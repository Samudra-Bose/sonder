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

// Idempotency cache tracking processed task creation mutations
interface ProcessedTaskMutation {
  rawBody: string;
  response: TaskDto;
  seq: number;
}
const processedTaskMutations = new Map<string, ProcessedTaskMutation>();

// Query snapshot registry for workspace query pagination
export interface QuerySnapshotRecord {
  id: string;
  workspaceId: string;
  items: TaskDto[];
  createdAt: number;
  expiresAt: number;
  backlogCount?: number;
  backlogPreview?: TaskDto[];
  filterSignature?: string;
}
const querySnapshots = new Map<string, QuerySnapshotRecord>();
let forceSnapshotExpired = false;
let forceSnapshotExpiredOnce = false;

export function setForceExpireSnapshot(expired: boolean, once = false): void {
  forceSnapshotExpired = expired;
  forceSnapshotExpiredOnce = once;
}

export function getQuerySnapshots(): Map<string, QuerySnapshotRecord> {
  return querySnapshots;
}

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
  processedTaskMutations.clear();
  querySnapshots.clear();
  forceSnapshotExpired = false;
  forceSnapshotExpiredOnce = false;
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

/**
 * Calculates the maximum height of a task's descendant subtree.
 * 0 = Leaf task (no children), 1 = Has direct children only, 2 = Has nested grandchildren
 */
function getTaskSubtreeHeight(taskId: string, allTasks: TaskDto[]): number {
  const children = allTasks.filter((t) => t.parentTaskId === taskId);
  if (children.length === 0) return 0;
  let maxHeight = 0;
  for (const child of children) {
    maxHeight = Math.max(maxHeight, 1 + getTaskSubtreeHeight(child.id, allTasks));
  }
  return maxHeight;
}

/**
 * Returns set of all descendant task IDs under the given taskId (transitive closure).
 */
