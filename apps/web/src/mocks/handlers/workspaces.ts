import { http, HttpResponse, delay } from "msw";
import type { ApiSchema } from "@sonder/contracts";
import { generateUuidV7 } from "@/lib/uuid";
import {
  mockWorkspacesByCommunityId,
  mockWorkspacesCommunity1,
  mockWorkspaceTemplates,
} from "../data/workspaces";
import type {
  WorkspaceDto,
  WorkspaceListDto,
  ActiveCommunityDto,
  SetActiveCommunityRequest,
  WorkspaceTemplateListDto,
  CreateWorkspaceRequest,
} from "@/modules/workspace/types";

// State toggles for test scenarios
let workspacesDelayMs = 0;
let workspacesError: { status: number; problem: ApiSchema<"Problem"> } | null = null;
let activeCommunityError: { status: number; problem: ApiSchema<"Problem"> } | null = null;
let templatesDelayMs = 0;
let templatesError: { status: number; problem: ApiSchema<"Problem"> } | null = null;
let createWorkspaceError: { status: number; problem: ApiSchema<"Problem"> } | null = null;
let activeCommunityId: string = "018f98a2-3f12-7890-b123-456789abcdef";

export function setMockWorkspacesDelay(ms: number): void {
  workspacesDelayMs = ms;
}

export function setMockWorkspacesError(
  error: { status: number; problem: ApiSchema<"Problem"> } | null
): void {
  workspacesError = error;
}

export function setMockTemplatesDelay(ms: number): void {
  templatesDelayMs = ms;
}

export function setMockTemplatesError(
  error: { status: number; problem: ApiSchema<"Problem"> } | null
): void {
  templatesError = error;
}

