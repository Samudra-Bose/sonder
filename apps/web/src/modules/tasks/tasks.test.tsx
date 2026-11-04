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
  taskQueryKey,
  taskKeyResolutionQueryKey,
} from "./index.js";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import {
  MOCK_COMMUNITY_1_ID,
  WS_SHARED_ENG_ID,
  WS_PERSONAL_ALEX_ID,
  MOCK_USER_ID,
} from "@/mocks/data/my-work.js";
import {
  resetTaskMockState,
} from "@/mocks/handlers/tasks.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import { ApiProblemError } from "@/lib/api-client.js";

const TEST_CSRF_TOKEN = "mock-csrf-token-xyz";
const ENG_101_TASK_ID = "018f98a2-task-001-overdue-assigned";
const ENG_105_SUBTASK_DEPTH1_ID = "018f98a2-task-001-subtask-1";
const ENG_106_SUBTASK_DEPTH2_ID = "018f98a2-task-001-subtask-1-nested";
const ALEX_1_TASK_ID = "018f98a2-task-004-today-personal";

const testAuthUser = {
  id: MOCK_USER_ID,
  displayName: "Alex Morgan",
  email: "alex.morgan@example.org",
  avatarUrl: null,
};

function createMockAuth(overrides?: Partial<AuthContextType>): AuthContextType {
  return {
    user: testAuthUser,
    communities: defaultMockCommunities,
    csrfToken: TEST_CSRF_TOKEN,
    status: "authenticated",
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  };
}

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

