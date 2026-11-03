import { apiRequest } from "@/lib/api-client";
import type {
  WorkspaceListDto,
  ActiveCommunityDto,
  SetActiveCommunityRequest,
} from "./types";

/**
 * Fetch workspaces visible to the current caller for a specific community.
 * Contract: GET /api/v1/communities/{communityId}/workspaces
 */
export async function fetchWorkspaces(
  communityId: string
): Promise<WorkspaceListDto> {
  return apiRequest<WorkspaceListDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces`
  );
}

/**
 * Update the active community context for the session.
 * Contract: PUT /api/v1/me/active-community
 * Headers: X-Mutation-Id, X-CSRF-Token
 */
export async function setActiveCommunityApi(
  communityId: string,
  csrfToken: string
): Promise<ActiveCommunityDto> {
  const payload: SetActiveCommunityRequest = { communityId };
  return apiRequest<ActiveCommunityDto>("/me/active-community", {
    method: "PUT",
    body: JSON.stringify(payload),
    csrfToken,
  });
}
