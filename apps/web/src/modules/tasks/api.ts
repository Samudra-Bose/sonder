import { apiRequest } from "@/lib/api-client.js";
import type {
  TaskDto,
  TaskKeyResolutionDto,
  GetTaskParams,
  ResolveTaskKeyParams,
  CreateTaskParams,
  UpdateTaskParams,
} from "./types.js";

/**
 * Fetches a single task by its canonical task ID.
 * Returns task details and backend-computed effective permissions.
 */
export async function getTaskById({
  communityId,
  workspaceId,
  taskId,
}: GetTaskParams): Promise<TaskDto> {
  return apiRequest<TaskDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}`
  );
}

/**
 * Resolves a current task key (e.g. "ENG-101") or historical alias (e.g. "OLD-42").
 * Transparently resolves to canonical currentKey and current workspace.
 * Returns indistinguishable 404 for unknown or unauthorized keys to preserve privacy.
 */
export async function resolveTaskKey({
  communityId,
  workspaceId,
  taskKey,
}: ResolveTaskKeyParams): Promise<TaskKeyResolutionDto> {
  return apiRequest<TaskKeyResolutionDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/tasks/by-key/${encodeURIComponent(taskKey)}`
  );
}

/**
 * Creates a new task or subtask in the designated workspace.
 * Requires valid CSRF token and UUIDv7 X-Mutation-Id header.
 * For subtasks, supply parentTaskId in data.
 */
export async function createTask({
  communityId,
  workspaceId,
  data,
  csrfToken,
  mutationId,
}: CreateTaskParams): Promise<TaskDto> {
  return apiRequest<TaskDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/tasks`,
    {
      method: "POST",
      body: JSON.stringify(data),
      csrfToken,
      mutationId,
    }
  );
}

/**
 * Updates permitted task fields using atomic field-level optimistic concurrency.
 * Requires baseFieldRevisions map in data to detect concurrent conflicts.
 * Rejects with HTTP 409 Conflict if any baseFieldRevision is stale.
 */
export async function updateTask({
  communityId,
  workspaceId,
  taskId,
  data,
  csrfToken,
  mutationId,
}: UpdateTaskParams): Promise<TaskDto> {
  return apiRequest<TaskDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
      csrfToken,
      mutationId,
    }
  );
}
