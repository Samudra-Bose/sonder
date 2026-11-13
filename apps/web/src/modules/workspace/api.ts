import { apiRequest } from "@/lib/api-client";
import type {
  WorkspaceDto,
  WorkspaceListDto,
  ActiveCommunityDto,
  SetActiveCommunityRequest,
  WorkspaceTemplateListDto,
  CreateWorkspaceRequest,
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
 * List the three built-in Workspace setup templates.
 * Contract: GET /api/v1/communities/{communityId}/workspace-templates
 */
export async function fetchWorkspaceTemplates(
  communityId: string
): Promise<WorkspaceTemplateListDto> {
  return apiRequest<WorkspaceTemplateListDto>(
    `/communities/${encodeURIComponent(communityId)}/workspace-templates`
  );
}

/**
 * Create a personal or authorized shared workspace with an optional starter template.
 * Contract: POST /api/v1/communities/{communityId}/workspaces
 * Headers: X-Mutation-Id, X-CSRF-Token
 */
export async function createWorkspaceApi(
  communityId: string,
  data: CreateWorkspaceRequest,
  csrfToken: string
): Promise<WorkspaceDto> {
  return apiRequest<WorkspaceDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces`,
    {
      method: "POST",
      body: JSON.stringify(data),
      csrfToken,
    }
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
