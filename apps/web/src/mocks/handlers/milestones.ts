import { http, HttpResponse } from "msw";
import type { ApiSchema } from "@sonder/contracts";
import { generateUuidV7 } from "../../lib/uuid.js";
import {
  getMockMilestones,
  setMockMilestones,
} from "../data/milestones.js";
import { clearMilestoneFromTasks } from "./tasks.js";
import type {
  MilestoneDto,
  MilestoneListDto,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
} from "@/modules/milestones/types.js";

export const milestoneHandlers = [
  // GET /api/v1/communities/:communityId/workspaces/:workspaceId/milestones
  http.get(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/milestones",
    ({ params }) => {
      const { workspaceId } = params as { communityId: string; workspaceId: string };
      const allMilestones = getMockMilestones();
      const workspaceMilestones = allMilestones.filter((m) => m.workspaceId === workspaceId);

      // Sort by targetDate ascending (nulls last)
      workspaceMilestones.sort((a, b) => {
        if (!a.targetDate && !b.targetDate) return 0;
        if (!a.targetDate) return 1;
        if (!b.targetDate) return -1;
        return a.targetDate.localeCompare(b.targetDate);
      });

      const response: MilestoneListDto = {
        items: workspaceMilestones,
      };

      return HttpResponse.json(response, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  ),

  // POST /api/v1/communities/:communityId/workspaces/:workspaceId/milestones
  http.post(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/milestones",
    async ({ request, params }) => {
      const { workspaceId } = params as { communityId: string; workspaceId: string };

      // Header verification: CSRF Token
      const csrfToken = request.headers.get("X-CSRF-Token");
      if (!csrfToken || !csrfToken.trim()) {
        const problem: ApiSchema<"Problem"> = {
          type: "https://errors.sonder.platform/csrf-error",
          title: "CSRF Token Required",
          status: 400,
          detail: "A valid CSRF token is required for milestone creation.",
          code: "CSRF_TOKEN_REQUIRED",
        };
        return HttpResponse.json(problem, {
          status: 400,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      // Header verification: Mutation ID
      const mutationId = request.headers.get("X-Mutation-Id");
      if (!mutationId || !mutationId.trim()) {
        const problem: ApiSchema<"Problem"> = {
          type: "https://errors.sonder.platform/validation-error",
          title: "Mutation ID Required",
          status: 400,
          detail: "A valid UUIDv7 X-Mutation-Id header is required.",
          code: "MUTATION_ID_REQUIRED",
        };
        return HttpResponse.json(problem, {
          status: 400,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      let body: CreateMilestoneRequest;
      try {
        body = (await request.json()) as CreateMilestoneRequest;
      } catch {
        const problem: ApiSchema<"Problem"> = {
          type: "https://errors.sonder.platform/bad-request",
          title: "Invalid JSON Body",
          status: 400,
          detail: "Request body could not be parsed as JSON.",
        };
        return HttpResponse.json(problem, {
          status: 400,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      if (!body.name || !body.name.trim()) {
        const problem: ApiSchema<"Problem"> = {
          type: "https://errors.sonder.platform/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Milestone name is required.",
          invalidParams: [
            { name: "name", reason: "Milestone name must not be blank." },
          ],
        };
        return HttpResponse.json(problem, {
          status: 400,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      const now = new Date().toISOString();
      const newMilestone: MilestoneDto = {
        id: generateUuidV7(),
        workspaceId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        targetDate: body.targetDate || null,
        createdAt: now,
        updatedAt: now,
      };

      const milestones = getMockMilestones();
      setMockMilestones([...milestones, newMilestone]);

      return HttpResponse.json(newMilestone, {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
  ),

  // PATCH /api/v1/communities/:communityId/workspaces/:workspaceId/milestones/:milestoneId
  http.patch(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/milestones/:milestoneId",
    async ({ request, params }) => {
      const { workspaceId, milestoneId } = params as {
        communityId: string;
        workspaceId: string;
        milestoneId: string;
      };

      const csrfToken = request.headers.get("X-CSRF-Token");
      if (!csrfToken || !csrfToken.trim()) {
        const problem: ApiSchema<"Problem"> = {
          type: "https://errors.sonder.platform/csrf-error",
          title: "CSRF Token Required",
          status: 400,
          detail: "A valid CSRF token is required for milestone modification.",
          code: "CSRF_TOKEN_REQUIRED",
        };
        return HttpResponse.json(problem, {
          status: 400,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      const mutationId = request.headers.get("X-Mutation-Id");
      if (!mutationId || !mutationId.trim()) {
        const problem: ApiSchema<"Problem"> = {
          type: "https://errors.sonder.platform/validation-error",
          title: "Mutation ID Required",
          status: 400,
          detail: "A valid UUIDv7 X-Mutation-Id header is required.",
          code: "MUTATION_ID_REQUIRED",
        };
        return HttpResponse.json(problem, {
          status: 400,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      const milestones = getMockMilestones();
      const index = milestones.findIndex(
        (m) => m.id === milestoneId && m.workspaceId === workspaceId
      );

      if (index === -1) {
        const problem: ApiSchema<"Problem"> = {
          type: "https://errors.sonder.platform/not-found",
          title: "Milestone Not Found",
          status: 404,
          detail: `Milestone ${milestoneId} was not found in workspace ${workspaceId}.`,
        };
        return HttpResponse.json(problem, {
          status: 404,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      let body: UpdateMilestoneRequest;
      try {
        body = (await request.json()) as UpdateMilestoneRequest;
      } catch {
        const problem: ApiSchema<"Problem"> = {
          type: "https://errors.sonder.platform/bad-request",
          title: "Invalid JSON Body",
          status: 400,
          detail: "Request body could not be parsed as JSON.",
        };
        return HttpResponse.json(problem, {
          status: 400,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      const existing = milestones[index]!;
      const updated: MilestoneDto = {
        ...existing,
        name: body.name !== undefined ? body.name.trim() : existing.name,
        description:
          body.description !== undefined
            ? body.description?.trim() || null
            : existing.description,
        targetDate:
          body.targetDate !== undefined ? body.targetDate : existing.targetDate,
        updatedAt: new Date().toISOString(),
      };

      const nextList = [...milestones];
      nextList[index] = updated;
      setMockMilestones(nextList);

      return HttpResponse.json(updated, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  ),

  // DELETE /api/v1/communities/:communityId/workspaces/:workspaceId/milestones/:milestoneId
  http.delete(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/milestones/:milestoneId",
    ({ request, params }) => {
      const { workspaceId, milestoneId } = params as {
        communityId: string;
        workspaceId: string;
        milestoneId: string;
      };

      const csrfToken = request.headers.get("X-CSRF-Token");
      if (!csrfToken || !csrfToken.trim()) {
        const problem: ApiSchema<"Problem"> = {
          type: "https://errors.sonder.platform/csrf-error",
          title: "CSRF Token Required",
          status: 400,
          detail: "A valid CSRF token is required for milestone deletion.",
          code: "CSRF_TOKEN_REQUIRED",
        };
        return HttpResponse.json(problem, {
          status: 400,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      const mutationId = request.headers.get("X-Mutation-Id");
      if (!mutationId || !mutationId.trim()) {
        const problem: ApiSchema<"Problem"> = {
          type: "https://errors.sonder.platform/validation-error",
          title: "Mutation ID Required",
          status: 400,
          detail: "A valid UUIDv7 X-Mutation-Id header is required.",
          code: "MUTATION_ID_REQUIRED",
        };
        return HttpResponse.json(problem, {
          status: 400,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      const milestones = getMockMilestones();
      const existing = milestones.find(
        (m) => m.id === milestoneId && m.workspaceId === workspaceId
      );

      if (!existing) {
        const problem: ApiSchema<"Problem"> = {
          type: "https://errors.sonder.platform/not-found",
          title: "Milestone Not Found",
          status: 404,
          detail: `Milestone ${milestoneId} was not found in workspace ${workspaceId}.`,
        };
        return HttpResponse.json(problem, {
          status: 404,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      // Delete milestone
      setMockMilestones(milestones.filter((m) => m.id !== milestoneId));

      // Clear milestoneId from any tasks referencing this milestone
      clearMilestoneFromTasks(milestoneId);

      return new HttpResponse(null, { status: 204 });
    }
  ),
];
