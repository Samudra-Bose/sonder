import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/index.js";
import { bulkMutateTasks } from "./api.js";
import type { BulkTaskMutationRequest, BulkTaskResultDto } from "./types.js";

export interface BulkMutateTasksVariables {
  communityId: string;
  workspaceId: string;
  data: BulkTaskMutationRequest;
}

/**
 * Hook to apply bulk mutations (ARCHIVE, SET_STATUS, SET_PRIORITY, ASSIGN, UNASSIGN)
 * on up to 100 selected tasks.
 */
export function useBulkMutateTasks(): UseMutationResult<
  BulkTaskResultDto,
  Error,
  BulkMutateTasksVariables
> {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      communityId,
      workspaceId,
      data,
    }: BulkMutateTasksVariables) => {
      if (!csrfToken) {
        throw new Error("Cannot execute bulk mutation: CSRF token is not initialized.");
      }
      return bulkMutateTasks({
        communityId,
        workspaceId,
        data,
        csrfToken,
      });
    },

    onSuccess: (_result, { communityId, workspaceId }) => {
      // Invalidate active task queries
      queryClient.invalidateQueries({
        queryKey: ["communities", communityId, "workspaces", workspaceId, "tasks"],
      });
      // Invalidate trash queries (in case of bulk archive)
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
