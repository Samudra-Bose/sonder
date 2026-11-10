import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { taskActivityQueryKey } from "./useTaskComments.js";

/**
 * Transport Architecture Classification:
 * STATUS: EVENT_CONSUMER_ABSTRACTION
 *
 * NOTE: This hook provides the contract-compliant domain event processing, bounded LRU deduplication,
 * and TanStack Query cache invalidation for task collaboration events. It acts as an event-consumer
 * abstraction. Live WebSocket transport integration (ticket issuance via POST /communities/{cid}/realtime-ticket,
 * WebSocket handshake on subprotocol work-platform.v1, and control frame ping/pong per ws-protocol.schema.json)
 * remains strictly pending backend transport gateway implementation.
 */
export const REALTIME_TRANSPORT_CLASSIFICATION = "EVENT_CONSUMER_ABSTRACTION" as const;

export interface WorkspaceEventEnvelope {
  schemaVersion: 1;
  stream?: "workspace";
  communityId: string;
  workspaceId: string;
  workspaceSeq: number;
  eventId: string;
  eventType: string;
  occurredAt: string;
  actorId: string;
  entityId: string;
  mutationId?: string | null;
  payload?: Record<string, unknown>;
}

export interface UseTaskCollaborationRealtimeOptions {
  communityId?: string | null;
  workspaceId?: string | null;
  taskId?: string | null;
  currentUserId?: string | null;
}

/**
 * Resolves the canonical task ID associated with a workspace event.
 * Per ws-events.schema.json, OpenAPI 0.3.20-draft, and Master Spec §8:
 * - For comment events (comment.created, comment.updated, comment.deleted),
 *   payload.taskId explicitly identifies the parent task, while entityId identifies the comment.
 * - For task-level events and watcher.changed, entityId identifies the task, and payload.taskId
 *   may also mirror the task ID.
 * Returns null if no valid task identity is present.
 */
function resolveEventTaskId(event: WorkspaceEventEnvelope): string | null {
  const payloadTaskId =
    typeof event.payload?.taskId === "string" ? event.payload.taskId.trim() : null;
  if (payloadTaskId) {
    return payloadTaskId;
  }
  if (typeof event.entityId === "string" && event.entityId.trim().length > 0) {
    return event.entityId.trim();
  }
  return null;
}

/**
 * Handles incoming workspace events (comment.created, comment.updated, comment.deleted, watcher.changed)
 * with event deduplication by eventId and monotonic sequence ordering, updating the TanStack query cache.
 */
export function useTaskCollaborationRealtime({
  communityId,
  workspaceId,
  taskId,
  currentUserId: _currentUserId,
}: UseTaskCollaborationRealtimeOptions) {
  const queryClient = useQueryClient();
  const processedEventIds = useRef<Set<string>>(new Set());
  const latestSequence = useRef<number>(0);

  const handleWorkspaceEvent = useCallback(
    (event: WorkspaceEventEnvelope) => {
      // 1. Guard active hook options
      if (!communityId || !workspaceId || !taskId) return;

      // 2. Reject events from other communities or workspaces without advancing stream state
      if (event.communityId !== communityId || event.workspaceId !== workspaceId) {
        return;
      }

      // 3. Deduplicate by eventId (LRU cache bounded to 500 events)
      if (!event.eventId || processedEventIds.current.has(event.eventId)) {
        return;
      }
      processedEventIds.current.add(event.eventId);

      // Keep deduplication set bounded to latest 500 events
      if (processedEventIds.current.size > 500) {
        const firstEntry = processedEventIds.current.values().next().value;
        if (firstEntry) processedEventIds.current.delete(firstEntry);
      }

      // 4. Track monotonic workspace sequence for all valid events on this stream
      if (typeof event.workspaceSeq === "number" && event.workspaceSeq > latestSequence.current) {
        latestSequence.current = event.workspaceSeq;
      }

      // 5. Strict task-level event isolation:
      // Every task-scoped event handled by the active task context must match the canonical task identity.
      // Events for other tasks or missing valid task identity must never invalidate or modify active task data.
      const eventTaskId = resolveEventTaskId(event);
      if (!eventTaskId || eventTaskId !== taskId) {
        return;
      }

      // 6. Handle relevant collaboration events
      switch (event.eventType) {
        case "comment.created":
        case "comment.updated":
        case "comment.deleted": {
          queryClient.invalidateQueries({
            queryKey: taskActivityQueryKey(communityId, workspaceId, taskId),
          });
          break;
        }

        case "watcher.changed": {
          // Canonical watcher.changed payload per ws-events.schema.json, OpenAPI 0.3.20-draft,
          // and Master Spec §8 contains only taskId and event metadata.
          // It does NOT declare watching, isWatching, or target userId properties.
          // In accordance with contract governance, we do not fabricate missing payload fields
          // or mutate the current user's watcher state using undeclared properties.
          // We invalidate task queries and activity history so server-rendered activity entries refresh.
          queryClient.invalidateQueries({
            queryKey: taskActivityQueryKey(communityId, workspaceId, taskId),
          });
          queryClient.invalidateQueries({
            queryKey: ["task", communityId, workspaceId, taskId],
          });
          queryClient.invalidateQueries({ queryKey: ["my-work"] });
          break;
        }

        default:
          break;
      }
    },
    [communityId, workspaceId, taskId, queryClient]
  );

  return {
    handleWorkspaceEvent,
    get latestSequence() {
      return latestSequence.current;
    },
    transportClassification: REALTIME_TRANSPORT_CLASSIFICATION,
  };
}
