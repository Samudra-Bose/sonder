import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  getTaskById,
  resolveTaskKey,
  createTask,
  updateTask,
  useTask,
  useResolveTaskKey,
  useCreateTask,
  useUpdateTask,
  taskKeys,
} from "./index";
import {
  WS_SHARED_ENG_ID,
  WS_PERSONAL_ALEX_ID,
  MOCK_USER_ID,
} from "@/mocks/data/my-work";
import {
  resetTaskMockState,
  setMockTasksError,
} from "@/mocks/handlers/tasks";
import { ApiError } from "@/lib/api-client";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("VS-03 Stage 1: Task Data Access Layer & Mock Infrastructure", () => {
  beforeEach(() => {
    resetTaskMockState();
  });

  describe("API Client: getTaskById", () => {
    it("fetches task by canonical ID with complete contract fields and effectivePermissions", async () => {
      const taskId = "018f98a2-3f12-7890-e123-456789abcdef"; // ENG-101
      const task = await getTaskById(taskId);

      expect(task).toBeDefined();
      expect(task.id).toBe(taskId);
      expect(task.key).toBe("ENG-101");
      expect(task.workspaceId).toBe(WS_SHARED_ENG_ID);
      expect(task.title).toBe("Implement OAuth 2.0 PKCE Authorization Flow");
      expect(task.status).toBe("IN_PROGRESS");
      expect(task.priority).toBe("HIGH");
      expect(task.subtaskDepth).toBe(0);
      expect(task.parentTaskId).toBeNull();
      expect(task.fieldRevisions).toBeDefined();
      expect(task.fieldRevisions.title).toBe(1);
      expect(task.fieldRevisions.status).toBe(1);

      // Verify effectivePermissions
      expect(task.effectivePermissions).toBeDefined();
      expect(task.effectivePermissions.canEdit).toBe(true);
      expect(task.effectivePermissions.canDelete).toBe(true);
      expect(task.effectivePermissions.canChangeStatus).toBe(true);
      expect(task.effectivePermissions.canComment).toBe(true);
      expect(task.effectivePermissions.canAssign).toBe(true);
    });

    it("throws ApiError with 404 Problem Details when task ID is non-existent", async () => {
      const missingId = "018f98a2-3f12-7890-ffff-000000000000";
      await expect(getTaskById(missingId)).rejects.toThrow(ApiError);
      try {
        await getTaskById(missingId);
      } catch (err) {
        const apiError = err as ApiError;
        expect(apiError.status).toBe(404);
        expect(apiError.problem.title).toBe("Task Not Found");
      }
    });
  });

  describe("API Client: resolveTaskKey", () => {
    it("resolves canonical active task key without redirection", async () => {
      const result = await resolveTaskKey("ENG-101");

      expect(result).toBeDefined();
      expect(result.currentKey).toBe("ENG-101");
      expect(result.taskId).toBe("018f98a2-3f12-7890-e123-456789abcdef");
      expect(result.canonicalWorkspaceId).toBe(WS_SHARED_ENG_ID);
      expect(result.wasRedirected).toBe(false);
      expect(result.requestedKey).toBeUndefined();
    });

    it("resolves historical alias with redirection metadata", async () => {
      const result = await resolveTaskKey("ENG-OLD-1");

      expect(result).toBeDefined();
      expect(result.currentKey).toBe("ENG-101");
      expect(result.taskId).toBe("018f98a2-3f12-7890-e123-456789abcdef");
      expect(result.canonicalWorkspaceId).toBe(WS_SHARED_ENG_ID);
      expect(result.wasRedirected).toBe(true);
      expect(result.requestedKey).toBe("ENG-OLD-1");
    });

    it("returns 404 Problem Details for unknown key indistinguishable from unauthorized key", async () => {
      await expect(resolveTaskKey("NONEXISTENT-999")).rejects.toThrow(ApiError);
      try {
        await resolveTaskKey("NONEXISTENT-999");
      } catch (err) {
        const apiError = err as ApiError;
        expect(apiError.status).toBe(404);
        expect(apiError.problem.title).toBe("Task Not Found");
      }
    });
  });

  describe("API Client: createTask & Subtask Hierarchy", () => {
    it("creates root task with monotonic sequence key, default field revisions, and contract properties", async () => {
      const created = await createTask({
        workspaceId: WS_SHARED_ENG_ID,
        title: "Build Cache Purge Pipeline",
        description: "Automated cache eviction workflow",
        status: "TODO",
        priority: "MEDIUM",
      });

      expect(created).toBeDefined();
      expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(created.key).toMatch(/^ENG-\d+$/);
      expect(created.title).toBe("Build Cache Purge Pipeline");
      expect(created.workspaceId).toBe(WS_SHARED_ENG_ID);
      expect(created.status).toBe("TODO");
      expect(created.priority).toBe("MEDIUM");
      expect(created.parentTaskId).toBeNull();
      expect(created.subtaskDepth).toBe(0);
      expect(created.fieldRevisions.title).toBe(1);
      expect(created.fieldRevisions.status).toBe(1);
      expect(created.effectivePermissions.canEdit).toBe(true);
    });

    it("creates a subtask at depth 1 under an existing root task", async () => {
      const parentId = "018f98a2-3f12-7890-e123-456789abcdef"; // ENG-101 (depth 0)
      const subtask = await createTask({
        workspaceId: WS_SHARED_ENG_ID,
        parentTaskId: parentId,
        title: "Subtask 1A",
        status: "TODO",
        priority: "LOW",
      });

      expect(subtask.parentTaskId).toBe(parentId);
      expect(subtask.subtaskDepth).toBe(1);
    });

    it("creates a nested subtask at depth 2 in a workspace supporting depth 2", async () => {
      const depth1ParentId = "018f98a2-3f12-7890-e123-456789abcd04"; // ENG-104 (depth 1)
      const subtask = await createTask({
        workspaceId: WS_SHARED_ENG_ID,
        parentTaskId: depth1ParentId,
        title: "Subtask Level 2",
        status: "TODO",
        priority: "LOW",
      });

      expect(subtask.parentTaskId).toBe(depth1ParentId);
      expect(subtask.subtaskDepth).toBe(2);
    });

    it("rejects subtask exceeding maxSubtaskDepth with 400 Bad Request", async () => {
      // In ENG workspace, maxSubtaskDepth is 2. ENG-105 is already at depth 2.
      const depth2ParentId = "018f98a2-3f12-7890-e123-456789abcd05"; // ENG-105 (depth 2)

      await expect(
        createTask({
          workspaceId: WS_SHARED_ENG_ID,
          parentTaskId: depth2ParentId,
          title: "Depth 3 Subtask (Should Fail)",
          status: "TODO",
          priority: "LOW",
        })
      ).rejects.toThrow(ApiError);

      try {
        await createTask({
          workspaceId: WS_SHARED_ENG_ID,
          parentTaskId: depth2ParentId,
          title: "Depth 3 Subtask",
          status: "TODO",
          priority: "LOW",
        });
      } catch (err) {
        const apiError = err as ApiError;
        expect(apiError.status).toBe(400);
        expect(apiError.problem.title).toBe("Subtask Depth Limit Exceeded");
      }
    });

    it("enforces maxSubtaskDepth of 1 in personal workspace", async () => {
      // Create depth 1 subtask in personal workspace
      const rootTask = await createTask({
        workspaceId: WS_PERSONAL_ALEX_ID,
        title: "Alex Root Task",
        status: "TODO",
        priority: "LOW",
      });
      expect(rootTask.subtaskDepth).toBe(0);

      const depth1Subtask = await createTask({
        workspaceId: WS_PERSONAL_ALEX_ID,
        parentTaskId: rootTask.id,
        title: "Alex Subtask Depth 1",
        status: "TODO",
        priority: "LOW",
      });
      expect(depth1Subtask.subtaskDepth).toBe(1);

      // Attempting depth 2 in personal workspace must fail (limit is 1)
      await expect(
        createTask({
          workspaceId: WS_PERSONAL_ALEX_ID,
          parentTaskId: depth1Subtask.id,
          title: "Alex Subtask Depth 2 (Forbidden)",
          status: "TODO",
          priority: "LOW",
        })
      ).rejects.toThrow(ApiError);
    });
  });

  describe("API Client: updateTask & Concurrency Control", () => {
    it("updates task fields and increments field revisions", async () => {
      const taskId = "018f98a2-3f12-7890-e123-456789abcdef"; // ENG-101

      const updated = await updateTask(taskId, {
        title: "Updated Title PKCE",
        status: "DONE",
        baseFieldRevisions: {
          title: 1,
          status: 1,
        },
      });

      expect(updated.title).toBe("Updated Title PKCE");
      expect(updated.status).toBe("DONE");
      expect(updated.fieldRevisions.title).toBe(2);
      expect(updated.fieldRevisions.status).toBe(2);
    });

    it("returns 409 Conflict when baseFieldRevisions contains a stale revision", async () => {
      const taskId = "018f98a2-3f12-7890-e123-456789abcdef"; // ENG-101 (title is at rev 1)

      // Provide stale baseFieldRevisions: { title: 0 }
      await expect(
        updateTask(taskId, {
          title: "Conflicting Update",
          baseFieldRevisions: {
            title: 0,
          },
        })
      ).rejects.toThrow(ApiError);

      try {
        await updateTask(taskId, {
          title: "Conflicting Update",
          baseFieldRevisions: {
            title: 0,
          },
        });
      } catch (err) {
        const apiError = err as ApiError;
        expect(apiError.status).toBe(409);
        expect(apiError.problem.title).toBe("Task Concurrency Conflict");
      }
    });
  });

  describe("React Query Hooks", () => {
    describe("useTask", () => {
      it("loads and caches task by canonical taskId", async () => {
        const queryClient = createTestQueryClient();
        const wrapper = createWrapper(queryClient);
        const taskId = "018f98a2-3f12-7890-e123-456789abcdef";

        const { result } = renderHook(() => useTask(taskId), { wrapper });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.key).toBe("ENG-101");
        expect(result.current.data?.title).toBe("Implement OAuth 2.0 PKCE Authorization Flow");

        // Verify cache inspection
        const cached = queryClient.getQueryData(taskKeys.detail(taskId));
        expect(cached).toBeDefined();
      });

      it("respects enabled option when taskId is undefined or enabled: false", () => {
        const queryClient = createTestQueryClient();
        const wrapper = createWrapper(queryClient);

        const { result } = renderHook(() => useTask(undefined, { enabled: false }), { wrapper });
        expect(result.current.fetchStatus).toBe("idle");
      });
    });

    describe("useResolveTaskKey", () => {
      it("resolves task key and caches under taskKeys.byKey", async () => {
        const queryClient = createTestQueryClient();
        const wrapper = createWrapper(queryClient);

        const { result } = renderHook(() => useResolveTaskKey("ENG-101"), { wrapper });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.currentKey).toBe("ENG-101");
        expect(result.current.data?.wasRedirected).toBe(false);

        const cached = queryClient.getQueryData(taskKeys.byKey("ENG-101"));
        expect(cached).toBeDefined();
      });
    });

    describe("useCreateTask", () => {
      it("creates task, seeds detail cache, and invalidates my-work queries", async () => {
        const queryClient = createTestQueryClient();
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
        const wrapper = createWrapper(queryClient);

        const { result } = renderHook(() => useCreateTask(), { wrapper });

        let createdTask: any;
        await act(async () => {
          createdTask = await result.current.mutateAsync({
            workspaceId: WS_SHARED_ENG_ID,
            title: "Automated Test Task Creation",
            status: "TODO",
            priority: "URGENT",
          });
        });

        expect(createdTask).toBeDefined();
        expect(createdTask.title).toBe("Automated Test Task Creation");

        // Detail cache should be seeded
        const cached = queryClient.getQueryData(taskKeys.detail(createdTask.id));
        expect(cached).toEqual(createdTask);

        // my-work queries should have been invalidated
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: ["my-work"] })
        );
      });
    });

    describe("useUpdateTask", () => {
      it("performs optimistic update on cache and commits upon success", async () => {
        const queryClient = createTestQueryClient();
        const wrapper = createWrapper(queryClient);
        const taskId = "018f98a2-3f12-7890-e123-456789abcdef";

        // Seed initial data
        const initialTask = await getTaskById(taskId);
        queryClient.setQueryData(taskKeys.detail(taskId), initialTask);

        const { result } = renderHook(() => useUpdateTask(), { wrapper });

        await act(async () => {
          await result.current.mutateAsync({
            taskId,
            request: {
              title: "Optimistically Updated Title",
              baseFieldRevisions: {
                title: initialTask.fieldRevisions.title,
              },
            },
          });
        });

        const cached = queryClient.getQueryData<any>(taskKeys.detail(taskId));
        expect(cached.title).toBe("Optimistically Updated Title");
        expect(cached.fieldRevisions.title).toBe(2);
      });

      it("rolls back optimistic update when server responds with 409 Concurrency Conflict", async () => {
        const queryClient = createTestQueryClient();
        const wrapper = createWrapper(queryClient);
        const taskId = "018f98a2-3f12-7890-e123-456789abcdef";

        // Seed initial data
        const initialTask = await getTaskById(taskId);
        queryClient.setQueryData(taskKeys.detail(taskId), initialTask);

        const { result } = renderHook(() => useUpdateTask(), { wrapper });

        // Submit stale revision (0 instead of 1)
        await act(async () => {
          try {
            await result.current.mutateAsync({
              taskId,
              request: {
                title: "Conflicting Title Should Rollback",
                baseFieldRevisions: {
                  title: 0,
                },
              },
            });
          } catch {
            // Expected 409
          }
        });

        // Verify cache was rolled back to initial state
        const cached = queryClient.getQueryData<any>(taskKeys.detail(taskId));
        expect(cached.title).toBe(initialTask.title);
      });
    });
  });
});
