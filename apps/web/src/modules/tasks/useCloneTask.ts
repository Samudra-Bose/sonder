import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/index.js";
import { cloneTask as apiCloneTask } from "./api.js";
import { taskQueryKey } from "./useTask.js";
import { taskKeyResolutionQueryKey } from "./useResolveTaskKey.js";
import { setCachedTaskWorkspace } from "./useTaskPeekDrawer.js";
import { generateUuidV7 } from "@/lib/uuid.js";
import type { TaskDto, CloneTaskRequest } from "./types.js";

export interface CloneTaskMutationVariables {
  communityId: string;
  workspaceId: string;
  taskId: string;
  data: CloneTaskRequest;
  mutationId?: string;
}

/**
 * Hook to execute the cloneTask mutation.
 * Enforces CSRF token presence and idempotency header generation.
 * Seeds the cloned task and key resolution into the React Query cache,
 * and invalidates affected workspace queries to ensure immediate visibility.
 */
export function useCloneTask(): UseMutationResult<
  TaskDto,
  Error,
  CloneTaskMutationVariables
> {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      communityId,
      workspaceId,
      taskId,
      data,
      mutationId = generateUuidV7(),
    }: CloneTaskMutationVariables) => {
      if (!csrfToken) {
        throw new Error("Cannot clone task: CSRF token is not initialized.");
      }
      return apiCloneTask({
        communityId,
        workspaceId,
        taskId,
        data,
        csrfToken,
        mutationId,
      });
    },
    onSuccess: (clonedTask, { communityId, workspaceId }) => {
      // 1. Seed task detail into cache
      queryClient.setQueryData(
        taskQueryKey(communityId, workspaceId, clonedTask.id),
        clonedTask
      );

      // 2. Seed key resolution into cache
      queryClient.setQueryData(
        taskKeyResolutionQueryKey(communityId, workspaceId, clonedTask.taskKey),
        {
          taskId: clonedTask.id,
          workspaceId: clonedTask.workspaceId,
          requestedKey: clonedTask.taskKey,
          currentKey: clonedTask.taskKey,
          resolvedFromAlias: false,
          lifecycleState: "ACTIVE" as const,
          archivedAt: null,
          recoverableUntil: null,
        }
      );

      // 3. Register with in-session task-to-workspace mapping
      setCachedTaskWorkspace(clonedTask.taskKey, workspaceId);

      // 4. Invalidate workspace tasks and my-work query lists
      queryClient.invalidateQueries({
        queryKey: ["communities", communityId, "workspaces", workspaceId, "tasks"],
      });
      queryClient.invalidateQueries({
        queryKey: ["communities", communityId, "my-work"],
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });
    },
  });
}
