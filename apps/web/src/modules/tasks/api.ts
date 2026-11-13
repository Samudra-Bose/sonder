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
  CloneTaskParams,
  TaskViewQueryRequest,
  ArchiveTaskResultDto,
  ArchiveTaskParams,
  RestoreTaskParams,
  BulkMutateTasksParams,
  BulkTaskResultDto,
  ListTrashedTasksParams,
  TrashedTaskListDto,
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
  const isBoard = query.projection === "BOARD";
  const fullBody: TaskViewQueryRequest = {
    projection: query.projection ?? "LIST",
    pageScope: query.pageScope ?? "PRIMARY",
    querySpec: {
      subtaskMode: "NESTED",
      groupBy: isBoard ? "statusCategory" : "none",
      subGroupBy: "none",
      includeBacklog: query.querySpec?.includeBacklog ?? true,
      includeCompleted: query.querySpec?.includeCompleted ?? true,
      filter: { conjunction: "AND", conditions: [] },
      ...query.querySpec,
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

/**
 * Clones a task and optionally its subtasks / checklists into the same workspace.
 * Returns the newly created TaskDto with fresh ID and sequential taskKey.
 */
export async function cloneTask({
  communityId,
  workspaceId,
  taskId,
  data,
  csrfToken,
  mutationId,
}: CloneTaskParams): Promise<TaskDto> {
  return apiRequest<TaskDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/clone`,
    {
      method: "POST",
      body: JSON.stringify(data),
      csrfToken,
      mutationId,
    }
  );
}

/**
 * Archives a single task with a 10-second undo token and 30-day trash retention.
 * Requires fail-closed canArchive authorization and UUIDv7 idempotency key.
 */
export async function archiveTask({
  communityId,
  workspaceId,
  taskId,
  reason,
  csrfToken,
  mutationId,
}: ArchiveTaskParams): Promise<ArchiveTaskResultDto> {
  return apiRequest<ArchiveTaskResultDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/archive`,
    {
      method: "POST",
      body: JSON.stringify(reason ? { reason } : {}),
      csrfToken,
      mutationId,
    }
  );
}

/**
 * Restores an archived task.
 * When undoToken is provided, validates within the advisory undo window.
 * When undoToken is omitted, restores from the 30-day trash view.
 */
export async function restoreTask({
  communityId,
  workspaceId,
  taskId,
  undoToken,
  csrfToken,
  mutationId,
}: RestoreTaskParams): Promise<TaskDto> {
  if (undoToken === "") {
    throw new Error("Missing undoToken: restoreTask requires a valid undoToken to restore an archived task.");
  }
  const body = undoToken ? { undoToken } : {};
  return apiRequest<TaskDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/restore`,
    {
      method: "POST",
      body: JSON.stringify(body),
      csrfToken,
      mutationId,
    }
  );
}

/**
 * Lists recoverable archived tasks in the workspace (30-day retention window).
 */
export async function listTrashedTasks({
  communityId,
  workspaceId,
}: ListTrashedTasksParams): Promise<TrashedTaskListDto> {
  return apiRequest<TrashedTaskListDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/trash/tasks`
  );
}

/**
 * Applies an all-or-nothing bulk task mutation (up to 100 tasks).
 * Supported actions: ARCHIVE, SET_STATUS, SET_PRIORITY, ASSIGN, UNASSIGN.
 */
export async function bulkMutateTasks({
  communityId,
  workspaceId,
  data,
  csrfToken,
  mutationId,
}: BulkMutateTasksParams): Promise<BulkTaskResultDto> {
  return apiRequest<BulkTaskResultDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/tasks/bulk`,
    {
      method: "POST",
      body: JSON.stringify(data),
      csrfToken,
      mutationId,
    }
  );
}
