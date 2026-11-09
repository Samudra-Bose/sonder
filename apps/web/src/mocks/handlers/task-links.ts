import { http, HttpResponse } from "msw";
import type { ApiSchema } from "@sonder/contracts";
import { generateUuidV7 } from "../../lib/uuid.js";
import {
  getMockTaskLinks,
  setMockTaskLinks,
  type StoredTaskLink,
} from "../data/task-links.js";
import { getMockTasks } from "./tasks.js";
import type {
  TaskLinkDto,
  TaskLinkListDto,
  CreateTaskLinkRequest,
  TaskLinkType,
} from "@/modules/tasks/dependencies/types.js";

/**
 * Checks if adding a directed blocking edge from source to target introduces a cycle.
 */
function wouldCreateCycle(sourceId: string, targetId: string, links: StoredTaskLink[]): boolean {
  // Build adjacency list for all BLOCKS relationships: u -> v means u blocks v
  const adj = new Map<string, string[]>();

  const addEdge = (u: string, v: string) => {
    const list = adj.get(u) ?? [];
    list.push(v);
    adj.set(u, list);
  };

  for (const l of links) {
    if (l.type === "BLOCKS") {
      addEdge(l.sourceTaskId, l.targetTaskId);
    } else if (l.type === "IS_BLOCKED_BY") {
      addEdge(l.targetTaskId, l.sourceTaskId);
    }
  }

  // If we add sourceId -> targetId, a cycle exists if sourceId is already reachable from targetId
  const visited = new Set<string>();
  const queue = [targetId];
  visited.add(targetId);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === sourceId) {
      return true;
    }
    const neighbors = adj.get(curr) ?? [];
    for (const next of neighbors) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  return false;
}

