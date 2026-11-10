import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { taskActivityQueryKey, taskWatchQueryKey } from "./useTaskComments.js";

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
 * Handles incoming workspace events (comment.created, comment.updated, comment.deleted, watcher.changed)
 * with event deduplication by eventId and monotonic sequence ordering, updating the TanStack query cache.
 */
export function useTaskCollaborationRealtime({
  communityId,
  workspaceId,
  taskId,
  currentUserId,
}: UseTaskCollaborationRealtimeOptions) {
  const queryClient = useQueryClient();
  const processedEventIds = useRef<Set<string>>(new Set());
  const latestSequence = useRef<number>(0);

  const handleWorkspaceEvent = useCallback(
    (event: WorkspaceEventEnvelope) => {
      if (!communityId || !workspaceId || !taskId) return;
      if (event.communityId !== communityId || event.workspaceId !== workspaceId) return;

      // Ensure event pertains to the active task (by entityId or payload.taskId)
      const eventTaskId =
        (event.payload as { taskId?: string })?.taskId ?? event.entityId;
      if (eventTaskId && eventTaskId !== taskId && event.eventType.startsWith("comment.")) {
        return;
      }

      // 1. Deduplicate by eventId (LRU cache bounded to 500 events)
      if (processedEventIds.current.has(event.eventId)) {
        return;
      }
      processedEventIds.current.add(event.eventId);

      // Keep deduplication set bounded to latest 500 events
      if (processedEventIds.current.size > 500) {
        const firstEntry = processedEventIds.current.values().next().value;
        if (firstEntry) processedEventIds.current.delete(firstEntry);
      }

      // 2. Track monotonic sequence
      if (event.workspaceSeq > latestSequence.current) {
        latestSequence.current = event.workspaceSeq;
      }

      // 3. Handle relevant collaboration events
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
          const watcherUserId = (event.payload as { userId?: string })?.userId;
          const payloadObj = event.payload as { watching?: boolean; isWatching?: boolean } | undefined;
          const isWatching = payloadObj?.watching ?? payloadObj?.isWatching;
          if (
            typeof isWatching === "boolean" &&
            (!watcherUserId || !currentUserId || watcherUserId === currentUserId)
          ) {
            queryClient.setQueryData(
              taskWatchQueryKey(communityId, workspaceId, taskId),
              isWatching
            );
          }
          queryClient.invalidateQueries({
            queryKey: taskWatchQueryKey(communityId, workspaceId, taskId),
          });
          queryClient.invalidateQueries({
            queryKey: ["task", communityId, workspaceId, taskId],
          });
          queryClient.invalidateQueries({
            queryKey: taskActivityQueryKey(communityId, workspaceId, taskId),
          });
          queryClient.invalidateQueries({ queryKey: ["my-work"] });
          break;
        }

        default:
          break;
      }
    },
    [communityId, workspaceId, taskId, currentUserId, queryClient]
  );

  return {
    handleWorkspaceEvent,
    latestSequence: latestSequence.current,
    transportClassification: REALTIME_TRANSPORT_CLASSIFICATION,
  };
}
