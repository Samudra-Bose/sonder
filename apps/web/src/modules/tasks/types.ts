import type { ApiSchema } from "@sonder/contracts";

export type TaskDto = ApiSchema<"TaskDto">;
export type TaskKeyResolutionDto = ApiSchema<"TaskKeyResolutionDto">;
export type CreateTaskRequest = ApiSchema<"CreateTaskRequest">;
export type UpdateTaskRequest = ApiSchema<"UpdateTaskRequest">;
export type TaskPermissions = ApiSchema<"TaskPermissions">;
export type TaskStatusCategory = ApiSchema<"TaskStatusCategory">;
export type TaskPriority = ApiSchema<"TaskPriority">;
export type TaskType = ApiSchema<"TaskType">;

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

export interface TaskConcurrencyConflictError {
  type: string;
  title: string;
  status: 409;
  detail: string;
  code: "TASK_FIELD_CONCURRENCY_CONFLICT";
  conflictedFields: string[];
  serverTask?: TaskDto;
}
