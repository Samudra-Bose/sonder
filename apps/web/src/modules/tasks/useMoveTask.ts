import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/index.js";
import { moveTask } from "./api.js";
import { taskQueryKey } from "./useTask.js";
import type { TaskMoveResultDto, MoveTaskRequest } from "./types.js";

export interface MoveTaskMutationVariables {
  communityId: string;
  workspaceId: string;
  taskId: string;
  data: MoveTaskRequest;
}

/**
 * Hook to move or reparent a task within its workspace.
 * Reconciles React Query cache upon success and updates related queries.
 */
export function useMoveTask(): UseMutationResult<
  TaskMoveResultDto,
  Error,
  MoveTaskMutationVariables
> {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      communityId,
      workspaceId,
      taskId,
      data,
    }: MoveTaskMutationVariables) => {
      if (!csrfToken) {
        throw new Error("Cannot move task: CSRF token is not initialized.");
      }
      return moveTask({
        communityId,
        workspaceId,
        taskId,
        data,
        csrfToken,
      });
    },
    onSuccess: (result, { communityId, workspaceId }) => {
      // 1. Seed root task detail cache
      queryClient.setQueryData(
        taskQueryKey(communityId, workspaceId, result.rootTask.id),
        result.rootTask
      );

      // 2. Invalidate all workspace tasks and descendant queries
      queryClient.invalidateQueries({
        queryKey: ["communities", communityId, "workspaces", workspaceId, "tasks"],
      });

      // 3. Invalidate my-work query lists
      queryClient.invalidateQueries({
        queryKey: ["communities", communityId, "my-work"],
      });
    },
  });
}
