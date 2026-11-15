import type { WorkspaceRoleDto } from "@/mocks/data/roles.js";

/**
 * Authoritative Capability Evaluation & Role Preview Engine (FEAT-G02b, FEAT-G03)
 *
 * Core Security Invariant:
 *   effectiveCapabilities = callerCapabilities ∩ previewRoleCapabilities
 *
 * Governance Rules:
 * 1. Downward-Only Simulation: Role preview can only reduce permissions, never grant them.
 * 2. Intersection Principle: Any capability not held by the authenticated caller is strictly stripped.
 * 3. Fail-Closed Boundary: Missing caller capabilities or invalid/unrecognized preview roles return an empty set.
 * 4. Workspace & Community Isolation: Roles and memberships are evaluated strictly within the tenant boundary.
 * 5. Simulation Safety: Preview mode is strictly read-only; mutation requests bearing preview headers are rejected.
 * 6. Grant Ceiling: An actor cannot delegate or configure a role with capabilities they do not hold (granted_caps ⊆ actor_caps).
 */

export interface EvaluateAuthorizationParams {
  callerCapabilities: string[] | null | undefined;
  previewRoleId?: string | null;
  availableRoles: WorkspaceRoleDto[];
  requiredCapability?: string;
}

export interface AuthorizationResult {
  allowed: boolean;
  effectiveCapabilities: string[];
  isPreview: boolean;
  previewRole?: WorkspaceRoleDto | null;
  reason?: string;
}

/**
 * Computes the intersection of caller capabilities and preview role capabilities.
 * If no preview role is active, returns caller capabilities.
 * If caller capabilities are missing, returns empty array (fail closed).
 */
export function computeEffectiveCapabilities<T extends string = string>(
  callerCapabilities: T[] | null | undefined,
  previewRoleCapabilities?: T[] | null
): T[] {
  if (!callerCapabilities || !Array.isArray(callerCapabilities) || callerCapabilities.length === 0) {
    return [];
  }
  if (!previewRoleCapabilities) {
    return [...callerCapabilities];
  }
  // Intersection: callerCapabilities ∩ previewRoleCapabilities
  return callerCapabilities.filter((cap) => previewRoleCapabilities.includes(cap));
}

/**
 * Evaluates whether an action requiring `requiredCapability` is authorized under the
 * caller's effective permissions, taking role-preview simulation into account.
 */
export function evaluateAuthorization(params: EvaluateAuthorizationParams): AuthorizationResult {
  const { callerCapabilities, previewRoleId, availableRoles, requiredCapability } = params;

  // 1. Missing caller capabilities -> fail closed
  if (!callerCapabilities || !Array.isArray(callerCapabilities) || callerCapabilities.length === 0) {
    return {
      allowed: false,
      effectiveCapabilities: [],
      isPreview: Boolean(previewRoleId),
      reason: "Missing caller capabilities context. Failing closed.",
    };
  }

  // 2. Direct caller evaluation (no preview role active)
  if (!previewRoleId || !previewRoleId.trim()) {
    const allowed = requiredCapability ? callerCapabilities.includes(requiredCapability) : true;
    return {
      allowed,
      effectiveCapabilities: [...callerCapabilities],
      isPreview: false,
      reason: allowed
        ? undefined
        : `Caller lacks required capability '${requiredCapability}'.`,
    };
  }

  // 3. Preview mode active: resolve preview role from available workspace roles
  const targetRole = availableRoles.find(
    (r) => r.id === previewRoleId || (r.systemKey && r.systemKey === previewRoleId)
  );

  // If preview role ID is invalid, unknown, or not present in workspace -> fail closed
  if (!targetRole) {
    return {
      allowed: false,
      effectiveCapabilities: [],
      isPreview: true,
      reason: `Invalid or unrecognized preview role ID '${previewRoleId}'. Failing closed.`,
    };
  }

  // 4. Downward-only intersection: callerCapabilities ∩ targetRole.capabilities
  const effective = computeEffectiveCapabilities(callerCapabilities, targetRole.capabilities);

  const allowed = requiredCapability ? effective.includes(requiredCapability) : true;

  return {
    allowed,
    effectiveCapabilities: effective,
    isPreview: true,
    previewRole: targetRole,
    reason: allowed
      ? undefined
      : `Capability '${requiredCapability}' is not in effective permissions under preview role '${targetRole.name}'.`,
  };
}

/**
 * Validates the delegation grant ceiling:
 * An actor cannot grant, assign, or create a role containing capabilities they do not personally hold.
 * Invariant: granted_caps ⊆ actor_caps
 */
export function validateGrantCeiling(
  actorCapabilities: string[] | null | undefined,
  requestedCapabilities: string[]
): { valid: boolean; unauthorizedCapabilities: string[] } {
  if (!actorCapabilities || !Array.isArray(actorCapabilities)) {
    return { valid: false, unauthorizedCapabilities: [...requestedCapabilities] };
  }

  const actorCapSet = new Set(actorCapabilities);
  const unauthorized = requestedCapabilities.filter((cap) => !actorCapSet.has(cap));

  return {
    valid: unauthorized.length === 0,
    unauthorizedCapabilities: unauthorized,
  };
}
