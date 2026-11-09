import type { ApiSchema } from "@sonder/contracts";

export type TaskLinkDto = ApiSchema<"TaskLinkDto">;
export type TaskLinkListDto = ApiSchema<"TaskLinkListDto">;
export type CreateTaskLinkRequest = ApiSchema<"CreateTaskLinkRequest">;
export type TaskQueryDependencyEdgeDto = ApiSchema<"TaskQueryDependencyEdgeDto">;
export type TaskQueryVisibleEndpointDto = ApiSchema<"TaskQueryVisibleEndpointDto">;
export type TaskQueryRestrictedEndpointDto = ApiSchema<"TaskQueryRestrictedEndpointDto">;

export type TaskLinkType = "BLOCKS" | "IS_BLOCKED_BY" | "RELATES_TO" | "DUPLICATES";

export interface ListTaskLinksParams {
  communityId: string;
  workspaceId: string;
  taskId: string;
}

export interface CreateTaskLinkParams {
  communityId: string;
  workspaceId: string;
  taskId: string;
  data: CreateTaskLinkRequest;
  csrfToken?: string | null;
  mutationId?: string;
}

export interface DeleteTaskLinkParams {
  communityId: string;
  workspaceId: string;
  taskId: string;
  linkId: string;
  csrfToken?: string | null;
  mutationId?: string;
}

export interface DependencyConflictResult {
  hasConflict: boolean;
  reason?: string;
  blockerId?: string;
  dependentId?: string;
  blockerDueDate?: string | null;
  dependentStartDate?: string | null;
}
