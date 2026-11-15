import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { closeDbPool } from "../src/db/pool.js";

describe("Live Authorization Vertical Slice (Roles & Role Preview)", () => {
  let server: Server;
  let baseUrl: string;

  const communityId = "018f98a2-3f12-7890-b123-456789abcdef";
  const workspaceId = "018f98a2-3f12-7890-w002-456789abcdef";

  const ownerToken = "Bearer session:user=user-owner:admin=false:role=OWNER";
  const coordToken = "Bearer session:user=user-coord:admin=false:role=COORDINATOR";
  const memberToken = "Bearer session:user=user-member:admin=false:role=MEMBER";

  const ownerRoleId = "018f98a2-3f12-7890-role-owner-001";
  const coordRoleId = "018f98a2-3f12-7890-role-coord-002";
  const memberRoleId = "018f98a2-3f12-7890-role-membr-003";

  beforeAll(async () => {
    const config = loadConfig({
      PORT: "0",
    });
    server = createApp(config);
    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://localhost:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await closeDbPool();
  });

  describe("A. GET /api/v1/communities/:communityId/workspaces/:workspaceId/roles", () => {
    it("returns 200 with active workspace roles for authenticated Owner", async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/communities/${communityId}/workspaces/${workspaceId}/roles`,
        {
          headers: { Authorization: ownerToken },
        }
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/json");
      expect(res.headers.get("Cache-Control")).toBe("private, no-store");

      const body = await res.json();
      expect(body.items).toBeDefined();
      expect(body.items.length).toBeGreaterThanOrEqual(4);

      const keys = body.items.map((r: { systemKey: string }) => r.systemKey);
      expect(keys).toContain("OWNER");
      expect(keys).toContain("COORDINATOR");
      expect(keys).toContain("MEMBER");
      expect(keys).toContain("VIEWER");
    });

    it("returns 401 Problem Details when authentication token is missing", async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/communities/${communityId}/workspaces/${workspaceId}/roles`
      );

      expect(res.status).toBe(401);
      expect(res.headers.get("Content-Type")).toBe("application/problem+json");

      const problem = await res.json();
      expect(problem.status).toBe(401);
      expect(problem.code).toBe("AUTHENTICATION_REQUIRED");
      expect(problem.title).toBe("Unauthorized");
    });
  });

  describe("B. POST /api/v1/communities/:communityId/workspaces/:workspaceId/role-preview", () => {
    it("Scenario 1: Coordinator caller is blocked from invoking role-preview (lacks workspace:administer_roles)", async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/communities/${communityId}/workspaces/${workspaceId}/role-preview`,
        {
          method: "POST",
          headers: {
            Authorization: coordToken,
            "X-CSRF-Token": "valid-csrf-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roleId: ownerRoleId }),
        }
      );

      expect(res.status).toBe(403);
      expect(res.headers.get("Content-Type")).toBe("application/problem+json");

      const problem = await res.json();
      expect(problem.status).toBe(403);
      expect(problem.code).toBe("INSUFFICIENT_CAPABILITY");
      expect(problem.detail).toContain("workspace:administer_roles");
    });

    it("Scenario 2: Owner previews Coordinator -> Owner-only capabilities are strictly removed", async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/communities/${communityId}/workspaces/${workspaceId}/role-preview`,
        {
          method: "POST",
          headers: {
            Authorization: ownerToken,
            "X-CSRF-Token": "valid-csrf-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roleId: coordRoleId }),
        }
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("private, no-store");

      const preview = await res.json();
      expect(preview.roleId).toBe(coordRoleId);
      expect(preview.roleName).toBe("Coordinator");
      expect(preview.previewOnly).toBe(true);

      // Downward-only intersection: Owner capabilities ∩ Coordinator capabilities
      expect(preview.capabilities).toContain("task:read");
      expect(preview.capabilities).toContain("task:create");
      expect(preview.capabilities).toContain("audit:read");

      // Owner-only capabilities must be stripped!
      expect(preview.capabilities).not.toContain("audit:export");
      expect(preview.capabilities).not.toContain("workspace:update_settings");
      expect(preview.capabilities).not.toContain("workspace:administer_roles");
      expect(preview.capabilities).not.toContain("workspace:transfer_ownership");
      expect(preview.capabilities).not.toContain("task:delete_permanent");
    });

    it("Scenario 3: Owner previews Owner -> retains all shared capabilities", async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/communities/${communityId}/workspaces/${workspaceId}/role-preview`,
        {
          method: "POST",
          headers: {
            Authorization: ownerToken,
            "X-CSRF-Token": "valid-csrf-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roleId: ownerRoleId }),
        }
      );

      expect(res.status).toBe(200);
      const preview = await res.json();
      expect(preview.roleId).toBe(ownerRoleId);
      expect(preview.capabilities).toContain("audit:export");
      expect(preview.capabilities).toContain("workspace:administer_roles");
    });

    it("Scenario 4: Missing or invalid preview roleId -> fails closed with 404 Problem Details", async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/communities/${communityId}/workspaces/${workspaceId}/role-preview`,
        {
          method: "POST",
          headers: {
            Authorization: ownerToken,
            "X-CSRF-Token": "valid-csrf-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roleId: "018f98a2-3f12-7890-role-nonexistent-999" }),
        }
      );

      expect(res.status).toBe(404);
      expect(res.headers.get("Content-Type")).toBe("application/problem+json");

      const problem = await res.json();
      expect(problem.status).toBe(404);
      expect(problem.code).toBe("RESOURCE_NOT_FOUND");
    });

    it("Scenario 5: State-changing operations during role preview are strictly rejected with 403 PREVIEW_MODE_READ_ONLY", async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/communities/${communityId}/workspaces/${workspaceId}/roles`,
        {
          method: "POST",
          headers: {
            Authorization: ownerToken,
            "X-CSRF-Token": "valid-csrf-token",
            "X-Preview-Role-Id": coordRoleId,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: "Attempted State Mutation" }),
        }
      );

      expect(res.status).toBe(403);
      expect(res.headers.get("Content-Type")).toBe("application/problem+json");

      const problem = await res.json();
      expect(problem.status).toBe(403);
      expect(problem.code).toBe("PREVIEW_MODE_READ_ONLY");
      expect(problem.detail).toMatch(/Mutating requests are forbidden while role preview simulation is active/i);
    });

    it("rejects role-preview request missing X-CSRF-Token header with 400 Problem Details", async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/communities/${communityId}/workspaces/${workspaceId}/role-preview`,
        {
          method: "POST",
          headers: {
            Authorization: ownerToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roleId: coordRoleId }),
        }
      );

      expect(res.status).toBe(400);
      const problem = await res.json();
      expect(problem.code).toBe("CSRF_TOKEN_INVALID");
    });

    it("rejects role-preview request with empty payload with 422 Problem Details", async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/communities/${communityId}/workspaces/${workspaceId}/role-preview`,
        {
          method: "POST",
          headers: {
            Authorization: ownerToken,
            "X-CSRF-Token": "valid-csrf-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      expect(res.status).toBe(422);
      const problem = await res.json();
      expect(problem.status).toBe(422);
      expect(problem.invalidParams).toHaveLength(1);
    });
  });
});
