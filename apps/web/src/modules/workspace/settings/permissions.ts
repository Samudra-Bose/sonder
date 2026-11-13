import type { WorkspaceDto } from "@/modules/workspace/types.js";
import type { RoleCapability } from "./types.js";

/**
 * Validates whether the active user in the given workspace context possesses
 * the requested workspace-scoped capability.
 *
 * Evaluation rules:
 * 1. If explicit `effectiveCapabilities` array is present (from server or simulated custom role),
 *    it is strictly authoritative.
 * 2. If missing, falls back to the canonical default capabilities for built-in roles:
 *    - OWNER: possesses all workspace-scoped capabilities by default.
 *    - COORDINATOR: possesses coordination and task capabilities; excludes workspace:manage_custom_fields and workspace:update_settings.
 *    - MEMBER / VIEWER: restricted execution/read capabilities; excludes administration.
 * 3. In the absence of workspace context or unassigned roles, fails closed (returns false).
 */
export function hasWorkspaceCapability(
  workspace: (WorkspaceDto & { effectiveCapabilities?: string[] }) | null | undefined,
  capability: RoleCapability
): boolean {
  if (!workspace) return false;

  // 1. Authoritative explicit capability array (used by server responses and role simulator)
  if (Array.isArray(workspace.effectiveCapabilities)) {
    return workspace.effectiveCapabilities.includes(capability);
  }

  // 2. Canonical built-in role default capability sets
  switch (workspace.myRole) {
    case "OWNER":
      return true;

    case "COORDINATOR":
      return [
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
        "workspace:read_metadata",
        "workspace:invite_members",
        "saved_view:manage_shared",
        "audit:read",
      ].includes(capability);

    case "MEMBER":
      return [
        "task:read",
        "task:create",
        "task:edit_title_description",
        "task:edit_dates_priority",
        "task:edit_custom_fields_links",
        "task:edit_estimate",
        "task:update_status",
        "task:comment",
        "task:watch",
        "workspace:read_metadata",
      ].includes(capability);

    case "VIEWER":
      return [
        "task:read",
        "workspace:read_metadata",
      ].includes(capability);

    default:
      // Unknown role or missing role without explicit capabilities fails closed
      return false;
  }
}

/**
 * Checks if the actor can manage workspace custom-field definitions (FEAT-D04a).
 * Governed strictly by capability: workspace:manage_custom_fields.
 */
export function canManageCustomFields(
  workspace: (WorkspaceDto & { effectiveCapabilities?: string[] }) | null | undefined
): boolean {
  return hasWorkspaceCapability(workspace, "workspace:manage_custom_fields");
}

/**
 * Checks if the actor can modify workspace identity, prefix, depth and policies (FEAT-D01).
 * Governed strictly by capability: workspace:update_settings.
 */
export function canUpdateWorkspaceSettings(
  workspace: (WorkspaceDto & { effectiveCapabilities?: string[] }) | null | undefined
): boolean {
  return hasWorkspaceCapability(workspace, "workspace:update_settings");
}

/**
 * Checks if the actor can inspect workspace audit events (FEAT-G04).
 * Governed strictly by capability: audit:read.
 */
export function canReadAuditLogs(
  workspace: (WorkspaceDto & { effectiveCapabilities?: string[] }) | null | undefined
): boolean {
  return hasWorkspaceCapability(workspace, "audit:read");
}

/**
 * Checks if the actor can export workspace audit events to CSV (FEAT-G04).
 * Governed strictly by capability: audit:export.
 */
export function canExportAuditLogs(
  workspace: (WorkspaceDto & { effectiveCapabilities?: string[] }) | null | undefined
): boolean {
  return hasWorkspaceCapability(workspace, "audit:export");
}
