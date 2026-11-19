import { describe, it, expect, beforeEach } from "vitest";
import {
  computeEffectiveCapabilities,
  evaluateAuthorization,
  validateGrantCeiling,
} from "./authorization.js";
import {
  mockOwnerRole,
  mockCoordinatorRole,
  mockMemberRole,
  mockViewerRole,
  initialMockWorkspaceRoles,
} from "@/mocks/data/roles.js";
import { apiRequest, type RequestOptions } from "./api-client.js";
import { resetMockAuditState } from "@/mocks/handlers/audit.js";

const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { method: "GET", ...options }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      csrfToken: "test-csrf-token",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      csrfToken: "test-csrf-token",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),
};

describe("VS-10: Critical Authorization Boundary & Role Preview Security", () => {
  const ownerCaps = [...mockOwnerRole.capabilities];
  const coordCaps = [...mockCoordinatorRole.capabilities];
  const memberCaps = [...mockMemberRole.capabilities];
  const viewerCaps = [...mockViewerRole.capabilities];

  beforeEach(() => {
    resetMockAuditState();
  });

  describe("A. Canonical Intersection Invariant: effectiveCapabilities = callerCapabilities ∩ previewRoleCapabilities", () => {
    it("Scenario 1: Coordinator previews Owner -> must NOT acquire Owner-only capabilities", () => {
      // Coordinator previews Owner
      const effective = computeEffectiveCapabilities(coordCaps, ownerCaps);

      // Must not acquire Owner-only capabilities
      expect(effective).not.toContain("audit:export");
      expect(effective).not.toContain("workspace:update_settings");
      expect(effective).not.toContain("workspace:administer_roles");
      expect(effective).not.toContain("workspace:manage_custom_fields");
      expect(effective).not.toContain("task:delete_permanent");

      // Retains capabilities available to both
      expect(effective).toContain("audit:read");
      expect(effective).toContain("task:read");
      expect(effective).toContain("task:create");
      expect(effective).toContain("task:manage_subtasks");

      // evaluateAuthorization helper verification
      const evalExport = evaluateAuthorization({
        callerCapabilities: coordCaps,
        previewRoleId: mockOwnerRole.id,
        availableRoles: initialMockWorkspaceRoles,
        requiredCapability: "audit:export",
      });
      expect(evalExport.allowed).toBe(false);
      expect(evalExport.isPreview).toBe(true);

      const evalRead = evaluateAuthorization({
        callerCapabilities: coordCaps,
        previewRoleId: mockOwnerRole.id,
        availableRoles: initialMockWorkspaceRoles,
        requiredCapability: "audit:read",
      });
      expect(evalRead.allowed).toBe(true);
      expect(evalRead.isPreview).toBe(true);
    });

    it("Scenario 2: Owner previews Coordinator -> Owner-only capabilities MUST be removed during preview", () => {
      // Owner previews Coordinator
      const effective = computeEffectiveCapabilities(ownerCaps, coordCaps);

      // Owner-only capabilities must be stripped
      expect(effective).not.toContain("audit:export");
      expect(effective).not.toContain("workspace:update_settings");
      expect(effective).not.toContain("workspace:administer_roles");
      expect(effective).not.toContain("workspace:manage_custom_fields");
      expect(effective).not.toContain("task:delete_permanent");

      // Capabilities shared with Coordinator are retained
      expect(effective).toContain("audit:read");
      expect(effective).toContain("task:read");
      expect(effective).toContain("task:create");
      expect(effective).toContain("workspace:invite_members");

      // evaluateAuthorization helper verification
      const evalExport = evaluateAuthorization({
        callerCapabilities: ownerCaps,
        previewRoleId: mockCoordinatorRole.id,
        availableRoles: initialMockWorkspaceRoles,
        requiredCapability: "audit:export",
      });
      expect(evalExport.allowed).toBe(false);

      const evalRead = evaluateAuthorization({
        callerCapabilities: ownerCaps,
        previewRoleId: mockCoordinatorRole.id,
        availableRoles: initialMockWorkspaceRoles,
        requiredCapability: "audit:read",
      });
      expect(evalRead.allowed).toBe(true);
    });

    it("Scenario 3: Owner previews Owner -> retains only capabilities available to both", () => {
      const effective = computeEffectiveCapabilities(ownerCaps, ownerCaps);
      expect(effective).toEqual(ownerCaps);
      expect(effective).toContain("audit:export");
      expect(effective).toContain("workspace:update_settings");

      const evalExport = evaluateAuthorization({
        callerCapabilities: ownerCaps,
        previewRoleId: mockOwnerRole.id,
        availableRoles: initialMockWorkspaceRoles,
        requiredCapability: "audit:export",
      });
      expect(evalExport.allowed).toBe(true);
      expect(evalExport.effectiveCapabilities).toEqual(ownerCaps);
    });

    it("Scenario 4: Missing caller capabilities or invalid preview role -> strictly fails closed", () => {
      // Missing / null caller capabilities
      const nullCallerResult = evaluateAuthorization({
        callerCapabilities: null,
        previewRoleId: mockOwnerRole.id,
        availableRoles: initialMockWorkspaceRoles,
        requiredCapability: "task:read",
      });
      expect(nullCallerResult.allowed).toBe(false);
      expect(nullCallerResult.effectiveCapabilities).toEqual([]);

      // Empty caller capabilities
      const emptyCallerResult = evaluateAuthorization({
        callerCapabilities: [],
        previewRoleId: mockOwnerRole.id,
        availableRoles: initialMockWorkspaceRoles,
        requiredCapability: "task:read",
      });
      expect(emptyCallerResult.allowed).toBe(false);
      expect(emptyCallerResult.effectiveCapabilities).toEqual([]);

      // Invalid / unknown preview role ID
      const invalidRoleResult = evaluateAuthorization({
        callerCapabilities: ownerCaps,
        previewRoleId: "unknown-role-uuid-9999",
        availableRoles: initialMockWorkspaceRoles,
        requiredCapability: "task:read",
      });
      expect(invalidRoleResult.allowed).toBe(false);
      expect(invalidRoleResult.effectiveCapabilities).toEqual([]);
      expect(invalidRoleResult.reason).toMatch(/invalid or unrecognized preview role/i);

      // Inactive / suspended membership -> fails closed
      const suspendedResult = evaluateAuthorization({
        callerCapabilities: ownerCaps,
        availableRoles: initialMockWorkspaceRoles,
        membershipState: "SUSPENDED",
        requiredCapability: "task:read",
      });
      expect(suspendedResult.allowed).toBe(false);
      expect(suspendedResult.effectiveCapabilities).toEqual([]);
      expect(suspendedResult.reason).toMatch(/membership state is 'SUSPENDED'/i);

      // Tenant mismatch (Community ID mismatch) -> fails closed
      const communityMismatchResult = evaluateAuthorization({
        callerCapabilities: ownerCaps,
        availableRoles: initialMockWorkspaceRoles,
        contextCommunityId: "community-1",
        targetCommunityId: "community-2",
        requiredCapability: "task:read",
      });
      expect(communityMismatchResult.allowed).toBe(false);
      expect(communityMismatchResult.effectiveCapabilities).toEqual([]);
      expect(communityMismatchResult.reason).toMatch(/community id mismatch/i);

      // Tenant mismatch (Workspace ID mismatch) -> fails closed
      const workspaceMismatchResult = evaluateAuthorization({
        callerCapabilities: ownerCaps,
        availableRoles: initialMockWorkspaceRoles,
        contextWorkspaceId: "workspace-1",
        targetWorkspaceId: "workspace-2",
        requiredCapability: "task:read",
      });
      expect(workspaceMismatchResult.allowed).toBe(false);
      expect(workspaceMismatchResult.effectiveCapabilities).toEqual([]);
      expect(workspaceMismatchResult.reason).toMatch(/workspace id mismatch/i);
    });

    it("Scenario 5: Member previews Viewer -> further restricts to read-only capabilities", () => {
      const effective = computeEffectiveCapabilities(memberCaps, viewerCaps);

      // Write capabilities in Member are stripped
      expect(effective).not.toContain("task:create");
      expect(effective).not.toContain("task:edit_title_description");
      expect(effective).not.toContain("task:comment");

      // Only read-only capabilities present in both survive
      expect(effective).toContain("task:read");
      expect(effective).toContain("task:watch");
      expect(effective).toContain("workspace:read_metadata");
    });
  });

  describe("B. Delegation Grant Ceiling: granted_caps ⊆ actor_caps", () => {
    it("permits role delegation when requested capabilities are a subset of actor capabilities", () => {
      const result = validateGrantCeiling(coordCaps, [
        "task:read",
        "task:create",
        "task:comment",
      ]);
      expect(result.valid).toBe(true);
      expect(result.unauthorizedCapabilities).toEqual([]);
    });

    it("rejects role delegation when requested capabilities exceed actor capabilities", () => {
      // Coordinator attempts to create a role with audit:export and workspace:update_settings
      const result = validateGrantCeiling(coordCaps, [
        "task:read",
        "audit:export",
        "workspace:update_settings",
      ]);
      expect(result.valid).toBe(false);
      expect(result.unauthorizedCapabilities).toEqual([
        "audit:export",
        "workspace:update_settings",
      ]);
    });

    it("fails closed if actor capabilities are absent", () => {
      const result = validateGrantCeiling(null, ["task:read"]);
      expect(result.valid).toBe(false);
      expect(result.unauthorizedCapabilities).toEqual(["task:read"]);
    });
  });

  describe("C. Audit Export HTTP Integration Boundary & Privilege Escalation Defenses", () => {
    const communityId = "018f98a2-3f12-7890-b123-456789abcdef";
    const ownerWorkspaceId = "018f98a2-3f12-7890-w002-456789abcdef"; // Workspace where caller is OWNER
    const coordWorkspaceId = "018f98a2-3f12-7890-w003-456789abcdef"; // Workspace where caller is COORDINATOR

    it("allows Owner to export audit events without preview role", async () => {
      const response = await api.post<string>(
        `/communities/${communityId}/workspaces/${ownerWorkspaceId}/audit-events/export`,
        { format: "CSV", filters: {} }
      );
      expect(response).toBeDefined();
      expect(typeof response).toBe("string");
      expect(response).toContain("Sequence");
      expect(response).toContain("Event Type");
    });

    it("blocks Owner from exporting audit events when previewing Coordinator (audit:export stripped)", async () => {
      await expect(
        api.post<any>(
          `/communities/${communityId}/workspaces/${ownerWorkspaceId}/audit-events/export`,
          { format: "CSV", filters: {} },
          { previewRoleId: mockCoordinatorRole.id }
        )
      ).rejects.toMatchObject({
        status: 403,
        code: "FORBIDDEN",
        detail: expect.stringContaining("audit:export"),
      });
    });

    it("blocks Coordinator from exporting audit events (lacks audit:export)", async () => {
      await expect(
        api.post<any>(
          `/communities/${communityId}/workspaces/${coordWorkspaceId}/audit-events/export`,
          { format: "CSV", filters: {} }
        )
      ).rejects.toMatchObject({
        status: 403,
        code: "FORBIDDEN",
        detail: expect.stringContaining("audit:export"),
      });
    });

    it("strictly prevents Coordinator from acquiring audit:export by spoofing/passing previewRoleId: Owner", async () => {
      // Coordinator attempts privilege escalation by setting preview to OWNER
      // Server enforces intersection: coordCaps ∩ ownerCaps does NOT include audit:export!
      await expect(
        api.post<any>(
          `/communities/${communityId}/workspaces/${coordWorkspaceId}/audit-events/export`,
          { format: "CSV", filters: {} },
          { previewRoleId: mockOwnerRole.id }
        )
      ).rejects.toMatchObject({
        status: 403,
        code: "FORBIDDEN",
        detail: expect.stringContaining("audit:export"),
      });
    });

    it("allows Coordinator previewing Owner to read audit events because both possess audit:read", async () => {
      const response = await api.get<any>(
        `/communities/${communityId}/workspaces/${coordWorkspaceId}/audit-events?limit=5`,
        { previewRoleId: mockOwnerRole.id }
      );
      expect(response).toBeDefined();
      expect(response.items).toBeDefined();
    });

    it("rejects audit requests with invalid/unknown preview role IDs (fails closed)", async () => {
      await expect(
        api.get<any>(
          `/communities/${communityId}/workspaces/${ownerWorkspaceId}/audit-events`,
          { previewRoleId: "completely-invalid-role-id-0000" }
        )
      ).rejects.toMatchObject({
        status: 403,
        code: "FORBIDDEN",
      });
    });

    it("rejects audit requests across non-existent workspace/community boundaries", async () => {
      await expect(
        api.get<any>(
          `/communities/${communityId}/workspaces/non-existent-workspace-uuid/audit-events`
        )
      ).rejects.toMatchObject({
        status: 404,
        code: "RESOURCE_NOT_FOUND",
      });
    });
  });

  describe("D. Preview Mode Mutation Protection & Role Preview Endpoint", () => {
    const communityId = "018f98a2-3f12-7890-b123-456789abcdef";
    const ownerWorkspaceId = "018f98a2-3f12-7890-w002-456789abcdef";
    const coordWorkspaceId = "018f98a2-3f12-7890-w003-456789abcdef";

    it("strictly blocks state mutation requests during active role preview with 403 PREVIEW_MODE_READ_ONLY", async () => {
      await expect(
        api.patch<any>(
          `/communities/${communityId}/workspaces/${ownerWorkspaceId}`,
          { name: "Attempted Malicious Rename" },
          { previewRoleId: mockCoordinatorRole.id }
        )
      ).rejects.toMatchObject({
        status: 403,
        code: "PREVIEW_MODE_READ_ONLY",
      });
    });

    it("POST /role-preview computes downward-only intersection for Owner caller", async () => {
      const response = await api.post<any>(
        `/communities/${communityId}/workspaces/${ownerWorkspaceId}/role-preview`,
        { roleId: mockCoordinatorRole.id }
      );

      expect(response).toBeDefined();
      expect(response.roleId).toBe(mockCoordinatorRole.id);
      expect(response.roleName).toBe("Coordinator");
      expect(response.previewOnly).toBe(true);

      // Downward-only: capabilities in response must be intersection with Owner (equals Coordinator capabilities)
      expect(response.capabilities).toEqual(mockCoordinatorRole.capabilities);
      expect(response.capabilities).not.toContain("audit:export");
      expect(response.capabilities).not.toContain("workspace:update_settings");
    });

    it("POST /role-preview rejects non-Owner caller with 403 INSUFFICIENT_CAPABILITY", async () => {
      // Coordinator attempts to execute role administration /role-preview endpoint
      await expect(
        api.post<any>(
          `/communities/${communityId}/workspaces/${coordWorkspaceId}/role-preview`,
          { roleId: mockMemberRole.id }
        )
      ).rejects.toMatchObject({
        status: 403,
        code: "INSUFFICIENT_CAPABILITY",
      });
    });

    it("POST /role-preview rejects invalid roleId with 404 RESOURCE_NOT_FOUND", async () => {
      await expect(
        api.post<any>(
          `/communities/${communityId}/workspaces/${ownerWorkspaceId}/role-preview`,
          { roleId: "018f98a2-3f12-7890-role-nonexistent-999" }
        )
      ).rejects.toMatchObject({
        status: 404,
        code: "RESOURCE_NOT_FOUND",
      });
    });
  });
});
