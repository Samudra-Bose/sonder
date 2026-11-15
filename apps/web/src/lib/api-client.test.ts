import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiRequest, ApiProblemError } from "./api-client.js";

describe("api-client hardening and security invariants", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Credentials Invariant", () => {
    it("strictly enforces credentials: 'include' and prevents caller override", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      // Caller attempts to pass credentials: "omit"
      await apiRequest("/test-endpoint", {
        credentials: "omit" as RequestCredentials,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const passedInit = fetchSpy.mock.calls[0]?.[1];
      expect(passedInit?.credentials).toBe("include");
    });
  });

  describe("Fail-closed CSRF Protection on Mutating Methods", () => {
    it("fails closed on POST when csrfToken is missing", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      await expect(
        apiRequest("/test-mutation", {
          method: "POST",
          body: JSON.stringify({ key: "val" }),
        })
      ).rejects.toThrow(ApiProblemError);

      await expect(
        apiRequest("/test-mutation", {
          method: "POST",
          body: JSON.stringify({ key: "val" }),
        })
      ).rejects.toMatchObject({
        status: 400,
        code: "CSRF_TOKEN_REQUIRED",
      });

      // Crucial: No network request should be dispatched
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("fails closed on POST when csrfToken is empty or whitespace", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      await expect(
        apiRequest("/test-mutation", {
          method: "POST",
          csrfToken: "   ",
        })
      ).rejects.toThrow(ApiProblemError);

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("fails closed on PUT, PATCH, and DELETE without csrfToken", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      for (const method of ["PUT", "PATCH", "DELETE"]) {
        await expect(
          apiRequest("/test-mutation", {
            method,
          })
        ).rejects.toMatchObject({
          status: 400,
          code: "CSRF_TOKEN_REQUIRED",
        });
      }

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("attaches X-CSRF-Token and X-Mutation-Id when csrfToken is supplied", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(null, { status: 204 })
      );

      await apiRequest("/test-mutation", {
        method: "POST",
        csrfToken: "valid-session-csrf-token",
        mutationId: "018f98a2-3f12-7890-a123-456789abcdef",
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const passedHeaders = new Headers(fetchSpy.mock.calls[0]?.[1]?.headers);
      expect(passedHeaders.get("X-CSRF-Token")).toBe("valid-session-csrf-token");
      expect(passedHeaders.get("X-Mutation-Id")).toBe("018f98a2-3f12-7890-a123-456789abcdef");
      expect(passedHeaders.get("Content-Type")).toBe("application/json");
    });
  });

  describe("RFC 7807 Problem Details Decoding", () => {
    it("decodes application/problem+json into ApiProblemError", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              type: "https://errors.sonder.platform/invalid-credentials",
              title: "Invalid Credentials",
              status: 401,
              detail: "Invalid email or password.",
              code: "INVALID_CREDENTIALS",
            }),
            {
              status: 401,
              headers: { "Content-Type": "application/problem+json" },
            }
          )
        )
      );

      await expect(apiRequest("/test-err")).rejects.toThrow(ApiProblemError);
      try {
        await apiRequest("/test-err");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiProblemError);
        const pErr = err as ApiProblemError;
        expect(pErr.status).toBe(401);
        expect(pErr.code).toBe("INVALID_CREDENTIALS");
        expect(pErr.detail).toBe("Invalid email or password.");
      }
    });
  });

  describe("Role Preview Mutation Protection & Explicit Non-Mutating Allowlist", () => {
    it("allows contract-defined non-mutating POST operations in role preview mode", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const allowedEndpoints = [
        "/communities/c1/workspaces/w1/tasks/query",
        "/communities/c1/my-work/query",
        "/communities/c1/workspaces/w1/audit-events/export",
        "/communities/c1/admin/audit-events/export",
        "/communities/c1/workspaces/w1/tasks/t1/move-preview",
        "/communities/c1/workspaces/w1/role-preview",
      ];

      for (const endpoint of allowedEndpoints) {
        await apiRequest(endpoint, {
          method: "POST",
          csrfToken: "valid-csrf-token",
          previewRoleId: "role-preview-123",
          body: JSON.stringify({}),
        });
      }

      expect(fetchSpy).toHaveBeenCalledTimes(allowedEndpoints.length);
      for (let i = 0; i < allowedEndpoints.length; i++) {
        const passedHeaders = new Headers(fetchSpy.mock.calls[i]?.[1]?.headers);
        expect(passedHeaders.get("X-Preview-Role-Id")).toBe("role-preview-123");
        expect(passedHeaders.get("X-CSRF-Token")).toBe("valid-csrf-token");
      }
    });

    it("strictly blocks state-changing POST routes containing 'export', 'query', or 'search' substrings in preview mode", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const mutatingSubstringEndpoints = [
        "/communities/c1/workspaces/w1/export-settings",
        "/communities/c1/workspaces/w1/tasks/query-presets",
        "/communities/c1/workspaces/w1/search-configuration",
        "/communities/c1/workspaces/w1/bulk-export-jobs",
        "/communities/c1/workspaces/w1/saved-views/query-builder/save",
      ];

      for (const endpoint of mutatingSubstringEndpoints) {
        await expect(
          apiRequest(endpoint, {
            method: "POST",
            csrfToken: "valid-csrf",
            previewRoleId: "role-viewer-sim",
            body: JSON.stringify({ name: "hack" }),
          })
        ).rejects.toMatchObject({
          status: 403,
          code: "PREVIEW_MODE_READ_ONLY",
        });
      }

      // No network request should have been dispatched
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("blocks standard mutating methods (PUT, PATCH, DELETE, and normal POST) in preview mode", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      // Mutating POST
      await expect(
        apiRequest("/communities/c1/workspaces/w1/tasks", {
          method: "POST",
          csrfToken: "valid-csrf",
          previewRoleId: "role-sim",
          body: JSON.stringify({ title: "New Task" }),
        })
      ).rejects.toMatchObject({
        status: 403,
        code: "PREVIEW_MODE_READ_ONLY",
      });

      // PUT
      await expect(
        apiRequest("/communities/c1/workspaces/w1/tasks/t1", {
          method: "PUT",
          csrfToken: "valid-csrf",
          previewRoleId: "role-sim",
        })
      ).rejects.toMatchObject({
        status: 403,
        code: "PREVIEW_MODE_READ_ONLY",
      });

      // PATCH
      await expect(
        apiRequest("/communities/c1/workspaces/w1/tasks/t1", {
          method: "PATCH",
          csrfToken: "valid-csrf",
          previewRoleId: "role-sim",
        })
      ).rejects.toMatchObject({
        status: 403,
        code: "PREVIEW_MODE_READ_ONLY",
      });

      // DELETE
      await expect(
        apiRequest("/communities/c1/workspaces/w1/tasks/t1", {
          method: "DELETE",
          csrfToken: "valid-csrf",
          previewRoleId: "role-sim",
        })
      ).rejects.toMatchObject({
        status: 403,
        code: "PREVIEW_MODE_READ_ONLY",
      });

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("API Base URL and Target Resolution", () => {
    it("targets /api/v1 prefix by default or absolute URL if endpoint starts with http", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ status: "ok" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      await apiRequest("/test-relative");
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/test-relative$/),
        expect.anything()
      );

      await apiRequest("http://127.0.0.1:3001/api/v1/test-absolute");
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://127.0.0.1:3001/api/v1/test-absolute",
        expect.anything()
      );
    });
  });
});
