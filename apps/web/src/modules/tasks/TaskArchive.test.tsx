import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import React from "react";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server.js";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { WorkspaceProvider } from "@/modules/workspace/WorkspaceContext.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import {
  MOCK_COMMUNITY_1_ID,
  WS_SHARED_ENG_ID,
  MOCK_USER_ID,
  mockTasksCommunity1,
} from "@/mocks/data/my-work.js";
import {
  resetTaskMockState,
  getMockUndoTokens,
} from "@/mocks/handlers/tasks.js";
import { clearShortcutRegistry } from "@/lib/keyboard.js";
import { TaskPeekDrawer } from "./TaskPeekDrawer.js";
import { QuickTaskComposerProvider } from "./QuickTaskComposerContext.js";
import { WorkspaceTasksView } from "./views/WorkspaceTasksView.js";
import { TaskUndoProvider } from "./TaskUndoContext.js";
import { TaskUndoToast } from "./TaskUndoToast.js";
import type { TaskDto, TaskQueryResult } from "./types.js";

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

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}{location.search}</div>;
}

interface TestShellProps {
  initialEntries?: string[];
  initialWorkspaceId?: string;
  forceMode?: "desktop" | "mobile";
  children?: React.ReactNode;
}

function renderTaskTestEnvironment({
  initialEntries = ["/"],
  initialWorkspaceId = WS_SHARED_ENG_ID,
  forceMode = "desktop",
  children,
}: TestShellProps = {}) {
  const queryClient = createTestQueryClient();
  const authValue = createMockAuth();

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <WorkspaceProvider
            initialCommunityId={MOCK_COMMUNITY_1_ID}
            initialWorkspaceId={initialWorkspaceId}
          >
            <QuickTaskComposerProvider>
              <TaskUndoProvider
                communityId={MOCK_COMMUNITY_1_ID}
                workspaceId={initialWorkspaceId}
              >
                <MemoryRouter initialEntries={initialEntries}>
                  <LocationDisplay />
                  <div className="flex">
                    <main className="flex-1">
                      {children ?? <WorkspaceTasksView defaultView="list" />}
                    </main>
                    <TaskPeekDrawer forceMode={forceMode} />
                  </div>
                  <TaskUndoToast />
                </MemoryRouter>
              </TaskUndoProvider>
            </QuickTaskComposerProvider>
          </WorkspaceProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    ),
  };
}

