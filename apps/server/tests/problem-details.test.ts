import { describe, it, expect } from "vitest";
import {
  HttpProblemError,
  createBadRequestError,
  createUnauthorizedError,
  createForbiddenError,
  createNotFoundError,
  createUnprocessableError,
  createServiceUnavailableError,
} from "../src/errors/problem-details.js";

describe("RFC 9457 Problem Details Formatting", () => {
  it("formats HttpProblemError with required RFC 9457 fields", () => {
    const error = new HttpProblemError({
      status: 403,
      code: "INSUFFICIENT_CAPABILITY",
      title: "Forbidden",
      detail: "Caller lacks required capability 'workspace:administer_roles'.",
    });

    const payload = error.toPayload("/api/v1/workspaces/123/role-preview");
    expect(payload.status).toBe(403);
    expect(payload.title).toBe("Forbidden");
    expect(payload.code).toBe("INSUFFICIENT_CAPABILITY");
    expect(payload.detail).toContain("workspace:administer_roles");
    expect(payload.instance).toBe("/api/v1/workspaces/123/role-preview");
    expect(payload.type).toContain("insufficient_capability");
  });

  it("creates standard 400 Bad Request error", () => {
    const err = createBadRequestError("Missing CSRF token", "CSRF_TOKEN_INVALID");
    expect(err.status).toBe(400);
    expect(err.code).toBe("CSRF_TOKEN_INVALID");
    expect(err.title).toBe("Bad Request");
  });

  it("creates standard 401 Unauthorized error", () => {
    const err = createUnauthorizedError();
    expect(err.status).toBe(401);
    expect(err.code).toBe("AUTHENTICATION_REQUIRED");
    expect(err.title).toBe("Unauthorized");
  });

  it("creates standard 403 Forbidden error", () => {
    const err = createForbiddenError("State mutating requests forbidden", "PREVIEW_MODE_READ_ONLY");
    expect(err.status).toBe(403);
    expect(err.code).toBe("PREVIEW_MODE_READ_ONLY");
    expect(err.title).toBe("Forbidden");
  });

  it("creates standard 404 Not Found error", () => {
    const err = createNotFoundError("Role not found", "RESOURCE_NOT_FOUND");
    expect(err.status).toBe(404);
    expect(err.code).toBe("RESOURCE_NOT_FOUND");
    expect(err.title).toBe("Not Found");
  });

  it("creates standard 422 Unprocessable Content with invalidParams", () => {
    const err = createUnprocessableError("Validation failed", [
      { name: "roleId", reason: "roleId must be a valid UUID" },
    ]);
    expect(err.status).toBe(422);
    expect(err.invalidParams).toHaveLength(1);
    expect(err.invalidParams?.[0]?.name).toBe("roleId");
  });

  it("creates standard 503 Service Unavailable error", () => {
    const err = createServiceUnavailableError();
    expect(err.status).toBe(503);
    expect(err.code).toBe("SERVICE_UNAVAILABLE");
    expect(err.title).toBe("Service Unavailable");
  });
});
