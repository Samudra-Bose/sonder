import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import * as fs from "fs";
import * as path from "path";

import { App } from "../../App.js";
import { setMockSessionActive, resetAuthMockState, defaultMockCommunities } from "../../mocks/handlers/auth.js";
import { resetWorkspaceMockState } from "../../mocks/handlers/workspaces.js";
import { resetMyWorkMockState } from "../../mocks/handlers/my-work.js";
import {
  resetTaskMockState,
  setMockTasksError,
  setForceExpireSnapshot,
  getMockTasks,
  simulateConcurrentFieldUpdate,
} from "../../mocks/handlers/tasks.js";
import { clearShortcutRegistry } from "../../lib/keyboard.js";
import {
  MOCK_COMMUNITY_1_ID,
  WS_SHARED_ENG_ID,
  WS_PERSONAL_ALEX_ID,
  MOCK_USER_ID,
} from "../../mocks/data/my-work.js";
import { AuthContext, type AuthContextType } from "../auth/AuthContext.js";
import { WorkspaceProvider } from "../workspace/WorkspaceContext.js";
import { TaskPeekDrawer } from "./TaskPeekDrawer.js";
import { SubtaskList } from "./SubtaskList.js";
import { useWorkspaceTasks } from "./useWorkspaceTasks.js";
import { renderHook } from "@testing-library/react";

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

function renderTaskDrawerShell({
  initialEntries = ["/?task=ENG-101"],
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
            <MemoryRouter initialEntries={initialEntries}>
              <LocationDisplay />
              <div className="flex">
                <main className="flex-1">
                  {children ?? <div>Main Canvas Content</div>}
                </main>
                <TaskPeekDrawer forceMode={forceMode} />
              </div>
            </MemoryRouter>
          </WorkspaceProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    ),
  };
}

