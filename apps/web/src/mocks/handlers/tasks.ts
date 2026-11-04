import { http, HttpResponse, delay } from "msw";
import type { ApiSchema } from "@sonder/contracts";
import { generateUuidV7 } from "../../lib/uuid.js";
import {
  initialMockTasks,
  initialMockKeyAliases,
  makeTaskPermissions,
  makeTaskAssignments,
  type TaskDto,
  type TaskKeyResolutionDto,
  type CreateTaskRequest,
  type UpdateTaskRequest,
} from "../data/tasks.js";
import {
  MOCK_USER_ID,
  WS_PERSONAL_ALEX_ID,
  WS_SHARED_ENG_ID,
  WS_SHARED_GALA_ID,
} from "../data/my-work.js";
import { mockWorkspacesCommunity1 } from "../data/workspaces.js";

// In-memory mock task store mutable during tests
let currentMockTasks: TaskDto[] = JSON.parse(JSON.stringify(initialMockTasks));
let currentKeyAliases = { ...initialMockKeyAliases };

// Workspace sequence counters for monotonic key generation
const workspaceSeqCounters: Record<string, number> = {
  [WS_SHARED_ENG_ID]: 106,
  [WS_SHARED_GALA_ID]: 201,
  [WS_PERSONAL_ALEX_ID]: 2,
};

// Configurable delay and error overrides for tests
let tasksDelayMs = 0;
export interface MockTasksErrorOverride {
  status: number;
  problem: ApiSchema<"Problem">;
  method?: "GET" | "POST" | "PATCH" | "ALL";
}
let tasksErrorOverride: MockTasksErrorOverride | null = null;

export function setMockTasksDelay(ms: number): void {
  tasksDelayMs = ms;
}

export function setMockTasksError(error: MockTasksErrorOverride | null): void {
  tasksErrorOverride = error;
}

function matchesErrorOverride(method: "GET" | "POST" | "PATCH"): boolean {
  if (!tasksErrorOverride) return false;
  if (!tasksErrorOverride.method || tasksErrorOverride.method === "ALL") return true;
  return tasksErrorOverride.method === method;
}

export function getMockTasks(): TaskDto[] {
  return currentMockTasks;
}

export function resetTaskMockState(): void {
  currentMockTasks = JSON.parse(JSON.stringify(initialMockTasks));
  currentKeyAliases = { ...initialMockKeyAliases };
  workspaceSeqCounters[WS_SHARED_ENG_ID] = 106;
  workspaceSeqCounters[WS_SHARED_GALA_ID] = 201;
  workspaceSeqCounters[WS_PERSONAL_ALEX_ID] = 2;
  tasksDelayMs = 0;
  tasksErrorOverride = null;
}

/**
 * Simulates a concurrent update from another client or background job,
 * advancing the field revision so any subsequent patch using the previous revision
 * triggers HTTP 409 Concurrency Conflict.
 */
export function simulateConcurrentFieldUpdate(
  taskIdOrKey: string,
  field: string,
  newValue: unknown
): void {
  const task = currentMockTasks.find(
    (t) => t.id === taskIdOrKey || t.taskKey.toUpperCase() === taskIdOrKey.toUpperCase()
  );
  if (task) {
    (task as Record<string, unknown>)[field] = newValue;
    task.fieldRevisions[field] = (task.fieldRevisions[field] ?? 1) + 1;
    task.version += 1;
    task.updatedAt = new Date().toISOString();
  }
}

/**
 * Calculates current hierarchy depth for a task.
 * 0 = Root Task, 1 = Subtask, 2 = Nested Subtask
 */
function getTaskDepth(task: TaskDto, allTasks: TaskDto[]): number {
  if (!task.parentTaskId) return 0;
  const parent = allTasks.find((t) => t.id === task.parentTaskId);
  if (!parent) return 1;
  if (!parent.parentTaskId) return 1;
  return 2;
}

