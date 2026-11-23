import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { useSetTaskWatch } from "./useTaskComments.js";
import {
  useTaskCollaborationRealtime,
  type WorkspaceEventEnvelope,
} from "./useTaskCollaborationRealtime.js";
import * as commentsApi from "./api.js";

vi.mock("./api.js", () => ({
  setTaskWatchStatusApi: vi.fn(),
  getCommentsApi: vi.fn(),
  postCommentApi: vi.fn(),
  getTaskActivityApi: vi.fn(),
}));

function createWrapper(queryClient: QueryClient) {
  const authValue: AuthContextType = {
    user: { id: "user-1", displayName: "Alex Morgan", email: "alex@example.org", avatarUrl: null },
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

describe("DEF-05: Task Comments & Collaboration Community-Scoped Invalidation", () => {
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

  describe("useSetTaskWatch Mutation Invalidation", () => {
    it("invalidates community-scoped ['communities', communityId, 'my-work'] on watch state change", async () => {
      vi.mocked(commentsApi.setTaskWatchStatusApi).mockResolvedValueOnce(undefined);
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const wrapper = createWrapper(queryClient);
      const { result } = renderHook(() => useSetTaskWatch(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          communityId: "comm-alpha",
          workspaceId: "ws-platform",
          taskId: "task-999",
          watching: true,
        });
      });

      // Verifies exact community-scoped my-work query key is invalidated
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ["communities", "comm-alpha", "my-work"],
        })
      );
      // Verifies task details and activity are also invalidated
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ["task", "comm-alpha", "ws-platform", "task-999"],
        })
      );
    });
  });

  describe("useTaskCollaborationRealtime Event Invalidation", () => {
    it("invalidates community-scoped ['communities', communityId, 'my-work'] when receiving watcher.changed event", () => {
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(
        () =>
          useTaskCollaborationRealtime({
            communityId: "comm-beta",
            workspaceId: "ws-engineering",
            taskId: "task-888",
            currentUserId: "user-1",
          }),
        { wrapper }
      );

      const watcherChangedEvent: WorkspaceEventEnvelope = {
        schemaVersion: 1,
        stream: "workspace",
        communityId: "comm-beta",
        workspaceId: "ws-engineering",
        workspaceSeq: 301,
        eventId: "evt-watcher-changed-01",
        eventType: "watcher.changed",
        occurredAt: "2026-11-23T00:15:00Z",
        actorId: "user-other",
        entityId: "task-888",
        payload: {
          taskId: "task-888",
        },
      };

      act(() => {
        result.current.handleWorkspaceEvent(watcherChangedEvent);
      });

      // Verifies community-scoped my-work key is invalidated on realtime watcher.changed
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ["communities", "comm-beta", "my-work"],
        })
      );
      // Verifies single task cache is refreshed
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ["task", "comm-beta", "ws-engineering", "task-888"],
        })
      );
      // Verifies sequence is advanced
      expect(result.current.latestSequence).toBe(301);
    });
  });
});
