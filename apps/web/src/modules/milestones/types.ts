import type { ApiSchema, Uuid } from "@sonder/contracts";

export type MilestoneDto = ApiSchema<"MilestoneDto">;
export type MilestoneListDto = ApiSchema<"MilestoneListDto">;
export type CreateMilestoneRequest = ApiSchema<"CreateMilestoneRequest">;
export type UpdateMilestoneRequest = ApiSchema<"UpdateMilestoneRequest">;

export type { Uuid };

export interface ListMilestonesParams {
  communityId: string;
  workspaceId: string;
}

export interface CreateMilestoneParams {
  communityId: string;
  workspaceId: string;
  data: CreateMilestoneRequest;
  csrfToken?: string | null;
  mutationId?: string;
}

export interface UpdateMilestoneParams {
  communityId: string;
  workspaceId: string;
  milestoneId: string;
  data: UpdateMilestoneRequest;
  csrfToken?: string | null;
  mutationId?: string;
}

export interface DeleteMilestoneParams {
  communityId: string;
  workspaceId: string;
  milestoneId: string;
  csrfToken?: string | null;
  mutationId?: string;
}