function createWrapper(queryClient: QueryClient, authOverrides?: Partial<AuthContextType>) {
  const authValue = createMockAuth(authOverrides);
  return function QueryAndAuthWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          {children}
        </AuthContext.Provider>
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
      const task = await getTaskById({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        taskId: ENG_101_TASK_ID,
      });

      expect(task).toBeDefined();
      expect(task.id).toBe(ENG_101_TASK_ID);
      expect(task.taskKey).toBe("ENG-101");
      expect(task.workspaceId).toBe(WS_SHARED_ENG_ID);
      expect(task.title).toBe("Fix critical auth token refresh race condition");
      expect(task.statusCategory).toBe("IN_PROGRESS");
      expect(task.priority).toBe("URGENT");
      expect(task.parentTaskId).toBeNull();
      expect(task.fieldRevisions).toBeDefined();
      expect(task.fieldRevisions.title).toBe(1);
      expect(task.fieldRevisions.statusCategory).toBe(2);

      // Verify effectivePermissions
      expect(task.effectivePermissions).toBeDefined();
      expect(task.effectivePermissions.canEditTitleDescription).toBe(true);
      expect(task.effectivePermissions.canUpdateStatus).toBe(true);
      expect(task.effectivePermissions.canManageSubtasks).toBe(true);
      expect(task.effectivePermissions.canComment).toBe(true);
      expect(task.effectivePermissions.canAssign).toBe(true);
    });

    it("throws ApiProblemError with 404 Problem Details when task ID is non-existent", async () => {
      const missingId = "018f98a2-3f12-7890-ffff-000000000000";
      await expect(
        getTaskById({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          taskId: missingId,
        })
      ).rejects.toThrow(ApiProblemError);

      try {
        await getTaskById({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          taskId: missingId,
        });
      } catch (err) {
        const problem = (err as ApiProblemError).problem;
        expect((err as ApiProblemError).status).toBe(404);
        expect(problem.title).toBe("Task Not Found");
      }
    });
  });

  describe("API Client: resolveTaskKey", () => {
    it("resolves canonical active task key without redirection", async () => {
      const result = await resolveTaskKey({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        taskKey: "ENG-101",
      });

      expect(result).toBeDefined();
      expect(result.currentKey).toBe("ENG-101");
      expect(result.taskId).toBe(ENG_101_TASK_ID);
      expect(result.workspaceId).toBe(WS_SHARED_ENG_ID);
      expect(result.requestedKey).toBe("ENG-101");
      expect(result.resolvedFromAlias).toBe(false);
      expect(result.lifecycleState).toBe("ACTIVE");
    });

    it("resolves historical alias with redirection metadata", async () => {
      const result = await resolveTaskKey({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        taskKey: "ENG-OLD-1",
      });

      expect(result).toBeDefined();
      expect(result.currentKey).toBe("ENG-101");
      expect(result.taskId).toBe(ENG_101_TASK_ID);
      expect(result.workspaceId).toBe(WS_SHARED_ENG_ID);
      expect(result.requestedKey).toBe("ENG-OLD-1");
      expect(result.resolvedFromAlias).toBe(true);
      expect(result.lifecycleState).toBe("ACTIVE");
    });

    it("returns 404 Problem Details for unknown key indistinguishable from unauthorized key", async () => {
      await expect(
        resolveTaskKey({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          taskKey: "NONEXISTENT-999",
        })
      ).rejects.toThrow(ApiProblemError);

      try {
        await resolveTaskKey({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          taskKey: "NONEXISTENT-999",
        });
      } catch (err) {
        const problem = (err as ApiProblemError).problem;
        expect((err as ApiProblemError).status).toBe(404);
        expect(problem.title).toBe("Resource Not Found");
      }
    });
  });

  describe("API Client: createTask & Subtask Hierarchy", () => {
    it("creates root task with monotonic sequence key, default field revisions, and contract properties", async () => {
      const created = await createTask({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        data: {
          title: "Build Cache Purge Pipeline",
          description: "Automated cache eviction workflow",
          statusCategory: "TODO",
          priority: "MEDIUM",
        },
        csrfToken: TEST_CSRF_TOKEN,
      });

      expect(created).toBeDefined();
      expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(created.taskKey).toMatch(/^ENG-\d+$/);
      expect(created.title).toBe("Build Cache Purge Pipeline");
      expect(created.workspaceId).toBe(WS_SHARED_ENG_ID);
      expect(created.statusCategory).toBe("TODO");
      expect(created.priority).toBe("MEDIUM");
      expect(created.parentTaskId).toBeNull();
      expect(created.fieldRevisions.title).toBe(1);
      expect(created.fieldRevisions.statusCategory).toBe(1);
      expect(created.effectivePermissions.canEditTitleDescription).toBe(true);
    });

    it("creates a subtask at depth 1 under an existing root task", async () => {
      const subtask = await createTask({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        data: {
          parentTaskId: ENG_101_TASK_ID,
          title: "Subtask 1A",
          statusCategory: "TODO",
          priority: "LOW",
        },
        csrfToken: TEST_CSRF_TOKEN,
      });

      expect(subtask.parentTaskId).toBe(ENG_101_TASK_ID);
      expect(subtask.title).toBe("Subtask 1A");
    });

    it("creates a nested subtask at depth 2 in a workspace supporting depth 2", async () => {
      const subtask = await createTask({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        data: {
          parentTaskId: ENG_105_SUBTASK_DEPTH1_ID,
          title: "Subtask Level 2",
          statusCategory: "TODO",
          priority: "LOW",
        },
        csrfToken: TEST_CSRF_TOKEN,
      });

      expect(subtask.parentTaskId).toBe(ENG_105_SUBTASK_DEPTH1_ID);
    });

    it("rejects subtask exceeding maxSubtaskDepth with 400 Bad Request", async () => {
      // In ENG workspace, maxSubtaskDepth is 2. ENG-106 is already at depth 2.
      await expect(
        createTask({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          data: {
            parentTaskId: ENG_106_SUBTASK_DEPTH2_ID,
            title: "Depth 3 Subtask (Should Fail)",
            statusCategory: "TODO",
            priority: "LOW",
          },
          csrfToken: TEST_CSRF_TOKEN,
        })
      ).rejects.toThrow(ApiProblemError);

      try {
        await createTask({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          data: {
            parentTaskId: ENG_106_SUBTASK_DEPTH2_ID,
            title: "Depth 3 Subtask",
            statusCategory: "TODO",
            priority: "LOW",
          },
          csrfToken: TEST_CSRF_TOKEN,
        });
      } catch (err) {
        const problem = (err as ApiProblemError).problem;
        expect((err as ApiProblemError).status).toBe(400);
        expect(problem.title).toBe("Subtask Depth Limit Exceeded");
      }
    });

    it("enforces maxSubtaskDepth of 1 in personal workspace", async () => {
      // Create depth 1 subtask under ALEX-1 (depth 0) in personal workspace
      const depth1Subtask = await createTask({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_PERSONAL_ALEX_ID,
        data: {
          parentTaskId: ALEX_1_TASK_ID,
          title: "Alex Subtask Depth 1",
          statusCategory: "TODO",
          priority: "LOW",
        },
        csrfToken: TEST_CSRF_TOKEN,
      });
      expect(depth1Subtask.parentTaskId).toBe(ALEX_1_TASK_ID);

      // Attempting depth 2 in personal workspace must fail (limit is 1)
      await expect(
        createTask({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_PERSONAL_ALEX_ID,
          data: {
            parentTaskId: depth1Subtask.id,
            title: "Alex Subtask Depth 2 (Forbidden)",
            statusCategory: "TODO",
            priority: "LOW",
          },
          csrfToken: TEST_CSRF_TOKEN,
        })
      ).rejects.toThrow(ApiProblemError);
    });
  });

  describe("API Client: updateTask & Concurrency Control", () => {
    it("updates task fields and increments field revisions", async () => {
      const updated = await updateTask({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        taskId: ENG_101_TASK_ID,
        data: {
          title: "Updated Title PKCE",
          statusCategory: "DONE",
          baseFieldRevisions: {
            title: 1,
            statusCategory: 2,
          },
        },
        csrfToken: TEST_CSRF_TOKEN,
      });

      expect(updated.title).toBe("Updated Title PKCE");
      expect(updated.statusCategory).toBe("DONE");
      expect(updated.fieldRevisions.title).toBe(2);
      expect(updated.fieldRevisions.statusCategory).toBe(3);
    });

    it("returns 409 Conflict when baseFieldRevisions contains a stale revision", async () => {
      // Provide stale baseFieldRevisions: { title: 0 } when server is at 1
      await expect(
        updateTask({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          taskId: ENG_101_TASK_ID,
          data: {
            title: "Conflicting Update",
            baseFieldRevisions: {
              title: 0,
            },
          },
          csrfToken: TEST_CSRF_TOKEN,
        })
      ).rejects.toThrow(ApiProblemError);

      try {
        await updateTask({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          taskId: ENG_101_TASK_ID,
          data: {
            title: "Conflicting Update",
            baseFieldRevisions: {
              title: 0,
            },
          },
          csrfToken: TEST_CSRF_TOKEN,
        });
      } catch (err) {
        const problem = (err as ApiProblemError).problem;
        expect((err as ApiProblemError).status).toBe(409);
        expect(problem.title).toBe("Task Concurrency Conflict");
      }
    });
  });

  describe("React Query Hooks", () => {
    describe("useTask", () => {
      it("loads and caches task by canonical taskId", async () => {
        const queryClient = createTestQueryClient();
        const wrapper = createWrapper(queryClient);

        const { result } = renderHook(
          () =>
            useTask({
              communityId: MOCK_COMMUNITY_1_ID,
              workspaceId: WS_SHARED_ENG_ID,
              taskId: ENG_101_TASK_ID,
            }),
          { wrapper }
        );

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.taskKey).toBe("ENG-101");
        expect(result.current.data?.title).toBe("Fix critical auth token refresh race condition");

        // Verify cache inspection
        const cached = queryClient.getQueryData(
          taskQueryKey(MOCK_COMMUNITY_1_ID, WS_SHARED_ENG_ID, ENG_101_TASK_ID)
        );
        expect(cached).toBeDefined();
      });

      it("respects enabled option when taskId is undefined or enabled: false", () => {
        const queryClient = createTestQueryClient();
        const wrapper = createWrapper(queryClient);

        const { result } = renderHook(
          () =>
            useTask({
              communityId: MOCK_COMMUNITY_1_ID,
              workspaceId: WS_SHARED_ENG_ID,
              taskId: undefined,
              enabled: false,
            }),
          { wrapper }
        );
        expect(result.current.fetchStatus).toBe("idle");
      });
    });

    describe("useResolveTaskKey", () => {
      it("resolves task key and caches under taskKeyResolutionQueryKey", async () => {
        const queryClient = createTestQueryClient();
        const wrapper = createWrapper(queryClient);

        const { result } = renderHook(
          () =>
            useResolveTaskKey({
              communityId: MOCK_COMMUNITY_1_ID,
              workspaceId: WS_SHARED_ENG_ID,
              taskKey: "ENG-101",
            }),
          { wrapper }
        );

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.currentKey).toBe("ENG-101");
        expect(result.current.data?.resolvedFromAlias).toBe(false);

        const cached = queryClient.getQueryData(
          taskKeyResolutionQueryKey(MOCK_COMMUNITY_1_ID, WS_SHARED_ENG_ID, "ENG-101")
        );
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
            communityId: MOCK_COMMUNITY_1_ID,
            workspaceId: WS_SHARED_ENG_ID,
            data: {
              title: "Automated Test Task Creation",
              statusCategory: "TODO",
              priority: "URGENT",
            },
          });
        });

        expect(createdTask).toBeDefined();
        expect(createdTask.title).toBe("Automated Test Task Creation");

        // Detail cache should be seeded
        const cached = queryClient.getQueryData(
          taskQueryKey(MOCK_COMMUNITY_1_ID, WS_SHARED_ENG_ID, createdTask.id)
        );
        expect(cached).toEqual(createdTask);

        // Community-scoped my-work queries should have been invalidated
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ["communities", MOCK_COMMUNITY_1_ID, "my-work"],
        });
      });
    });

    describe("useUpdateTask", () => {
      it("performs optimistic update on cache and commits upon success", async () => {
        const queryClient = createTestQueryClient();
        const wrapper = createWrapper(queryClient);

        // Seed initial data
        const initialTask = await getTaskById({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          taskId: ENG_101_TASK_ID,
        });
        queryClient.setQueryData(
          taskQueryKey(MOCK_COMMUNITY_1_ID, WS_SHARED_ENG_ID, ENG_101_TASK_ID),
          initialTask
        );

        const { result } = renderHook(() => useUpdateTask(), { wrapper });

        await act(async () => {
          await result.current.mutateAsync({
            communityId: MOCK_COMMUNITY_1_ID,
            workspaceId: WS_SHARED_ENG_ID,
            taskId: ENG_101_TASK_ID,
            data: {
              title: "Optimistically Updated Title",
              baseFieldRevisions: {
                title: initialTask.fieldRevisions.title ?? 1,
              },
            },
          });
        });

        const cached = queryClient.getQueryData<any>(
          taskQueryKey(MOCK_COMMUNITY_1_ID, WS_SHARED_ENG_ID, ENG_101_TASK_ID)
        );
        expect(cached.title).toBe("Optimistically Updated Title");
        expect(cached.fieldRevisions.title).toBe(2);
      });

      it("rolls back optimistic update when server responds with 409 Concurrency Conflict", async () => {
        const queryClient = createTestQueryClient();
        const wrapper = createWrapper(queryClient);

        // Seed initial data
        const initialTask = await getTaskById({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          taskId: ENG_101_TASK_ID,
        });
        queryClient.setQueryData(
          taskQueryKey(MOCK_COMMUNITY_1_ID, WS_SHARED_ENG_ID, ENG_101_TASK_ID),
          initialTask
        );

        const { result } = renderHook(() => useUpdateTask(), { wrapper });

        // Submit stale revision (0 instead of 1)
        await act(async () => {
          try {
            await result.current.mutateAsync({
              communityId: MOCK_COMMUNITY_1_ID,
              workspaceId: WS_SHARED_ENG_ID,
              taskId: ENG_101_TASK_ID,
              data: {
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
        const cached = queryClient.getQueryData<any>(
          taskQueryKey(MOCK_COMMUNITY_1_ID, WS_SHARED_ENG_ID, ENG_101_TASK_ID)
        );
        expect(cached.title).toBe(initialTask.title);
      });
    });
  });
});
