import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/index.js";
import {
  fetchTaskActivity,
  createCommentApi,
  updateCommentApi,
  deleteCommentApi,
  setTaskWatchStatusApi,
  fetchMentionCandidates,
} from "./api.js";
import type {
  TaskActivityDto,
  CommentDto,
  CreateCommentRequest,
  UpdateCommentRequest,
  MentionCandidateListDto,
} from "./types.js";

export const taskActivityQueryKey = (
  communityId?: string | null,
  workspaceId?: string | null,
  taskId?: string | null
): [string, string, string, string] => [
  "task-activity",
  communityId ?? "",
  workspaceId ?? "",
  taskId ?? "",
];

export const mentionCandidatesQueryKey = (
  communityId?: string | null,
  workspaceId?: string | null,
  taskId?: string | null,
  q?: string
): [string, string, string, string, string] => [
  "mention-candidates",
  communityId ?? "",
  workspaceId ?? "",
  taskId ?? "",
  q ?? "",
];

export interface UseTaskActivityOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch comments and activity stream for a task.
 */
export function useTaskActivity(
  communityId?: string | null,
  workspaceId?: string | null,
  taskId?: string | null,
  options: UseTaskActivityOptions = {}
): UseQueryResult<TaskActivityDto, Error> {
  const isEnabled = Boolean(communityId && workspaceId && taskId && (options.enabled ?? true));

  return useQuery({
    queryKey: taskActivityQueryKey(communityId, workspaceId, taskId),
    queryFn: () => {
      if (!communityId || !workspaceId || !taskId) {
        throw new Error("Cannot fetch task activity: missing communityId, workspaceId, or taskId");
      }
      return fetchTaskActivity({ communityId, workspaceId, taskId });
    },
    enabled: isEnabled,
    staleTime: 10 * 1000,
  });
}

export interface CreateCommentVariables {
  communityId: string;
  workspaceId: string;
  taskId: string;
  data: CreateCommentRequest;
}

/**
 * Mutation hook to create a Markdown comment.
 */
export function useCreateComment(): UseMutationResult<
  CommentDto,
  Error,
  CreateCommentVariables
> {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation({
    mutationFn: async ({ communityId, workspaceId, taskId, data }) => {
      if (!csrfToken) {
        throw new Error("CSRF token is required to create a comment");
      }
      return createCommentApi({
        communityId,
        workspaceId,
        taskId,
        data,
        csrfToken,
      });
    },
    onSuccess: (newComment, { communityId, workspaceId, taskId }) => {
      const qKey = taskActivityQueryKey(communityId, workspaceId, taskId);
      queryClient.setQueryData<TaskActivityDto>(qKey, (old) => {
        if (!old) {
          return { comments: [newComment], activity: [] };
        }
        // Deduplicate in case realtime or optimistic update placed it
        const exists = old.comments.some((c) => c.id === newComment.id);
        if (exists) {
          return {
            ...old,
            comments: old.comments.map((c) => (c.id === newComment.id ? newComment : c)),
          };
        }
        return {
          ...old,
          comments: [...old.comments, newComment],
        };
      });
      queryClient.invalidateQueries({ queryKey: qKey });
    },
  });
}

export interface UpdateCommentVariables {
  communityId: string;
  workspaceId: string;
  taskId: string;
  commentId: string;
  data: UpdateCommentRequest;
}

/**
 * Mutation hook to update an existing comment with optimistic concurrency version check.
 */
export function useUpdateComment(): UseMutationResult<
  CommentDto,
  Error,
  UpdateCommentVariables
> {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation({
    mutationFn: async ({ communityId, workspaceId, commentId, data }) => {
      if (!csrfToken) {
        throw new Error("CSRF token is required to update a comment");
      }
      return updateCommentApi({
        communityId,
        workspaceId,
        commentId,
        data,
        csrfToken,
      });
    },
    onSuccess: (updatedComment, { communityId, workspaceId, taskId }) => {
      const qKey = taskActivityQueryKey(communityId, workspaceId, taskId);
      queryClient.setQueryData<TaskActivityDto>(qKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          comments: old.comments.map((c) =>
            c.id === updatedComment.id ? updatedComment : c
          ),
        };
      });
      queryClient.invalidateQueries({ queryKey: qKey });
    },
  });
}

export interface DeleteCommentVariables {
  communityId: string;
  workspaceId: string;
  taskId: string;
  commentId: string;
}

/**
 * Mutation hook to soft-delete a comment.
 */
export function useDeleteComment(): UseMutationResult<
  void,
  Error,
  DeleteCommentVariables
> {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation({
    mutationFn: async ({ communityId, workspaceId, commentId }) => {
      if (!csrfToken) {
        throw new Error("CSRF token is required to delete a comment");
      }
      return deleteCommentApi({
        communityId,
        workspaceId,
        commentId,
        csrfToken,
      });
    },
    onSuccess: (_, { communityId, workspaceId, taskId, commentId }) => {
      const qKey = taskActivityQueryKey(communityId, workspaceId, taskId);
      queryClient.setQueryData<TaskActivityDto>(qKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          comments: old.comments.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  isDeleted: true,
                  body: null,
                  bodyAst: null,
                  mentions: [],
                  deletedAt: new Date().toISOString(),
                }
              : c
          ),
        };
      });
      queryClient.invalidateQueries({ queryKey: qKey });
    },
  });
}

export interface SetTaskWatchVariables {
  communityId: string;
  workspaceId: string;
  taskId: string;
  watching: boolean;
}

/**
 * Mutation hook to follow or unfollow a task for the authenticated actor.
 */
export function useSetTaskWatch(): UseMutationResult<
  void,
  Error,
  SetTaskWatchVariables
> {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation({
    mutationFn: async ({ communityId, workspaceId, taskId, watching }) => {
      if (!csrfToken) {
        throw new Error("CSRF token is required to update watch status");
      }
      return setTaskWatchStatusApi({
        communityId,
        workspaceId,
        taskId,
        data: { watching },
        csrfToken,
      });
    },
    onSuccess: (_, { communityId, workspaceId, taskId }) => {
      // Invalidate task queries and my-work
      queryClient.invalidateQueries({
        queryKey: ["task", communityId, workspaceId, taskId],
      });
      queryClient.invalidateQueries({ queryKey: ["my-work"] });
      queryClient.invalidateQueries({
        queryKey: taskActivityQueryKey(communityId, workspaceId, taskId),
      });
    },
  });
}

/**
 * Hook to search mention candidates within the current workspace and task scope.
 */
export function useMentionCandidates(
  communityId?: string | null,
  workspaceId?: string | null,
  taskId?: string | null,
  query: string | null = "",
  enabled = true
): UseQueryResult<MentionCandidateListDto, Error> {
  const trimmed = (query ?? "").trim();
  const isEnabled = Boolean(
    communityId && workspaceId && taskId && query !== null && enabled
  );

  return useQuery({
    queryKey: mentionCandidatesQueryKey(communityId, workspaceId, taskId, trimmed),
    queryFn: () => {
      if (!communityId || !workspaceId || !taskId) {
        throw new Error("Missing params for mention search");
      }
      return fetchMentionCandidates({
        communityId,
        workspaceId,
        taskId,
        q: trimmed,
        limit: 10,
      });
    },
    enabled: isEnabled,
    staleTime: 60 * 1000,
  });
}
