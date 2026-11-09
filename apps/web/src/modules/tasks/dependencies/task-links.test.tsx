import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextType } from "@/modules/auth/index.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import {
  useTaskLinks,
  useCreateTaskLink,
  useDeleteTaskLink,
} from "./useTaskLinks.js";
import { resetTaskMockState } from "@/mocks/handlers/tasks.js";
import {
  WS_SHARED_ENG_ID,
  MOCK_COMMUNITY_1_ID,
} from "@/mocks/data/my-work.js";

const mockAuthValue: AuthContextType = {
  user: {
    id: "018f98a2-3f12-7890-a001-23456789abcd",
    email: "alex@example.com",
    displayName: "Alex Morgan",
    avatarUrl: null,
  },
  communities: defaultMockCommunities,
  status: "authenticated",
  error: null,
  csrfToken: "mock-valid-csrf-token",
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
  clearError: vi.fn(),
};

function createWrapper(authValue = mockAuthValue) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          {children}
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };
}

describe("Task Links Hook & API Integration", () => {
  beforeEach(() => {
    resetTaskMockState();
  });

  it("fetches task links for ENG-101 and properly identifies conflict & restricted endpoints", async () => {
    const wrapper = createWrapper();
    const taskId = "018f98a2-task-001-overdue-assigned"; // ENG-101

    const { result } = renderHook(
      () => useTaskLinks(MOCK_COMMUNITY_1_ID, WS_SHARED_ENG_ID, taskId),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const links = result.current.data?.items ?? [];
    expect(links.length).toBeGreaterThanOrEqual(2);

    // Link 1: ENG-101 BLOCKS ENG-105
    const blocksLink = links.find((l) => l.targetKey === "ENG-105");
    expect(blocksLink).toBeDefined();
    expect(blocksLink?.type).toBe("BLOCKS");
    expect(blocksLink?.targetAccessible).toBe(true);
    expect(blocksLink?.targetTitle).toBe("Write concurrent refresh token unit tests");
    expect(blocksLink?.targetStatusCategory).toBe("TODO");
  });

  it("creates a new valid link between two tasks", async () => {
    const wrapper = createWrapper();
    const taskId = "018f98a2-task-001-subtask-1"; // ENG-105
    const targetTaskId = "018f98a2-task-011-viewer-readonly"; // ENG-050

    const { result: createHook } = renderHook(() => useCreateTaskLink(), { wrapper });

    let createdLink: unknown;
    await act(async () => {
      createdLink = await createHook.current.mutateAsync({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        taskId,
        data: {
          targetTaskId,
          type: "RELATES_TO",
        },
      });
    });

    expect(createdLink).toBeDefined();
    expect((createdLink as { type: string }).type).toBe("RELATES_TO");
    expect((createdLink as { targetKey: string }).targetKey).toBe("ENG-050");
  });

  it("prevents self-linking with 422 SELF_LINK_NOT_ALLOWED", async () => {
    const wrapper = createWrapper();
    const taskId = "018f98a2-task-001-overdue-assigned";

    const { result: createHook } = renderHook(() => useCreateTaskLink(), { wrapper });

    await expect(
      createHook.current.mutateAsync({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        taskId,
        data: {
          targetTaskId: taskId,
          type: "BLOCKS",
        },
      })
    ).rejects.toThrow();
  });

  it("prevents dependency cycle with 422 DEPENDENCY_CYCLE_DETECTED", async () => {
    const wrapper = createWrapper();
    // In seed data: ENG-101 BLOCKS ENG-105
    // Attempting ENG-105 BLOCKS ENG-101 must be rejected due to cycle
    const eng101Id = "018f98a2-task-001-overdue-assigned";
    const eng105Id = "018f98a2-task-001-subtask-1";

    const { result: createHook } = renderHook(() => useCreateTaskLink(), { wrapper });

    await expect(
      createHook.current.mutateAsync({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        taskId: eng105Id,
        data: {
          targetTaskId: eng101Id,
          type: "BLOCKS",
        },
      })
    ).rejects.toThrow();
  });

  it("deletes a task link and removes it from queries", async () => {
    const wrapper = createWrapper();
    const taskId = "018f98a2-task-001-overdue-assigned";

    const { result: linksHook } = renderHook(
      () => useTaskLinks(MOCK_COMMUNITY_1_ID, WS_SHARED_ENG_ID, taskId),
      { wrapper }
    );

    await waitFor(() => {
      expect(linksHook.current.isSuccess).toBe(true);
    });

    const linkToDelete = linksHook.current.data?.items[0];
    expect(linkToDelete).toBeDefined();

    const { result: deleteHook } = renderHook(() => useDeleteTaskLink(), { wrapper });

    await act(async () => {
      await deleteHook.current.mutateAsync({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        taskId,
        linkId: linkToDelete!.id,
      });
    });

    // Refetch links
    await act(async () => {
      await linksHook.current.refetch();
    });

    const remaining = linksHook.current.data?.items ?? [];
    expect(remaining.some((l) => l.id === linkToDelete!.id)).toBe(false);
  });
});
