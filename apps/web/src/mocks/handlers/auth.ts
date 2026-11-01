/**
 * Development Mock Handlers — Authentication & Context Probes
 * 
 * Note: These handlers provide contract-shaped development scaffolding.
 * They do not perform real authentication, password verification, or token issuance.
 */
import { http, HttpResponse } from "msw";
import type { ApiSchema } from "@sonder/contracts";

export const mockUser: ApiSchema<"MeContextDto">["user"] = {
  id: "018f98a2-3f12-7890-a123-456789abcdef",
  displayName: "Alex Morgan",
  email: "alex.morgan@example.org",
  avatarUrl: null,
};

export const mockCommunities: ApiSchema<"MeContextDto">["communities"] = [
  {
    communityId: "018f98a2-3f12-7890-b123-456789abcdef",
    name: "Sonder Community",
    membershipStatus: "ACTIVE",
    isCommunityAdmin: true,
    isDefaultCoordinator: false,
    joinedAt: "2026-10-01T12:00:00Z",
  },
];

export const authHandlers = [
  // GET /api/v1/me
  http.get("/api/v1/me", () => {
    const meResponse: ApiSchema<"MeContextDto"> = {
      user: mockUser,
      communities: mockCommunities,
    };
    return HttpResponse.json(meResponse, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  }),

  // POST /api/v1/auth/login
  http.post("/api/v1/auth/login", async ({ request }) => {
    const body = (await request.json()) as ApiSchema<"LoginRequest">;

    if (!body.email || !body.password) {
      const problem: ApiSchema<"ProblemDetails"> = {
        type: "https://errors.sonder.platform/validation-error",
        title: "Validation Error",
        status: 400,
        detail: "Email and password are required.",
        code: "VALIDATION_FAILED",
      };
      return HttpResponse.json(problem, { status: 400 });
    }

    const session: ApiSchema<"SessionDto"> = {
      userId: mockUser.id,
      expiresAt: "2026-12-01T12:00:00Z",
      csrfToken: "mock-csrf-token-xyz-123",
    };

    return HttpResponse.json(session, {
      status: 200,
      headers: {
        "Set-Cookie": "__Host-session=mock-opaque-session; Path=/; Secure; HttpOnly; SameSite=Lax",
        "Cache-Control": "private, no-store",
      },
    });
  }),

  // POST /api/v1/auth/logout
  http.post("/api/v1/auth/logout", () => {
    return new HttpResponse(null, {
      status: 204,
      headers: {
        "Set-Cookie": "__Host-session=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0",
        "Cache-Control": "private, no-store",
      },
    });
  }),
];
