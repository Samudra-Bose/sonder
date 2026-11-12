import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/index.js";
import { restoreTask } from "./api.js";
import type { TaskDto } from "./types.js";

export interface RestoreTrashedTaskVariables {
  communityId: string;
  workspaceId: string;
  taskId: string;
}

/**
 * Hook to restore an archived task from the 30-day workspace trash view.
 */
export function useRestoreTrashedTask(): UseMutationResult<
  TaskDto,
  Error,
  RestoreTrashedTaskVariables
> {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      communityId,
      workspaceId,
      taskId,
    }: RestoreTrashedTaskVariables) => {
      return restoreTask({
        communityId,
        workspaceId,
        taskId,
        csrfToken: csrfToken ?? undefined,
      });
    },

    onSuccess: (_task, { communityId, workspaceId }) => {
      // Invalidate active task queries
      queryClient.invalidateQueries({
        queryKey: ["communities", communityId, "workspaces", workspaceId, "tasks"],
      });
      // Invalidate trash queries
      queryClient.invalidateQueries({
        queryKey: ["communities", communityId, "workspaces", workspaceId, "trash"],
      });
      // Invalidate My Work
      queryClient.invalidateQueries({
        queryKey: ["communities", communityId, "my-work"],
      });
    },
  });
}
