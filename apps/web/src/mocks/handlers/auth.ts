/**
 * Development Mock Handlers — Authentication & Session Lifecycle
 *
 * Implements contract-accurate handlers strictly matching OpenAPI 0.3.20-draft:
 * - GET /api/v1/auth/csrf
 * - POST /api/v1/auth/register
 * - POST /api/v1/auth/login
 * - POST /api/v1/auth/logout
 * - GET /api/v1/me
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
  },
];

let isSessionActive = true;
let currentCsrfToken = "mock-preauth-csrf-token";

export function setMockSessionActive(active: boolean): void {
  isSessionActive = active;
}

export function resetAuthMockState(): void {
  isSessionActive = true;
  currentCsrfToken = "mock-preauth-csrf-token";
}

export const authHandlers = [
  // GET /api/v1/auth/csrf
  http.get("/api/v1/auth/csrf", () => {
    const dto: ApiSchema<"CsrfTokenDto"> = {
      csrfToken: isSessionActive ? "mock-session-csrf-token" : currentCsrfToken,
    };
    return HttpResponse.json(dto, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Set-Cookie": "__Host-auth-csrf=mock-csrf-cookie; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=600",
      },
    });
  }),

  // GET /api/v1/me
  http.get("/api/v1/me", () => {
    if (!isSessionActive) {
      const problem: ApiSchema<"Problem"> = {
        type: "https://errors.sonder.platform/unauthenticated",
        title: "Authentication Required",
        status: 401,
        detail: "Active session required.",
        code: "UNAUTHENTICATED",
      };
      return HttpResponse.json(problem, {
        status: 401,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

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

  // POST /api/v1/auth/register
  http.post("/api/v1/auth/register", async ({ request }) => {
    const mutationId = request.headers.get("X-Mutation-Id");
    const csrfToken = request.headers.get("X-CSRF-Token");

    if (!csrfToken || csrfToken === "invalid-csrf") {
      const problem: ApiSchema<"Problem"> = {
        type: "https://errors.sonder.platform/csrf-error",
        title: "CSRF Token Invalid",
        status: 400,
        detail: "Missing or invalid CSRF synchronizer token.",
        code: "CSRF_TOKEN_INVALID",
      };
      return HttpResponse.json(problem, {
        status: 400,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    if (!mutationId) {
      const problem: ApiSchema<"Problem"> = {
        type: "https://errors.sonder.platform/idempotency-error",
        title: "Mutation ID Required",
        status: 400,
        detail: "Missing X-Mutation-Id header.",
        code: "MUTATION_ID_REQUIRED",
      };
      return HttpResponse.json(problem, {
        status: 400,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    const body = (await request.json()) as Partial<ApiSchema<"RegisterRequest">>;

    if (!body?.email || !body?.password || !body?.displayName) {
      const problem: ApiSchema<"Problem"> = {
        type: "https://errors.sonder.platform/validation-error",
        title: "Validation Error",
        status: 400,
        detail: "Display name, email, and password are all required.",
        code: "VALIDATION_FAILED",
      };
      return HttpResponse.json(problem, {
        status: 400,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    if (body.password.length < 8) {
      const problem: ApiSchema<"Problem"> = {
        type: "https://errors.sonder.platform/validation-error",
        title: "Validation Error",
        status: 422,
        detail: "Password must be at least 8 characters long.",
        code: "PASSWORD_TOO_WEAK",
      };
      return HttpResponse.json(problem, {
        status: 422,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    const accepted: ApiSchema<"AuthActionAcceptedDto"> = {
      accepted: true,
      message: "If the request can be completed, instructions will be sent to the supplied address.",
    };

    return HttpResponse.json(accepted, {
      status: 202,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  }),

  // POST /api/v1/auth/login
  http.post("/api/v1/auth/login", async ({ request }) => {
    const mutationId = request.headers.get("X-Mutation-Id");
    const csrfToken = request.headers.get("X-CSRF-Token");

    if (!csrfToken || csrfToken === "invalid-csrf") {
      const problem: ApiSchema<"Problem"> = {
        type: "https://errors.sonder.platform/csrf-error",
        title: "CSRF Token Invalid",
        status: 400,
        detail: "Missing or invalid CSRF synchronizer token.",
        code: "CSRF_TOKEN_INVALID",
      };
      return HttpResponse.json(problem, {
        status: 400,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    if (!mutationId) {
      const problem: ApiSchema<"Problem"> = {
        type: "https://errors.sonder.platform/idempotency-error",
        title: "Mutation ID Required",
        status: 400,
        detail: "Missing X-Mutation-Id header.",
        code: "MUTATION_ID_REQUIRED",
      };
      return HttpResponse.json(problem, {
        status: 400,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    const body = (await request.json()) as Partial<ApiSchema<"LoginRequest">>;

    if (!body?.email || !body?.password) {
      const problem: ApiSchema<"Problem"> = {
        type: "https://errors.sonder.platform/validation-error",
        title: "Validation Error",
        status: 400,
        detail: "Email and password are required.",
        code: "VALIDATION_FAILED",
      };
      return HttpResponse.json(problem, {
        status: 400,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    if (body.email === "unverified@example.org") {
      const problem: ApiSchema<"Problem"> = {
        type: "https://errors.sonder.platform/email-verification-required",
        title: "Email Verification Required",
        status: 403,
        detail: "Please verify your email address before logging in.",
        code: "EMAIL_VERIFICATION_REQUIRED",
      };
      return HttpResponse.json(problem, {
        status: 403,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    if (body.password === "wrongpassword" || body.email === "unknown@example.org") {
      const problem: ApiSchema<"Problem"> = {
        type: "https://errors.sonder.platform/invalid-credentials",
        title: "Invalid Credentials",
        status: 401,
        detail: "Invalid email or password.",
        code: "INVALID_CREDENTIALS",
      };
      return HttpResponse.json(problem, {
        status: 401,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    isSessionActive = true;
    currentCsrfToken = "mock-session-csrf-token";

    const session: ApiSchema<"SessionDto"> = {
      userId: mockUser.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
      csrfToken: currentCsrfToken,
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
  http.post("/api/v1/auth/logout", ({ request }) => {
    const mutationId = request.headers.get("X-Mutation-Id");
    const csrfToken = request.headers.get("X-CSRF-Token");

    if (!csrfToken || csrfToken === "invalid-csrf") {
      const problem: ApiSchema<"Problem"> = {
        type: "https://errors.sonder.platform/csrf-error",
        title: "CSRF Token Invalid",
        status: 400,
        detail: "Missing or invalid CSRF token.",
        code: "CSRF_TOKEN_INVALID",
      };
      return HttpResponse.json(problem, {
        status: 400,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    if (!mutationId) {
      const problem: ApiSchema<"Problem"> = {
        type: "https://errors.sonder.platform/idempotency-error",
        title: "Mutation ID Required",
        status: 400,
        detail: "Missing X-Mutation-Id header.",
        code: "MUTATION_ID_REQUIRED",
      };
      return HttpResponse.json(problem, {
        status: 400,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    isSessionActive = false;
    currentCsrfToken = "mock-preauth-csrf-token";

    return new HttpResponse(null, {
      status: 204,
      headers: {
        "Set-Cookie": "__Host-session=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0",
        "Cache-Control": "private, no-store",
      },
    });
  }),
];
