import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { useUpdateTask } from "./useUpdateTask.js";
import * as api from "./api.js";
import type { TaskDto } from "./types.js";

vi.mock("./api.js", () => ({
  updateTask: vi.fn(),
}));

const mockTaskResponse = {
  id: "task-001",
  taskKey: "ENG-101",
  workspaceId: "ws-1",
  title: "Updated Task Title",
  description: "Description",
  itemType: "TASK" as const,
  statusCategory: "IN_PROGRESS" as const,
  priority: "HIGH" as const,
  assigneeIds: [],
  assigneeAssignments: [],
  assigneeEditableFieldGroups: [],
  effectivePermissions: {
    canUpdateStatus: true,
    canEditDatesPriority: true,
    canAssignTask: true,
    canEditTitleDescription: true,
  },
  fieldRevisions: { statusCategory: 2 },
  creatorId: "user-1",
  dueDate: "2026-12-01",
  archivedAt: null,
  version: 2,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T01:00:00Z",
} as unknown as TaskDto;

function createWrapper(queryClient: QueryClient) {
  const authValue: AuthContextType = {
    user: { id: "user-1", displayName: "Alex", email: "alex@example.com", avatarUrl: null },
    communities: [],
    csrfToken: "mock-csrf-token",
    status: "authenticated",
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
    clearError: vi.fn(),
  };

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AuthContext.Provider value={authValue}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </AuthContext.Provider>
    );
  };
}

describe("DEF-03: useUpdateTask Mutation Boundary Guards", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it("rejects task update when communityId is missing, empty, or whitespace, and does not dispatch API call", async () => {
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useUpdateTask(), { wrapper });

    // Empty string
    await expect(
      result.current.mutateAsync({
        communityId: "",
        workspaceId: "ws-1",
        taskId: "task-001",
        data: { statusCategory: "DONE", baseFieldRevisions: {} },
      })
    ).rejects.toThrow("Cannot update task: communityId is required.");

    // Whitespace string
    await expect(
      result.current.mutateAsync({
        communityId: "   ",
        workspaceId: "ws-1",
        taskId: "task-001",
        data: { statusCategory: "DONE", baseFieldRevisions: {} },
      })
    ).rejects.toThrow("Cannot update task: communityId is required.");

    expect(api.updateTask).not.toHaveBeenCalled();
  });

  it("rejects task update when workspaceId is missing or empty, and does not dispatch API call", async () => {
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useUpdateTask(), { wrapper });

    await expect(
      result.current.mutateAsync({
        communityId: "comm-1",
        workspaceId: "",
        taskId: "task-001",
        data: { statusCategory: "DONE", baseFieldRevisions: {} },
      })
    ).rejects.toThrow("Cannot update task: workspaceId is required.");

    await expect(
      result.current.mutateAsync({
        communityId: "comm-1",
        workspaceId: "   ",
        taskId: "task-001",
        data: { statusCategory: "DONE", baseFieldRevisions: {} },
      })
    ).rejects.toThrow("Cannot update task: workspaceId is required.");

    expect(api.updateTask).not.toHaveBeenCalled();
  });

  it("rejects task update when taskId is missing or empty, and does not dispatch API call", async () => {
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useUpdateTask(), { wrapper });

    await expect(
      result.current.mutateAsync({
        communityId: "comm-1",
        workspaceId: "ws-1",
        taskId: "",
        data: { statusCategory: "DONE", baseFieldRevisions: {} },
      })
    ).rejects.toThrow("Cannot update task: taskId is required.");

    expect(api.updateTask).not.toHaveBeenCalled();
  });

  it("successfully executes valid task update via updateTask API when context is complete", async () => {
    vi.mocked(api.updateTask).mockResolvedValueOnce(mockTaskResponse);

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useUpdateTask(), { wrapper });

    let updatedResult: TaskDto | undefined;
    await act(async () => {
      updatedResult = await result.current.mutateAsync({
        communityId: "comm-1",
        workspaceId: "ws-1",
        taskId: "task-001",
        data: { statusCategory: "IN_PROGRESS", baseFieldRevisions: { statusCategory: 1 } },
      });
    });

    expect(api.updateTask).toHaveBeenCalledTimes(1);
    expect(api.updateTask).toHaveBeenCalledWith({
      communityId: "comm-1",
      workspaceId: "ws-1",
      taskId: "task-001",
      data: { statusCategory: "IN_PROGRESS", baseFieldRevisions: { statusCategory: 1 } },
      csrfToken: "mock-csrf-token",
    });
    expect(updatedResult).toEqual(mockTaskResponse);
  });
});
