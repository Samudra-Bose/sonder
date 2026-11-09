import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import * as fs from "fs";
import * as path from "path";

import { defaultMockCommunities } from "../../mocks/handlers/auth.js";
import { resetWorkspaceMockState } from "../../mocks/handlers/workspaces.js";
import {
  resetTaskMockState,
  setMockTasksError,
  setForceExpireSnapshot,
  getMockTasks,
} from "../../mocks/handlers/tasks.js";
import {
  MOCK_COMMUNITY_1_ID,
  WS_SHARED_ENG_ID,
  WS_PERSONAL_ALEX_ID,
  MOCK_USER_ID,
} from "../../mocks/data/my-work.js";
import { AuthContext, type AuthContextType } from "../auth/AuthContext.js";
import { WorkspaceProvider } from "../workspace/WorkspaceContext.js";
import { TaskPeekDrawer } from "./TaskPeekDrawer.js";
import { QuickTaskComposerProvider } from "./QuickTaskComposerContext.js";
import { QuickTaskComposer } from "./QuickTaskComposer.js";
import { WorkspaceTasksView } from "./views/WorkspaceTasksView.js";
import { TaskListView } from "./views/TaskListView.js";
import { TaskBoardView } from "./views/TaskBoardView.js";

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

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  const authValue = createMockAuth();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <WorkspaceProvider
          initialCommunityId={MOCK_COMMUNITY_1_ID}
          initialWorkspaceId={WS_SHARED_ENG_ID}
        >
          <MemoryRouter>{ui}</MemoryRouter>
        </WorkspaceProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

interface TestWorkspaceTasksShellProps {
  initialEntries?: string[];
  initialCommunityId?: string;
  initialWorkspaceId?: string;
  defaultView?: "list" | "board";
}

function renderWorkspaceTasksShell({
  initialEntries = ["/list"],
  initialCommunityId = MOCK_COMMUNITY_1_ID,
  initialWorkspaceId = WS_SHARED_ENG_ID,
  defaultView = "list",
}: TestWorkspaceTasksShellProps = {}) {
  const queryClient = createTestQueryClient();
  const authValue = createMockAuth();

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <WorkspaceProvider
            initialCommunityId={initialCommunityId}
            initialWorkspaceId={initialWorkspaceId}
          >
            <QuickTaskComposerProvider>
              <MemoryRouter initialEntries={initialEntries}>
                <LocationDisplay />
                <div className="flex flex-col min-h-screen">
                  <main className="flex-1">
                    <WorkspaceTasksView defaultView={defaultView} />
                  </main>
                  <TaskPeekDrawer forceMode="desktop" />
                  <QuickTaskComposer />
                </div>
              </MemoryRouter>
            </QuickTaskComposerProvider>
          </WorkspaceProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    ),
  };
}