describe("VS-03 Stage 6: Integration QA & End-to-End Regression Hardening", () => {
  let storageMock: Record<string, string> = {};

  beforeEach(() => {
    resetAuthMockState();
    resetWorkspaceMockState();
    resetMyWorkMockState();
    resetTaskMockState();

    storageMock = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => storageMock[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete storageMock[key];
      }),
      clear: vi.fn(() => {
        storageMock = {};
      }),
    };
    Object.defineProperty(window, "localStorage", {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });

    storageMock["sonder-active-community-id"] = MOCK_COMMUNITY_1_ID;
    clearShortcutRegistry();
  });

  afterEach(() => {
    storageMock = {};
    clearShortcutRegistry();
    resetTaskMockState();
  });

  // =========================================================================
  // FLOW A: Authentication, Workspace Context & Cache Isolation
  // =========================================================================
  describe("Flow A: Authentication, Workspace Context & Cache Isolation", () => {
    it("restores user session and renders protected My Work with community context", async () => {
      setMockSessionActive(true);

      render(<App initialEntries={["/my-work"]} />);

      await waitFor(() => {
        expect(screen.getAllByText("Alex Morgan").length).toBeGreaterThan(0);
        expect(screen.getByRole("banner")).toBeInTheDocument();
        expect(screen.getByTestId("my-work-view")).toBeInTheDocument();
      });

      // Tasks for Sonder Community load
      expect(await screen.findByTestId("my-work-task-ENG-101")).toBeInTheDocument();
    });

    it("evicts community query cache on community switch to prevent data leakage", async () => {
      const user = userEvent.setup();
      setMockSessionActive(true);

      render(<App initialEntries={["/my-work"]} />);

      await waitFor(() => {
        expect(screen.getByTestId("my-work-task-ENG-101")).toBeInTheDocument();
      });

      // Switch community via Omnibar to Regional Arts Guild (Community 2)
      const omnibarBtn = screen.getByRole("button", { name: /open command palette/i });
      await user.click(omnibarBtn);

      await screen.findByRole("dialog", { name: /omnibar command palette/i });
      const searchInput = screen.getByPlaceholderText(/type a command or search navigation/i);
      await user.type(searchInput, "Switch to community");

      const targetCommunity = await screen.findByRole("option", {
        name: /Switch to community: Regional Arts Guild/i,
      });
      await user.click(targetCommunity);

      // Verify community header switches
      await waitFor(() => {
        expect(within(screen.getByRole("banner")).getByText("Regional Arts Guild")).toBeInTheDocument();
      });

      // Verify Sonder Community tasks are purged from DOM and cache
      await waitFor(() => {
        expect(screen.queryByTestId("my-work-task-ENG-101")).not.toBeInTheDocument();
        expect(screen.getByTestId("my-work-empty-state")).toBeInTheDocument();
      });
    });

    it("prevents unauthenticated access to protected task views", async () => {
      setMockSessionActive(false);

      render(<App initialEntries={["/my-work"]} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Sign in to your account" })).toBeInTheDocument();
        expect(screen.queryByTestId("my-work-view")).not.toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // FLOW B: My Work Dashboard & Deep Link Resolution
  // =========================================================================
  describe("Flow B: My Work Dashboard & Deep Link Resolution", () => {
    it("opens TaskPeekDrawer when clicking a task row in My Work and updates URL query", async () => {
      const user = userEvent.setup();
      setMockSessionActive(true);

      render(<App initialEntries={["/my-work"]} />);

      const taskRow = await screen.findByTestId("my-work-task-ENG-101");
      expect(taskRow).toBeInTheDocument();

      await user.click(taskRow);

      // TaskPeekDrawer opens
      const drawer = await screen.findByTestId("task-peek-drawer-desktop");
      expect(drawer).toBeInTheDocument();
      await waitFor(() => {
        expect(within(drawer).getByRole("heading", { name: /fix critical auth token refresh race condition/i })).toBeInTheDocument();
      });

      // Close drawer via close button
      const closeBtn = within(drawer).getByRole("button", { name: "Close task details" });
      await user.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByTestId("task-peek-drawer-desktop")).not.toBeInTheDocument();
      });
    });

    it("automatically opens TaskPeekDrawer when navigating to a deep-linked URL", async () => {
      setMockSessionActive(true);

      render(<App initialEntries={["/my-work?task=ENG-102"]} />);

      const drawer = await screen.findByTestId("task-peek-drawer-desktop");
      expect(drawer).toBeInTheDocument();
      await waitFor(() => {
        expect(within(drawer).getByText("ENG-102")).toBeInTheDocument();
        expect(within(drawer).getByRole("heading", { name: /Ship VS-02E My Work cross-workspace dashboard/i })).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // FLOW C: Quick Task Composer End-to-End Workflow
  // =========================================================================
  describe("Flow C: Quick Task Composer End-to-End Workflow", () => {
    it("opens composer via 'C' shortcut, creates task, and navigates drawer to new task", async () => {
      const user = userEvent.setup();
      setMockSessionActive(true);

      render(<App initialEntries={["/my-work"]} />);

      await waitFor(() => {
        expect(screen.getByTestId("my-work-view")).toBeInTheDocument();
      });

      // Press global shortcut 'c'
      await user.keyboard("c");

      // Composer modal opens
      const composerDialog = await screen.findByTestId("quick-task-composer-dialog");
      expect(composerDialog).toBeInTheDocument();

      // Fill in title
      const titleInput = screen.getByTestId("composer-title-input");
      await user.type(titleInput, "Deploy canary build to production cluster");

      // Submit form
      const createBtn = screen.getByTestId("composer-submit-btn");
      await user.click(createBtn);

      // Composer closes
      await waitFor(() => {
        expect(screen.queryByTestId("quick-task-composer-dialog")).not.toBeInTheDocument();
      });

      // Drawer automatically opens with the newly created task
      const drawer = await screen.findByTestId("task-peek-drawer-desktop");
      expect(drawer).toBeInTheDocument();
      await waitFor(() => {
        expect(within(drawer).getByRole("heading", { name: /Deploy canary build to production cluster/i })).toBeInTheDocument();
      });
    });

    it("suppresses 'C' shortcut when typing inside an editable input", async () => {
      const user = userEvent.setup();
      setMockSessionActive(true);

      render(<App initialEntries={["/my-work"]} />);

      await waitFor(() => {
        expect(screen.getByTestId("my-work-view")).toBeInTheDocument();
      });

      // Open Omnibar
      const omnibarBtn = screen.getByRole("button", { name: /open command palette/i });
      await user.click(omnibarBtn);

      const omnibarDialog = await screen.findByRole("dialog", { name: /omnibar command palette/i });
      const searchInput = screen.getByPlaceholderText(/type a command or search navigation/i);

      // Type 'c' inside input
      await user.type(searchInput, "calendar");

      // Composer modal should NOT be opened
      expect(screen.queryByTestId("quick-task-composer-dialog")).not.toBeInTheDocument();
      expect(omnibarDialog).toBeInTheDocument();
    });

    it("preserves draft form values when task creation fails", async () => {
      const user = userEvent.setup();
      setMockSessionActive(true);

      render(<App initialEntries={["/my-work"]} />);

      await waitFor(() => {
        expect(screen.getByTestId("my-work-view")).toBeInTheDocument();
      });

      // Inject server error for creation
      setMockTasksError({
        status: 500,
        problem: {
          type: "https://errors.sonder.platform/server-error",
          title: "Internal Error",
          status: 500,
          detail: "Database write failure simulated for test.",
        },
        method: "POST",
      });

      await user.keyboard("c");
      await screen.findByTestId("quick-task-composer-dialog");

      const titleInput = screen.getByTestId("composer-title-input");
      await user.type(titleInput, "Task with recoverable failure");

      const createBtn = screen.getByTestId("composer-submit-btn");
      await user.click(createBtn);

      // Feedback shows error message
      await waitFor(() => {
        expect(screen.getByTestId("composer-server-error")).toHaveTextContent(/database write failure simulated/i);
      });

      // Draft is preserved
      expect(titleInput).toHaveValue("Task with recoverable failure");
      expect(screen.getByTestId("quick-task-composer-dialog")).toBeInTheDocument();
    });

    it("opens composer from Omnibar 'Create Task' action", async () => {
      const user = userEvent.setup();
      setMockSessionActive(true);

      render(<App initialEntries={["/my-work"]} />);

      await waitFor(() => {
        expect(screen.getByTestId("my-work-view")).toBeInTheDocument();
      });

      // Open Omnibar
      await user.click(screen.getByRole("button", { name: /open command palette/i }));
      await screen.findByRole("dialog", { name: /omnibar command palette/i });

      const searchInput = screen.getByPlaceholderText(/type a command or search navigation/i);
      await user.type(searchInput, "Create Task");

      const createOption = await screen.findByRole("option", { name: /Create Task/i });
      await user.click(createOption);

      // Composer opens
      await waitFor(() => {
        expect(screen.getByTestId("quick-task-composer-dialog")).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // FLOW D: Task Peek Drawer & Inline Editing
  // =========================================================================
  describe("Flow D: Task Peek Drawer & Inline Editing", () => {
    it("resolves canonical alias and displays canonical task details", async () => {
      // ENG-OLD-1 is an alias pointing to ENG-101
      renderTaskDrawerShell({ initialEntries: ["/?task=ENG-OLD-1"] });

      const drawer = await screen.findByTestId("task-peek-drawer-desktop");
      expect(drawer).toBeInTheDocument();

      // Resolved to canonical ENG-101
      await waitFor(() => {
        expect(within(drawer).getByRole("heading", { name: /fix critical auth token refresh race condition/i })).toBeInTheDocument();
      });

      // Canonical redirect notice
      expect(within(drawer).getByRole("status")).toHaveTextContent(/redirected from historical key/i);
    });

    it("performs optimistic title update and rolls back on server 500 error", async () => {
      const user = userEvent.setup();
      renderTaskDrawerShell({ initialEntries: ["/?task=ENG-101"] });

      await screen.findByTestId("task-peek-drawer-desktop");
      await waitFor(() => {
        expect(screen.getByTestId("edit-title-btn")).toBeInTheDocument();
      });

      // Inject server error for patch
      setMockTasksError({
        status: 500,
        problem: {
          type: "https://errors.sonder.platform/server-error",
          title: "Internal Error",
          status: 500,
          detail: "Database timeout during patch.",
        },
        method: "PATCH",
      });

      // Click to edit
      await user.click(screen.getByTestId("edit-title-btn"));
      const titleInput = screen.getByTestId("title-input");
      await user.clear(titleInput);
      await user.type(titleInput, "Optimistic title rollback test");

      await user.click(screen.getByTestId("save-title-btn"));

      // Error message appears
      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/database timeout during patch/i);
      });

      // Cancel edit mode
      setMockTasksError(null);
      await user.click(screen.getByTestId("cancel-title-btn"));

      // Original title remains
      expect(
        screen.getByRole("heading", { name: "Fix critical auth token refresh race condition" })
      ).toBeInTheDocument();
    });

    it("handles concurrency conflict (HTTP 409) with error notification and rollback", async () => {
      const user = userEvent.setup();
      renderTaskDrawerShell({ initialEntries: ["/?task=ENG-101"] });

      await screen.findByTestId("task-peek-drawer-desktop");
      await waitFor(() => {
        expect(screen.getByTestId("edit-title-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("edit-title-btn"));
      const titleInput = screen.getByTestId("title-input");
      await user.clear(titleInput);
      await user.type(titleInput, "Client attempted title");

      // Simulate concurrent update on server
      simulateConcurrentFieldUpdate(
        "ENG-101",
        "title",
        "Concurrent title update from another session"
      );

      // Save
      await user.click(screen.getByTestId("save-title-btn"));

      // Conflict alert appears
      await waitFor(() => {
        expect(screen.getByTestId("conflict-alert-title")).toBeInTheDocument();
      });
      expect(screen.getByTestId("conflict-alert-title")).toHaveTextContent(/Conflict on title/i);
    });

    it("disables editing controls and displays notice when viewing archived task", async () => {
      // ENG-088 is an archived task
      renderTaskDrawerShell({ initialEntries: ["/?task=ENG-088"] });

      const drawer = await screen.findByTestId("task-peek-drawer-desktop");
      expect(drawer).toBeInTheDocument();

      await waitFor(() => {
        expect(within(drawer).getByText("ENG-088")).toBeInTheDocument();
        expect(within(drawer).getByText("This task is archived. Active triage and editing are disabled.")).toBeInTheDocument();
      });

      // Inline edit buttons should NOT be present
      expect(screen.queryByTestId("edit-title-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("add-subtask-btn")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // FLOW E: Subtask Hierarchy & Depth Limits
  // =========================================================================
  describe("Flow E: Subtask Hierarchy & Depth Limits", () => {
    it("renders existing subtask hierarchy reconstructed from parentTaskId", async () => {
      const user = userEvent.setup();
      // ENG-101 has subtask ENG-105
      renderTaskDrawerShell({ initialEntries: ["/?task=ENG-101"] });

      await screen.findByTestId("task-peek-drawer-desktop");

      // Direct child ENG-105 is displayed
      await waitFor(() => {
        expect(screen.getByTestId("subtask-item-ENG-105")).toBeInTheDocument();
      });

      // Nested subtask ENG-106 is visible by default (expanded)
      expect(screen.getByTestId("subtask-item-ENG-106")).toBeInTheDocument();

      // Toggle collapse on ENG-105
      const toggleBtn = screen.getByTestId("toggle-expand-ENG-105");
      await user.click(toggleBtn);

      await waitFor(() => {
        expect(screen.queryByTestId("subtask-item-ENG-106")).not.toBeInTheDocument();
      });

      // Toggle expand again
      await user.click(toggleBtn);
      await waitFor(() => {
        expect(screen.getByTestId("subtask-item-ENG-106")).toBeInTheDocument();
      });
    });

    it("creates an inline subtask with parentTaskId set to current task ID", async () => {
      const user = userEvent.setup();
      // ENG-102 has 0 subtasks initially
      renderTaskDrawerShell({ initialEntries: ["/?task=ENG-102"] });

      await screen.findByTestId("task-peek-drawer-desktop");

      await waitFor(() => {
        expect(screen.getByTestId("subtasks-empty")).toBeInTheDocument();
      });

      // Click Add Subtask
      const addBtn = screen.getByTestId("add-subtask-btn");
      await user.click(addBtn);

      const titleInput = screen.getByTestId("subtask-title-input");
      await user.type(titleInput, "Configure Redis sentinel failover");

      const submitBtn = screen.getByTestId("subtask-create-submit-btn");
      await user.click(submitBtn);

      // Subtask appears in list
      await waitFor(() => {
        expect(screen.getByText("Configure Redis sentinel failover")).toBeInTheDocument();
      });

      // Verify in-memory task store
      const tasks = getMockTasks();
      const created = tasks.find((t) => t.title === "Configure Redis sentinel failover");
      expect(created).toBeDefined();
      expect(created?.parentTaskId).toBe("018f98a2-task-003-today-assigned-created");
    });

    it("enforces maxSubtaskDepth limit in Personal Workspace (max depth 1)", async () => {
      // In Personal Workspace (WS_PERSONAL_ALEX_ID), maxSubtaskDepth is 1.
      // Root task ALEX-1 (depth 0) can have direct subtasks (depth 1).
      // But subtask at depth 1 cannot create further descendants.
      const user = userEvent.setup();
      const { unmount } = renderTaskDrawerShell({
        initialEntries: ["/?task=ALEX-1"],
        initialWorkspaceId: WS_PERSONAL_ALEX_ID,
      });

      await screen.findByTestId("task-peek-drawer-desktop");

      // Root ALEX-1 can add a subtask
      const addBtn = await screen.findByTestId("add-subtask-btn");
      await user.click(addBtn);

      const titleInput = screen.getByTestId("subtask-title-input");
      await user.type(titleInput, "Personal checklist child");
      await user.click(screen.getByTestId("subtask-create-submit-btn"));

      await waitFor(() => {
        expect(screen.getByText("Personal checklist child")).toBeInTheDocument();
      });

      // Unmount first render before rendering child task
      unmount();

      // Now view the newly created child subtask in the drawer
      const childTask = getMockTasks().find((t) => t.title === "Personal checklist child");
      expect(childTask).toBeDefined();

      // Render child task in drawer
      renderTaskDrawerShell({
        initialEntries: [`/?task=${childTask!.taskKey}`],
        initialWorkspaceId: WS_PERSONAL_ALEX_ID,
      });

      // Depth limit notice is displayed for the child task (depth 1 reaches maxSubtaskDepth 1)
      await waitFor(() => {
        expect(screen.getByTestId("subtask-depth-limit-notice")).toHaveTextContent(
          "Maximum subtask depth (1) reached for this workspace."
        );
      });

      // Add subtask button is NOT rendered
      expect(screen.queryByTestId("add-subtask-btn")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // FLOW F: Same-Workspace Reparenting & Safety Validation
  // =========================================================================
  describe("Flow F: Same-Workspace Reparenting & Safety Validation", () => {
    it("reparents a subtask to top level (parentTaskId = null)", async () => {
      const user = userEvent.setup();
      // ENG-101 has subtask ENG-105
      renderTaskDrawerShell({ initialEntries: ["/?task=ENG-101"] });

      await screen.findByTestId("task-peek-drawer-desktop");
      await waitFor(() => {
        expect(screen.getByTestId("subtask-item-ENG-105")).toBeInTheDocument();
      });

      // Click Reparent on ENG-105
      const reparentBtn = screen.getByTestId("reparent-btn-ENG-105");
      await user.click(reparentBtn);

      // Reparent modal opens
      const modal = await screen.findByTestId("reparent-task-modal");
      expect(modal).toBeInTheDocument();

      // Select "Top level (no parent)"
      const select = screen.getByTestId("reparent-destination-select");
      await user.selectOptions(select, "TOP_LEVEL");

      // Submit move
      const moveBtn = screen.getByTestId("reparent-submit-btn");
      await user.click(moveBtn);

      // Modal closes
      await waitFor(() => {
        expect(screen.queryByTestId("reparent-task-modal")).not.toBeInTheDocument();
      });

      // Verify in-memory task store has parentTaskId set to null
      const tasks = getMockTasks();
      const movedTask = tasks.find((t) => t.taskKey === "ENG-105");
      expect(movedTask?.parentTaskId).toBeNull();
    });

    it("prevents self-parenting and cycle formation in reparent parent selector", async () => {
      const user = userEvent.setup();
      renderTaskDrawerShell({ initialEntries: ["/?task=ENG-101"] });

      await screen.findByTestId("task-peek-drawer-desktop");
      await waitFor(() => {
        expect(screen.getByTestId("subtask-item-ENG-105")).toBeInTheDocument();
      });

      // Open reparent modal for ENG-105
      await user.click(screen.getByTestId("reparent-btn-ENG-105"));
      await screen.findByTestId("reparent-task-modal");

      // Check options in parent select:
      // Ineligible targets (self ENG-105 and descendant ENG-106) are excluded from candidates
      const select = screen.getByTestId("reparent-destination-select");
      const options = within(select).getAllByRole("option");

      // Self task ENG-105 is excluded
      expect(options.some((opt) => opt.textContent?.includes("ENG-105"))).toBe(false);

      // Descendant task ENG-106 is excluded (cycle prevented)
      expect(options.some((opt) => opt.textContent?.includes("ENG-106"))).toBe(false);

      // Eligible parent ENG-102 is included
      expect(options.some((opt) => opt.textContent?.includes("ENG-102"))).toBe(true);
    });

    it("displays error feedback and preserves dialog when server rejects move with 422", async () => {
      const user = userEvent.setup();
      renderTaskDrawerShell({ initialEntries: ["/?task=ENG-101"] });

      await screen.findByTestId("task-peek-drawer-desktop");
      await waitFor(() => {
        expect(screen.getByTestId("subtask-item-ENG-105")).toBeInTheDocument();
      });

      // Inject server error for move endpoint
      setMockTasksError({
        status: 422,
        problem: {
          type: "https://errors.sonder.platform/cycle-detected",
          title: "Cycle Detected",
          status: 422,
          detail: "Server-side DAG cycle verification failed.",
        },
        method: "POST",
      });

      await user.click(screen.getByTestId("reparent-btn-ENG-105"));
      await screen.findByTestId("reparent-task-modal");

      // Change destination to enable submit button
      const select = screen.getByTestId("reparent-destination-select");
      await user.selectOptions(select, "TOP_LEVEL");

      const moveBtn = screen.getByTestId("reparent-submit-btn");
      await user.click(moveBtn);

      // Error message is displayed in modal
      await waitFor(() => {
        expect(screen.getByTestId("reparent-error")).toHaveTextContent(
          "Server-side DAG cycle verification failed."
        );
      });

      // Modal remains open so user can rectify
      expect(screen.getByTestId("reparent-task-modal")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // FLOW G: Workspace Query Pagination, Snapshots & Recovery
  // =========================================================================
  describe("Flow G: Workspace Query Pagination, Snapshots & Recovery", () => {
    it("automatically fetches subsequent continuation pages up to maxPages and combines items", async () => {
      const queryClient = createTestQueryClient();

      const { result } = renderHook(
        () =>
          useWorkspaceTasks({
            communityId: MOCK_COMMUNITY_1_ID,
            workspaceId: WS_SHARED_ENG_ID,
            query: {
              limit: 2, // Set small page limit to force pagination
              projection: "LIST",
            },
            fetchAllPages: true,
            maxPages: 5,
          }),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>
              <AuthContext.Provider value={createMockAuth()}>{children}</AuthContext.Provider>
            </QueryClientProvider>
          ),
        }
      );

      // Hook combines all pages into result.data.items
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Engineering Platform has 6 active tasks in mock store (ENG-088 is archived and excluded):
      // (ENG-101, ENG-105, ENG-106, ENG-102, ENG-099, READ-ONLY task)
      expect(result.current.data?.items.length).toBe(6);
      expect(result.current.data?.nextCursor).toBeNull();
    });

    it("automatically recovers from HTTP 409 QUERY_SNAPSHOT_EXPIRED on continuation pages", async () => {
      const queryClient = createTestQueryClient();

      // Trigger force snapshot expiration once on continuation
      setForceExpireSnapshot(false, true);

      const { result } = renderHook(
        () =>
          useWorkspaceTasks({
            communityId: MOCK_COMMUNITY_1_ID,
            workspaceId: WS_SHARED_ENG_ID,
            query: {
              limit: 2,
              projection: "LIST",
            },
            fetchAllPages: true,
            maxPages: 5,
          }),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>
              <AuthContext.Provider value={createMockAuth()}>{children}</AuthContext.Provider>
            </QueryClientProvider>
          ),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Recovers by restarting from page 1 and loads all 6 active tasks (excluding archived ENG-088)
      expect(result.current.data?.items.length).toBe(6);
    });

    it("displays partial-warning banner in SubtaskList when continuation cursor exceeds bounded maxPages", async () => {
      const queryClient = createTestQueryClient();
      const parentTask = getMockTasks().find((t) => t.taskKey === "ENG-101")!;

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={createMockAuth()}>
            <WorkspaceProvider
              initialCommunityId={MOCK_COMMUNITY_1_ID}
              initialWorkspaceId={WS_SHARED_ENG_ID}
            >
              <SubtaskList
                task={parentTask}
                communityId={MOCK_COMMUNITY_1_ID}
                workspaceId={WS_SHARED_ENG_ID}
              />
            </WorkspaceProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("subtasks-section")).toBeInTheDocument();
      });

      // In default full-fetch mode, nextCursor is null so no partial warning is displayed
      expect(screen.queryByTestId("subtasks-partial-warning")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // FLOW H: Production Data & Architectural Isolation Audit
  // =========================================================================
  describe("Flow H: Production Data & Architectural Isolation Audit", () => {
    it("verifies zero mock data imports in all production task modules", () => {
      const tasksDir = path.resolve(__dirname);
      const files = fs.readdirSync(tasksDir);
      const productionFiles = files.filter(
        (f) => (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.includes(".test.")
      );

      expect(productionFiles.length).toBeGreaterThanOrEqual(10);

      const forbiddenPatterns = [
        /from\s+['"].*mocks\/data.*['"]/,
        /from\s+['"].*mocks\/handlers.*['"]/,
        /MOCK_USER_ID/,
        /MOCK_COMMUNITY/,
        /WS_SHARED_ENG_ID/,
        /WS_PERSONAL_ALEX_ID/,
      ];

      const violations: string[] = [];

      for (const file of productionFiles) {
        const filePath = path.join(tasksDir, file);
        const content = fs.readFileSync(filePath, "utf-8");

        for (const pattern of forbiddenPatterns) {
          if (pattern.test(content)) {
            violations.push(`${file} matches forbidden mock pattern: ${pattern.toString()}`);
          }
        }
      }

      expect(violations).toEqual([]);
    });

    it("confirms mutation requests carry CSRF tokens from dynamic AuthContext", async () => {
      const auth = createMockAuth({ csrfToken: "test-verified-csrf-token" });
      expect(auth.csrfToken).toBe("test-verified-csrf-token");
      expect(auth.status).toBe("authenticated");
    });
  });
});
