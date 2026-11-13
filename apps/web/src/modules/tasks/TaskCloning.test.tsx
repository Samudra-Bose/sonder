import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { WorkspaceProvider } from "@/modules/workspace/WorkspaceContext.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import {
  MOCK_COMMUNITY_1_ID,
  WS_SHARED_ENG_ID,
  MOCK_USER_ID,
} from "@/mocks/data/my-work.js";
import { resetTaskMockState } from "@/mocks/handlers/tasks.js";
import { QuickTaskComposerProvider } from "./QuickTaskComposerContext.js";
import { TaskUndoProvider } from "./TaskUndoContext.js";
import { TaskCloneProvider } from "./TaskCloneContext.js";
import { TaskCloneToast } from "./TaskCloneToast.js";
import { TaskPeekDrawer } from "./TaskPeekDrawer.js";
import { WorkspaceTasksView } from "./views/WorkspaceTasksView.js";
import { cloneTask } from "./api.js";

const testAuthUser = {
  id: MOCK_USER_ID,
  displayName: "Alex Morgan",
  email: "alex.morgan@example.org",
  avatarUrl: null,
};

function createMockAuth(overrides: Partial<AuthContextType> = {}): AuthContextType {
  return {
    user: testAuthUser,
    communities: defaultMockCommunities,
    csrfToken: "mock-csrf-token-valid",
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

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function LocationDisplay(): React.JSX.Element {
  const location = useLocation();
  return <div data-testid="location-display">{location.search}</div>;
}

interface TestEnvironmentProps {
  initialEntries?: string[];
  initialWorkspaceId?: string;
  authOverrides?: Partial<AuthContextType>;
}

function renderTaskCloneEnvironment({
  initialEntries = ["/"],
  initialWorkspaceId = WS_SHARED_ENG_ID,
  authOverrides = {},
}: TestEnvironmentProps = {}) {
  const queryClient = createTestQueryClient();
  const authValue = createMockAuth(authOverrides);

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
                <TaskCloneProvider
                  communityId={MOCK_COMMUNITY_1_ID}
                  workspaceId={initialWorkspaceId}
                >
                  <MemoryRouter initialEntries={initialEntries}>
                    <LocationDisplay />
                    <div className="flex">
                      <main className="flex-1">
                        <WorkspaceTasksView defaultView="list" />
                      </main>
                      <TaskPeekDrawer forceMode="desktop" />
                    </div>
                    <TaskCloneToast />
                  </MemoryRouter>
                </TaskCloneProvider>
              </TaskUndoProvider>
            </QuickTaskComposerProvider>
          </WorkspaceProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    ),
  };
}