function getTaskDescendantIds(taskId: string, allTasks: TaskDto[]): Set<string> {
  const descendantIds = new Set<string>();
  function traverse(currentId: string) {
    for (const t of allTasks) {
      if (t.parentTaskId === currentId) {
        descendantIds.add(t.id);
        traverse(t.id);
      }
    }
  }
  traverse(taskId);
  return descendantIds;
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

      // Check idempotency replay / payload mismatch
      const rawBody = await request.clone().text();
      const cachedMutation = processedTaskMutations.get(mutationId);
      if (cachedMutation) {
        if (cachedMutation.rawBody === rawBody) {
          return HttpResponse.json(cachedMutation.response, {
            status: 201,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "private, no-store",
              "X-Workspace-Seq": String(cachedMutation.seq),
              "X-Idempotent-Replayed": "true",
            },
          });
        } else {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/idempotency-mismatch",
              title: "Idempotency Key Payload Mismatch",
              status: 409,
              detail: "X-Mutation-Id was already processed with a different request payload.",
              code: "IDEMPOTENCY_KEY_PAYLOAD_MISMATCH",
            },
            {
              status: 409,
              headers: { "Content-Type": "application/problem+json" },
            }
          );
        }
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

      if (body.title.length > 500) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/validation-error",
            title: "Validation Error",
            status: 422,
            detail: "Task title must be 500 characters or fewer.",
            code: "VALIDATION_FAILED",
          },
          {
            status: 422,
            headers: { "Content-Type": "application/problem+json" },
          }
        );
      }

      if (body.description && body.description.length > 20000) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/validation-error",
            title: "Validation Error",
            status: 422,
            detail: "Task description must be 20000 characters or fewer.",
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
      if (!workspace) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/workspace-not-found",
            title: "Workspace Not Found",
            status: 404,
            detail: `Workspace '${workspaceId}' not found in community.`,
            code: "WORKSPACE_NOT_FOUND",
          },
          {
            status: 404,
            headers: { "Content-Type": "application/problem+json" },
          }
        );
      }
      const maxSubtaskDepth = workspace.maxSubtaskDepth ?? 1;

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

        if (parent.effectivePermissions && !parent.effectivePermissions.canCreateSubtask) {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/forbidden",
              title: "Forbidden",
              status: 403,
              detail: "You do not have permission to create a subtask under this parent task.",
              code: "FORBIDDEN",
            },
            {
              status: 403,
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
      processedTaskMutations.set(mutationId, {
        rawBody,
        response: newTask,
        seq: nextSeq,
      });

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

  // 5. POST /api/v1/communities/:communityId/workspaces/:workspaceId/tasks/query
  http.post(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/tasks/query",
    async ({ params, request }) => {
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

      const body = (await request.json().catch(() => ({}))) as Partial<ApiSchema<"TaskViewQueryRequest">>;

      // Check workspace exists
      const workspace = mockWorkspacesCommunity1.find((w) => w.id === workspaceId);
      if (!workspace) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/workspace-not-found",
            title: "Workspace Not Found",
            status: 404,
            detail: `Workspace '${workspaceId}' not found.`,
            code: "WORKSPACE_NOT_FOUND",
          },
          {
            status: 404,
            headers: { "Content-Type": "application/problem+json" },
          }
        );
      }

      // Continuation page with cursor
      if (body.cursor) {
        if (forceSnapshotExpired || forceSnapshotExpiredOnce) {
          if (forceSnapshotExpiredOnce) {
            forceSnapshotExpiredOnce = false;
          }
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/query-snapshot-expired",
              title: "Query Snapshot Expired",
              status: 409,
              detail: "The query snapshot has expired. Restart query from page 1.",
              code: "QUERY_SNAPSHOT_EXPIRED",
            },
            {
              status: 409,
              headers: { "Content-Type": "application/problem+json" },
            }
          );
        }

        let cursorData: { snapshotId?: string; offset?: number; groupKey?: string } | null = null;
        try {
          const decoded = atob(body.cursor);
          cursorData = JSON.parse(decoded);
        } catch {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/query-cursor-invalid",
              title: "Query Cursor Invalid",
              status: 409,
              detail: "The provided continuation cursor is invalid or malformed.",
              code: "QUERY_CURSOR_INVALID",
            },
            {
              status: 409,
              headers: { "Content-Type": "application/problem+json" },
            }
          );
        }

        if (
          !cursorData ||
          typeof cursorData.snapshotId !== "string" ||
          typeof cursorData.offset !== "number"
        ) {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/query-cursor-invalid",
              title: "Query Cursor Invalid",
              status: 409,
              detail: "The provided continuation cursor is invalid or malformed.",
              code: "QUERY_CURSOR_INVALID",
            },
            {
              status: 409,
              headers: { "Content-Type": "application/problem+json" },
            }
          );
        }

        const snapshot = querySnapshots.get(cursorData.snapshotId);
        if (!snapshot || Date.now() > snapshot.expiresAt) {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/query-snapshot-expired",
              title: "Query Snapshot Expired",
              status: 409,
              detail: "The query snapshot has expired. Restart query from page 1.",
              code: "QUERY_SNAPSHOT_EXPIRED",
            },
            {
              status: 409,
              headers: { "Content-Type": "application/problem+json" },
            }
          );
        }

        if (cursorData.offset < 0 || cursorData.offset > snapshot.items.length) {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/query-cursor-invalid",
              title: "Query Cursor Invalid",
              status: 409,
              detail: "The continuation cursor offset is out of bounds.",
              code: "QUERY_CURSOR_INVALID",
            },
            {
              status: 409,
              headers: { "Content-Type": "application/problem+json" },
            }
          );
        }

        const limit = Math.max(1, Math.min(200, body.limit ?? 200));
        const pageItems = snapshot.items.slice(cursorData.offset, cursorData.offset + limit);
        const nextOffset = cursorData.offset + limit;
        let nextCursor: string | null = null;
        if (nextOffset < snapshot.items.length) {
          nextCursor = btoa(JSON.stringify({ snapshotId: snapshot.id, offset: nextOffset, v: 1 }));
        }

        const result: ApiSchema<"TaskQueryResult"> = {
          projection: body.projection ?? "LIST",
          pageScope: body.pageScope ?? "PRIMARY",
          groupKey: null,
          querySnapshotId: snapshot.id,
          snapshotSequence: workspaceSeqCounters[workspaceId] ?? 1,
          snapshotAt: new Date(snapshot.createdAt).toISOString(),
          snapshotExpiresAt: new Date(snapshot.expiresAt).toISOString(),
          items: pageItems,
          total: snapshot.items.length + (snapshot.backlogCount ?? 0),
          primaryCount: snapshot.items.length,
          backlogCount: snapshot.backlogCount ?? 0,
          backlogPreview: snapshot.backlogPreview ?? [],
          backlogNextCursor: null,
          unscheduledCount: 0,
          unscheduledPreview: [],
          unscheduledNextCursor: null,
          nextCursor,
          groups: [],
          dependencyEdges: [],
        };

        return HttpResponse.json(result, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, no-store",
          },
        });
      }

      // Check querySnapshotId reuse
      let snapshot: QuerySnapshotRecord | undefined;
      if (body.querySnapshotId) {
        if (forceSnapshotExpired || forceSnapshotExpiredOnce) {
          if (forceSnapshotExpiredOnce) forceSnapshotExpiredOnce = false;
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/query-snapshot-expired",
              title: "Query Snapshot Expired",
              status: 409,
              detail: "The query snapshot has expired. Restart query from page 1.",
              code: "QUERY_SNAPSHOT_EXPIRED",
            },
            {
              status: 409,
              headers: { "Content-Type": "application/problem+json" },
            }
          );
        }

        const existing = querySnapshots.get(body.querySnapshotId);
        if (!existing || Date.now() > existing.expiresAt) {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/query-snapshot-expired",
              title: "Query Snapshot Expired",
              status: 409,
              detail: "The query snapshot has expired. Restart query from page 1.",
              code: "QUERY_SNAPSHOT_EXPIRED",
            },
            {
              status: 409,
              headers: { "Content-Type": "application/problem+json" },
            }
          );
        }

        const incomingFilter = JSON.stringify(body.querySpec?.filter ?? {});
        if (!existing.filterSignature || existing.filterSignature === incomingFilter) {
          snapshot = existing;
        }
      }

      // Initial query without existing valid snapshot - create new snapshot
      if (!snapshot) {
        let allFiltered = currentMockTasks.filter((t) => t.workspaceId === workspaceId);

        const subtaskMode = body.querySpec?.subtaskMode ?? "NESTED";
        if (subtaskMode === "TOP_LEVEL_ONLY") {
          allFiltered = allFiltered.filter((t) => t.parentTaskId === null);
        }

        const includeCompleted = body.querySpec?.includeCompleted ?? true;
        if (!includeCompleted) {
          allFiltered = allFiltered.filter(
            (t) => t.statusCategory !== "DONE" && t.statusCategory !== "CANCELED"
          );
        }

        // Apply filter conditions if present
        const filterGroup = body.querySpec?.filter;
        if (filterGroup && filterGroup.conditions && filterGroup.conditions.length > 0) {
          allFiltered = allFiltered.filter((task) => {
            const matchesCondition = (cond: any): boolean => {
              if (!cond || !cond.field) return true;
              const { field, operator, value } = cond;
              if (field === "q") {
                const searchStr = String(value || "").toLowerCase().trim();
                if (!searchStr) return true;
                const corpus = `${task.taskKey} ${task.title} ${task.description || ""}`.toLowerCase();
                return corpus.includes(searchStr);
              }
              if (field === "statusCategory") {
                if (operator === "EQ") return task.statusCategory === value;
                if (operator === "IN" && Array.isArray(value)) return value.includes(task.statusCategory);
                if (operator === "NEQ") return task.statusCategory !== value;
              }
              if (field === "priority") {
                if (operator === "EQ") return task.priority === value;
                if (operator === "IN" && Array.isArray(value)) return value.includes(task.priority);
                if (operator === "NEQ") return task.priority !== value;
              }
              if (field === "assigneeId") {
                if (operator === "EQ") return task.assigneeIds.includes(String(value));
                if (operator === "IN" && Array.isArray(value)) {
                  return value.some((v: string) => task.assigneeIds.includes(v));
                }
              }
              return true;
            };

            if (filterGroup.conjunction === "OR") {
              return filterGroup.conditions.some(matchesCondition);
            }
            return filterGroup.conditions.every(matchesCondition);
          });
        }

        // Apply sorting if present
        const sortBy = body.querySpec?.sortBy;
        if (sortBy && Array.isArray(sortBy) && sortBy.length > 0) {
          const priorityWeights: Record<string, number> = {
            URGENT: 4,
            HIGH: 3,
            MEDIUM: 2,
            LOW: 1,
            NONE: 0,
          };
          allFiltered.sort((a, b) => {
            for (const term of sortBy) {
              const field = term.field;
              const dir = term.direction === "DESC" ? -1 : 1;
              if (field === "priority") {
                const diff = (priorityWeights[a.priority] ?? 0) - (priorityWeights[b.priority] ?? 0);
                if (diff !== 0) return diff * dir;
              } else if (field === "dueDate") {
                const aDue = a.dueDate || "9999-99-99";
                const bDue = b.dueDate || "9999-99-99";
                if (aDue !== bDue) return aDue.localeCompare(bDue) * dir;
              } else if (field === "createdAt") {
                if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt) * dir;
              } else if (field === "currentKey") {
                if (a.taskKey !== b.taskKey) return a.taskKey.localeCompare(b.taskKey) * dir;
              } else if (field === "rankKey") {
                const aRank = a.rankKey ?? "";
                const bRank = b.rankKey ?? "";
                if (aRank !== bRank) return aRank.localeCompare(bRank) * dir;
              }
            }
            return 0;
          });
        }

        // Backlog separation
        const includeBacklog = body.querySpec?.includeBacklog ?? false;
        let primaryItems = allFiltered;
        let backlogItems: TaskDto[] = [];
        if (!includeBacklog) {
          primaryItems = allFiltered.filter((t) => t.statusCategory !== "BACKLOG");
          backlogItems = allFiltered.filter((t) => t.statusCategory === "BACKLOG");
        }

        const snapshotId = `snapshot-${generateUuidV7()}`;
        const now = Date.now();
        const expiresAt = now + 900_000; // 900 seconds (15 minutes) canonical lifetime
        snapshot = {
          id: snapshotId,
          workspaceId,
          items: [...primaryItems],
          backlogCount: backlogItems.length,
          backlogPreview: backlogItems.slice(0, 20),
          filterSignature: JSON.stringify(body.querySpec?.filter ?? {}),
          createdAt: now,
          expiresAt,
        };
        querySnapshots.set(snapshotId, snapshot);
      }

      // BOARD projection handling
      if (body.projection === "BOARD") {
        const includeBacklog = body.querySpec?.includeBacklog ?? false;
        const includeCompleted = body.querySpec?.includeCompleted ?? true;

        const categories: Array<{ key: string; label: string }> = [
          ...(includeBacklog ? [{ key: "BACKLOG", label: "Backlog" }] : []),
          { key: "TODO", label: "To Do" },
          { key: "IN_PROGRESS", label: "In Progress" },
          ...(includeCompleted
            ? [
                { key: "DONE", label: "Done" },
                { key: "CANCELED", label: "Canceled" },
              ]
            : []),
        ];

        const limit = Math.max(1, Math.min(200, body.limit ?? 50));
        const groups: ApiSchema<"TaskQueryBucketDto">[] = categories.map((cat) => {
          const bucketTasks = snapshot!.items.filter((t) => t.statusCategory === cat.key);
          const bucketItems = bucketTasks.slice(0, limit);
          const nextCursor =
            bucketTasks.length > limit
              ? btoa(JSON.stringify({ snapshotId: snapshot!.id, groupKey: cat.key, offset: limit, v: 1 }))
              : null;
          return {
            key: cat.key,
            label: cat.label,
            total: bucketTasks.length,
            items: bucketItems,
            nextCursor,
            children: [],
          };
        });

        const result: ApiSchema<"TaskQueryResult"> = {
          projection: "BOARD",
          pageScope: body.pageScope ?? "PRIMARY",
          groupKey: null,
          querySnapshotId: snapshot.id,
          snapshotSequence: workspaceSeqCounters[workspaceId] ?? 1,
          snapshotAt: new Date(snapshot.createdAt).toISOString(),
          snapshotExpiresAt: new Date(snapshot.expiresAt).toISOString(),
          items: [],
          total: snapshot.items.length + (snapshot.backlogCount ?? 0),
          primaryCount: snapshot.items.length,
          backlogCount: snapshot.backlogCount ?? 0,
          backlogPreview: snapshot.backlogPreview ?? [],
          backlogNextCursor: null,
          unscheduledCount: 0,
          unscheduledPreview: [],
          unscheduledNextCursor: null,
          nextCursor: null,
          groups,
          dependencyEdges: [],
        };

        return HttpResponse.json(result, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, no-store",
          },
        });
      }

      // LIST projection handling (default)
      const limit = Math.max(1, Math.min(200, body.limit ?? 200));
      const pageItems = snapshot.items.slice(0, limit);
      let nextCursor: string | null = null;
      if (limit < snapshot.items.length) {
        nextCursor = btoa(JSON.stringify({ snapshotId: snapshot.id, offset: limit, v: 1 }));
      }

      const result: ApiSchema<"TaskQueryResult"> = {
        projection: body.projection ?? "LIST",
        pageScope: body.pageScope ?? "PRIMARY",
        groupKey: null,
        querySnapshotId: snapshot.id,
        snapshotSequence: workspaceSeqCounters[workspaceId] ?? 1,
        snapshotAt: new Date(snapshot.createdAt).toISOString(),
        snapshotExpiresAt: new Date(snapshot.expiresAt).toISOString(),
        items: pageItems,
        total: snapshot.items.length + (snapshot.backlogCount ?? 0),
        primaryCount: snapshot.items.length,
        backlogCount: snapshot.backlogCount ?? 0,
        backlogPreview: snapshot.backlogPreview ?? [],
        backlogNextCursor: null,
        unscheduledCount: 0,
        unscheduledPreview: [],
        unscheduledNextCursor: null,
        nextCursor,
        groups: [],
        dependencyEdges: [],
      };

      return HttpResponse.json(result, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
        },
      });
    }
  ),

  // 6. POST /api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId/move
  http.post(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId/move",
    async ({ params, request }) => {
      if (tasksDelayMs > 0) {
        await delay(tasksDelayMs);
      }

      if (matchesErrorOverride("POST")) {
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

      const rawBody = await request.text();
      let body: ApiSchema<"MoveTaskRequest">;
      try {
        body = JSON.parse(rawBody);
      } catch {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/validation-error",
            title: "Invalid JSON",
            status: 400,
            detail: "Malformed JSON in request body.",
            code: "MALFORMED_JSON",
          },
          { status: 400, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      // Find task
      const task = currentMockTasks.find(
        (t) => t.id === taskId && t.workspaceId === workspaceId
      );
      if (!task) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/task-not-found",
            title: "Task Not Found",
            status: 404,
            detail: `Task '${taskId}' was not found.`,
            code: "TASK_NOT_FOUND",
          },
          { status: 404, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      // Permission check: canMove
      if (task.effectivePermissions && !task.effectivePermissions.canMove) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/forbidden",
            title: "Forbidden",
            status: 403,
            detail: "You do not have permission to move or reparent this task.",
            code: "FORBIDDEN",
          },
          { status: 403, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      // Same-workspace validation
      if (body.targetWorkspaceId !== workspaceId) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/transfer-not-supported",
            title: "Transfer Not Supported",
            status: 422,
            detail: "Cross-workspace task transfers are not supported in this stage.",
            code: "TRANSFER_NOT_SUPPORTED",
          },
          { status: 422, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      const targetParentId = body.targetParentTaskId;

      // Self-parent validation
      if (targetParentId === taskId) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/target-parent-invalid",
            title: "Invalid Target Parent",
            status: 422,
            detail: "A task cannot be its own parent.",
            code: "TARGET_PARENT_INVALID",
          },
          { status: 422, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      // Descendant cycle check
      const descendants = getTaskDescendantIds(taskId, currentMockTasks);
      if (targetParentId && descendants.has(targetParentId)) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/target-parent-invalid",
            title: "Hierarchy Cycle Detected",
            status: 422,
            detail: "Cycle detected: cannot reparent a task under one of its own descendants.",
            code: "TARGET_PARENT_INVALID",
          },
          { status: 422, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      // Destination depth check
      const workspace = mockWorkspacesCommunity1.find((w) => w.id === workspaceId);
      const maxSubtaskDepth = workspace?.maxSubtaskDepth ?? 1;

      if (targetParentId) {
        const destParent = currentMockTasks.find(
          (t) => t.id === targetParentId && t.workspaceId === workspaceId
        );
        if (!destParent) {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/target-parent-invalid",
              title: "Target Parent Not Found",
              status: 422,
              detail: `Target parent '${targetParentId}' was not found in this workspace.`,
              code: "TARGET_PARENT_INVALID",
            },
            { status: 422, headers: { "Content-Type": "application/problem+json" } }
          );
        }

        const destParentDepth = getTaskDepth(destParent, currentMockTasks);
        const subtreeHeight = getTaskSubtreeHeight(taskId, currentMockTasks);

        if (destParentDepth + 1 + subtreeHeight > maxSubtaskDepth) {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/max-subtask-depth-exceeded",
              title: "Maximum Subtask Depth Exceeded",
              status: 422,
              detail: `Move would exceed maximum subtask depth (${maxSubtaskDepth}) for this workspace.`,
              code: "MAX_SUBTASK_DEPTH_EXCEEDED",
            },
            { status: 422, headers: { "Content-Type": "application/problem+json" } }
          );
        }
      }

      // Atomic move update
      task.parentTaskId = targetParentId ?? null;
      task.updatedAt = new Date().toISOString();
      task.version += 1;

      const newSeq = (workspaceSeqCounters[workspaceId] ?? 100) + 1;
      workspaceSeqCounters[workspaceId] = newSeq;

      const result: ApiSchema<"TaskMoveResultDto"> = {
        transferId: generateUuidV7(),
        mode: "PRESERVE_IN_PLACE",
        rootTask: task,
        movedTaskCount: 1 + descendants.size,
        sourceWorkspaceId: workspaceId,
        targetWorkspaceId: workspaceId,
        sourceWorkspaceSeq: newSeq,
        targetWorkspaceSeq: newSeq,
        previousRootKey: task.taskKey,
        currentRootKey: task.taskKey,
        aliasesCreated: 0,
      };

      return HttpResponse.json(result, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
          "X-Workspace-Seq": String(newSeq),
        },
      });
    }
  ),
];
