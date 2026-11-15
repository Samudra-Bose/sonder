import type { WorkspaceDto } from "@/modules/workspace/types.js";
import type { RoleCapability } from "./types.js";

/**
 * Validates whether the active user in the given workspace context possesses
 * the requested workspace-scoped capability.
 *
 * Evaluation rules:
 * 1. Strictly authoritative: relies solely on the server-provided `effectiveCapabilities` array.
 * 2. In the absence of workspace context, or if `effectiveCapabilities` is missing/empty,
 *    it strictly fails closed (returns false).
 * 3. Never treats role names (`myRole`) as authorization proof. Role-to-capability mapping
 *    belongs exclusively to server/fixture contracts.
 */
export function hasWorkspaceCapability(
  workspace: (WorkspaceDto & { effectiveCapabilities?: string[] }) | null | undefined,
  capability: RoleCapability,
  previewRoleCapabilities?: string[] | null
): boolean {
  if (!workspace) return false;

  // Authoritative explicit capability array (provided by server responses and role simulator)
  if (Array.isArray(workspace.effectiveCapabilities)) {
    if (previewRoleCapabilities) {
      // Invariant: effective = caller ∩ preview (FEAT-G02b, FEAT-G03)
      return (
        workspace.effectiveCapabilities.includes(capability) &&
        previewRoleCapabilities.includes(capability)
      );
    }
    return workspace.effectiveCapabilities.includes(capability);
  }

  // Fails closed: role names are display labels, never authorization authority
  return false;
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
