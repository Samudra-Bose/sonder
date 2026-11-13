import { apiRequest } from "@/lib/api-client";
import type { WorkspaceDto } from "@/modules/workspace/types";
import type {
  CustomFieldDefinitionDto,
  CustomFieldDefinitionListDto,
  CreateCustomFieldDefinitionRequest,
  UpdateCustomFieldDefinitionRequest,
  UpdateWorkspaceSettingsRequest,
  WorkspaceMemberListDto,
} from "./types.js";

/**
 * List workspace custom-field definitions.
 * Contract: GET /api/v1/communities/{communityId}/workspaces/{workspaceId}/custom-fields
 */
export async function fetchCustomFields(
  communityId: string,
  workspaceId: string
): Promise<CustomFieldDefinitionListDto> {
  return apiRequest<CustomFieldDefinitionListDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/custom-fields`
  );
}

/**
 * Create a core custom-field definition.
 * Contract: POST /api/v1/communities/{communityId}/workspaces/{workspaceId}/custom-fields
 */
export async function createCustomFieldApi(
  communityId: string,
  workspaceId: string,
  data: CreateCustomFieldDefinitionRequest,
  csrfToken: string
): Promise<CustomFieldDefinitionDto> {
  return apiRequest<CustomFieldDefinitionDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/custom-fields`,
    {
      method: "POST",
      body: JSON.stringify(data),
      csrfToken,
    }
  );
}

/**
 * Update a custom-field definition.
 * Contract: PATCH /api/v1/communities/{communityId}/workspaces/{workspaceId}/custom-fields/{fieldId}
 */
export async function updateCustomFieldApi(
  communityId: string,
  workspaceId: string,
  fieldId: string,
  data: UpdateCustomFieldDefinitionRequest,
  csrfToken: string
): Promise<CustomFieldDefinitionDto> {
  return apiRequest<CustomFieldDefinitionDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/custom-fields/${encodeURIComponent(fieldId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
      csrfToken,
    }
  );
}

/**
 * Archive a custom-field definition without erasing existing task history.
 * Contract: DELETE /api/v1/communities/{communityId}/workspaces/{workspaceId}/custom-fields/{fieldId}?baseVersion={v}
 */
export async function archiveCustomFieldApi(
  communityId: string,
  workspaceId: string,
  fieldId: string,
  baseVersion: number,
  csrfToken: string
): Promise<void> {
  return apiRequest<void>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/custom-fields/${encodeURIComponent(fieldId)}?baseVersion=${encodeURIComponent(baseVersion)}`,
    {
      method: "DELETE",
      csrfToken,
    }
  );
}

/**
 * Add an option to a SINGLE_SELECT custom field definition.
 * Contract: POST /api/v1/communities/{communityId}/workspaces/{workspaceId}/custom-fields/{fieldId}/options
 */
export async function createCustomFieldOptionApi(
  communityId: string,
  workspaceId: string,
  fieldId: string,
  label: string,
  csrfToken: string
): Promise<CustomFieldDefinitionDto> {
  return apiRequest<CustomFieldDefinitionDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/custom-fields/${encodeURIComponent(fieldId)}/options`,
    {
      method: "POST",
      body: JSON.stringify({ label }),
      csrfToken,
    }
  );
}

/**
 * Get workspace details.
 * Contract: GET /api/v1/communities/{communityId}/workspaces/{workspaceId}
 */
export async function fetchWorkspaceSettings(
  communityId: string,
  workspaceId: string
): Promise<WorkspaceDto> {
  return apiRequest<WorkspaceDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}`
  );
}

/**
 * Update permitted workspace settings.
 * Contract: PATCH /api/v1/communities/{communityId}/workspaces/{workspaceId}
 */
export async function updateWorkspaceSettingsApi(
  communityId: string,
  workspaceId: string,
  data: UpdateWorkspaceSettingsRequest,
  csrfToken: string
): Promise<WorkspaceDto> {
  return apiRequest<WorkspaceDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
      csrfToken,
    }
  );
}

/**
 * List workspace members.
 * Contract: GET /api/v1/communities/{communityId}/workspaces/{workspaceId}/members
 */
export async function fetchWorkspaceMembers(
  communityId: string,
  workspaceId: string
): Promise<WorkspaceMemberListDto> {
  return apiRequest<WorkspaceMemberListDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/members`
  );
}
