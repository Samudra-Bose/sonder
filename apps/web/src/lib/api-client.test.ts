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
      const passedInit = fetchSpy.mock.calls[0][1];
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
      const passedHeaders = new Headers(fetchSpy.mock.calls[0][1]?.headers);
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
});
