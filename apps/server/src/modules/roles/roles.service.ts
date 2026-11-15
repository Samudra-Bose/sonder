import type { ApiSchema } from "@sonder/contracts";
import {
  createNotFoundError,
} from "../../errors/problem-details.js";

export type RoleCapability = ApiSchema<"RoleCapability">;
export type WorkspaceRoleDto = ApiSchema<"WorkspaceRoleDto">;
export type RolePreviewDto = ApiSchema<"RolePreviewDto">;

export const BUILTIN_ROLES: WorkspaceRoleDto[] = [
  {
    id: "018f98a2-3f12-7890-role-owner-001",
    systemKey: "OWNER",
    name: "Workspace Owner",
    description: "Full administrative, role management, workflow, and data management authority.",
    capabilities: [
      "task:read",
      "task:create",
      "task:edit_definition",
      "task:edit_title_description",
      "task:edit_dates_priority",
      "task:edit_custom_fields_links",
      "task:edit_estimate",
      "task:update_status",
      "task:assign",
      "task:manage_subtasks",
      "task:move",
      "task:comment",
      "task:watch",
      "task:archive",
      "task:restore",
      "task:delete_permanent",
      "task:request_signoff",
      "task:approve_signoff",
      "workspace:read_metadata",
      "workspace:invite_members",
      "workspace:manage_members",
      "workspace:administer_roles",
      "workspace:update_settings",
      "workspace:transfer_ownership",
      "workspace:archive",
      "workspace:restore",
      "workspace:configure_workflow",
      "saved_view:manage_shared",
      "audit:read",
      "audit:export",
      "workspace:manage_custom_fields",
    ],
    isBuiltIn: true,
  },
  {
    id: "018f98a2-3f12-7890-role-coord-002",
    systemKey: "COORDINATOR",
    name: "Coordinator",
    description: "Operational leadership: triage, assign, update workflow, and manage views.",
    capabilities: [
      "task:read",
      "task:create",
      "task:edit_definition",
      "task:edit_title_description",
      "task:edit_dates_priority",
      "task:edit_custom_fields_links",
      "task:edit_estimate",
      "task:update_status",
      "task:assign",
      "task:manage_subtasks",
      "task:move",
      "task:comment",
      "task:watch",
      "task:archive",
      "task:restore",
      "task:request_signoff",
      "task:approve_signoff",
      "workspace:read_metadata",
      "workspace:invite_members",
      "workspace:manage_members",
      "saved_view:manage_shared",
      "audit:read",
    ],
    isBuiltIn: true,
  },
  {
    id: "018f98a2-3f12-7890-role-membr-003",
    systemKey: "MEMBER",
    name: "Member",
    description: "Standard contributor: create, update own tasks, comment, and participate.",
    capabilities: [
      "task:read",
      "task:create",
      "task:edit_definition",
      "task:edit_title_description",
      "task:edit_dates_priority",
      "task:edit_custom_fields_links",
      "task:edit_estimate",
      "task:update_status",
      "task:assign",
      "task:manage_subtasks",
      "task:comment",
      "task:watch",
      "workspace:read_metadata",
    ],
    isBuiltIn: true,
  },
  {
    id: "018f98a2-3f12-7890-role-viewr-004",
    systemKey: "VIEWER",
    name: "Viewer",
    description: "Read-only workspace observer: view tasks, subscribe to updates.",
    capabilities: [
      "task:read",
      "task:watch",
      "workspace:read_metadata",
    ],
    isBuiltIn: true,
  },
];

/**
 * Computes the downward-only intersection:
 * effectiveCapabilities = callerCapabilities ∩ previewRoleCapabilities
 */
export function computeDownwardIntersection(
  callerCapabilities: RoleCapability[],
  previewRoleCapabilities: RoleCapability[]
): RoleCapability[] {
  if (!callerCapabilities || !Array.isArray(callerCapabilities) || callerCapabilities.length === 0) {
    return [];
  }
  const previewCapSet = new Set(previewRoleCapabilities);
  return callerCapabilities.filter((cap) => previewCapSet.has(cap));
}

export class RolesService {
  /**
   * Lists all available roles for a workspace.
   */
  async listRoles(
    _communityId: string,
    _workspaceId: string
  ): Promise<WorkspaceRoleDto[]> {
    // In live PostgreSQL setup, queries `workspace_roles` under RLS.
    // Built-in roles are canonical.
    return [...BUILTIN_ROLES];
  }

  /**
   * Simulates downward-only role preview.
   * Security Invariant:
   *   effectiveCapabilities = callerCapabilities ∩ previewRoleCapabilities
   */
  async previewRole(
    callerCapabilities: RoleCapability[],
    targetRoleId: string,
    communityId: string,
    workspaceId: string
  ): Promise<RolePreviewDto> {
    const roles = await this.listRoles(communityId, workspaceId);
    const targetRole = roles.find((r) => r.id === targetRoleId || r.systemKey === targetRoleId);

    if (!targetRole) {
      throw createNotFoundError(
        `Role with ID '${targetRoleId}' was not found in this workspace.`,
        "RESOURCE_NOT_FOUND"
      );
    }

    const effectiveCapabilities = computeDownwardIntersection(
      callerCapabilities,
      targetRole.capabilities
    );

    return {
      roleId: targetRole.id,
      roleName: targetRole.name,
      capabilities: effectiveCapabilities,
      previewOnly: true,
    };
  }
}

export const rolesService = new RolesService();