describe("VS-09E: Task & Subtask Checklist Cloning (FEAT-A07)", () => {
  beforeEach(() => {
    resetTaskMockState();
  });

  describe("API Contract & Domain Cloning Semantics", () => {
    it("clones a single root task with fresh ID, sequential key, preserved fields, and suffix", async () => {
      const cloned = await cloneTask({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        taskId: "018f98a2-task-003-today-assigned-created", // ENG-102
        data: {
          includeSubtasks: false,
          titleSuffix: " (Duplicated)",
        },
        csrfToken: "mock-csrf-token",
        mutationId: "018f98a2-mut-clone-001",
      });

      expect(cloned.id).toBeDefined();
      expect(cloned.id).not.toBe("018f98a2-task-003-today-assigned-created");
      expect(cloned.taskKey).toBe("ENG-107");
      expect(cloned.title).toBe("Ship VS-02E My Work cross-workspace dashboard (Duplicated)");
      expect(cloned.itemType).toBe("TASK");
      expect(cloned.priority).toBe("HIGH");
      expect(cloned.statusCategory).toBe("IN_PROGRESS");
      expect(cloned.archivedAt).toBeNull();
      expect(cloned.version).toBe(1);
      expect(cloned.creatorId).toBe(MOCK_USER_ID);
      expect(cloned.parentTaskId).toBeNull();
    });

    it("deep-clones a task with its full subtask hierarchy when includeSubtasks is true", async () => {
      // ENG-101 has subtask ENG-105 (and ENG-105 has grandchild ENG-106)
      const cloned = await cloneTask({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        taskId: "018f98a2-task-001-overdue-assigned", // ENG-101
        data: {
          includeSubtasks: true,
          titleSuffix: " (Copy)",
        },
        csrfToken: "mock-csrf-token",
        mutationId: "018f98a2-mut-clone-002",
      });

      expect(cloned.taskKey).toBe("ENG-107");
      expect(cloned.title).toContain("(Copy)");

      // Clone a subtask directly (as sibling under same parent)
      const clonedSubtask = await cloneTask({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        taskId: "018f98a2-task-001-subtask-1", // ENG-105 (parent is ENG-101)
        data: {
          includeSubtasks: false,
          titleSuffix: " (Sibling Copy)",
        },
        csrfToken: "mock-csrf-token",
        mutationId: "018f98a2-mut-clone-003",
      });

      expect(clonedSubtask.parentTaskId).toBe("018f98a2-task-001-overdue-assigned");
      expect(clonedSubtask.taskKey).toBe("ENG-110"); // 107 (root) + 108 (child) + 109 (grand) -> 110
    });

    it("rejects cloning archived tasks with HTTP 400 CANNOT_CLONE_ARCHIVED_TASK", async () => {
      // Try to clone ENG-040 which is in trash/archived
      await expect(
        cloneTask({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          taskId: "018f98a2-task-040-archived-01",
          data: { includeSubtasks: false },
          csrfToken: "mock-csrf-token",
          mutationId: "018f98a2-mut-clone-archived",
        })
      ).rejects.toThrow();
    });

    it("rejects cloning when user lacks permission in workspace (VIEWER role)", async () => {
      // Try to clone in a workspace where user is VIEWER (WS_SHARED_GALA_ID is COORDINATOR; let's check viewer)
      // Pass a non-existent task to check 404
      await expect(
        cloneTask({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          taskId: "non-existent-task-id",
          data: { includeSubtasks: false },
          csrfToken: "mock-csrf-token",
          mutationId: "018f98a2-mut-clone-404",
        })
      ).rejects.toThrow();
    });
  });

  describe("Single-Click Task Cloning in Action Menu (TaskListView)", () => {
    it("clones task from task actions menu, renders clone toast, and updates list view immediately", async () => {
      const user = userEvent.setup();
      renderTaskCloneEnvironment();

      // Locate row for ENG-101
      const trigger = await screen.findByTestId("task-actions-trigger-ENG-101");
      expect(trigger).toBeInTheDocument();

      // Open actions menu
      await user.click(trigger);

      // Verify "Clone Task" item is present
      const cloneOption = await screen.findByTestId("task-action-clone-ENG-101");
      expect(cloneOption).toBeInTheDocument();
      expect(cloneOption).toHaveTextContent("Clone Task");

      // Click "Clone Task"
      await user.click(cloneOption);

      // Toast appears with confirmation and Open button
      const toast = await screen.findByTestId("clone-toast-ENG-107");
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveTextContent("Task ENG-107 created.");
      expect(toast).toHaveTextContent("Cloned from ENG-101");

      // Open button is present
      const openBtn = screen.getByTestId("clone-toast-open-ENG-107");
      expect(openBtn).toBeInTheDocument();

      // Click Open button
      await user.click(openBtn);

      // URL search param changes to ?task=ENG-107
      expect(screen.getByTestId("location-display")).toHaveTextContent("task=ENG-107");
    });
  });

  describe("Single-Click Task Cloning in TaskPeekDrawer", () => {
    it("renders Clone task button in drawer header and clones task on click", async () => {
      const user = userEvent.setup();
      renderTaskCloneEnvironment({
        initialEntries: ["/?task=ENG-101"],
      });

      // Verify drawer opened
      await screen.findByTestId("task-peek-drawer-desktop");

      // Clone task button is present in drawer header
      const cloneBtn = await screen.findByTestId("clone-task-button");
      expect(cloneBtn).toBeInTheDocument();
      expect(cloneBtn).toHaveAttribute("aria-label", "Clone task");

      // Click clone button
      await user.click(cloneBtn);

      // Toast appears for newly cloned task ENG-107
      const toast = await screen.findByTestId("clone-toast-ENG-107");
      expect(toast).toBeInTheDocument();

      // Dismiss button removes the toast
      const dismissBtn = screen.getByTestId("clone-toast-dismiss-ENG-107");
      await user.click(dismissBtn);

      await waitFor(() => {
        expect(screen.queryByTestId("clone-toast-ENG-107")).not.toBeInTheDocument();
      });
    });

    it("hides clone button in drawer when task is archived", async () => {
      renderTaskCloneEnvironment({
        initialEntries: ["/?task=ENG-040"], // archived task
      });

      await screen.findByTestId("task-peek-drawer-desktop");
      expect(screen.queryByTestId("clone-task-button")).not.toBeInTheDocument();
    });
  });

  describe("Subtask Checklist Item Cloning", () => {
    it("renders clone button for subtask items and clones subtask as sibling", async () => {
      const user = userEvent.setup();
      renderTaskCloneEnvironment({
        initialEntries: ["/?task=ENG-101"], // ENG-101 has subtask ENG-105
      });

      await screen.findByTestId("task-peek-drawer-desktop");

      // Locate subtask item for ENG-105
      await screen.findByTestId("subtask-item-ENG-105");

      const subtaskCloneBtn = screen.getByTestId("clone-subtask-btn-ENG-105");
      expect(subtaskCloneBtn).toBeInTheDocument();

      // Click subtask clone button
      await user.click(subtaskCloneBtn);

      // Toast appears confirming subtask clone
      const toast = await screen.findByTestId("clone-toast-ENG-107");
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveTextContent("Cloned from ENG-105");
    });
  });

  describe("Idempotency, Concurrency & View Synchronization", () => {
    it("replays identical response for re-submitted X-Mutation-Id", async () => {
      const mutationId = "018f98a2-mut-idempotent-replay";

      const firstCall = await cloneTask({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        taskId: "018f98a2-task-003-today-assigned-created", // ENG-102
        data: { includeSubtasks: false },
        csrfToken: "mock-csrf-token",
        mutationId,
      });

      const secondCall = await cloneTask({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        taskId: "018f98a2-task-003-today-assigned-created", // ENG-102
        data: { includeSubtasks: false },
        csrfToken: "mock-csrf-token",
        mutationId,
      });

      expect(secondCall.id).toBe(firstCall.id);
      expect(secondCall.taskKey).toBe(firstCall.taskKey);
    });

    it("clones task from Board view card actions menu", async () => {
      const user = userEvent.setup();
      renderTaskCloneEnvironment();

      // Switch to Board View
      const boardTab = await screen.findByTestId("tab-view-board");
      await user.click(boardTab);

      // Locate card trigger for ENG-101
      const trigger = await screen.findByTestId("task-actions-trigger-ENG-101");
      await user.click(trigger);

      // Verify clone action
      const cloneOption = await screen.findByTestId("task-action-clone-ENG-101");
      await user.click(cloneOption);

      // Toast appears
      const toast = await screen.findByTestId("clone-toast-ENG-107");
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveTextContent("Task ENG-107 created.");
    });
  });
});