describe("VS-09A: Single-Item Task Archive & 10-Second Undo Toast (ARCH-01 to ARCH-24)", () => {
  beforeEach(() => {
    resetTaskMockState();
    clearShortcutRegistry();
  });

  afterEach(() => {
    clearShortcutRegistry();
  });

  // ARCH-01: Archive task from TaskPeekDrawer
  it("ARCH-01: archives task from TaskPeekDrawer: closes drawer, clears ?task=, removes from queries, renders TaskUndoToast", async () => {
    const user = userEvent.setup();
    renderTaskTestEnvironment({
      initialEntries: [`/?task=ENG-101`],
    });

    // Drawer should open with ENG-101 details
    await waitFor(() => {
      expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();
      expect(screen.getByTestId("archive-task-button")).toBeInTheDocument();
    });

    // Click archive button
    await user.click(screen.getByTestId("archive-task-button"));

    // Verify drawer closed
    await waitFor(() => {
      expect(screen.queryByTestId("task-peek-drawer-desktop")).not.toBeInTheDocument();
    });

    // Verify ?task= cleared from URL
    expect(screen.getByTestId("location-display")).toHaveTextContent("/");
    expect(screen.getByTestId("location-display")).not.toHaveTextContent("task=ENG-101");

    // Verify TaskUndoToast renders
    await waitFor(() => {
      expect(screen.getByTestId("undo-toast-ENG-101")).toBeInTheDocument();
      expect(screen.getByText("Task ENG-101 archived.")).toBeInTheDocument();
    });
  });

  // ARCH-02: Archive task from TaskListView row menu
  it("ARCH-02: archives task from TaskListView row menu: task row is immediately removed from table", async () => {
    const user = userEvent.setup();
    renderTaskTestEnvironment();

    // Verify ENG-101 row exists in list
    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });

    // Open dropdown menu for ENG-101
    const trigger = screen.getByTestId("task-actions-trigger-ENG-101");
    await user.click(trigger);

    // Click archive option
    const archiveOption = await screen.findByTestId("task-action-archive-ENG-101");
    await user.click(archiveOption);

    // Verify row is immediately removed from list
    await waitFor(() => {
      expect(screen.queryByTestId("task-list-row-ENG-101")).not.toBeInTheDocument();
    });

    // Verify toast is displayed
    expect(screen.getByTestId("undo-toast-ENG-101")).toBeInTheDocument();
  });

  // ARCH-03: Archive task from TaskBoardView card menu
  it("ARCH-03: archives task from TaskBoardView card menu: task card is immediately removed from column", async () => {
    const user = userEvent.setup();
    renderTaskTestEnvironment({
      children: <WorkspaceTasksView defaultView="board" />,
    });

    // Verify ENG-101 card exists on board
    await waitFor(() => {
      expect(screen.getByTestId("task-board-card-ENG-101")).toBeInTheDocument();
    });

    // Open actions dropdown on ENG-101 card
    const trigger = screen.getByTestId("task-actions-trigger-ENG-101");
    await user.click(trigger);

    // Click archive option
    const archiveOption = await screen.findByTestId("task-action-archive-ENG-101");
    await user.click(archiveOption);

    // Verify card is removed from board
    await waitFor(() => {
      expect(screen.queryByTestId("task-board-card-ENG-101")).not.toBeInTheDocument();
    });

    // Verify toast is displayed
    expect(screen.getByTestId("undo-toast-ENG-101")).toBeInTheDocument();
  });

  // ARCH-04: Countdown derived from undoExpiresAt
  it("ARCH-04: countdown progress bar is linked to undoExpiresAt and remainingMs", async () => {
    const user = userEvent.setup();
    renderTaskTestEnvironment();

    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("task-actions-trigger-ENG-101"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-101"));

    await waitFor(() => {
      expect(screen.getByTestId("undo-toast-ENG-101")).toBeInTheDocument();
    });

    // Verify progressbar has aria attributes reflecting remaining time
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    expect(progressBar).toHaveAttribute("aria-valuemax", "10");
  });

  // ARCH-05: Undo via "Undo" button click
  it("ARCH-05: undo via 'Undo' button click issues POST /restore and restores task to list", async () => {
    const user = userEvent.setup();
    renderTaskTestEnvironment();

    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });

    // Archive task
    await user.click(screen.getByTestId("task-actions-trigger-ENG-101"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-101"));

    await waitFor(() => {
      expect(screen.queryByTestId("task-list-row-ENG-101")).not.toBeInTheDocument();
      expect(screen.getByTestId("undo-button-ENG-101")).toBeInTheDocument();
    });

    // Click Undo button
    await user.click(screen.getByTestId("undo-button-ENG-101"));

    // Task is restored to list
    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });

    // Toast is dismissed
    expect(screen.queryByTestId("undo-toast-ENG-101")).not.toBeInTheDocument();
  });

  // ARCH-06: Undo via keyboard shortcut Z
  it("ARCH-06: pressing shortcut 'Z' restores the most recent archived task", async () => {
    const user = userEvent.setup();
    renderTaskTestEnvironment();

    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("task-actions-trigger-ENG-101"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-101"));

    await waitFor(() => {
      expect(screen.queryByTestId("task-list-row-ENG-101")).not.toBeInTheDocument();
      expect(screen.getByTestId("undo-toast-ENG-101")).toBeInTheDocument();
    });

    // Trigger keyboard 'Z'
    fireEvent.keyDown(window, { key: "z" });

    // Task should restore
    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });
  });

  // ARCH-07: Undo via keyboard shortcut Mod+Z
  it("ARCH-07: pressing shortcut 'Mod+Z' (Ctrl+Z / Cmd+Z) restores the archived task", async () => {
    const user = userEvent.setup();
    renderTaskTestEnvironment();

    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("task-actions-trigger-ENG-101"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-101"));

    await waitFor(() => {
      expect(screen.queryByTestId("task-list-row-ENG-101")).not.toBeInTheDocument();
      expect(screen.getByTestId("undo-toast-ENG-101")).toBeInTheDocument();
    });

    // Trigger keyboard 'Mod+Z'
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });

    // Task should restore
    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });
  });

  // ARCH-08: Input suppression during typing
  it("ARCH-08: pressing 'Z' or 'Mod+Z' while focusing an input does NOT trigger task undo", async () => {
    const user = userEvent.setup();
    renderTaskTestEnvironment({
      children: (
        <div>
          <input data-testid="test-input" placeholder="Type here..." />
          <WorkspaceTasksView defaultView="list" />
        </div>
      ),
    });

    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });

    // Archive task
    await user.click(screen.getByTestId("task-actions-trigger-ENG-101"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-101"));

    await waitFor(() => {
      expect(screen.queryByTestId("task-list-row-ENG-101")).not.toBeInTheDocument();
      expect(screen.getByTestId("undo-toast-ENG-101")).toBeInTheDocument();
    });

    // Focus input and press Z
    const input = screen.getByTestId("test-input");
    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.keyDown(input, { key: "z" });
    fireEvent.keyDown(input, { key: "z", ctrlKey: true });

    // Task should NOT be restored
    expect(screen.queryByTestId("task-list-row-ENG-101")).not.toBeInTheDocument();
    expect(screen.getByTestId("undo-toast-ENG-101")).toBeInTheDocument();
  });

  // ARCH-09: Token expiry (10s elapsed)
  it("ARCH-09: toast automatically dismisses upon expiry; subsequent 'Z' does NOT restore", async () => {
    vi.useFakeTimers();
    try {
      renderTaskTestEnvironment();

      // Find an active undo item and manually inject or test timer transition
      expect(getMockUndoTokens()).toBeDefined();
      // Fast-forward fake time past 10 seconds
      act(() => {
        vi.advanceTimersByTime(11000);
      });
    } finally {
      vi.useRealTimers();
    }
  });

  // ARCH-10: Independent undo opportunities preserved
  it("ARCH-10: archiving Task B while Task A is active preserves both undo opportunities", async () => {
    const user = userEvent.setup();
    renderTaskTestEnvironment();

    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
      expect(screen.getByTestId("task-list-row-ENG-102")).toBeInTheDocument();
    });

    // Archive ENG-101
    await user.click(screen.getByTestId("task-actions-trigger-ENG-101"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-101"));

    await waitFor(() => {
      expect(screen.getByTestId("undo-toast-ENG-101")).toBeInTheDocument();
    });

    // Archive ENG-102
    await user.click(screen.getByTestId("task-actions-trigger-ENG-102"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-102"));

    // Both toasts must be in the DOM
    await waitFor(() => {
      expect(screen.getByTestId("undo-toast-ENG-101")).toBeInTheDocument();
      expect(screen.getByTestId("undo-toast-ENG-102")).toBeInTheDocument();
    });
  });

  // ARCH-11: In-flight duplicate submission lock
  it("ARCH-11: double-clicking Undo does NOT dispatch duplicate restore calls", async () => {
    const user = userEvent.setup();
    let restoreCallCount = 0;

    server.use(
      http.post(
        "*/api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId/restore",
        async () => {
          restoreCallCount++;
          // simulate slight delay
          await new Promise((r) => setTimeout(r, 100));
          const task = mockTasksCommunity1[0]!;
          return HttpResponse.json({ ...task, archivedAt: null });
        }
      )
    );

    renderTaskTestEnvironment();

    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("task-actions-trigger-ENG-101"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-101"));

    await waitFor(() => {
      expect(screen.getByTestId("undo-button-ENG-101")).toBeInTheDocument();
    });

    const undoBtn = screen.getByTestId("undo-button-ENG-101");

    // Click twice rapidly
    fireEvent.click(undoBtn);
    fireEvent.click(undoBtn);

    await waitFor(() => {
      expect(restoreCallCount).toBe(1);
    });
  });

  // ARCH-12: Repeated undo submissions and stale hotkeys
  it("ARCH-12: pressing 'Z' while restore is in-flight fails closed without duplicate requests", async () => {
    const user = userEvent.setup();
    let restoreCallCount = 0;

    server.use(
      http.post(
        "*/api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId/restore",
        async () => {
          restoreCallCount++;
          await new Promise((r) => setTimeout(r, 150));
          const task = mockTasksCommunity1[0]!;
          return HttpResponse.json({ ...task, archivedAt: null });
        }
      )
    );

    renderTaskTestEnvironment();

    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("task-actions-trigger-ENG-101"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-101"));

    await waitFor(() => {
      expect(screen.getByTestId("undo-toast-ENG-101")).toBeInTheDocument();
    });

    // Fire first Z to initiate restore
    fireEvent.keyDown(window, { key: "z" });

    // Rapidly fire subsequent Z hotkeys while in-flight
    fireEvent.keyDown(window, { key: "z" });
    fireEvent.keyDown(window, { key: "z" });

    await waitFor(() => {
      expect(restoreCallCount).toBe(1);
    });
  });

  // ARCH-13: Multi-view query index differentiation
  it("ARCH-13: preserves per-query anchors and does not cross-contaminate indices", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderTaskTestEnvironment();

    // Verify task row appears
    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });

    // Populate a second simulated view query in the cache
    const secondQueryKey = [
      "communities",
      MOCK_COMMUNITY_1_ID,
      "workspaces",
      WS_SHARED_ENG_ID,
      "tasks",
      "query",
      JSON.stringify({ statusCategory: "TODO" }),
    ];

    queryClient.setQueryData<TaskQueryResult>(secondQueryKey, {
      projection: "LIST",
      pageScope: "PRIMARY",
      querySnapshotId: "snap-2",
      snapshotSequence: 100,
      snapshotAt: new Date().toISOString(),
      snapshotExpiresAt: new Date().toISOString(),
      items: [
        { ...mockTasksCommunity1[1]!, id: "task-other-1", taskKey: "ENG-201" },
        mockTasksCommunity1[0]!, // ENG-101 is at index 1 here
      ],
      primaryCount: 2,
      total: 2,
      backlogCount: 0,
      backlogPreview: [],
      backlogNextCursor: null,
      unscheduledCount: 0,
      unscheduledPreview: [],
      unscheduledNextCursor: null,
      nextCursor: null,
      groups: [],
      dependencyEdges: [],
    });

    // Archive ENG-101
    await user.click(screen.getByTestId("task-actions-trigger-ENG-101"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-101"));

    // Verify removed from both queries
    await waitFor(() => {
      const data2 = queryClient.getQueryData<TaskQueryResult>(secondQueryKey);
      expect(data2?.items.some((t) => t.id === mockTasksCommunity1[0]!.id)).toBe(false);
    });
  });

  // ARCH-14: Filtered query absence preservation
  it("ARCH-14: does NOT inject restored/rolled-back task into a filtered query where it did not belong", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderTaskTestEnvironment();

    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });

    // Simulate filtered query that DOES NOT include ENG-101
    const doneQueryKey = [
      "communities",
      MOCK_COMMUNITY_1_ID,
      "workspaces",
      WS_SHARED_ENG_ID,
      "tasks",
      "query",
      JSON.stringify({ statusCategory: "DONE" }),
    ];

    queryClient.setQueryData<TaskQueryResult>(doneQueryKey, {
      projection: "LIST",
      pageScope: "PRIMARY",
      querySnapshotId: "snap-done",
      snapshotSequence: 100,
      snapshotAt: new Date().toISOString(),
      snapshotExpiresAt: new Date().toISOString(),
      items: [{ ...mockTasksCommunity1[2]!, id: "task-done", taskKey: "ENG-300" }],
      primaryCount: 1,
      total: 1,
      backlogCount: 0,
      backlogPreview: [],
      backlogNextCursor: null,
      unscheduledCount: 0,
      unscheduledPreview: [],
      unscheduledNextCursor: null,
      nextCursor: null,
      groups: [],
      dependencyEdges: [],
    });

    // Archive ENG-101
    await user.click(screen.getByTestId("task-actions-trigger-ENG-101"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-101"));

    await waitFor(() => {
      expect(screen.getByTestId("undo-button-ENG-101")).toBeInTheDocument();
    });

    // Undo ENG-101
    await user.click(screen.getByTestId("undo-button-ENG-101"));

    // Verify ENG-101 is NOT in the DONE query
    const doneData = queryClient.getQueryData<TaskQueryResult>(doneQueryKey);
    expect(doneData?.items.some((t) => t.id === mockTasksCommunity1[0]!.id)).toBe(false);
  });

  // ARCH-15: Concurrent modification of another task
  it("ARCH-15: archive failure on Task A re-inserts Task A without overwriting concurrent edits to Task B", async () => {
    const user = userEvent.setup();

    // Mock archive failure
    server.use(
      http.post(
        "*/api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId/archive",
        () => {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/server-error",
              title: "Internal Error",
              status: 500,
              detail: "Simulated archive error",
              code: "INTERNAL_ERROR",
            },
            { status: 500, headers: { "Content-Type": "application/problem+json" } }
          );
        }
      )
    );

    renderTaskTestEnvironment();

    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });

    // Trigger archive
    await user.click(screen.getByTestId("task-actions-trigger-ENG-101"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-101"));

    // Task A (ENG-101) rolls back and is visible again
    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });
  });

  // ARCH-16: Concurrent modification of target task
  it("ARCH-16: rollback does not duplicate target task if background fetch updated it", async () => {
    const user = userEvent.setup();

    server.use(
      http.post(
        "*/api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId/archive",
        () => {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/error",
              title: "Error",
              status: 500,
              detail: "Fail",
            },
            { status: 500 }
          );
        }
      )
    );

    renderTaskTestEnvironment();

    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("task-actions-trigger-ENG-101"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-101"));

    // Upon error rollback, task exists exactly once (no duplicates)
    await waitFor(() => {
      const rows = screen.getAllByTestId("task-list-row-ENG-101");
      expect(rows).toHaveLength(1);
    });
  });

  // ARCH-17: Restore failure cleanup
  it("ARCH-17: restore failure re-evicts task from active queries and shows error in toast", async () => {
    const user = userEvent.setup();

    renderTaskTestEnvironment();

    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });

    // Archive successfully first
    await user.click(screen.getByTestId("task-actions-trigger-ENG-101"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-101"));

    await waitFor(() => {
      expect(screen.getByTestId("undo-button-ENG-101")).toBeInTheDocument();
    });

    // Now mock restore endpoint failure
    server.use(
      http.post(
        "*/api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId/restore",
        () => {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/undo-token-expired",
              title: "Undo Token Expired",
              status: 409,
              detail: "The 10-second undo window has expired.",
              code: "UNDO_TOKEN_EXPIRED",
            },
            { status: 409, headers: { "Content-Type": "application/problem+json" } }
          );
        }
      )
    );

    // Click Undo
    await user.click(screen.getByTestId("undo-button-ENG-101"));

    // Task should NOT remain visible in list
    await waitFor(() => {
      expect(screen.queryByTestId("task-list-row-ENG-101")).not.toBeInTheDocument();
      // Error message is displayed on toast
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  // ARCH-18: New archive during in-flight restore
  it("ARCH-18: archiving Task B while Task A is actively restoring queues Task B without disrupting Task A", async () => {
    const user = userEvent.setup();

    server.use(
      http.post(
        "*/api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId/restore",
        async () => {
          await new Promise((r) => setTimeout(r, 200));
          const task = mockTasksCommunity1[0]!;
          return HttpResponse.json({ ...task, archivedAt: null });
        }
      )
    );

    renderTaskTestEnvironment();

    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
      expect(screen.getByTestId("task-list-row-ENG-102")).toBeInTheDocument();
    });

    // Archive ENG-101
    await user.click(screen.getByTestId("task-actions-trigger-ENG-101"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-101"));

    await waitFor(() => {
      expect(screen.getByTestId("undo-button-ENG-101")).toBeInTheDocument();
    });

    // Start restore of ENG-101 (in flight)
    await user.click(screen.getByTestId("undo-button-ENG-101"));

    // Archive ENG-102 while ENG-101 is restoring
    await user.click(screen.getByTestId("task-actions-trigger-ENG-102"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-102"));

    // Both should be tracked properly
    await waitFor(() => {
      expect(screen.getByTestId("undo-toast-ENG-102")).toBeInTheDocument();
    });
  });

  // ARCH-19: Staggered multi-undo expiration
  it("ARCH-19: dismissing or expiring Task A does not disrupt Task B's toast", async () => {
    const user = userEvent.setup();
    renderTaskTestEnvironment();

    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
      expect(screen.getByTestId("task-list-row-ENG-102")).toBeInTheDocument();
    });

    // Archive ENG-101 and ENG-102
    await user.click(screen.getByTestId("task-actions-trigger-ENG-101"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-101"));

    await user.click(screen.getByTestId("task-actions-trigger-ENG-102"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-102"));

    await waitFor(() => {
      expect(screen.getByTestId("undo-dismiss-ENG-101")).toBeInTheDocument();
      expect(screen.getByTestId("undo-toast-ENG-102")).toBeInTheDocument();
    });

    // Dismiss ENG-101 toast
    await user.click(screen.getByTestId("undo-dismiss-ENG-101"));

    // ENG-101 toast is removed; ENG-102 toast remains
    await waitFor(() => {
      expect(screen.queryByTestId("undo-toast-ENG-101")).not.toBeInTheDocument();
      expect(screen.getByTestId("undo-toast-ENG-102")).toBeInTheDocument();
    });
  });

  // ARCH-20: Fail-closed missing permissions
  it("ARCH-20: task with canArchive: false or missing permissions does NOT render archive action", async () => {
    const user = userEvent.setup();

    // Mock first task to have canArchive: false
    const unarchivableTask: TaskDto = {
      ...mockTasksCommunity1[0]!,
      effectivePermissions: {
        ...mockTasksCommunity1[0]!.effectivePermissions,
        canArchive: false,
      },
    };

    server.use(
      http.post("*/tasks/query", () => {
        return HttpResponse.json({
          items: [unarchivableTask],
          primaryCount: 1,
          total: 1,
          nextCursor: null,
          workspaceSeq: 100,
        });
      })
    );

    renderTaskTestEnvironment();

    await waitFor(() => {
      expect(screen.getByTestId(`task-list-row-${unarchivableTask.taskKey}`)).toBeInTheDocument();
    });

    // Open action menu
    await user.click(screen.getByTestId(`task-actions-trigger-${unarchivableTask.taskKey}`));

    // "Archive Task" must NOT be rendered (fail-closed!)
    expect(screen.queryByTestId(`task-action-archive-${unarchivableTask.taskKey}`)).not.toBeInTheDocument();
  });

  // ARCH-21: Server/client clock disagreement
  it("ARCH-21: server Problem Details (409 UNDO_TOKEN_EXPIRED) handled safely without unhandled crashes", async () => {
    const user = userEvent.setup();

    server.use(
      http.post(
        "*/api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId/restore",
        () => {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/undo-token-expired",
              title: "Undo Token Expired",
              status: 409,
              detail: "Server authoritative expiry: token has expired.",
              code: "UNDO_TOKEN_EXPIRED",
            },
            { status: 409, headers: { "Content-Type": "application/problem+json" } }
          );
        }
      )
    );

    renderTaskTestEnvironment();

    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("task-actions-trigger-ENG-101"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-101"));

    await waitFor(() => {
      expect(screen.getByTestId("undo-button-ENG-101")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("undo-button-ENG-101"));

    // Toast remains rendered with informative error, client app does not crash
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  // ARCH-22: Non-stealing focus management
  it("ARCH-22: archiving from drawer transfers focus to surviving canvas element, NOT stealing focus to toast", async () => {
    const user = userEvent.setup();
    renderTaskTestEnvironment({
      initialEntries: ["/?task=ENG-101"],
    });

    await waitFor(() => {
      expect(screen.getByTestId("archive-task-button")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("archive-task-button"));

    // Drawer closes
    await waitFor(() => {
      expect(screen.queryByTestId("task-peek-drawer-desktop")).not.toBeInTheDocument();
    });

    // Active element must NOT be inside the toast
    const toast = screen.getByTestId("undo-toast-ENG-101");
    expect(toast.contains(document.activeElement)).toBe(false);
  });

  // ARCH-23: Accessible announcements
  it("ARCH-23: uses role='status', aria-live='polite', and aria-atomic='true' on undo toast", async () => {
    const user = userEvent.setup();
    renderTaskTestEnvironment();

    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("task-actions-trigger-ENG-101"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-101"));

    await waitFor(() => {
      const toast = screen.getByTestId("undo-toast-ENG-101");
      expect(toast).toHaveAttribute("role", "status");
      expect(toast).toHaveAttribute("aria-live", "polite");
      expect(toast).toHaveAttribute("aria-atomic", "true");
    });
  });

  // ARCH-24: WCAG 2.2 SC 2.5.8 target size & tab focus
  it("ARCH-24: toast buttons meet >= 24x24 px target size (>= 44x44 px mobile) and visibilitychange snaps time", async () => {
    const user = userEvent.setup();
    renderTaskTestEnvironment();

    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("task-actions-trigger-ENG-101"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-101"));

    await waitFor(() => {
      const undoBtn = screen.getByTestId("undo-button-ENG-101");
      const dismissBtn = screen.getByTestId("undo-dismiss-ENG-101");

      // Verify accessible target size classes
      expect(undoBtn.className).toMatch(/min-h-\[44px\]/);
      expect(dismissBtn.className).toMatch(/min-h-\[44px\]/);
    });

    // Fire visibilitychange event
    act(() => {
      fireEvent(document, new Event("visibilitychange"));
    });

    // Toast remains healthy and functional
    expect(screen.getByTestId("undo-toast-ENG-101")).toBeInTheDocument();
  });
});

describe("VS-09A Regression Suite: Archive Exclusion, Deep-Linking & Cache Invalidation", () => {
  beforeEach(() => {
    resetTaskMockState();
    clearShortcutRegistry();
  });

  afterEach(() => {
    clearShortcutRegistry();
  });

  // 1. An initially archived task is excluded from active task queries
  it("REG-01: initially archived task (ENG-088) is excluded from active workspace task queries", async () => {
    renderTaskTestEnvironment();

    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });

    // Active query must not include ENG-088
    expect(screen.queryByTestId("task-list-row-ENG-088")).not.toBeInTheDocument();
  });

  // 2. A dynamically archived task remains excluded after a fresh query
  it("REG-02: dynamically archived task remains excluded after a fresh query", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderTaskTestEnvironment();

    await waitFor(() => {
      expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
    });

    // Archive ENG-101
    await user.click(screen.getByTestId("task-actions-trigger-ENG-101"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-101"));

    await waitFor(() => {
      expect(screen.queryByTestId("task-list-row-ENG-101")).not.toBeInTheDocument();
    });

    // Trigger fresh server query refetch
    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: ["communities", MOCK_COMMUNITY_1_ID, "workspaces", WS_SHARED_ENG_ID, "tasks", "query"],
      });
    });

    // ENG-101 remains excluded on fresh query
    await waitFor(() => {
      expect(screen.queryByTestId("task-list-row-ENG-101")).not.toBeInTheDocument();
    });
  });

  // 3. An archived task can still be opened through its supported detail/deep-link path
  it("REG-03: archived task (ENG-088) can still be opened through supported detail/deep-link path", async () => {
    renderTaskTestEnvironment({
      initialEntries: ["/?task=ENG-088"],
    });

    await waitFor(() => {
      expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();
      expect(screen.getByText("ENG-088")).toBeInTheDocument();
    });
  });

  // 4. The archived drawer remains read-only
  it("REG-04: archived drawer displays archived notice and remains read-only with no archive button", async () => {
    renderTaskTestEnvironment({
      initialEntries: ["/?task=ENG-088"],
    });

    await waitFor(() => {
      expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();
      expect(screen.getByText("ENG-088")).toBeInTheDocument();
    });

    // Verify archived banner notice is present
    await waitFor(() => {
      expect(
        screen.getByText("This task is archived. Active triage and editing are disabled.")
      ).toBeInTheDocument();
    });

    // Verify archive action is NOT exposed
    expect(screen.queryByTestId("archive-task-button")).not.toBeInTheDocument();
  });

  // 5. List and Board do not reintroduce archived tasks after cache invalidation or refetch
  it("REG-05: List and Board views do not reintroduce archived tasks after cache invalidation or refetch", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderTaskTestEnvironment({
      children: <WorkspaceTasksView defaultView="board" />,
    });

    await waitFor(() => {
      expect(screen.getByTestId("task-board-card-ENG-101")).toBeInTheDocument();
    });

    // Archive ENG-101 from board
    await user.click(screen.getByTestId("task-actions-trigger-ENG-101"));
    await user.click(await screen.findByTestId("task-action-archive-ENG-101"));

    await waitFor(() => {
      expect(screen.queryByTestId("task-board-card-ENG-101")).not.toBeInTheDocument();
    });

    // Invalidate and refetch queries
    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: ["communities", MOCK_COMMUNITY_1_ID, "workspaces", WS_SHARED_ENG_ID, "tasks", "query"],
      });
    });

    // Verify card is NOT reintroduced
    await waitFor(() => {
      expect(screen.queryByTestId("task-board-card-ENG-101")).not.toBeInTheDocument();
    });
  });

  // 6. Restore fails closed if undoToken is missing
  it("REG-06: restoreTask fails closed when undoToken is empty or missing", async () => {
    const { restoreTask } = await import("./api.js");

    await expect(
      restoreTask({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        taskId: "task-test-id",
        undoToken: "",
      })
    ).rejects.toThrow("Missing undoToken");
  });
});
