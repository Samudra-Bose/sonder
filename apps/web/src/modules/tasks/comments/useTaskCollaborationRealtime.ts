import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { taskActivityQueryKey } from "./useTaskComments.js";

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
}

/**
 * Handles incoming workspace events (comment.created, comment.updated, comment.deleted, watcher.changed)
 * with event deduplication by eventId and monotonic sequence ordering, updating the TanStack query cache.
 */
export function useTaskCollaborationRealtime({
  communityId,
  workspaceId,
  taskId,
}: UseTaskCollaborationRealtimeOptions) {
  const queryClient = useQueryClient();
  const processedEventIds = useRef<Set<string>>(new Set());
  const latestSequence = useRef<number>(0);

  const handleWorkspaceEvent = useCallback(
    (event: WorkspaceEventEnvelope) => {
      if (!communityId || !workspaceId || !taskId) return;
      if (event.communityId !== communityId || event.workspaceId !== workspaceId) return;

      // 1. Deduplicate by eventId
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
    [communityId, workspaceId, taskId, queryClient]
  );

  return {
    handleWorkspaceEvent,
    latestSequence: latestSequence.current,
  };
}
