import { apiRequest } from "@/lib/api-client.js";
import type {
  TaskLinkDto,
  TaskLinkListDto,
  ListTaskLinksParams,
  CreateTaskLinkParams,
  DeleteTaskLinkParams,
} from "./types.js";

/**
 * Lists dependency and relation links for a specific task.
 * Returns TaskLinkListDto ({ items: TaskLinkDto[] }).
 */
export async function fetchTaskLinks({
  communityId,
  workspaceId,
  taskId,
}: ListTaskLinksParams): Promise<TaskLinkListDto> {
  return apiRequest<TaskLinkListDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/links`
  );
}

/**
 * Creates a task link / dependency.
 * Requires valid CSRF token and UUIDv7 X-Mutation-Id header.
 */
export async function createTaskLinkApi({
  communityId,
  workspaceId,
  taskId,
  data,
  csrfToken,
  mutationId,
}: CreateTaskLinkParams): Promise<TaskLinkDto> {
  return apiRequest<TaskLinkDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/links`,
    {
      method: "POST",
      body: JSON.stringify(data),
      csrfToken,
      mutationId,
    }
  );
}

/**
 * Deletes a task relation link.
 * Requires valid CSRF token and UUIDv7 X-Mutation-Id header.
 */
export async function deleteTaskLinkApi({
  communityId,
  workspaceId,
  taskId,
  linkId,
  csrfToken,
  mutationId,
}: DeleteTaskLinkParams): Promise<void> {
  return apiRequest<void>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/links/${encodeURIComponent(linkId)}`,
    {
      method: "DELETE",
      csrfToken,
      mutationId,
    }
  );
}