export const taskHandlers = [
  // 1. GET /api/v1/communities/:communityId/workspaces/:workspaceId/tasks/by-key/:taskKey
  http.get(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/tasks/by-key/:taskKey",
    async ({ params }) => {
      if (tasksDelayMs > 0) {
        await delay(tasksDelayMs);
      }

      if (matchesErrorOverride("GET")) {
        return HttpResponse.json(tasksErrorOverride!.problem, {
          status: tasksErrorOverride!.status,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      const { workspaceId, taskKey } = params as {
        communityId: string;
        workspaceId: string;
        taskKey: string;
      };

      // 1. Direct match in current workspace
      const directMatch = currentMockTasks.find(
        (t) => t.workspaceId === workspaceId && t.taskKey.toUpperCase() === taskKey.toUpperCase()
      );

      if (directMatch) {
        const resolution: TaskKeyResolutionDto = {
          taskId: directMatch.id,
          workspaceId: directMatch.workspaceId,
          requestedKey: taskKey,
          currentKey: directMatch.taskKey,
          resolvedFromAlias: false,
          lifecycleState: directMatch.archivedAt ? "ARCHIVED" : "ACTIVE",
          archivedAt: directMatch.archivedAt ?? null,
          recoverableUntil: null,
        };
        return HttpResponse.json(resolution, {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, no-store",
          },
        });
      }

      // 2. Check historical aliases
      const alias = currentKeyAliases[taskKey.toUpperCase()];
      if (alias) {
        // Find canonical task in its current workspace
        const destinationTask = currentMockTasks.find((t) => t.id === alias.taskId);
        if (destinationTask) {
          const resolution: TaskKeyResolutionDto = {
            taskId: destinationTask.id,
            workspaceId: destinationTask.workspaceId,
            requestedKey: taskKey,
            currentKey: destinationTask.taskKey,
            resolvedFromAlias: true,
            lifecycleState: destinationTask.archivedAt ? "ARCHIVED" : "ACTIVE",
            archivedAt: destinationTask.archivedAt ?? null,
            recoverableUntil: null,
          };
          return HttpResponse.json(resolution, {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "private, no-store",
            },
          });
        }
      }

      // Non-discovery invariant: return generic 404 for unknown or unauthorized keys
      return HttpResponse.json(
        {
          type: "https://errors.sonder.platform/not-found",
          title: "Resource Not Found",
          status: 404,
          detail: `Task key '${taskKey}' could not be found or is not accessible.`,
          code: "RESOURCE_NOT_FOUND",
        },
        {
          status: 404,
          headers: {
            "Content-Type": "application/problem+json",
            "Cache-Control": "private, no-store",
          },
        }
      );
    }
  ),

  // 2. GET /api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId
  http.get(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId",
    async ({ params }) => {
      if (tasksDelayMs > 0) {
        await delay(tasksDelayMs);
      }

      if (matchesErrorOverride("GET")) {
        return HttpResponse.json(tasksErrorOverride!.problem, {
          status: tasksErrorOverride!.status,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      const { workspaceId, taskId } = params as {
        communityId: string;
        workspaceId: string;
        taskId: string;
      };

      const task = currentMockTasks.find(
        (t) => t.id === taskId && t.workspaceId === workspaceId
      );

      if (!task) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/not-found",
            title: "Task Not Found",
            status: 404,
            detail: `Task '${taskId}' was not found in workspace '${workspaceId}'.`,
            code: "TASK_NOT_FOUND",
          },
          {
            status: 404,
            headers: {
              "Content-Type": "application/problem+json",
              "Cache-Control": "private, no-store",
            },
          }
        );
      }

      return HttpResponse.json(task, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
        },
      });
    }
  ),

  // 3. POST /api/v1/communities/:communityId/workspaces/:workspaceId/tasks
  http.post(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/tasks",
    async ({ request, params }) => {
      if (tasksDelayMs > 0) {
        await delay(tasksDelayMs);
      }

      if (matchesErrorOverride("POST")) {
        return HttpResponse.json(tasksErrorOverride!.problem, {
          status: tasksErrorOverride!.status,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      const { workspaceId } = params as {
        communityId: string;
        workspaceId: string;
      };

      // Header verification
      const csrfToken = request.headers.get("X-CSRF-Token");
      if (!csrfToken || !csrfToken.trim()) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/csrf-error",
            title: "CSRF Token Required",
            status: 400,
            detail: "A valid CSRF token is required for task creation.",
            code: "CSRF_TOKEN_REQUIRED",
          },
          {
            status: 400,
            headers: { "Content-Type": "application/problem+json" },
          }
        );
      }

      const mutationId = request.headers.get("X-Mutation-Id");
      if (!mutationId || !mutationId.trim()) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/missing-mutation-id",
            title: "Mutation ID Required",
            status: 400,
            detail: "A valid UUIDv7 X-Mutation-Id header is required for task creation.",
            code: "MUTATION_ID_REQUIRED",
          },
          {
            status: 400,
            headers: { "Content-Type": "application/problem+json" },
          }
        );
      }

      const body = (await request.json()) as CreateTaskRequest;

      // Validate title
      if (!body.title || !body.title.trim()) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/validation-error",
            title: "Validation Error",
            status: 422,
            detail: "Task title is required and cannot be empty.",
            code: "VALIDATION_FAILED",
          },
          {
            status: 422,
            headers: { "Content-Type": "application/problem+json" },
          }
        );
      }

      // Find workspace and its maxSubtaskDepth
      const workspace = mockWorkspacesCommunity1.find((w) => w.id === workspaceId);
      const maxSubtaskDepth = workspace?.maxSubtaskDepth ?? 1;

      // Subtask parent validation & depth limit checking
      if (body.parentTaskId) {
        const parent = currentMockTasks.find(
          (t) => t.id === body.parentTaskId && t.workspaceId === workspaceId
        );
        if (!parent) {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/parent-not-found",
              title: "Parent Task Not Found",
              status: 400,
              detail: `Parent task '${body.parentTaskId}' was not found in this workspace.`,
              code: "PARENT_TASK_NOT_FOUND",
            },
            {
              status: 400,
              headers: { "Content-Type": "application/problem+json" },
            }
          );
        }

        const parentDepth = getTaskDepth(parent, currentMockTasks);
        if (parentDepth >= maxSubtaskDepth) {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/subtask-depth-limit",
              title: "Subtask Depth Limit Exceeded",
              status: 400,
              detail: `Maximum subtask depth (${maxSubtaskDepth}) exceeded for this workspace.`,
              code: "SUBTASK_DEPTH_LIMIT",
            },
            {
              status: 400,
              headers: { "Content-Type": "application/problem+json" },
            }
          );
        }
      }

      // Generate monotonic sequence key
      const prefix = workspace?.keyPrefix ?? "TSK";
      const nextSeq = (workspaceSeqCounters[workspaceId] ?? 100) + 1;
      workspaceSeqCounters[workspaceId] = nextSeq;
      const taskKey = `${prefix}-${nextSeq}`;

      const now = new Date().toISOString();
      const newTaskId = generateUuidV7();

      const newTask: TaskDto = {
        id: newTaskId,
        workspaceId,
        parentTaskId: body.parentTaskId ?? null,
        taskKey,
        title: body.title.trim(),
        description: body.description ?? null,
        itemType: body.itemType ?? "TASK",
        statusCategory: body.statusCategory ?? "TODO",
        priority: body.priority ?? "NONE",
        assigneeIds: body.assigneeIds ?? [],
        creatorId: MOCK_USER_ID,
        startDate: body.startDate ?? null,
        dueDate: body.dueDate ?? null,
        estimatePoints: body.estimatePoints ?? null,
        labelIds: body.labelIds ?? [],
        milestoneId: body.milestoneId ?? null,
        rankKey: `0|hzzzzz${nextSeq}:`,
        version: 1,
        fieldRevisions: {
          title: 1,
          description: 1,
          statusCategory: 1,
          priority: 1,
          assigneeIds: 1,
          dueDate: 1,
          estimatePoints: 1,
          labelIds: 1,
        },
        effectivePermissions: makeTaskPermissions(true),
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
        assigneeAssignments: makeTaskAssignments(body.assigneeIds ?? [], MOCK_USER_ID, now),
        assigneeEditableFieldGroups: body.assigneeEditableFieldGroups ?? [],
        customFieldValues: {},
      };

      currentMockTasks.push(newTask);

      return HttpResponse.json(newTask, {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
          "X-Workspace-Seq": String(nextSeq),
        },
      });
    }
  ),

  // 4. PATCH /api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId
  http.patch(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId",
    async ({ request, params }) => {
      if (tasksDelayMs > 0) {
        await delay(tasksDelayMs);
      }

      if (matchesErrorOverride("PATCH")) {
        return HttpResponse.json(tasksErrorOverride!.problem, {
          status: tasksErrorOverride!.status,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      const { workspaceId, taskId } = params as {
        communityId: string;
        workspaceId: string;
        taskId: string;
      };

      // Header verification
      const csrfToken = request.headers.get("X-CSRF-Token");
      if (!csrfToken || !csrfToken.trim()) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/csrf-error",
            title: "CSRF Token Required",
            status: 400,
            detail: "A valid CSRF token is required for task updates.",
            code: "CSRF_TOKEN_REQUIRED",
          },
          {
            status: 400,
            headers: { "Content-Type": "application/problem+json" },
          }
        );
      }

      const mutationId = request.headers.get("X-Mutation-Id");
      if (!mutationId || !mutationId.trim()) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/missing-mutation-id",
            title: "Mutation ID Required",
            status: 400,
            detail: "A valid UUIDv7 X-Mutation-Id header is required for task updates.",
            code: "MUTATION_ID_REQUIRED",
          },
          {
            status: 400,
            headers: { "Content-Type": "application/problem+json" },
          }
        );
      }

      const task = currentMockTasks.find(
        (t) => t.id === taskId && t.workspaceId === workspaceId
      );

      if (!task) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/not-found",
            title: "Task Not Found",
            status: 404,
            detail: `Task '${taskId}' was not found.`,
            code: "TASK_NOT_FOUND",
          },
          {
            status: 404,
            headers: { "Content-Type": "application/problem+json" },
          }
        );
      }

      const body = (await request.json()) as UpdateTaskRequest;

      // Validate baseFieldRevisions required
      if (!body.baseFieldRevisions || Object.keys(body.baseFieldRevisions).length === 0) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/validation-error",
            title: "Validation Error",
            status: 400,
            detail: "baseFieldRevisions is required for optimistic concurrency.",
            code: "BASE_FIELD_REVISIONS_REQUIRED",
          },
          {
            status: 400,
            headers: { "Content-Type": "application/problem+json" },
          }
        );
      }

      // Validations: minLength 1 for title
      if (body.title !== undefined && (!body.title.trim() || body.title.length > 500)) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/validation-error",
            title: "Validation Error",
            status: 400,
            detail: "Title must be between 1 and 500 characters.",
            code: "VALIDATION_FAILED",
          },
          { status: 400, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      // Validation: estimatePoints non-negative
      if (body.estimatePoints !== null && body.estimatePoints !== undefined && body.estimatePoints < 0) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/validation-error",
            title: "Validation Error",
            status: 400,
            detail: "Estimate points must be a non-negative number.",
            code: "VALIDATION_FAILED",
          },
          { status: 400, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      // Permission checks: separately authorize every supplied field
      if (
        (body.title !== undefined || body.description !== undefined) &&
        task.effectivePermissions.canEditTitleDescription === false
      ) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/forbidden",
            title: "Permission Denied",
            status: 403,
            detail: "You do not have permission to edit title or description in this workspace.",
            code: "PERMISSION_DENIED",
          },
          { status: 403, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      if (body.statusCategory !== undefined && task.effectivePermissions.canUpdateStatus === false) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/forbidden",
            title: "Permission Denied",
            status: 403,
            detail: "You do not have permission to update task status in this workspace.",
            code: "PERMISSION_DENIED",
          },
          { status: 403, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      if (
        (body.priority !== undefined || body.startDate !== undefined || body.dueDate !== undefined) &&
        task.effectivePermissions.canEditDatesPriority === false
      ) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/forbidden",
            title: "Permission Denied",
            status: 403,
            detail: "You do not have permission to edit dates or priority in this workspace.",
            code: "PERMISSION_DENIED",
          },
          { status: 403, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      if (body.estimatePoints !== undefined && task.effectivePermissions.canEditEstimate === false) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/forbidden",
            title: "Permission Denied",
            status: 403,
            detail: "You do not have permission to edit estimate in this workspace.",
            code: "PERMISSION_DENIED",
          },
          { status: 403, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      if (body.assigneeIds !== undefined && task.effectivePermissions.canAssign === false) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/forbidden",
            title: "Permission Denied",
            status: 403,
            detail: "You do not have permission to modify task assignees in this workspace.",
            code: "PERMISSION_DENIED",
          },
          { status: 403, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      if (body.labelIds !== undefined && task.effectivePermissions.canEditCustomFieldsLinks === false) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/forbidden",
            title: "Permission Denied",
            status: 403,
            detail: "You do not have permission to modify labels in this workspace.",
            code: "PERMISSION_DENIED",
          },
          { status: 403, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      // Optimistic concurrency check via baseFieldRevisions
      const baseRevisions = body.baseFieldRevisions ?? {};
      const conflictingFields: string[] = [];

      // 1. Identify all fields being modified in this patch
      const editableFields = [
        "title",
        "description",
        "itemType",
        "statusCategory",
        "priority",
        "startDate",
        "dueDate",
        "estimatePoints",
        "assigneeIds",
        "labelIds",
        "milestoneId",
        "assigneeEditableFieldGroups",
      ] as const;

      const changedFields = editableFields.filter(
        (field) => (body as Record<string, unknown>)[field] !== undefined
      );

      // 2. Every changed field MUST have a matching base revision
      for (const field of changedFields) {
        const clientRev = baseRevisions[field];
        const serverRev = task.fieldRevisions[field] ?? 1;

        // If base revision is missing or doesn't match server revision exactly (stale or future), conflict
        if (clientRev === undefined || clientRev !== serverRev) {
          if (!conflictingFields.includes(field)) {
            conflictingFields.push(field);
          }
        }
      }

      // 3. Any additional field revision supplied in baseFieldRevisions must also match server revision
      for (const [field, clientRev] of Object.entries(baseRevisions)) {
        const serverRev = task.fieldRevisions[field] ?? 1;
        if (clientRev !== serverRev) {
          if (!conflictingFields.includes(field)) {
            conflictingFields.push(field);
          }
        }
      }

      if (conflictingFields.length > 0) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/task-concurrency-conflict",
            title: "Task Concurrency Conflict",
            status: 409,
            detail: `Field(s) '${conflictingFields.join(", ")}' have been modified concurrently or have invalid base revisions.`,
            code: "FIELD_REVISION_CONFLICT",
            conflictingFields,
            currentFieldRevisions: task.fieldRevisions,
            conflictDetails: conflictingFields.map((field) => ({
              fieldPath: field,
              clientValue: (body as Record<string, unknown>)[field] ?? null,
              serverValue: (task as Record<string, unknown>)[field] ?? null,
              baseRevision: baseRevisions[field] ?? 0,
              currentRevision: task.fieldRevisions[field] ?? 1,
            })),
          },
          {
            status: 409,
            headers: { "Content-Type": "application/problem+json" },
          }
        );
      }

      // Apply permitted field mutations
      if (body.title !== undefined) {
        task.title = body.title.trim();
        task.fieldRevisions.title = (task.fieldRevisions.title ?? 1) + 1;
      }
      if (body.description !== undefined) {
        task.description = body.description;
        task.fieldRevisions.description = (task.fieldRevisions.description ?? 1) + 1;
      }
      if (body.statusCategory !== undefined) {
        task.statusCategory = body.statusCategory;
        task.fieldRevisions.statusCategory = (task.fieldRevisions.statusCategory ?? 1) + 1;
      }
      if (body.priority !== undefined) {
        task.priority = body.priority;
        task.fieldRevisions.priority = (task.fieldRevisions.priority ?? 1) + 1;
      }
      if (body.startDate !== undefined) {
        task.startDate = body.startDate;
        task.fieldRevisions.startDate = (task.fieldRevisions.startDate ?? 1) + 1;
      }
      if (body.dueDate !== undefined) {
        task.dueDate = body.dueDate;
        task.fieldRevisions.dueDate = (task.fieldRevisions.dueDate ?? 1) + 1;
      }
      if (body.estimatePoints !== undefined) {
        task.estimatePoints = body.estimatePoints;
        task.fieldRevisions.estimatePoints = (task.fieldRevisions.estimatePoints ?? 1) + 1;
      }
      if (body.assigneeIds !== undefined) {
        task.assigneeIds = body.assigneeIds;
        task.assigneeAssignments = makeTaskAssignments(body.assigneeIds, MOCK_USER_ID);
        task.fieldRevisions.assigneeIds = (task.fieldRevisions.assigneeIds ?? 1) + 1;
      }
      if (body.labelIds !== undefined) {
        task.labelIds = body.labelIds;
        task.fieldRevisions.labelIds = (task.fieldRevisions.labelIds ?? 1) + 1;
      }
      if (body.milestoneId !== undefined) {
        task.milestoneId = body.milestoneId;
        task.fieldRevisions.milestoneId = (task.fieldRevisions.milestoneId ?? 1) + 1;
      }

      task.version += 1;
      task.updatedAt = new Date().toISOString();

      return HttpResponse.json(task, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
          "X-Workspace-Seq": String(task.version),
        },
      });
    }
  ),
];
