import { http, HttpResponse, delay } from "msw";
import type { ApiSchema } from "@sonder/contracts";
import {
  mockWorkspacesByCommunityId,
  mockWorkspacesCommunity1,
} from "../data/workspaces";
import type {
  WorkspaceListDto,
  ActiveCommunityDto,
  SetActiveCommunityRequest,
} from "@/modules/workspace/types";

// State toggles for test scenarios
let workspacesDelayMs = 0;
let workspacesError: { status: number; problem: ApiSchema<"Problem"> } | null = null;
let activeCommunityError: { status: number; problem: ApiSchema<"Problem"> } | null = null;
let activeCommunityId: string = "018f98a2-3f12-7890-b123-456789abcdef";

export function setMockWorkspacesDelay(ms: number): void {
  workspacesDelayMs = ms;
}

export function setMockWorkspacesError(
  error: { status: number; problem: ApiSchema<"Problem"> } | null
): void {
  workspacesError = error;
}

export function setMockActiveCommunityError(
  error: { status: number; problem: ApiSchema<"Problem"> } | null
): void {
  activeCommunityError = error;
}

export function resetWorkspaceMockState(): void {
  workspacesDelayMs = 0;
  workspacesError = null;
  activeCommunityError = null;
  activeCommunityId = "018f98a2-3f12-7890-b123-456789abcdef";
}

export function getMockActiveCommunityId(): string {
  return activeCommunityId;
}

export const workspaceHandlers = [
  // GET /api/v1/communities/:communityId/workspaces
  http.get("/api/v1/communities/:communityId/workspaces", async ({ params }) => {
    if (workspacesDelayMs > 0) {
      await delay(workspacesDelayMs);
    }

    if (workspacesError) {
      return HttpResponse.json(workspacesError.problem, {
        status: workspacesError.status,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    const { communityId } = params;
    const cid = Array.isArray(communityId) ? communityId[0] : communityId;

    // Default to Community 1 fixtures if unspecified or known ID
    const workspaces = cid && mockWorkspacesByCommunityId[cid]
      ? mockWorkspacesByCommunityId[cid]
      : mockWorkspacesCommunity1;

    const responseDto: WorkspaceListDto = {
      items: workspaces,
      nextCursor: null,
    };

    return HttpResponse.json(responseDto, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-cache",
      },
    });
  }),

  // PUT /api/v1/me/active-community
  http.put("/api/v1/me/active-community", async ({ request }) => {
    const csrfToken = request.headers.get("X-CSRF-Token");
    const mutationId = request.headers.get("X-Mutation-Id");

    if (!csrfToken || csrfToken.trim() === "") {
      const problem: ApiSchema<"Problem"> = {
        type: "https://errors.sonder.platform/csrf-error",
        title: "CSRF Token Required",
        status: 400,
        detail: "A valid CSRF synchronizer token is required for mutating requests.",
        code: "CSRF_TOKEN_REQUIRED",
      };
      return HttpResponse.json(problem, {
        status: 400,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    if (!mutationId || mutationId.trim() === "") {
      const problem: ApiSchema<"Problem"> = {
        type: "https://errors.sonder.platform/idempotency-error",
        title: "Mutation ID Required",
        status: 400,
        detail: "Missing required X-Mutation-Id idempotency key.",
        code: "MUTATION_ID_REQUIRED",
      };
      return HttpResponse.json(problem, {
        status: 400,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    if (activeCommunityError) {
      return HttpResponse.json(activeCommunityError.problem, {
        status: activeCommunityError.status,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    let body: SetActiveCommunityRequest;
    try {
      body = (await request.json()) as SetActiveCommunityRequest;
    } catch {
      const problem: ApiSchema<"Problem"> = {
        type: "https://errors.sonder.platform/bad-request",
        title: "Invalid Request Body",
        status: 400,
        detail: "Malformed JSON payload.",
        code: "INVALID_JSON",
      };
      return HttpResponse.json(problem, {
        status: 400,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    if (!body?.communityId) {
      const problem: ApiSchema<"Problem"> = {
        type: "https://errors.sonder.platform/validation-error",
        title: "Validation Error",
        status: 400,
        detail: "communityId is required.",
        code: "VALIDATION_FAILED",
      };
      return HttpResponse.json(problem, {
        status: 400,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    activeCommunityId = body.communityId;

    const responseDto: ActiveCommunityDto = {
      activeCommunityId: body.communityId,
    };

    return HttpResponse.json(responseDto, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }),
];
