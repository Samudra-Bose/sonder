import { apiRequest } from "@/lib/api-client.js";
import type {
  MilestoneDto,
  MilestoneListDto,
  ListMilestonesParams,
  CreateMilestoneParams,
  UpdateMilestoneParams,
  DeleteMilestoneParams,
} from "./types.js";

/**
 * Lists workspace milestones.
 * Milestones are workspace-level planning markers and are excluded from task row totals.
 */
export async function fetchMilestones({
  communityId,
  workspaceId,
}: ListMilestonesParams): Promise<MilestoneListDto> {
  return apiRequest<MilestoneListDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/milestones`
  );
}

/**
 * Creates a workspace milestone.
 * Requires valid CSRF token and UUIDv7 X-Mutation-Id header.
 */
export async function createMilestoneApi({
  communityId,
  workspaceId,
  data,
  csrfToken,
  mutationId,
}: CreateMilestoneParams): Promise<MilestoneDto> {
  return apiRequest<MilestoneDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/milestones`,
    {
      method: "POST",
      body: JSON.stringify(data),
      csrfToken,
      mutationId,
    }
  );
}

/**
 * Updates a milestone.
 * Requires valid CSRF token and UUIDv7 X-Mutation-Id header.
 */
export async function updateMilestoneApi({
  communityId,
  workspaceId,
  milestoneId,
  data,
  csrfToken,
  mutationId,
}: UpdateMilestoneParams): Promise<MilestoneDto> {
  return apiRequest<MilestoneDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/milestones/${encodeURIComponent(milestoneId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
      csrfToken,
      mutationId,
    }
  );
}

/**
 * Deletes a milestone.
 * When deleted, linked task milestoneId values are cleared by the server.
 * Requires valid CSRF token and UUIDv7 X-Mutation-Id header.
 */
export async function deleteMilestoneApi({
  communityId,
  workspaceId,
  milestoneId,
  csrfToken,
  mutationId,
}: DeleteMilestoneParams): Promise<void> {
  return apiRequest<void>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/milestones/${encodeURIComponent(milestoneId)}`,
    {
      method: "DELETE",
      csrfToken,
      mutationId,
    }
  );
}