export const taskLinkHandlers = [
  // GET /api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId/links
  http.get(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId/links",
    ({ params }) => {
      const { taskId, workspaceId } = params as {
        communityId: string;
        workspaceId: string;
        taskId: string;
      };

      const allLinks = getMockTaskLinks();
      const allTasks = getMockTasks();
      const tasksById = new Map(allTasks.map((t) => [t.id, t]));

      // Find links where taskId is either source or target in this workspace
      const relevantLinks = allLinks.filter(
        (l) => l.workspaceId === workspaceId && (l.sourceTaskId === taskId || l.targetTaskId === taskId)
      );

      const items: TaskLinkDto[] = relevantLinks.map((l) => {
        const isSource = l.sourceTaskId === taskId;
        const otherTaskId = isSource ? l.targetTaskId : l.sourceTaskId;

        // Determine link type from this task's perspective
        let effectiveType: TaskLinkType = l.type;
        if (!isSource) {
          if (l.type === "BLOCKS") {
            effectiveType = "IS_BLOCKED_BY";
          } else if (l.type === "IS_BLOCKED_BY") {
            effectiveType = "BLOCKS";
          }
        }

        const isRestricted = l.isTargetRestricted || !tasksById.has(otherTaskId);
        const otherTask = tasksById.get(otherTaskId);

        if (isRestricted || !otherTask) {
          return {
            id: l.id,
            sourceTaskId: taskId,
            targetTaskId: otherTaskId,
            type: effectiveType,
            createdAt: l.createdAt,
            targetAccessible: false,
            targetKey: null,
            targetTitle: null,
            targetStatusCategory: null,
          };
        }

        return {
          id: l.id,
          sourceTaskId: taskId,
          targetTaskId: otherTaskId,
          type: effectiveType,
          createdAt: l.createdAt,
          targetAccessible: true,
          targetKey: otherTask.taskKey,
          targetTitle: otherTask.title,
          targetStatusCategory: otherTask.statusCategory,
        };
      });

      const response: TaskLinkListDto = { items };
      return HttpResponse.json(response, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  ),

  // POST /api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId/links
  http.post(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId/links",
    async ({ request, params }) => {
      const { taskId, workspaceId } = params as {
        communityId: string;
        workspaceId: string;
        taskId: string;
      };

      // Header verification: CSRF Token
      const csrfToken = request.headers.get("X-CSRF-Token");
      if (!csrfToken || !csrfToken.trim()) {
        const problem: ApiSchema<"Problem"> = {
          type: "https://errors.sonder.platform/csrf-error",
          title: "CSRF Token Required",
          status: 400,
          detail: "A valid CSRF token is required for task link mutations.",
          code: "CSRF_TOKEN_REQUIRED",
        };
        return HttpResponse.json(problem, { status: 400 });
      }

      let body: CreateTaskLinkRequest;
      try {
        body = (await request.json()) as CreateTaskLinkRequest;
      } catch {
        const problem: ApiSchema<"Problem"> = {
          type: "https://errors.sonder.platform/invalid-json",
          title: "Invalid JSON",
          status: 400,
          detail: "The request body could not be parsed as JSON.",
          code: "INVALID_JSON",
        };
        return HttpResponse.json(problem, { status: 400 });
      }

      const { targetTaskId, type } = body;

      // 1. Check self-link
      if (taskId === targetTaskId) {
        const problem: ApiSchema<"Problem"> = {
          type: "https://errors.sonder.platform/self-link",
          title: "Self Link Prohibited",
          status: 422,
          detail: "A task cannot link to itself.",
          code: "SELF_LINK_NOT_ALLOWED",
        };
        return HttpResponse.json(problem, { status: 422 });
      }

      const allLinks = getMockTaskLinks();

      // 2. Check duplicate link
      const isDuplicate = allLinks.some(
        (l) =>
          l.workspaceId === workspaceId &&
          l.sourceTaskId === taskId &&
          l.targetTaskId === targetTaskId &&
          l.type === type
      );
      if (isDuplicate) {
        const problem: ApiSchema<"Problem"> = {
          type: "https://errors.sonder.platform/duplicate-link",
          title: "Duplicate Link",
          status: 409,
          detail: "A task relationship of this type already exists between these tasks.",
          code: "DUPLICATE_LINK",
        };
        return HttpResponse.json(problem, { status: 409 });
      }

      // 3. Check cycle detection for BLOCKS and IS_BLOCKED_BY
      if (type === "BLOCKS" && wouldCreateCycle(taskId, targetTaskId, allLinks)) {
        const problem: ApiSchema<"Problem"> = {
          type: "https://errors.sonder.platform/dependency-cycle",
          title: "Dependency Cycle Detected",
          status: 422,
          detail: "Creating this dependency would introduce a cycle in the task dependency graph.",
          code: "DEPENDENCY_CYCLE_DETECTED",
        };
        return HttpResponse.json(problem, { status: 422 });
      }

      if (type === "IS_BLOCKED_BY" && wouldCreateCycle(targetTaskId, taskId, allLinks)) {
        const problem: ApiSchema<"Problem"> = {
          type: "https://errors.sonder.platform/dependency-cycle",
          title: "Dependency Cycle Detected",
          status: 422,
          detail: "Creating this dependency would introduce a cycle in the task dependency graph.",
          code: "DEPENDENCY_CYCLE_DETECTED",
        };
        return HttpResponse.json(problem, { status: 422 });
      }

      // Create new link
      const newLinkId = generateUuidV7();
      const newLink: StoredTaskLink = {
        id: newLinkId,
        workspaceId,
        sourceTaskId: taskId,
        targetTaskId,
        type,
        createdAt: new Date().toISOString(),
      };

      setMockTaskLinks([...allLinks, newLink]);

      const allTasks = getMockTasks();
      const targetTask = allTasks.find((t) => t.id === targetTaskId);

      const createdDto: TaskLinkDto = {
        id: newLinkId,
        sourceTaskId: taskId,
        targetTaskId,
        type,
        createdAt: newLink.createdAt,
        targetAccessible: Boolean(targetTask),
        targetKey: targetTask?.taskKey ?? null,
        targetTitle: targetTask?.title ?? null,
        targetStatusCategory: targetTask?.statusCategory ?? null,
      };

      return HttpResponse.json(createdDto, {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Seq": "1",
        },
      });
    }
  ),

  // DELETE /api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId/links/:linkId
  http.delete(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId/links/:linkId",
    ({ request, params }) => {
      const { linkId } = params as {
        communityId: string;
        workspaceId: string;
        taskId: string;
        linkId: string;
      };

      // Header verification: CSRF Token
      const csrfToken = request.headers.get("X-CSRF-Token");
      if (!csrfToken || !csrfToken.trim()) {
        const problem: ApiSchema<"Problem"> = {
          type: "https://errors.sonder.platform/csrf-error",
          title: "CSRF Token Required",
          status: 400,
          detail: "A valid CSRF token is required for task link deletion.",
          code: "CSRF_TOKEN_REQUIRED",
        };
        return HttpResponse.json(problem, { status: 400 });
      }

      const allLinks = getMockTaskLinks();
      const existing = allLinks.find((l) => l.id === linkId);
      if (!existing) {
        const problem: ApiSchema<"Problem"> = {
          type: "https://errors.sonder.platform/not-found",
          title: "Task Link Not Found",
          status: 404,
          detail: `Task link with ID ${linkId} was not found.`,
          code: "RESOURCE_NOT_FOUND",
        };
        return HttpResponse.json(problem, { status: 404 });
      }

      setMockTaskLinks(allLinks.filter((l) => l.id !== linkId));

      return new HttpResponse(null, {
        status: 204,
        headers: {
          "X-Workspace-Seq": "1",
        },
      });
    }
  ),
];
