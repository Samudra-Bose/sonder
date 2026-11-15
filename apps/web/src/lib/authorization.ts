import type { ApiSchema } from "@sonder/contracts";
import type { WorkspaceRoleDto } from "@/mocks/data/roles.js";
import { ALL_CANONICAL_CAPABILITIES } from "@/mocks/data/roles.js";

export type RoleCapability = ApiSchema<"RoleCapability">;

export const CANONICAL_CAPABILITY_SET = new Set<string>(ALL_CANONICAL_CAPABILITIES);

/**
 * Type guard for canonical RoleCapability.
 */
export function isRoleCapability(cap: unknown): cap is RoleCapability {
  return typeof cap === "string" && CANONICAL_CAPABILITY_SET.has(cap);
}

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
  callerCapabilities: RoleCapability[] | string[] | null | undefined;
  previewRoleId?: string | null;
  availableRoles: WorkspaceRoleDto[];
  requiredCapability?: RoleCapability | string;
  membershipState?: "ACTIVE" | "SUSPENDED" | string | null;
  contextCommunityId?: string | null;
  targetCommunityId?: string | null;
  contextWorkspaceId?: string | null;
  targetWorkspaceId?: string | null;
}

export interface AuthorizationResult {
  allowed: boolean;
  effectiveCapabilities: RoleCapability[];
  isPreview: boolean;
  previewRole?: WorkspaceRoleDto | null;
  reason?: string;
}

/**
 * Computes the canonical intersection of caller capabilities and preview role capabilities.
 * If no preview role is active, returns caller capabilities.
 * If caller capabilities are missing, returns empty array (fail closed).
 */
export function computeEffectiveCapabilities(
  callerCapabilities: RoleCapability[] | string[] | null | undefined,
  previewRoleCapabilities?: RoleCapability[] | string[] | null
): RoleCapability[] {
  if (!callerCapabilities || !Array.isArray(callerCapabilities) || callerCapabilities.length === 0) {
    return [];
  }
  const filteredCallerCaps: RoleCapability[] = [];
  for (const cap of callerCapabilities) {
    if (isRoleCapability(cap)) {
      filteredCallerCaps.push(cap);
    }
  }
  if (!previewRoleCapabilities) {
    return [...filteredCallerCaps];
  }
  const previewCapSet = new Set<string>();
  for (const cap of previewRoleCapabilities) {
    if (isRoleCapability(cap)) {
      previewCapSet.add(cap);
    }
  }
  return filteredCallerCaps.filter((cap): cap is RoleCapability => previewCapSet.has(cap));
}

/**
 * Evaluates whether an action requiring `requiredCapability` is authorized under the
 * caller's effective permissions, taking role-preview simulation into account.
 * Strictly fails closed for inactive memberships, missing context, or mismatched tenant boundaries.
 */
export function evaluateAuthorization(params: EvaluateAuthorizationParams): AuthorizationResult {
  const {
    callerCapabilities,
    previewRoleId,
    availableRoles,
    requiredCapability,
    membershipState,
    contextCommunityId,
    targetCommunityId,
    contextWorkspaceId,
    targetWorkspaceId,
  } = params;

  // 1. Membership status boundary -> fail closed if inactive / suspended
  if (membershipState && membershipState !== "ACTIVE") {
    return {
      allowed: false,
      effectiveCapabilities: [],
      isPreview: Boolean(previewRoleId),
      reason: `Membership state is '${membershipState}'. Failing closed.`,
    };
  }

  // 2. Tenant isolation boundary -> fail closed on mismatch
  if (
    contextCommunityId &&
    targetCommunityId &&
    contextCommunityId !== targetCommunityId
  ) {
    return {
      allowed: false,
      effectiveCapabilities: [],
      isPreview: Boolean(previewRoleId),
      reason: "Community ID mismatch across tenant boundary. Failing closed.",
    };
  }

  if (
    contextWorkspaceId &&
    targetWorkspaceId &&
    contextWorkspaceId !== targetWorkspaceId
  ) {
    return {
      allowed: false,
      effectiveCapabilities: [],
      isPreview: Boolean(previewRoleId),
      reason: "Workspace ID mismatch across tenant boundary. Failing closed.",
    };
  }

  // 3. Missing caller capabilities -> fail closed
  if (!callerCapabilities || !Array.isArray(callerCapabilities) || callerCapabilities.length === 0) {
    return {
      allowed: false,
      effectiveCapabilities: [],
      isPreview: Boolean(previewRoleId),
      reason: "Missing caller capabilities context. Failing closed.",
    };
  }

  const validCallerCaps: RoleCapability[] = [];
  for (const cap of callerCapabilities) {
    if (isRoleCapability(cap)) {
      validCallerCaps.push(cap);
    }
  }

  // 4. Direct caller evaluation (no preview role active)
  if (!previewRoleId || !previewRoleId.trim()) {
    const allowed = requiredCapability
      ? validCallerCaps.includes(requiredCapability as RoleCapability)
      : true;
    return {
      allowed,
      effectiveCapabilities: [...validCallerCaps],
      isPreview: false,
      reason: allowed
        ? undefined
        : `Caller lacks required capability '${requiredCapability}'.`,
    };
  }

  // 5. Preview mode active: resolve preview role from available workspace roles
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

  // 6. Downward-only intersection: callerCapabilities ∩ targetRole.capabilities
  const effective = computeEffectiveCapabilities(validCallerCaps, targetRole.capabilities);

  const allowed = requiredCapability
    ? effective.includes(requiredCapability as RoleCapability)
    : true;

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
  actorCapabilities: RoleCapability[] | string[] | null | undefined,
  requestedCapabilities: (RoleCapability | string)[]
): { valid: boolean; unauthorizedCapabilities: string[] } {
  if (!actorCapabilities || !Array.isArray(actorCapabilities)) {
    return { valid: false, unauthorizedCapabilities: [...requestedCapabilities.map(String)] };
  }

  const actorCapSet = new Set(actorCapabilities.map(String));
  const unauthorized = requestedCapabilities
    .map(String)
    .filter((cap) => !actorCapSet.has(cap));

  return {
    valid: unauthorized.length === 0,
    unauthorizedCapabilities: unauthorized,
  };
}
