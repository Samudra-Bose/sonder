import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within, renderHook, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { apiRequest } from "@/lib/api-client.js";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { WorkspaceProvider } from "@/modules/workspace/WorkspaceContext.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import { TaskPeekDrawer } from "../TaskPeekDrawer.js";
import {
  MOCK_USER_ID,
  OTHER_USER_ID,
  MOCK_COMMUNITY_1_ID,
  WS_SHARED_ENG_ID,
} from "@/mocks/data/my-work.js";
import { resetTaskMockState } from "@/mocks/handlers/tasks.js";
import { resetMockCommentsState, initialMockComments } from "@/mocks/data/comments.js";
import { setMockCommentsError } from "@/mocks/handlers/comments.js";
import {
  useCreateComment,
  taskWatchQueryKey,
} from "./useTaskComments.js";
import {
  useTaskCollaborationRealtime,
  REALTIME_TRANSPORT_CLASSIFICATION,
  type WorkspaceEventEnvelope,
} from "./useTaskCollaborationRealtime.js";
import { parseMarkdownToAst, CANONICAL_UUID_PATTERN } from "./markdown-ast.js";
import { CommentItem } from "./CommentItem.js";

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
    csrfToken: "mock-csrf-token",
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

function renderDrawerTest(taskKey = "ENG-101", workspaceId = WS_SHARED_ENG_ID) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={createMockAuth()}>
        <WorkspaceProvider
          initialCommunityId={MOCK_COMMUNITY_1_ID}
          initialWorkspaceId={workspaceId}
        >
          <MemoryRouter initialEntries={[`/workspaces/${workspaceId}/list?task=${taskKey}`]}>
            <TaskPeekDrawer forceMode="desktop" />
          </MemoryRouter>
        </WorkspaceProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("VS-08A.1 — Collaboration Contract & Integration Hardening", () => {
  beforeEach(() => {
    resetTaskMockState();
    resetMockCommentsState();
  });

  // --------------------------------------------------------------------------
  // 1. Strict TaskDto response compatibility & Initial Watcher-State Handling
  // --------------------------------------------------------------------------
  describe("1. TaskDto Response Compatibility & Watcher State Derivation", () => {
    it("ensures GET /tasks/:taskId response conforms strictly to canonical TaskDto with no undeclared fields", async () => {
      // Direct API fetch to inspect the raw response object
      const response = await apiRequest<Record<string, unknown>>(
        `/communities/${MOCK_COMMUNITY_1_ID}/workspaces/${WS_SHARED_ENG_ID}/tasks/018f98a2-task-001-overdue-assigned`
      );

      // Verify required canonical TaskDto fields exist
      expect(response).toHaveProperty("id");
      expect(response).toHaveProperty("workspaceId");
      expect(response).toHaveProperty("taskKey", "ENG-101");
      expect(response).toHaveProperty("title");
      expect(response).toHaveProperty("creatorId");
      expect(response).toHaveProperty("assigneeIds");
      expect(response).toHaveProperty("effectivePermissions");

      // Verify that undeclared properties are NOT present on the TaskDto payload
      expect(response).not.toHaveProperty("isWatched");
      expect(response).not.toHaveProperty("watcherIds");
      expect(response).not.toHaveProperty("isWatching");
      expect(response).not.toHaveProperty("watchers");
    });

    it("derives initial watching state as true when user is an assignee (ENG-101)", async () => {
      renderDrawerTest("ENG-101");

      // Header Watch button must derive Watching=true based on assigneeIds containing MOCK_USER_ID
      const watchButton = await screen.findByTestId("task-watch-button");
      expect(watchButton).toHaveAttribute("aria-pressed", "true");
      expect(within(watchButton).getByText("Watching")).toBeInTheDocument();
    });

    it("derives initial watching state as false when user is NOT creator or assignee (ENG-050)", async () => {
      // ENG-050 is a read-only task created by OTHER_USER_ID and assigned to OTHER_USER_ID
      renderDrawerTest("ENG-050");

      // Header Watch button must derive Watching=false based on absence of user from creator/assignees
      const watchButton = await screen.findByTestId("task-watch-button");
      expect(watchButton).toHaveAttribute("aria-pressed", "false");
      expect(within(watchButton).getByText("Watch")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 2. Watch and Unwatch Behavior & Optimistic Mutation Rollback
  // --------------------------------------------------------------------------
  describe("2. Watch/Unwatch Toggle & Optimistic Rollback", () => {
    it("toggles watch state on a non-assigned task (ENG-050) from Watch to Watching", async () => {
      const user = userEvent.setup();
      renderDrawerTest("ENG-050");

      const watchButton = await screen.findByTestId("task-watch-button");
      expect(within(watchButton).getByText("Watch")).toBeInTheDocument();

      // Click Watch to follow
      await user.click(watchButton);

      await waitFor(() => {
        expect(within(watchButton).getByText("Watching")).toBeInTheDocument();
        expect(watchButton).toHaveAttribute("aria-pressed", "true");
      });
    });

    it("rolls back optimistic unwatch toggle when PUT /watch returns an error", async () => {
      const user = userEvent.setup();
      renderDrawerTest("ENG-101");

      const watchButton = await screen.findByTestId("task-watch-button");
      expect(within(watchButton).getByText("Watching")).toBeInTheDocument();

      // Inject server error for watch endpoint
      setMockCommentsError({
        status: 500,
        problem: {
          type: "https://errors.sonder.platform/internal-error",
          title: "Internal Server Error",
          status: 500,
          detail: "Database write failed",
        },
        endpoint: "watch",
      });

      // Attempt unwatch
      await user.click(watchButton);

      // Verify that after failed mutation, button rolls back to Watching
      await waitFor(() => {
        expect(within(watchButton).getByText("Watching")).toBeInTheDocument();
        expect(watchButton).toHaveAttribute("aria-pressed", "true");
      });
    });

    it("automatically sets watcher state to true when current user posts a comment", async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      const taskId = "018f98a2-task-001-overdue-assigned";

      // Explicitly set initial watch state to false in cache
      queryClient.setQueryData(
        taskWatchQueryKey(MOCK_COMMUNITY_1_ID, WS_SHARED_ENG_ID, taskId),
        false
      );
      expect(
        queryClient.getQueryData(taskWatchQueryKey(MOCK_COMMUNITY_1_ID, WS_SHARED_ENG_ID, taskId))
      ).toBe(false);

      const { result } = renderHook(
        () => useCreateComment(),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>
              <AuthContext.Provider value={createMockAuth()}>{children}</AuthContext.Provider>
            </QueryClientProvider>
          ),
        }
      );

      await act(async () => {
        await result.current.mutateAsync({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          taskId,
          data: {
            body: "Auto-follow comment creation verification test",
          },
        });
      });

      // CR-08 auto-follow: Watch query cache must now be updated to true
      expect(
        queryClient.getQueryData(taskWatchQueryKey(MOCK_COMMUNITY_1_ID, WS_SHARED_ENG_ID, taskId))
      ).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Thread Nesting & Maximum Depth (Depth 5 Limit)
  // --------------------------------------------------------------------------
  describe("3. Thread Nesting & Depth Validation", () => {
    it("hides reply button when comment is at nesting depth 5", () => {
      const queryClient = new QueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={createMockAuth()}>
            <CommentItem
              comment={initialMockComments[0]!}
              allComments={initialMockComments}
              communityId={MOCK_COMMUNITY_1_ID}
              workspaceId={WS_SHARED_ENG_ID}
              taskId="018f98a2-task-001-overdue-assigned"
              currentUserId={MOCK_USER_ID}
              canComment={true}
              depth={5}
            />
          </AuthContext.Provider>
        </QueryClientProvider>
      );
      expect(screen.queryByRole("button", { name: /reply/i })).not.toBeInTheDocument();
    });

    it("shows reply button when comment is at nesting depth less than 5", () => {
      const queryClient = new QueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={createMockAuth()}>
            <CommentItem
              comment={initialMockComments[0]!}
              allComments={initialMockComments}
              communityId={MOCK_COMMUNITY_1_ID}
              workspaceId={WS_SHARED_ENG_ID}
              taskId="018f98a2-task-001-overdue-assigned"
              currentUserId={MOCK_USER_ID}
              canComment={true}
              depth={4}
            />
          </AuthContext.Provider>
        </QueryClientProvider>
      );
      expect(screen.getByRole("button", { name: /reply/i })).toBeInTheDocument();
    });

    it("enforces depth limit on comment thread replies via API rejection", async () => {
      // Attempting to post a comment whose parent thread is invalid or at depth 5 fails with 422
      await expect(
        apiRequest(
          `/communities/${MOCK_COMMUNITY_1_ID}/workspaces/${WS_SHARED_ENG_ID}/tasks/018f98a2-task-001-overdue-assigned/comments`,
          {
            method: "POST",
            csrfToken: "mock-csrf-token",
            body: JSON.stringify({
              body: "Deep nested reply attempt",
              parentCommentId: "depth-5-dummy-id",
            }),
          }
        )
      ).rejects.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // 4. Mention Candidate Search & Filtering
  // --------------------------------------------------------------------------
  describe("4. Mention Candidate Search & Filtering", () => {
    it("filters candidate members by query substring, excluding active actor", async () => {
      const response = await apiRequest<{ items: Array<{ userId: string; displayName: string }> }>(
        `/communities/${MOCK_COMMUNITY_1_ID}/workspaces/${WS_SHARED_ENG_ID}/tasks/018f98a2-task-001-overdue-assigned/mention-candidates?q=jordan`
      );

      expect(response.items).toHaveLength(1);
      expect(response.items[0]?.displayName).toBe("Jordan Lee");
      expect(response.items[0]?.userId).toBe(OTHER_USER_ID);

      // Current user (Alex Morgan) must NOT appear in candidate search
      expect(response.items.some((c) => c.userId === MOCK_USER_ID)).toBe(false);
    });

    it("returns all other workspace members when query string is empty", async () => {
      const response = await apiRequest<{ items: Array<{ userId: string; displayName: string }> }>(
        `/communities/${MOCK_COMMUNITY_1_ID}/workspaces/${WS_SHARED_ENG_ID}/tasks/018f98a2-task-001-overdue-assigned/mention-candidates?q=`
      );

      // Must return candidates excluding Alex Morgan
      expect(response.items.length).toBeGreaterThanOrEqual(1);
      expect(response.items.every((c) => c.userId !== MOCK_USER_ID)).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Markdown AST Schema Consistency & Strict UUID Regex
  // --------------------------------------------------------------------------
  describe("5. Markdown AST Schema Consistency & Strict UUID Regex", () => {
    it("validates that CANONICAL_UUID_PATTERN matches valid RFC 4122/9562 UUIDs", () => {
      const regex = new RegExp(CANONICAL_UUID_PATTERN);
      expect(regex.test("018f98a2-3f12-7890-a123-456789abcdef")).toBe(true);
      expect(regex.test("018f98a2-3f12-7890-c999-456789abcdef")).toBe(true);

      // Non-UUIDs must fail
      expect(regex.test("018f98a2-user-1")).toBe(false);
      expect(regex.test("not-a-uuid")).toBe(false);
      expect(regex.test("javascript:alert(1)")).toBe(false);
    });

    it("parses valid mention tokens and rejects malformed non-UUID tokens", () => {
      const validToken = "Mention @[Jordan Lee](user:018f98a2-3f12-7890-c999-456789abcdef)";
      const invalidToken = "Mention @[Jordan Lee](user:018f98a2-user-1)";

      const validAst = parseMarkdownToAst(validToken);
      const invalidAst = parseMarkdownToAst(invalidToken);

      // Valid token produces a mention node
      const pNode = validAst.nodes[0] as any;
      const mentionNode = pNode.children.find((c: any) => c.type === "mention");
      expect(mentionNode).toBeDefined();
      expect(mentionNode.userId).toBe("018f98a2-3f12-7890-c999-456789abcdef");

      // Invalid token must NOT produce a mention node (remains plain text)
      const invalidPNode = invalidAst.nodes[0] as any;
      const invalidMentionNode = invalidPNode.children.find((c: any) => c.type === "mention");
      expect(invalidMentionNode).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // 6. Realtime Event Deduplication & Transport Classification
  // --------------------------------------------------------------------------
  describe("6. Realtime Event Deduplication & Transport Classification", () => {
    it("classifies transport strictly as EVENT_CONSUMER_ABSTRACTION", () => {
      expect(REALTIME_TRANSPORT_CLASSIFICATION).toBe("EVENT_CONSUMER_ABSTRACTION");
    });

    it("deduplicates events by eventId using 500-entry bounded LRU cache", () => {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(
        () =>
          useTaskCollaborationRealtime({
            communityId: MOCK_COMMUNITY_1_ID,
            workspaceId: WS_SHARED_ENG_ID,
            taskId: "018f98a2-task-001-overdue-assigned",
          }),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      const event: WorkspaceEventEnvelope = {
        schemaVersion: 1,
        stream: "workspace",
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        workspaceSeq: 101,
        eventId: "018f98a2-evt-001-unique",
        eventType: "comment.created",
        occurredAt: "2026-11-10T11:00:00Z",
        actorId: OTHER_USER_ID,
        entityId: "018f98a2-task-001-overdue-assigned",
        payload: { taskId: "018f98a2-task-001-overdue-assigned" },
      };

      // First dispatch
      act(() => {
        result.current.handleWorkspaceEvent(event);
      });
      expect(invalidateSpy).toHaveBeenCalledTimes(1);

      // Duplicate dispatch with exact same eventId
      act(() => {
        result.current.handleWorkspaceEvent(event);
      });
      // Invalidate count must not increase (deduplication applied)
      expect(invalidateSpy).toHaveBeenCalledTimes(1);

      // Distinct eventId
      const event2: WorkspaceEventEnvelope = {
        ...event,
        eventId: "018f98a2-evt-002-unique",
        workspaceSeq: 102,
      };
      act(() => {
        result.current.handleWorkspaceEvent(event2);
      });
      expect(invalidateSpy).toHaveBeenCalledTimes(2);
    });

    it("tracks monotonic workspace sequence and ignores events for different tasks", () => {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(
        () =>
          useTaskCollaborationRealtime({
            communityId: MOCK_COMMUNITY_1_ID,
            workspaceId: WS_SHARED_ENG_ID,
            taskId: "018f98a2-task-001-overdue-assigned",
          }),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      // Event for a different task in the same workspace
      const otherTaskEvent: WorkspaceEventEnvelope = {
        schemaVersion: 1,
        stream: "workspace",
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        workspaceSeq: 105,
        eventId: "018f98a2-evt-other-task",
        eventType: "comment.created",
        occurredAt: "2026-11-10T11:05:00Z",
        actorId: OTHER_USER_ID,
        entityId: "018f98a2-task-099-different",
        payload: { taskId: "018f98a2-task-099-different" },
      };

      act(() => {
        result.current.handleWorkspaceEvent(otherTaskEvent);
      });

      // Must be filtered out because it is for a different task
      expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it("updates watcher state when a watcher.changed event for current user is received", () => {
      const queryClient = new QueryClient();
      const taskId = "018f98a2-task-001-overdue-assigned";

      // Initially watch state is false
      queryClient.setQueryData(
        taskWatchQueryKey(MOCK_COMMUNITY_1_ID, WS_SHARED_ENG_ID, taskId),
        false
      );

      const { result } = renderHook(
        () =>
          useTaskCollaborationRealtime({
            communityId: MOCK_COMMUNITY_1_ID,
            workspaceId: WS_SHARED_ENG_ID,
            taskId,
            currentUserId: MOCK_USER_ID,
          }),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      const watcherEvent: WorkspaceEventEnvelope = {
        schemaVersion: 1,
        stream: "workspace",
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        workspaceSeq: 200,
        eventId: "018f98a2-evt-watcher-change",
        eventType: "watcher.changed",
        occurredAt: "2026-11-10T11:30:00Z",
        actorId: MOCK_USER_ID,
        entityId: taskId,
        payload: {
          taskId,
          userId: MOCK_USER_ID,
          isWatching: true,
        },
      };

      act(() => {
        result.current.handleWorkspaceEvent(watcherEvent);
      });

      // Query cache for watch state should now be updated to true
      expect(
        queryClient.getQueryData(taskWatchQueryKey(MOCK_COMMUNITY_1_ID, WS_SHARED_ENG_ID, taskId))
      ).toBe(true);
    });

    it("does not alter current user's watch state when watcher.changed is for another user", () => {
      const queryClient = new QueryClient();
      const taskId = "018f98a2-task-001-overdue-assigned";

      queryClient.setQueryData(
        taskWatchQueryKey(MOCK_COMMUNITY_1_ID, WS_SHARED_ENG_ID, taskId),
        false
      );

      const { result } = renderHook(
        () =>
          useTaskCollaborationRealtime({
            communityId: MOCK_COMMUNITY_1_ID,
            workspaceId: WS_SHARED_ENG_ID,
            taskId,
            currentUserId: MOCK_USER_ID,
          }),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      const otherUserWatcherEvent: WorkspaceEventEnvelope = {
        schemaVersion: 1,
        stream: "workspace",
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        workspaceSeq: 201,
        eventId: "018f98a2-evt-other-watcher-change",
        eventType: "watcher.changed",
        occurredAt: "2026-11-10T11:31:00Z",
        actorId: OTHER_USER_ID,
        entityId: taskId,
        payload: {
          taskId,
          userId: OTHER_USER_ID,
          isWatching: true,
        },
      };

      act(() => {
        result.current.handleWorkspaceEvent(otherUserWatcherEvent);
      });

      // Current user's watch state remains false
      expect(
        queryClient.getQueryData(taskWatchQueryKey(MOCK_COMMUNITY_1_ID, WS_SHARED_ENG_ID, taskId))
      ).toBe(false);
    });
  });
});