export function setMockCreateWorkspaceError(
  error: { status: number; problem: ApiSchema<"Problem"> } | null
): void {
  createWorkspaceError = error;
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
  templatesDelayMs = 0;
  templatesError = null;
  createWorkspaceError = null;
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

  // GET /api/v1/communities/:communityId/workspace-templates
  http.get("/api/v1/communities/:communityId/workspace-templates", async () => {
    if (templatesDelayMs > 0) {
      await delay(templatesDelayMs);
    }

    if (templatesError) {
      return HttpResponse.json(templatesError.problem, {
        status: templatesError.status,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    const responseDto: WorkspaceTemplateListDto = {
      items: mockWorkspaceTemplates,
    };

    return HttpResponse.json(responseDto, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-cache",
        "Content-Type": "application/json",
      },
    });
  }),

  // POST /api/v1/communities/:communityId/workspaces
  http.post("/api/v1/communities/:communityId/workspaces", async ({ params, request }) => {
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

    if (createWorkspaceError) {
      return HttpResponse.json(createWorkspaceError.problem, {
        status: createWorkspaceError.status,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    let body: CreateWorkspaceRequest;
    try {
      body = (await request.json()) as CreateWorkspaceRequest;
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

    if (!body?.name || body.name.trim().length === 0 || body.name.length > 120) {
      const problem: ApiSchema<"Problem"> = {
        type: "https://errors.sonder.platform/validation-error",
        title: "Validation Error",
        status: 400,
        detail: "Workspace name is required and must be between 1 and 120 characters.",
        code: "VALIDATION_FAILED",
      };
      return HttpResponse.json(problem, {
        status: 400,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    if (body.keyPrefix && !/^[A-Z][A-Z0-9]{1,9}$/.test(body.keyPrefix)) {
      const problem: ApiSchema<"Problem"> = {
        type: "https://errors.sonder.platform/validation-error",
        title: "Validation Error",
        status: 400,
        detail: "keyPrefix must match ^[A-Z][A-Z0-9]{1,9}$.",
        code: "INVALID_KEY_PREFIX",
      };
      return HttpResponse.json(problem, {
        status: 400,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    const { communityId } = params;
    const cid = (Array.isArray(communityId) ? communityId[0] : communityId) ?? "018f98a2-3f12-7890-b123-456789abcdef";

    const newPrefix =
      body.keyPrefix ||
      body.name
        .trim()
        .slice(0, 4)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "") ||
      "WS";

    const newWorkspace: WorkspaceDto = {
      id: generateUuidV7(),
      communityId: cid,
      name: body.name.trim(),
      kind: body.kind ?? "SHARED",
      keyPrefix: newPrefix,
      ownerIds: ["018f98a2-3f12-7890-a123-456789abcdef"],
      myRole: "OWNER",
      taskEditPolicy: "CREATOR_COORDINATOR_STRICT",
      personalWorkspaceAdminPolicy: "AUDITED_BREAK_GLASS",
      coordinatorCanInviteMembers: true,
      maxSubtaskDepth: body.maxSubtaskDepth ?? 1,
      assigneeEditableFieldGroupsAllowed: [],
      assigneeEditableFieldGroupsDefault: [],
      appliedTemplateKey: body.templateKey ?? "GENERAL_PURPOSE",
      appliedTemplateVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archivedAt: null,
    };

    if (!mockWorkspacesByCommunityId[cid]) {
      mockWorkspacesByCommunityId[cid] = [];
    }
    mockWorkspacesByCommunityId[cid].push(newWorkspace);

    return HttpResponse.json(newWorkspace, {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "X-Workspace-Seq": "1",
      },
    });
  }),

  // GET /api/v1/communities/:communityId/workspaces/:workspaceId
  http.get("/api/v1/communities/:communityId/workspaces/:workspaceId", async ({ params }) => {
    if (workspacesDelayMs > 0) {
      await delay(workspacesDelayMs);
    }

    if (workspacesError) {
      return HttpResponse.json(workspacesError.problem, {
        status: workspacesError.status,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    const { communityId, workspaceId } = params as { communityId: string; workspaceId: string };
    const workspaces = mockWorkspacesByCommunityId[communityId] || mockWorkspacesCommunity1;
    const ws = workspaces.find((w) => w.id === workspaceId);

    if (!ws) {
      return HttpResponse.json(
        {
          type: "https://errors.sonder.platform/not-found",
          title: "Not Found",
          status: 404,
          detail: `Workspace '${workspaceId}' not found.`,
          code: "RESOURCE_NOT_FOUND",
        },
        { status: 404, headers: { "Content-Type": "application/problem+json" } }
      );
    }

    return HttpResponse.json(ws, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  }),

  // PATCH /api/v1/communities/:communityId/workspaces/:workspaceId
  http.patch("/api/v1/communities/:communityId/workspaces/:workspaceId", async ({ params, request }) => {
    if (workspacesDelayMs > 0) {
      await delay(workspacesDelayMs);
    }

    const csrfToken = request.headers.get("X-CSRF-Token");
    if (!csrfToken || !csrfToken.trim()) {
      return HttpResponse.json(
        {
          type: "https://errors.sonder.platform/csrf-error",
          title: "CSRF Token Required",
          status: 400,
          detail: "A valid CSRF synchronizer token is required.",
          code: "CSRF_TOKEN_REQUIRED",
        },
        { status: 400, headers: { "Content-Type": "application/problem+json" } }
      );
    }

    const { communityId, workspaceId } = params as { communityId: string; workspaceId: string };
    const workspaces = mockWorkspacesByCommunityId[communityId] || mockWorkspacesCommunity1;
    const ws = workspaces.find((w) => w.id === workspaceId);

    if (!ws) {
      return HttpResponse.json(
        {
          type: "https://errors.sonder.platform/not-found",
          title: "Not Found",
          status: 404,
          detail: `Workspace '${workspaceId}' not found.`,
          code: "RESOURCE_NOT_FOUND",
        },
        { status: 404, headers: { "Content-Type": "application/problem+json" } }
      );
    }

    // Permission check: only active Workspace Owner may update settings
    if (ws.myRole !== "OWNER") {
      return HttpResponse.json(
        {
          type: "https://errors.sonder.platform/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Only an active Workspace Owner may update workspace settings.",
          code: "INSUFFICIENT_CAPABILITY",
        },
        { status: 403, headers: { "Content-Type": "application/problem+json" } }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        {
          type: "https://errors.sonder.platform/bad-request",
          title: "Bad Request",
          status: 400,
          detail: "Malformed JSON payload.",
          code: "INVALID_JSON",
        },
        { status: 400, headers: { "Content-Type": "application/problem+json" } }
      );
    }

    if (body.name !== undefined) {
      if (!body.name.trim() || body.name.length > 120) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/validation-error",
            title: "Validation Error",
            status: 400,
            detail: "Workspace name must be between 1 and 120 characters.",
            code: "VALIDATION_FAILED",
          },
          { status: 400, headers: { "Content-Type": "application/problem+json" } }
        );
      }
      ws.name = body.name.trim();
    }

    if (body.keyPrefix !== undefined) {
      const prefixRegex = /^[A-Z][A-Z0-9]{1,9}$/;
      if (!prefixRegex.test(body.keyPrefix)) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/validation-error",
            title: "Validation Error",
            status: 400,
            detail: "keyPrefix must match ^[A-Z][A-Z0-9]{1,9}$.",
            code: "INVALID_KEY_PREFIX",
          },
          { status: 400, headers: { "Content-Type": "application/problem+json" } }
        );
      }
      ws.keyPrefix = body.keyPrefix.trim().toUpperCase();
    }

    if (body.taskEditPolicy !== undefined) {
      ws.taskEditPolicy = body.taskEditPolicy;
    }

    if (body.coordinatorCanInviteMembers !== undefined) {
      ws.coordinatorCanInviteMembers = Boolean(body.coordinatorCanInviteMembers);
    }

    if (body.maxSubtaskDepth !== undefined) {
      if (body.maxSubtaskDepth < 1 || body.maxSubtaskDepth > 2) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/validation-error",
            title: "Validation Error",
            status: 400,
            detail: "maxSubtaskDepth must be 1 or 2.",
            code: "VALIDATION_FAILED",
          },
          { status: 400, headers: { "Content-Type": "application/problem+json" } }
        );
      }
      ws.maxSubtaskDepth = body.maxSubtaskDepth;
    }

    if (body.assigneeEditableFieldGroupsAllowed !== undefined) {
      ws.assigneeEditableFieldGroupsAllowed = body.assigneeEditableFieldGroupsAllowed;
    }

    if (body.assigneeEditableFieldGroupsDefault !== undefined) {
      ws.assigneeEditableFieldGroupsDefault = body.assigneeEditableFieldGroupsDefault;
    }

    ws.updatedAt = new Date().toISOString();

    return HttpResponse.json(ws, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-store",
        "X-Workspace-Seq": "2",
      },
    });
  }),

  // GET /api/v1/communities/:communityId/workspaces/:workspaceId/members
  http.get("/api/v1/communities/:communityId/workspaces/:workspaceId/members", async ({ params }) => {
    const { workspaceId: _workspaceId } = params as { workspaceId: string };

    const mockMembers = [
      {
        user: {
          id: "018f98a2-3f12-7890-a123-456789abcdef",
          displayName: "Alex Morgan",
          email: "alex.morgan@example.org",
          avatarUrl: null,
        },
        roleId: "018f98a2-3f12-7890-role-owner-001",
        roleName: "Workspace Owner",
        roleSystemKey: "OWNER" as const,
        membershipStatus: "ACTIVE" as const,
        isDefaultCoordinator: false,
      },
      {
        user: {
          id: "018f98a2-3f12-7890-a123-456789bbcdef",
          displayName: "Jordan Lee",
          email: "jordan.lee@example.org",
          avatarUrl: null,
        },
        roleId: "018f98a2-3f12-7890-role-coord-002",
        roleName: "Coordinator",
        roleSystemKey: "COORDINATOR" as const,
        membershipStatus: "ACTIVE" as const,
        isDefaultCoordinator: true,
      },
      {
        user: {
          id: "018f98a2-3f12-7890-a123-456789cccdef",
          displayName: "Taylor Swift",
          email: "taylor.swift@example.org",
          avatarUrl: null,
        },
        roleId: "018f98a2-3f12-7890-role-member-003",
        roleName: "Member",
        roleSystemKey: "MEMBER" as const,
        membershipStatus: "ACTIVE" as const,
        isDefaultCoordinator: false,
      },
    ];

    return HttpResponse.json(
      { items: mockMembers, nextCursor: null },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
        },
      }
    );
  }),
];
