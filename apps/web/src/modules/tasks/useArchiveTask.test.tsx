import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { useArchiveTask, useRestoreTask } from "./useArchiveTask.js";
import * as api from "./api.js";
import type { TaskDto, ArchiveTaskResultDto } from "./types.js";

vi.mock("./api.js", () => ({
  archiveTask: vi.fn(),
  restoreTask: vi.fn(),
}));

const mockTask = {
  id: "task-001",
  taskKey: "ENG-101",
  workspaceId: "ws-1",
  title: "Test Task",
  description: "Description",
  itemType: "TASK" as const,
  statusCategory: "TODO" as const,
  priority: "MEDIUM" as const,
  assigneeIds: [],
  assigneeAssignments: [],
  assigneeEditableFieldGroups: [],
  effectivePermissions: {
    canUpdateStatus: true,
    canEditDatesPriority: true,
    canAssignTask: true,
    canEditTitleDescription: true,
  },
  fieldRevisions: {},
  creatorId: "user-1",
  dueDate: "2026-12-01",
  archivedAt: null,
  version: 1,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
} as unknown as TaskDto;

const mockArchiveResult: ArchiveTaskResultDto = {
  taskId: "task-001",
  undoToken: "undo-token-123",
  undoExpiresAt: "2026-11-22T00:01:00Z",
  trashExpiresAt: "2026-12-22T00:00:00Z",
};

function createWrapper(queryClient: QueryClient) {
  const authValue: AuthContextType = {
    user: { id: "user-1", displayName: "Alex", email: "alex@example.com", avatarUrl: null },
    communities: [],
    csrfToken: "mock-csrf",
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

describe("DEF-04: useArchiveTask & useRestoreTask Cache Invalidation", () => {
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

  it("invalidates the active community's my-work query on successful archive", async () => {
    vi.mocked(api.archiveTask).mockResolvedValueOnce(mockArchiveResult);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(
      () => useArchiveTask({ communityId: "comm-1", workspaceId: "ws-1" }),
      { wrapper }
    );

    await act(async () => {
      await result.current.mutateAsync({ task: mockTask, communityId: "comm-1", workspaceId: "ws-1" });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["communities", "comm-1", "my-work"],
      })
    );
  });

  it("invalidates the active community's my-work query on successful restore", async () => {
    vi.mocked(api.restoreTask).mockResolvedValueOnce(mockTask);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(
      () => useRestoreTask({ communityId: "comm-1", workspaceId: "ws-1" }),
      { wrapper }
    );

    await act(async () => {
      await result.current.mutateAsync({ task: mockTask, undoToken: "token-1", communityId: "comm-1", workspaceId: "ws-1" });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["communities", "comm-1", "my-work"],
      })
    );
  });
});
