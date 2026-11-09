import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextType } from "@/modules/auth/index.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import {
  WS_SHARED_ENG_ID,
  WS_SHARED_GALA_ID,
  MOCK_COMMUNITY_1_ID,
} from "@/mocks/data/my-work.js";
import {
  useMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
  milestonesQueryKey,
} from "./useMilestones.js";
import { resetMockMilestones } from "@/mocks/data/milestones.js";
import { resetTaskMockState, getMockTasks } from "@/mocks/handlers/tasks.js";

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
        staleTime: 0,
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

describe("Milestones Data Layer & Invariants", () => {
  beforeEach(() => {
    resetTaskMockState();
    resetMockMilestones();
  });

  it("lists workspace milestones and enforces workspace isolation", async () => {
    // 1. Fetch milestones for Engineering workspace
    const { result: engResult } = renderHook(
      () => useMilestones(MOCK_COMMUNITY_1_ID, WS_SHARED_ENG_ID),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(engResult.current.isSuccess).toBe(true));
    expect(engResult.current.data?.items).toBeDefined();
    expect(engResult.current.data?.items.length).toBeGreaterThan(0);
    // Every milestone must belong strictly to WS_SHARED_ENG_ID
    for (const m of engResult.current.data!.items) {
      expect(m.workspaceId).toBe(WS_SHARED_ENG_ID);
    }

    // 2. Fetch milestones for Gala workspace
    const { result: galaResult } = renderHook(
      () => useMilestones(MOCK_COMMUNITY_1_ID, WS_SHARED_GALA_ID),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(galaResult.current.isSuccess).toBe(true));
    expect(galaResult.current.data?.items).toBeDefined();
    for (const m of galaResult.current.data!.items) {
      expect(m.workspaceId).toBe(WS_SHARED_GALA_ID);
    }

    // Isolation check: no milestone in engResult should appear in galaResult
    const engIds = new Set(engResult.current.data!.items.map((m) => m.id));
    for (const galaM of galaResult.current.data!.items) {
      expect(engIds.has(galaM.id)).toBe(false);
    }
  });

  it("creates a new milestone and invalidates cache", async () => {
    const wrapper = createWrapper();
    const { result: listHook } = renderHook(
      () => useMilestones(MOCK_COMMUNITY_1_ID, WS_SHARED_ENG_ID),
      { wrapper }
    );

    await waitFor(() => expect(listHook.current.isSuccess).toBe(true));
    const initialCount = listHook.current.data!.items.length;

    const { result: createHook } = renderHook(() => useCreateMilestone(), { wrapper });

    let createdMilestone: any;
    await waitFor(async () => {
      createdMilestone = await createHook.current.mutateAsync({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        data: {
          name: "Q4 Production Launch",
          description: "Production launch event for Q4",
          targetDate: "2026-12-15",
        },
      });
    });

    expect(createdMilestone).toBeDefined();
    expect(createdMilestone.name).toBe("Q4 Production Launch");
    expect(createdMilestone.targetDate).toBe("2026-12-15");
    expect(createdMilestone.workspaceId).toBe(WS_SHARED_ENG_ID);

    await waitFor(() => {
      expect(listHook.current.data!.items.length).toBe(initialCount + 1);
    });
  });

  it("updates an existing milestone", async () => {
    const wrapper = createWrapper();
    const { result: listHook } = renderHook(
      () => useMilestones(MOCK_COMMUNITY_1_ID, WS_SHARED_ENG_ID),
      { wrapper }
    );

    await waitFor(() => expect(listHook.current.isSuccess).toBe(true));
    const firstMilestone = listHook.current.data!.items[0]!;

    const { result: updateHook } = renderHook(() => useUpdateMilestone(), { wrapper });

    let updatedMilestone: any;
    await waitFor(async () => {
      updatedMilestone = await updateHook.current.mutateAsync({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        milestoneId: firstMilestone.id,
        data: {
          name: "Updated Milestone Title",
          targetDate: "2026-11-20",
        },
      });
    });

    expect(updatedMilestone.name).toBe("Updated Milestone Title");
    expect(updatedMilestone.targetDate).toBe("2026-11-20");
  });

  it("deletes a milestone and clears task milestoneId references on the server", async () => {
    const wrapper = createWrapper();
    const { result: listHook } = renderHook(
      () => useMilestones(MOCK_COMMUNITY_1_ID, WS_SHARED_ENG_ID),
      { wrapper }
    );

    await waitFor(() => expect(listHook.current.isSuccess).toBe(true));
    const targetMilestone = listHook.current.data!.items[0]!;

    // Verify at least one task currently links to this milestone
    const tasksBefore = getMockTasks();
    const linkedTasksBefore = tasksBefore.filter((t) => t.milestoneId === targetMilestone.id);
    expect(linkedTasksBefore.length).toBeGreaterThan(0);

    const { result: deleteHook } = renderHook(() => useDeleteMilestone(), { wrapper });

    await waitFor(async () => {
      await deleteHook.current.mutateAsync({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        milestoneId: targetMilestone.id,
      });
    });

    // Milestone must be gone from the list
    await waitFor(() => {
      const found = listHook.current.data!.items.find((m) => m.id === targetMilestone.id);
      expect(found).toBeUndefined();
    });

    // Tasks that previously pointed to this milestone must have milestoneId set to null
    const tasksAfter = getMockTasks();
    const linkedTasksAfter = tasksAfter.filter((t) => t.milestoneId === targetMilestone.id);
    expect(linkedTasksAfter.length).toBe(0);
  });

  it("fails closed when CSRF token is missing on mutating operations", async () => {
    const unauthedAuth: AuthContextType = {
      ...mockAuthValue,
      csrfToken: null,
    };
    const wrapper = createWrapper(unauthedAuth);

    const { result: createHook } = renderHook(() => useCreateMilestone(), { wrapper });

    await expect(
      createHook.current.mutateAsync({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        data: { name: "Unauthorized Milestone" },
      })
    ).rejects.toThrow("CSRF token is not initialized");
  });
});