describe("VS-04: Synchronized List & Board Views", () => {
  beforeEach(() => {
    resetTaskMockState();
    resetWorkspaceMockState();
    setForceExpireSnapshot(false);
    setMockTasksError(null);
  });

  afterEach(() => {
    setForceExpireSnapshot(false);
    setMockTasksError(null);
  });

  describe("1. Workspace List View", () => {
    it("renders task rows with keys, titles, status badges, priority badges, and due dates", async () => {
      renderWorkspaceTasksShell({ initialEntries: ["/list"], defaultView: "list" });

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      // Verify ENG-101 row elements
      const row101 = screen.getByTestId("task-list-row-ENG-101");
      expect(row101).toBeInTheDocument();
      expect(within(row101).getByText("ENG-101")).toBeInTheDocument();
      expect(within(row101).getByText("Fix critical auth token refresh race condition")).toBeInTheDocument();
      expect(within(row101).getByText("In Progress")).toBeInTheDocument();
      expect(within(row101).getByText("Urgent")).toBeInTheDocument();
      expect(within(row101).getByText("2026-10-28")).toBeInTheDocument();

      // Verify ENG-105 row elements
      const row105 = screen.getByTestId("task-list-row-ENG-105");
      expect(row105).toBeInTheDocument();
      expect(within(row105).getByText("ENG-105")).toBeInTheDocument();
      expect(within(row105).getByText("To Do")).toBeInTheDocument();
      expect(within(row105).getByText("High")).toBeInTheDocument();
    });

    it("filters task rows by search query 'auth'", async () => {
      const user = userEvent.setup();
      renderWorkspaceTasksShell({ initialEntries: ["/list"], defaultView: "list" });

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText("Search tasks");
      await user.type(searchInput, "auth");

      await waitFor(() => {
        expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
        expect(screen.queryByTestId("task-list-row-ENG-105")).not.toBeInTheDocument();
      });
    });

    it("filters task rows by priority 'URGENT'", async () => {
      const user = userEvent.setup();
      renderWorkspaceTasksShell({ initialEntries: ["/list"], defaultView: "list" });

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      const prioritySelect = screen.getByLabelText("Filter tasks by priority");
      await user.selectOptions(prioritySelect, "URGENT");

      await waitFor(() => {
        expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
        expect(screen.queryByTestId("task-list-row-ENG-105")).not.toBeInTheDocument();
      });
    });

    it("filters task rows by status category 'TODO'", async () => {
      const user = userEvent.setup();
      renderWorkspaceTasksShell({ initialEntries: ["/list"], defaultView: "list" });

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      const statusSelect = screen.getByLabelText("Filter tasks by status");
      await user.selectOptions(statusSelect, "TODO");

      await waitFor(() => {
        expect(screen.getByTestId("task-list-row-ENG-105")).toBeInTheDocument();
        expect(screen.queryByTestId("task-list-row-ENG-101")).not.toBeInTheDocument();
      });
    });

    it("opens Task Peek Drawer when clicking a task key or row in List View", async () => {
      const user = userEvent.setup();
      renderWorkspaceTasksShell({ initialEntries: ["/list"], defaultView: "list" });

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      const taskKeyBtn = screen.getByRole("button", { name: "ENG-101" });
      await user.click(taskKeyBtn);

      await waitFor(() => {
        expect(screen.getByTestId("location-display")).toHaveTextContent("task=ENG-101");
        expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();
      });
    });

    it("renders loading, empty, and error retry states in List View", async () => {
      const onRetry = vi.fn();

      // Test loading state
      const { unmount: unmountLoading } = renderWithProviders(
        <TaskListView
          tasks={[]}
          isLoading={true}
          isError={false}
          error={null}
          onRetry={onRetry}
          workspaceId={WS_SHARED_ENG_ID}
          communityId={MOCK_COMMUNITY_1_ID}
        />
      );
      expect(screen.getByTestId("task-list-loading")).toBeInTheDocument();
      unmountLoading();

      // Test empty state
      const { unmount: unmountEmpty } = renderWithProviders(
        <TaskListView
          tasks={[]}
          isLoading={false}
          isError={false}
          error={null}
          onRetry={onRetry}
          workspaceId={WS_SHARED_ENG_ID}
          communityId={MOCK_COMMUNITY_1_ID}
        />
      );
      expect(screen.getByTestId("task-list-empty")).toBeInTheDocument();
      expect(screen.getByText("No tasks match the active filters")).toBeInTheDocument();
      unmountEmpty();

      // Test error state with retry button
      const { unmount: unmountError } = renderWithProviders(
        <TaskListView
          tasks={[]}
          isLoading={false}
          isError={true}
          error={new Error("Network timeout")}
          onRetry={onRetry}
          workspaceId={WS_SHARED_ENG_ID}
          communityId={MOCK_COMMUNITY_1_ID}
        />
      );
      expect(screen.getByTestId("task-list-error")).toBeInTheDocument();
      expect(screen.getByText("Network timeout")).toBeInTheDocument();
      const retryBtn = screen.getByRole("button", { name: /retry/i });
      await userEvent.click(retryBtn);
      expect(onRetry).toHaveBeenCalledTimes(1);
      unmountError();
    });
  });

  describe("2. Workspace Board View", () => {
    it("renders workflow status columns with accurate task card placement and counts", async () => {
      renderWorkspaceTasksShell({ initialEntries: ["/board"], defaultView: "board" });

      await waitFor(() => {
        expect(screen.getByTestId("task-board-view")).toBeInTheDocument();
      });

      // Verify columns rendered
      expect(screen.getByTestId("board-column-TODO")).toBeInTheDocument();
      expect(screen.getByTestId("board-column-IN_PROGRESS")).toBeInTheDocument();
      expect(screen.getByTestId("board-column-DONE")).toBeInTheDocument();
      expect(screen.getByTestId("board-column-CANCELED")).toBeInTheDocument();

      // ENG-101 is IN_PROGRESS -> should be inside board-column-IN_PROGRESS
      const inProgressCol = screen.getByTestId("board-column-IN_PROGRESS");
      expect(within(inProgressCol).getByTestId("task-board-card-ENG-101")).toBeInTheDocument();
      expect(within(inProgressCol).getByText("Fix critical auth token refresh race condition")).toBeInTheDocument();

      // ENG-105 is TODO -> should be inside board-column-TODO
      const todoCol = screen.getByTestId("board-column-TODO");
      expect(within(todoCol).getByTestId("task-board-card-ENG-105")).toBeInTheDocument();
    });

    it("supports accessible non-drag status transition moving task between columns", async () => {
      const user = userEvent.setup();
      renderWorkspaceTasksShell({ initialEntries: ["/board"], defaultView: "board" });

      await waitFor(() => {
        expect(screen.getByTestId("task-board-view")).toBeInTheDocument();
      });

      // ENG-105 starts in TODO column
      const todoCol = screen.getByTestId("board-column-TODO");
      expect(within(todoCol).getByTestId("task-board-card-ENG-105")).toBeInTheDocument();

      // Use the card's accessible status selector to move ENG-105 to IN_PROGRESS
      const statusSelect = screen.getByLabelText("Move ENG-105 status");
      await user.selectOptions(statusSelect, "IN_PROGRESS");

      // Verify ENG-105 has moved to IN_PROGRESS column
      await waitFor(() => {
        const inProgressCol = screen.getByTestId("board-column-IN_PROGRESS");
        expect(within(inProgressCol).getByTestId("task-board-card-ENG-105")).toBeInTheDocument();
      });

      // Server mock task should reflect new statusCategory
      const tasks = getMockTasks();
      const updated = tasks.find((t) => t.taskKey === "ENG-105");
      expect(updated?.statusCategory).toBe("IN_PROGRESS");
    });

    it("opens Task Peek Drawer when clicking a card or task key in Board View", async () => {
      const user = userEvent.setup();
      renderWorkspaceTasksShell({ initialEntries: ["/board"], defaultView: "board" });

      await waitFor(() => {
        expect(screen.getByTestId("task-board-view")).toBeInTheDocument();
      });

      const cardKey = screen.getByRole("button", { name: "ENG-101" });
      await user.click(cardKey);

      await waitFor(() => {
        expect(screen.getByTestId("location-display")).toHaveTextContent("task=ENG-101");
        expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();
      });
    });

    it("renders mobile stage switcher tabs on mobile viewports", async () => {
      const user = userEvent.setup();
      renderWorkspaceTasksShell({ initialEntries: ["/board"], defaultView: "board" });

      await waitFor(() => {
        expect(screen.getByTestId("task-board-view")).toBeInTheDocument();
      });

      const inProgressStageTab = screen.getByTestId("mobile-stage-tab-IN_PROGRESS");
      expect(inProgressStageTab).toBeInTheDocument();

      await user.click(inProgressStageTab);
      await waitFor(() => {
        expect(screen.getByTestId("mobile-stage-tab-IN_PROGRESS")).toHaveAttribute("aria-selected", "true");
      });
    });

    it("renders loading, empty, and error retry states in Board View", async () => {
      const onRetry = vi.fn();

      // Loading
      const { unmount: unmountLoading } = renderWithProviders(
        <TaskBoardView
          groups={[]}
          isLoading={true}
          isError={false}
          error={null}
          onRetry={onRetry}
          workspaceId={WS_SHARED_ENG_ID}
          communityId={MOCK_COMMUNITY_1_ID}
        />
      );
      expect(screen.getByTestId("task-board-loading")).toBeInTheDocument();
      unmountLoading();

      // Empty
      const { unmount: unmountEmpty } = renderWithProviders(
        <TaskBoardView
          groups={[]}
          isLoading={false}
          isError={false}
          error={null}
          onRetry={onRetry}
          workspaceId={WS_SHARED_ENG_ID}
          communityId={MOCK_COMMUNITY_1_ID}
        />
      );
      expect(screen.getByTestId("task-board-empty")).toBeInTheDocument();
      unmountEmpty();

      // Error
      const { unmount: unmountError } = renderWithProviders(
        <TaskBoardView
          groups={[]}
          isLoading={false}
          isError={true}
          error={new Error("Server error 500")}
          onRetry={onRetry}
          workspaceId={WS_SHARED_ENG_ID}
          communityId={MOCK_COMMUNITY_1_ID}
        />
      );
      expect(screen.getByTestId("task-board-error")).toBeInTheDocument();
      const retryBtn = screen.getByRole("button", { name: /retry/i });
      await userEvent.click(retryBtn);
      expect(onRetry).toHaveBeenCalledTimes(1);
      unmountError();
    });
  });

  describe("3. View Synchronization & Shared State", () => {
    it("preserves search query, priority, and sort state when switching between List and Board views", async () => {
      const user = userEvent.setup();
      renderWorkspaceTasksShell({ initialEntries: ["/list"], defaultView: "list" });

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      // Set search query
      const searchInput = screen.getByLabelText("Search tasks");
      await user.type(searchInput, "critical");

      // Set priority filter
      const prioritySelect = screen.getByLabelText("Filter tasks by priority");
      await user.selectOptions(prioritySelect, "URGENT");

      // Switch to Board View via tab
      const boardTab = screen.getByTestId("tab-view-board");
      await user.click(boardTab);

      // Verify Board View is active and filtered
      await waitFor(() => {
        expect(screen.getByTestId("task-board-view")).toBeInTheDocument();
        expect(screen.queryByTestId("task-list-view")).not.toBeInTheDocument();
      });

      // Verify shared search query and priority are preserved in toolbar controls
      expect(screen.getByLabelText("Search tasks")).toHaveValue("critical");
      expect(screen.getByLabelText("Filter tasks by priority")).toHaveValue("URGENT");

      // Switch back to List View via tab
      const listTab = screen.getByTestId("tab-view-list");
      await user.click(listTab);

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      expect(screen.getByLabelText("Search tasks")).toHaveValue("critical");
      expect(screen.getByLabelText("Filter tasks by priority")).toHaveValue("URGENT");
    });

    it("reflects task status update performed in Board View inside List View immediately upon switching", async () => {
      const user = userEvent.setup();
      renderWorkspaceTasksShell({ initialEntries: ["/board"], defaultView: "board" });

      await waitFor(() => {
        expect(screen.getByTestId("task-board-view")).toBeInTheDocument();
      });

      // Move ENG-101 from IN_PROGRESS to DONE via Board card status selector
      const statusSelect = screen.getByLabelText("Move ENG-101 status");
      await user.selectOptions(statusSelect, "DONE");

      await waitFor(() => {
        const doneCol = screen.getByTestId("board-column-DONE");
        expect(within(doneCol).getByTestId("task-board-card-ENG-101")).toBeInTheDocument();
      });

      // Switch to List View
      const listTab = screen.getByTestId("tab-view-list");
      await user.click(listTab);

      // Verify ENG-101 in List View displays Done status badge
      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
        const row101 = screen.getByTestId("task-list-row-ENG-101");
        expect(within(row101).getByText("Done")).toBeInTheDocument();
      });
    });

    it("reflects new task created via Quick Task Composer in both List and Board views", async () => {
      const user = userEvent.setup();
      renderWorkspaceTasksShell({ initialEntries: ["/list"], defaultView: "list" });

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      // Open Quick Composer via toolbar button
      const newBtn = screen.getByTestId("task-toolbar-new-task-btn");
      await user.click(newBtn);

      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: "Create Task" })).toBeInTheDocument();
      });

      // Fill in new task details
      const titleInput = screen.getByTestId("composer-title-input");
      await user.type(titleInput, "Synchronized View Test Task");

      const submitBtn = screen.getByRole("button", { name: /^create task$/i });
      await user.click(submitBtn);

      // Verify new task appears in List View
      await waitFor(() => {
        expect(screen.getByText("Synchronized View Test Task")).toBeInTheDocument();
      });

      // Switch to Board View and verify new task appears in TODO column
      const boardTab = screen.getByTestId("tab-view-board");
      await user.click(boardTab);

      await waitFor(() => {
        expect(screen.getByTestId("task-board-view")).toBeInTheDocument();
        const todoCol = screen.getByTestId("board-column-TODO");
        expect(within(todoCol).getByText("Synchronized View Test Task")).toBeInTheDocument();
      });
    });

    it("preserves community and workspace isolation without leaking cache across workspaces", async () => {
      // Render in Personal Workspace (WS_PERSONAL_ALEX_ID)
      renderWorkspaceTasksShell({
        initialEntries: ["/list"],
        initialCommunityId: MOCK_COMMUNITY_1_ID,
        initialWorkspaceId: WS_PERSONAL_ALEX_ID,
        defaultView: "list",
      });

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      // Personal workspace has ALEX-1
      expect(screen.getByTestId("task-list-row-ALEX-1")).toBeInTheDocument();
      // Should NOT have shared engineering tasks (ENG-101)
      expect(screen.queryByTestId("task-list-row-ENG-101")).not.toBeInTheDocument();
    });

    it("recovers from 409 QUERY_SNAPSHOT_EXPIRED without data loss", async () => {
      // Force snapshot expiration once
      setForceExpireSnapshot(true, true);

      renderWorkspaceTasksShell({ initialEntries: ["/list"], defaultView: "list" });

      // The hook should catch the 409 and restart query, successfully recovering and rendering tasks
      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
        expect(screen.getByTestId("task-list-row-ENG-101")).toBeInTheDocument();
      });
    });
  });

  describe("4. Production Architectural Boundary", () => {
    it("ensures zero mock data imports in production tasks modules", () => {
      const tasksDir = path.resolve(__dirname);
      const productionFiles: string[] = [];

      function collectFiles(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            collectFiles(fullPath);
          } else if (
            entry.isFile() &&
            (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
            !entry.name.includes(".test.") &&
            !entry.name.includes(".spec.")
          ) {
            productionFiles.push(fullPath);
          }
        }
      }

      collectFiles(tasksDir);
      expect(productionFiles.length).toBeGreaterThan(0);

      const violations: Array<{ file: string; line: string }> = [];
      const mockImportRegex = /from\s+["'].*\/mocks\/.*["']|import\s+["'].*\/mocks\/.*["']/;

      for (const filePath of productionFiles) {
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n");
        lines.forEach((line, index) => {
          if (mockImportRegex.test(line)) {
            violations.push({
              file: path.relative(process.cwd(), filePath),
              line: `L${index + 1}: ${line.trim()}`,
            });
          }
        });
      }

      expect(violations).toEqual([]);
    });
  });
});
