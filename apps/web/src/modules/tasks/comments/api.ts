import { apiRequest } from "@/lib/api-client.js";
import type {
  TaskActivityDto,
  CommentDto,
  MentionCandidateListDto,
  ListTaskActivityParams,
  CreateCommentParams,
  UpdateCommentParams,
  DeleteCommentParams,
  SetTaskWatchStatusParams,
  ListMentionCandidatesParams,
} from "./types.js";

/**
 * Lists task comments and activity history.
 * Operation: listTaskActivity
 * Route: GET /communities/{communityId}/workspaces/{workspaceId}/tasks/{taskId}/comments
 */
export async function fetchTaskActivity({
  communityId,
  workspaceId,
  taskId,
}: ListTaskActivityParams): Promise<TaskActivityDto> {
  return apiRequest<TaskActivityDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/comments`
  );
}

/**
 * Creates a threaded Markdown comment and resolves eligible mentions.
 * Operation: createTaskComment
 * Route: POST /communities/{communityId}/workspaces/{workspaceId}/tasks/{taskId}/comments
 */
export async function createCommentApi({
  communityId,
  workspaceId,
  taskId,
  data,
  csrfToken,
  mutationId,
}: CreateCommentParams): Promise<CommentDto> {
  return apiRequest<CommentDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/comments`,
    {
      method: "POST",
      body: JSON.stringify(data),
      csrfToken,
      mutationId,
    }
  );
}

/**
 * Edits own comment with optimistic concurrency.
 * Operation: updateTaskComment
 * Route: PATCH /communities/{communityId}/workspaces/{workspaceId}/comments/{commentId}
 */
export async function updateCommentApi({
  communityId,
  workspaceId,
  commentId,
  data,
  csrfToken,
  mutationId,
}: UpdateCommentParams): Promise<CommentDto> {
  return apiRequest<CommentDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/comments/${encodeURIComponent(commentId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
      csrfToken,
      mutationId,
    }
  );
}

/**
 * Soft-deletes a comment (own comment, or moderated with task:archive).
 * Operation: deleteTaskComment
 * Route: DELETE /communities/{communityId}/workspaces/{workspaceId}/comments/{commentId}
 */
export async function deleteCommentApi({
  communityId,
  workspaceId,
  commentId,
  csrfToken,
  mutationId,
}: DeleteCommentParams): Promise<void> {
  return apiRequest<void>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/comments/${encodeURIComponent(commentId)}`,
    {
      method: "DELETE",
      csrfToken,
      mutationId,
    }
  );
}

/**
 * Follows or unfollows a task for the authenticated actor.
 * Operation: setTaskWatchStatus
 * Route: PUT /communities/{communityId}/workspaces/{workspaceId}/tasks/{taskId}/watch
 */
export async function setTaskWatchStatusApi({
  communityId,
  workspaceId,
  taskId,
  data,
  csrfToken,
  mutationId,
}: SetTaskWatchStatusParams): Promise<void> {
  return apiRequest<void>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/watch`,
    {
      method: "PUT",
      body: JSON.stringify(data),
      csrfToken,
      mutationId,
    }
  );
}

/**
 * Finds eligible workspace members for a task mention.
 * Operation: listTaskMentionCandidates
 * Route: GET /communities/{communityId}/workspaces/{workspaceId}/tasks/{taskId}/mention-candidates?q={q}&limit={limit}
 */
export async function fetchMentionCandidates({
  communityId,
  workspaceId,
  taskId,
  q,
  limit = 10,
}: ListMentionCandidatesParams): Promise<MentionCandidateListDto> {
  const queryParams = new URLSearchParams({
    q: q.trim(),
    limit: String(limit),
  });

  return apiRequest<MentionCandidateListDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/mention-candidates?${queryParams.toString()}`
  );
}
