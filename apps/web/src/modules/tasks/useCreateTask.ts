import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/index.js";
import { createTask } from "./api.js";
import { taskQueryKey } from "./useTask.js";
import { taskKeyResolutionQueryKey } from "./useResolveTaskKey.js";
import type { TaskDto, CreateTaskRequest } from "./types.js";

export interface CreateTaskMutationVariables {
  communityId: string;
  workspaceId: string;
  data: CreateTaskRequest;
}

/**
 * Hook to create a task or subtask.
 * Invalidate affected queries and seed the new task into the React Query cache.
 */
export function useCreateTask(): UseMutationResult<
  TaskDto,
  Error,
  CreateTaskMutationVariables
> {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation({
    mutationFn: async ({ communityId, workspaceId, data }: CreateTaskMutationVariables) => {
      if (!csrfToken) {
        throw new Error("Cannot create task: CSRF token is not initialized.");
      }
      return createTask({
        communityId,
        workspaceId,
        data,
        csrfToken,
      });
    },
    onSuccess: (newTask, { communityId, workspaceId }) => {
      // 1. Seed task detail into cache
      queryClient.setQueryData(
        taskQueryKey(communityId, workspaceId, newTask.id),
        newTask
      );

      // 2. Seed key resolution into cache
      queryClient.setQueryData(
        taskKeyResolutionQueryKey(communityId, workspaceId, newTask.taskKey),
        {
          taskId: newTask.id,
          workspaceId: newTask.workspaceId,
          requestedKey: newTask.taskKey,
          currentKey: newTask.taskKey,
          resolvedFromAlias: false,
          lifecycleState: "ACTIVE" as const,
          archivedAt: null,
          recoverableUntil: null,
        }
      );

      // 3. Invalidate workspace tasks and my-work query lists
      queryClient.invalidateQueries({
        queryKey: ["communities", communityId, "workspaces", workspaceId, "tasks"],
      });
      queryClient.invalidateQueries({
        queryKey: ["communities", communityId, "my-work"],
      });
    },
  });
}
