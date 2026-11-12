import type { ApiSchema } from "@sonder/contracts";

export type TaskDto = ApiSchema<"TaskDto">;
export type TaskKeyResolutionDto = ApiSchema<"TaskKeyResolutionDto">;
export type CreateTaskRequest = ApiSchema<"CreateTaskRequest">;
export type UpdateTaskRequest = ApiSchema<"UpdateTaskRequest">;
export type TaskPermissions = ApiSchema<"TaskPermissions">;
export type TaskStatusCategory = ApiSchema<"TaskStatusCategory">;
export type TaskPriority = ApiSchema<"TaskPriority">;
export type TaskType = ApiSchema<"TaskType">;
export type TaskViewQueryRequest = ApiSchema<"TaskViewQueryRequest">;
export type TaskQueryResult = ApiSchema<"TaskQueryResult">;
export type TaskQueryBucketDto = ApiSchema<"TaskQueryBucketDto">;
export type ViewQuerySpec = ApiSchema<"ViewQuerySpec">;
export type QueryFilterGroup = ApiSchema<"QueryFilterGroup">;
export type QueryFilterCondition = ApiSchema<"QueryFilterCondition">;
export type QuerySortTerm = ApiSchema<"QuerySortTerm">;
export type QueryDateWindow = ApiSchema<"QueryDateWindow">;
export type MoveTaskRequest = ApiSchema<"MoveTaskRequest">;
export type TaskMoveResultDto = ApiSchema<"TaskMoveResultDto">;
export type ArchiveRequest = ApiSchema<"ArchiveRequest">;
export type ArchiveTaskResultDto = ApiSchema<"ArchiveTaskResultDto">;
export type RestoreTaskRequest = ApiSchema<"RestoreTaskRequest">;
export type BulkTaskMutationRequest = ApiSchema<"BulkTaskMutationRequest">;
export type BulkTaskResultDto = ApiSchema<"BulkTaskResultDto">;
export type TrashedTaskDto = ApiSchema<"TrashedTaskDto">;
export type TrashedTaskListDto = ApiSchema<"TrashedTaskListDto">;

export interface GetTaskParams {
  communityId: string;
  workspaceId: string;
  taskId: string;
}

export interface ResolveTaskKeyParams {
  communityId: string;
  workspaceId: string;
  taskKey: string;
}

export interface CreateTaskParams {
  communityId: string;
  workspaceId: string;
  data: CreateTaskRequest;
  csrfToken: string;
  mutationId?: string;
}

export interface UpdateTaskParams {
  communityId: string;
  workspaceId: string;
  taskId: string;
  data: UpdateTaskRequest;
  csrfToken: string;
  mutationId?: string;
}

export interface QueryWorkspaceTasksParams {
  communityId: string;
  workspaceId: string;
  query?: Partial<TaskViewQueryRequest>;
  csrfToken?: string;
}

export interface MoveTaskParams {
  communityId: string;
  workspaceId: string;
  taskId: string;
  data: MoveTaskRequest;
  csrfToken: string;
  mutationId?: string;
}

export interface ArchiveTaskParams {
  communityId: string;
  workspaceId: string;
  taskId: string;
  reason?: string;
  csrfToken?: string;
  mutationId?: string;
}

export interface RestoreTaskParams {
  communityId: string;
  workspaceId: string;
  taskId: string;
  undoToken?: string;
  csrfToken?: string;
  mutationId?: string;
}

export interface BulkMutateTasksParams {
  communityId: string;
  workspaceId: string;
  data: BulkTaskMutationRequest;
  csrfToken?: string;
  mutationId?: string;
}

export interface ListTrashedTasksParams {
  communityId: string;
  workspaceId: string;
}

export interface TaskConcurrencyConflictError {
  type: string;
  title: string;
  status: 409;
  detail: string;
  code: "TASK_FIELD_CONCURRENCY_CONFLICT";
  conflictedFields: string[];
  serverTask?: TaskDto;
}
