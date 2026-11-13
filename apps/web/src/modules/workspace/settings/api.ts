import { apiRequest } from "@/lib/api-client";
import type { WorkspaceDto } from "@/modules/workspace/types";
import type {
  CustomFieldDefinitionDto,
  CustomFieldDefinitionListDto,
  CreateCustomFieldDefinitionRequest,
  UpdateCustomFieldDefinitionRequest,
  UpdateWorkspaceSettingsRequest,
  WorkspaceMemberListDto,
  WorkspaceRoleListDto,
  AuditEventPageDto,
  AuditEventExportRequest,
  AuditIntegrityStatusDto,
  AuditEventType,
  AuditEventCategory,
  AuditTargetType,
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

/**
 * List workspace built-in and custom roles.
 * Contract: GET /api/v1/communities/{communityId}/workspaces/{workspaceId}/roles
 */
export async function fetchWorkspaceRoles(
  communityId: string,
  workspaceId: string
): Promise<WorkspaceRoleListDto> {
  return apiRequest<WorkspaceRoleListDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/roles`
  );
}

export interface AuditEventQueryParams {
  from?: string;
  to?: string;
  actorId?: string;
  eventTypes?: AuditEventType[];
  categories?: AuditEventCategory[];
  severities?: ("INFO" | "WARNING" | "HIGH" | "CRITICAL")[];
  targetType?: AuditTargetType;
  targetId?: string;
  cursor?: string;
  limit?: number;
}

/**
 * List workspace audit events with cursor pagination and filtering.
 * Contract: GET /api/v1/communities/{communityId}/workspaces/{workspaceId}/audit-events
 */
export async function fetchWorkspaceAuditEvents(
  communityId: string,
  workspaceId: string,
  query?: AuditEventQueryParams
): Promise<AuditEventPageDto> {
  const searchParams = new URLSearchParams();
  if (query?.from) searchParams.set("from", query.from);
  if (query?.to) searchParams.set("to", query.to);
  if (query?.actorId) searchParams.set("actorId", query.actorId);
  if (query?.targetType) searchParams.set("targetType", query.targetType);
  if (query?.targetId) searchParams.set("targetId", query.targetId);
  if (query?.cursor) searchParams.set("cursor", query.cursor);
  if (query?.limit !== undefined) searchParams.set("limit", String(query.limit));
  if (query?.eventTypes) {
    for (const t of query.eventTypes) searchParams.append("eventTypes", t);
  }
  if (query?.categories) {
    for (const c of query.categories) searchParams.append("categories", c);
  }
  if (query?.severities) {
    for (const s of query.severities) searchParams.append("severities", s);
  }
  const qs = searchParams.toString();
  return apiRequest<AuditEventPageDto>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/audit-events${qs ? `?${qs}` : ""}`
  );
}

/**
 * Export workspace audit events matching filter criteria as CSV.
 * Contract: POST /api/v1/communities/{communityId}/workspaces/{workspaceId}/audit-events/export
 */
export async function exportWorkspaceAuditEventsApi(
  communityId: string,
  workspaceId: string,
  request: AuditEventExportRequest,
  csrfToken: string
): Promise<string> {
  return apiRequest<string>(
    `/communities/${encodeURIComponent(communityId)}/workspaces/${encodeURIComponent(workspaceId)}/audit-events/export`,
    {
      method: "POST",
      body: JSON.stringify(request),
      csrfToken,
    }
  );
}

/**
 * Get audit-chain cryptographic integrity status for community.
 * Contract: GET /api/v1/communities/{communityId}/admin/audit-integrity
 */
export async function fetchAuditIntegrityStatus(
  communityId: string
): Promise<AuditIntegrityStatusDto> {
  return apiRequest<AuditIntegrityStatusDto>(
    `/communities/${encodeURIComponent(communityId)}/admin/audit-integrity`
  );
}

