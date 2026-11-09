import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/index.js";
import {
  fetchTaskLinks,
  createTaskLinkApi,
  deleteTaskLinkApi,
} from "./api.js";
import type {
  TaskLinkDto,
  TaskLinkListDto,
  CreateTaskLinkRequest,
} from "./types.js";

export const taskLinksQueryKey = (
  communityId: string,
  workspaceId: string,
  taskId: string
): [string, string, string, string] => ["task-links", communityId, workspaceId, taskId];

export interface UseTaskLinksOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch dependency links for a task.
 */
export function useTaskLinks(
  communityId?: string | null,
  workspaceId?: string | null,
  taskId?: string | null,
  options: UseTaskLinksOptions = {}
): UseQueryResult<TaskLinkListDto, Error> {
  const isEnabled = Boolean(communityId && workspaceId && taskId && (options.enabled ?? true));

  return useQuery({
    queryKey: taskLinksQueryKey(communityId ?? "", workspaceId ?? "", taskId ?? ""),
    queryFn: () => {
      if (!communityId || !workspaceId || !taskId) {
        throw new Error("Cannot fetch task links: missing communityId, workspaceId, or taskId");
      }
      return fetchTaskLinks({ communityId, workspaceId, taskId });
    },
    enabled: isEnabled,
    staleTime: 30 * 1000,
  });
}

export interface CreateTaskLinkVariables {
  communityId: string;
  workspaceId: string;
  taskId: string;
  data: CreateTaskLinkRequest;
}

/**
 * Hook to create a task dependency / relation link.
 * Requires active CSRF token.
 */
export function useCreateTaskLink(): UseMutationResult<
  TaskLinkDto,
  Error,
  CreateTaskLinkVariables
> {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation({
    mutationFn: async ({ communityId, workspaceId, taskId, data }: CreateTaskLinkVariables) => {
      if (!csrfToken) {
        throw new Error("Cannot create task link: CSRF token is not initialized.");
      }
      return createTaskLinkApi({
        communityId,
        workspaceId,
        taskId,
        data,
        csrfToken,
      });
    },
    onSuccess: (_newLink, { communityId, workspaceId, taskId, data }) => {
      // Invalidate current task links
      queryClient.invalidateQueries({
        queryKey: taskLinksQueryKey(communityId, workspaceId, taskId),
      });
      // Invalidate target task links as well
      if (data.targetTaskId) {
        queryClient.invalidateQueries({
          queryKey: taskLinksQueryKey(communityId, workspaceId, data.targetTaskId),
        });
      }
      // Invalidate workspace tasks so timeline dependencyEdges are refreshed
      queryClient.invalidateQueries({
        queryKey: ["workspace-tasks", communityId, workspaceId],
      });
    },
  });
}

export interface DeleteTaskLinkVariables {
  communityId: string;
  workspaceId: string;
  taskId: string;
  linkId: string;
  targetTaskId?: string;
}

/**
 * Hook to delete a task link.
 * Requires active CSRF token.
 */
export function useDeleteTaskLink(): UseMutationResult<
  void,
  Error,
  DeleteTaskLinkVariables
> {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation({
    mutationFn: async ({ communityId, workspaceId, taskId, linkId }: DeleteTaskLinkVariables) => {
      if (!csrfToken) {
        throw new Error("Cannot delete task link: CSRF token is not initialized.");
      }
      return deleteTaskLinkApi({
        communityId,
        workspaceId,
        taskId,
        linkId,
        csrfToken,
      });
    },
    onSuccess: (_, { communityId, workspaceId, taskId, targetTaskId }) => {
      queryClient.invalidateQueries({
        queryKey: taskLinksQueryKey(communityId, workspaceId, taskId),
      });
      if (targetTaskId) {
        queryClient.invalidateQueries({
          queryKey: taskLinksQueryKey(communityId, workspaceId, targetTaskId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: ["workspace-tasks", communityId, workspaceId],
      });
    },
  });
}
