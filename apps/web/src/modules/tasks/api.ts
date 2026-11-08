import { apiRequest } from "@/lib/api-client.js";
import type {
  TaskDto,
  TaskKeyResolutionDto,
  GetTaskParams,
  ResolveTaskKeyParams,
  CreateTaskParams,
  UpdateTaskParams,
  QueryWorkspaceTasksParams,
  TaskQueryResult,
  MoveTaskParams,
  TaskMoveResultDto,
  TaskViewQueryRequest,
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

/**
 * Queries workspace tasks according to canonical querySpec.
 * Used for building and rendering task and subtask hierarchies.
 */
export async function queryWorkspaceTasks({
  communityId,
  workspaceId,
  query = {},
  csrfToken,
}: QueryWorkspaceTasksParams): Promise<TaskQueryResult> {
  const fullBody: TaskViewQueryRequest = {
    projection: query.projection ?? "LIST",
    pageScope: query.pageScope ?? "PRIMARY",
    querySpec: query.querySpec ?? {
      subtaskMode: "NESTED",
      groupBy: "none",
      subGroupBy: "none",
      includeBacklog: true,
      includeCompleted: true,
      filter: { conjunction: "AND", conditions: [] },
    },
    ...query,
  };

  return apiRequest<TaskQueryResult>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/tasks/query`,
    {
      method: "POST",
      body: JSON.stringify(fullBody),
      csrfToken,
    }
  );
}

/**
 * Moves a task within a workspace (same-workspace reparenting) or across workspaces.
 * In Stage 5, constrained to same-workspace moves (targetWorkspaceId === workspaceId).
 */
export async function moveTask({
  communityId,
  workspaceId,
  taskId,
  data,
  csrfToken,
  mutationId,
}: MoveTaskParams): Promise<TaskMoveResultDto> {
  return apiRequest<TaskMoveResultDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/move`,
    {
      method: "POST",
      body: JSON.stringify(data),
      csrfToken,
      mutationId,
    }
  );
}
