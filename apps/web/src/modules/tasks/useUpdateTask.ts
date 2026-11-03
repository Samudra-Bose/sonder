import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/index.js";
import { updateTask } from "./api.js";
import { taskQueryKey } from "./useTask.js";
import type { TaskDto, UpdateTaskRequest } from "./types.js";

export interface UpdateTaskMutationVariables {
  communityId: string;
  workspaceId: string;
  taskId: string;
  data: UpdateTaskRequest;
}

export interface UpdateTaskMutationContext {
  previousTask?: TaskDto;
  taskKey: readonly ["communities", string, "workspaces", string, "tasks", string] | readonly ["tasks", "disabled"];
  attemptedData: UpdateTaskRequest;
}

/**
 * Hook to update task attributes using optimistic updates with automatic rollback.
 * Accurately surfaces 409 field-revision conflicts while keeping the user's attempted edit intact.
 */
export function useUpdateTask(): UseMutationResult<
  TaskDto,
  Error,
  UpdateTaskMutationVariables,
  UpdateTaskMutationContext
> {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      communityId,
      workspaceId,
      taskId,
      data,
    }: UpdateTaskMutationVariables) => {
      if (!csrfToken) {
        throw new Error("Cannot update task: CSRF token is not initialized.");
      }
      return updateTask({
        communityId,
        workspaceId,
        taskId,
        data,
        csrfToken,
      });
    },

    onMutate: async ({ communityId, workspaceId, taskId, data }) => {
      const qKey = taskQueryKey(communityId, workspaceId, taskId);

      // Cancel any ongoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: qKey });

      // Snapshot previous task state
      const previousTask = queryClient.getQueryData<TaskDto>(qKey);

      // Optimistically update cached task if present
      if (previousTask) {
        const optimisticTask: TaskDto = {
          ...previousTask,
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.statusCategory !== undefined && { statusCategory: data.statusCategory }),
          ...(data.priority !== undefined && { priority: data.priority }),
          ...(data.startDate !== undefined && { startDate: data.startDate }),
          ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
          ...(data.estimatePoints !== undefined && { estimatePoints: data.estimatePoints }),
          ...(data.assigneeIds !== undefined && { assigneeIds: data.assigneeIds }),
          ...(data.labelIds !== undefined && { labelIds: data.labelIds }),
          ...(data.milestoneId !== undefined && { milestoneId: data.milestoneId }),
          updatedAt: new Date().toISOString(),
        };

        queryClient.setQueryData<TaskDto>(qKey, optimisticTask);
      }

      return {
        previousTask,
        taskKey: qKey,
        attemptedData: data,
      };
    },

    onError: (_err, _vars, context) => {
      // Rollback to previous task on error (including 409 Conflict and 403 Forbidden)
      if (context?.previousTask && context.taskKey) {
        queryClient.setQueryData(context.taskKey, context.previousTask);
      }
    },

    onSuccess: (updatedTask, { communityId, workspaceId }) => {
      const qKey = taskQueryKey(communityId, workspaceId, updatedTask.id);
      queryClient.setQueryData(qKey, updatedTask);

      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ["communities", communityId, "workspaces", workspaceId, "tasks"],
      });
      queryClient.invalidateQueries({
        queryKey: ["communities", communityId, "my-work"],
      });
    },

    onSettled: (_data, _error, { communityId, workspaceId, taskId }) => {
      // Re-sync with authoritative server state
      const qKey = taskQueryKey(communityId, workspaceId, taskId);
      queryClient.invalidateQueries({ queryKey: qKey });
    },
  });
}
