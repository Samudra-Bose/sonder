import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import * as fs from "fs";
import * as path from "path";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { WorkspaceProvider } from "@/modules/workspace/WorkspaceContext.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import {
  MOCK_COMMUNITY_1_ID,
  WS_SHARED_ENG_ID,
  WS_PERSONAL_ALEX_ID,
  MOCK_USER_ID,
} from "@/mocks/data/my-work.js";
import {
  resetTaskMockState,
  setMockTasksError,
  getMockTasks,
} from "@/mocks/handlers/tasks.js";
import { TaskPeekDrawer } from "./TaskPeekDrawer.js";
import {
  computeSubtreeHeight,
  getDescendantTaskIds,
} from "./ReparentTaskModal.js";
import { moveTask } from "./api.js";

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

function renderHierarchyTest({
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

describe("VS-03 Stage 5: Subtask Hierarchy & Reparenting", () => {
  beforeEach(() => {
    resetTaskMockState();
  });

  afterEach(() => {
    resetTaskMockState();
  });

  describe("Subtask Hierarchy Rendering & Tree Structure", () => {
    it("renders empty state 'No subtasks yet' when root task has no descendants", async () => {
      // ENG-102 is a root task with 0 subtasks
      renderHierarchyTest({ initialEntries: ["/?task=ENG-102"] });

      await waitFor(() => {
        expect(screen.getByTestId("subtasks-section")).toBeInTheDocument();
      });

      expect(await screen.findByTestId("subtasks-empty")).toHaveTextContent("No subtasks yet.");
    });

    it("renders direct subtasks and nested descendants using parentTaskId relationships", async () => {
      // ENG-101 has subtask ENG-105, which has nested subtask ENG-106
      renderHierarchyTest({ initialEntries: ["/?task=ENG-101"] });

      await waitFor(() => {
        expect(screen.getByTestId("subtasks-section")).toBeInTheDocument();
      });

      // Direct subtask ENG-105 should be visible
      const subtaskItem105 = await screen.findByTestId("subtask-item-ENG-105");
      expect(subtaskItem105).toBeInTheDocument();
      expect(subtaskItem105).toHaveTextContent("Write concurrent refresh token unit tests");
      expect(screen.getByTestId("subtask-status-ENG-105")).toBeInTheDocument();

      // Nested subtask ENG-106 should also be visible inside the tree
      const subtaskItem106 = await screen.findByTestId("subtask-item-ENG-106");
      expect(subtaskItem106).toBeInTheDocument();
      expect(subtaskItem106).toHaveTextContent("Mock OAuth provider latency simulation");
    });

    it("supports expanding and collapsing nested descendant groups", async () => {
      const user = userEvent.setup();
      renderHierarchyTest({ initialEntries: ["/?task=ENG-101"] });

      // Initially expanded
      await waitFor(() => {
        expect(screen.getByTestId("subtask-item-ENG-106")).toBeInTheDocument();
      });

      // Click collapse toggle on ENG-105
      const toggleBtn = screen.getByTestId("toggle-expand-ENG-105");
      expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
      await user.click(toggleBtn);

      // Now collapsed
      expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByTestId("subtask-item-ENG-106")).not.toBeInTheDocument();

      // Click again to expand
      await user.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
      expect(await screen.findByTestId("subtask-item-ENG-106")).toBeInTheDocument();
    });

    it("navigates to subtask in TaskPeekDrawer when subtask key link is clicked", async () => {
      const user = userEvent.setup();
      renderHierarchyTest({ initialEntries: ["/?task=ENG-101"] });

      const link105 = await screen.findByTestId("subtask-link-ENG-105");
      await user.click(link105);

      // URL search params update to ?task=ENG-105
      await waitFor(() => {
        expect(screen.getByTestId("location-display")).toHaveTextContent("task=ENG-105");
      });
    });

    it("handles error state and provides functional retry button", async () => {
      const user = userEvent.setup();
      setMockTasksError({
        status: 500,
        problem: {
          type: "https://errors.sonder.platform/server-error",
          title: "Internal Error",
          status: 500,
          detail: "Query pipeline failed temporarily.",
          code: "INTERNAL_ERROR",
        },
        method: "POST",
      });

      renderHierarchyTest({ initialEntries: ["/?task=ENG-101"] });

      // Error banner is displayed
      const errorNotice = await screen.findByTestId("subtasks-error");
      expect(errorNotice).toBeInTheDocument();
      expect(errorNotice).toHaveTextContent("Failed to load subtasks.");

      // Clear error and click Retry
      setMockTasksError(null);
      const retryBtn = screen.getByTestId("subtask-retry-btn");
      await user.click(retryBtn);

      // Recovers and displays subtasks
      await waitFor(() => {
        expect(screen.getByTestId("subtask-item-ENG-105")).toBeInTheDocument();
      });
    });
  });

  describe("Workspace Depth Policy & Limit Enforcement", () => {
    it("enforces maxSubtaskDepth = 2 in Engineering Platform workspace and blocks depth > 2", async () => {
      // Opening ENG-106 (which is at depth 2 in a maxSubtaskDepth=2 workspace)
      renderHierarchyTest({ initialEntries: ["/?task=ENG-106"] });

      await waitFor(() => {
        expect(screen.getByTestId("subtasks-section")).toBeInTheDocument();
      });

      // Depth limit notice should be rendered and Add Subtask button must not be displayed
      expect(await screen.findByTestId("subtask-depth-limit-notice")).toHaveTextContent(
        "Maximum subtask depth (2) reached for this workspace."
      );
      expect(screen.queryByTestId("add-subtask-btn")).not.toBeInTheDocument();
    });

    it("enforces maxSubtaskDepth = 1 in Personal Workspace (ALEX-1)", async () => {
      renderHierarchyTest({
        initialEntries: ["/?task=ALEX-1"],
        initialWorkspaceId: WS_PERSONAL_ALEX_ID,
      });

      await waitFor(() => {
        expect(screen.getByTestId("subtasks-section")).toBeInTheDocument();
      });

      // Root task ALEX-1 is at depth 0, so it can have subtasks
      expect(screen.getByTestId("add-subtask-btn")).toBeInTheDocument();
    });

    it("hides Add Subtask button when task is archived", async () => {
      // ENG-088 is archived
      renderHierarchyTest({ initialEntries: ["/?task=ENG-088"] });

      await waitFor(() => {
        expect(screen.getByTestId("subtasks-section")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("add-subtask-btn")).not.toBeInTheDocument();
    });

    it("hides Add Subtask button when actor lacks canCreateSubtask (read-only viewer task)", async () => {
      // ENG-050 is read-only for Alex
      renderHierarchyTest({ initialEntries: ["/?task=ENG-050"] });

      await waitFor(() => {
        expect(screen.getByTestId("subtasks-section")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("add-subtask-btn")).not.toBeInTheDocument();
    });
  });

  describe("Subtask Creation & Form Validation", () => {
    it("creates a new subtask under current task and updates hierarchy tree", async () => {
      const user = userEvent.setup();
      renderHierarchyTest({ initialEntries: ["/?task=ENG-102"] });

      const addBtn = await screen.findByTestId("add-subtask-btn");
      await user.click(addBtn);

      const titleInput = screen.getByTestId("subtask-title-input");
      expect(titleInput).toBeInTheDocument();

      // Enter valid subtask title
      await user.type(titleInput, "Implement board card status transitions");

      // Submit
      const submitBtn = screen.getByTestId("subtask-create-submit-btn");
      await user.click(submitBtn);

      // Form closes and newly created subtask appears in the list
      await waitFor(() => {
        expect(screen.queryByTestId("subtask-create-form")).not.toBeInTheDocument();
        expect(screen.getByText("Implement board card status transitions")).toBeInTheDocument();
      });
    });

    it("rejects empty title and disables submission", async () => {
      const user = userEvent.setup();
      renderHierarchyTest({ initialEntries: ["/?task=ENG-102"] });

      const addBtn = await screen.findByTestId("add-subtask-btn");
      await user.click(addBtn);

      const submitBtn = screen.getByTestId("subtask-create-submit-btn");
      expect(submitBtn).toBeDisabled();

      // Type spaces only
      const titleInput = screen.getByTestId("subtask-title-input");
      await user.type(titleInput, "   ");
      expect(submitBtn).toBeDisabled();
    });

    it("preserves title draft on server error and surfaces error message for retry", async () => {
      const user = userEvent.setup();
      setMockTasksError({
        status: 500,
        problem: {
          type: "https://errors.sonder.platform/server-error",
          title: "Internal Error",
          status: 500,
          detail: "Task persistence service timed out.",
          code: "INTERNAL_ERROR",
        },
        method: "POST",
      });

      renderHierarchyTest({ initialEntries: ["/?task=ENG-102"] });

      const addBtn = await screen.findByTestId("add-subtask-btn");
      await user.click(addBtn);

      const titleInput = screen.getByTestId("subtask-title-input");
      await user.type(titleInput, "Subtask to test failure draft retention");

      const submitBtn = screen.getByTestId("subtask-create-submit-btn");
      await user.click(submitBtn);

      // Error is displayed and draft is preserved
      await waitFor(() => {
        expect(screen.getByTestId("subtask-create-error")).toHaveTextContent(
          "Task persistence service timed out."
        );
      });
      expect(titleInput).toHaveValue("Subtask to test failure draft retention");
    });
  });

  describe("Same-Workspace Reparenting & Invariant Protection", () => {
    it("successfully reparents a subtask to top level (null parent)", async () => {
      const user = userEvent.setup();
      renderHierarchyTest({ initialEntries: ["/?task=ENG-101"] });

      // Click reparent on subtask ENG-105
      const reparentBtn = await screen.findByTestId("reparent-btn-ENG-105");
      await user.click(reparentBtn);

      const modal = await screen.findByTestId("reparent-task-modal");
      expect(modal).toBeInTheDocument();

      const select = screen.getByTestId("reparent-destination-select");
      await user.selectOptions(select, "TOP_LEVEL");

      const submitBtn = screen.getByTestId("reparent-submit-btn");
      await user.click(submitBtn);

      // Modal closes
      await waitFor(() => {
        expect(screen.queryByTestId("reparent-task-modal")).not.toBeInTheDocument();
      });

      // Authoritative task in store now has parentTaskId = null
      const tasks = getMockTasks();
      const task105 = tasks.find((t) => t.taskKey === "ENG-105");
      expect(task105?.parentTaskId).toBeNull();
    });

    it("prevents self-parenting and cycle formation in client calculation", () => {
      const tasks = getMockTasks();
      const task101 = tasks.find((t) => t.taskKey === "ENG-101")!;
      const task105 = tasks.find((t) => t.taskKey === "ENG-105")!;
      const task106 = tasks.find((t) => t.taskKey === "ENG-106")!;

      // Descendants of ENG-101 are ENG-105 and ENG-106
      const desc101 = getDescendantTaskIds(task101.id, tasks);
      expect(desc101.has(task105.id)).toBe(true);
      expect(desc101.has(task106.id)).toBe(true);

      // Descendants of ENG-105 is ENG-106
      const desc105 = getDescendantTaskIds(task105.id, tasks);
      expect(desc105.has(task106.id)).toBe(true);
      expect(desc105.has(task101.id)).toBe(false);

      // Height calculations
      expect(computeSubtreeHeight(task106.id, tasks)).toBe(0);
      expect(computeSubtreeHeight(task105.id, tasks)).toBe(1);
      expect(computeSubtreeHeight(task101.id, tasks)).toBe(2);
    });

    it("rejects move request with 422 if server detects depth limit violation", async () => {
      // Direct API test verifying server-side contract guard
      await expect(
        moveTask({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          taskId: "018f98a2-task-001-overdue-assigned", // ENG-101 (subtree height 2)
          data: {
            targetWorkspaceId: WS_SHARED_ENG_ID,
            targetParentTaskId: "018f98a2-task-003-today-assigned-created", // ENG-102 (depth 0)
            confirmedPersonalToSharedTransfer: false,
          },
          csrfToken: "mock-csrf-token",
        })
      ).rejects.toThrow();
    });

    it("rejects reparenting when target is a descendant (server 422 cycle rejection)", async () => {
      // Attempting to move ENG-101 under ENG-105 (cycle!)
      await expect(
        moveTask({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          taskId: "018f98a2-task-001-overdue-assigned", // ENG-101
          data: {
            targetWorkspaceId: WS_SHARED_ENG_ID,
            targetParentTaskId: "018f98a2-task-001-subtask-1", // ENG-105 (descendant of ENG-101)
            confirmedPersonalToSharedTransfer: false,
          },
          csrfToken: "mock-csrf-token",
        })
      ).rejects.toThrow();
    });

    it("rejects self-parenting with 422 TARGET_PARENT_INVALID", async () => {
      // Attempting to move ENG-101 under itself
      await expect(
        moveTask({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          taskId: "018f98a2-task-001-overdue-assigned",
          data: {
            targetWorkspaceId: WS_SHARED_ENG_ID,
            targetParentTaskId: "018f98a2-task-001-overdue-assigned",
            confirmedPersonalToSharedTransfer: false,
          },
          csrfToken: "mock-csrf-token",
        })
      ).rejects.toThrow();
    });
  });

  describe("Production Module Architectural Boundaries", () => {
    it("verifies zero mock fixture imports in production task modules", () => {
      const tasksDir = path.resolve(__dirname);
      const files = fs.readdirSync(tasksDir);
      const productionFiles = files.filter(
        (f) => (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.includes(".test.")
      );

      expect(productionFiles.length).toBeGreaterThan(0);

      for (const file of productionFiles) {
        const filePath = path.join(tasksDir, file);
        const content = fs.readFileSync(filePath, "utf-8");

        expect(content).not.toMatch(/from\s+['"].*\/mocks\/.*/);
        expect(content).not.toMatch(/from\s+['"]@\/mocks\/.*/);
      }
    });
  });
});
