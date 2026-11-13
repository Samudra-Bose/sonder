import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { WorkspaceProvider } from "@/modules/workspace/WorkspaceContext.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import {
  MOCK_COMMUNITY_1_ID,
  WS_SHARED_ENG_ID,
  WS_SHARED_GALA_ID,
  MOCK_USER_ID,
} from "@/mocks/data/my-work.js";
import {
  setMockTasksError,
  resetTaskMockState,
  getMockTasks,
} from "@/mocks/handlers/tasks.js";
import { BacklogTaskTray, type BacklogTaskTrayProps } from "./BacklogTaskTray";
import { TaskListView } from "./TaskListView";
import { TaskBoardView } from "./TaskBoardView";
import { WorkspaceTasksView } from "./WorkspaceTasksView.js";
import { QuickTaskComposerProvider } from "../QuickTaskComposerContext.js";
import type { TaskDto, TaskQueryBucketDto } from "../types";

const testAuthUser = {
  id: MOCK_USER_ID,
  displayName: "Alex Morgan",
  email: "alex.morgan@example.org",
  avatarUrl: null,
};

const mockAuthValue: AuthContextType = {
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
};

function makeTask(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: "task-backlog-1",
    workspaceId: WS_SHARED_ENG_ID,
    parentTaskId: null,
    taskKey: "ENG-501",
    title: "Unscheduled Backlog Item",
    description: "Idea staged in the backlog",
    itemType: "TASK",
    statusCategory: "BACKLOG",
    priority: "MEDIUM",
    assigneeIds: [],
    creatorId: MOCK_USER_ID,
    startDate: null,
    dueDate: null,
    estimatePoints: null,
    labelIds: [],
    milestoneId: null,
    rankKey: "0|hzzzzz:",
    version: 1,
    fieldRevisions: { statusCategory: 1 },
    effectivePermissions: {
      canEditTitleDescription: true,
      canEditDatesPriority: true,
      canEditCustomFieldsLinks: true,
      canEditEstimate: true,
      canUpdateStatus: true,
      canRequestSignoff: false,
      canApproveSignoff: false,
      canAssign: true,
      canManageSubtasks: true,
      canCreateSubtask: true,
      canMove: true,
      canComment: true,
      canWatch: true,
      canArchive: true,
      canRestore: true,
      canDeletePermanent: false,
      restrictedActions: [],
      canManageAssigneeFieldGrants: false,
    },
    createdAt: "2026-11-01T10:00:00Z",
    updatedAt: "2026-11-01T10:00:00Z",
    archivedAt: null,
    assigneeAssignments: [],
    assigneeEditableFieldGroups: [],
    ...overrides,
  };
}

function renderBacklogTray(props: Partial<BacklogTaskTrayProps> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  const defaultProps: BacklogTaskTrayProps = {
    tasks: [makeTask()],
    totalCount: 1,
    isOpen: false,
    onToggle: vi.fn(),
    onTaskClick: vi.fn(),
    workspaceId: WS_SHARED_ENG_ID,
    communityId: MOCK_COMMUNITY_1_ID,
    viewType: "list",
    ...props,
  };

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuthValue}>
          <WorkspaceProvider
            initialCommunityId={MOCK_COMMUNITY_1_ID}
            initialWorkspaceId={WS_SHARED_ENG_ID}
          >
            <MemoryRouter>
              <BacklogTaskTray {...defaultProps} />
            </MemoryRouter>
          </WorkspaceProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    ),
  };
}

let storageMock: Record<string, string> = {};

describe("VS-09G: Collapsible Backlog Tray (FEAT-B02)", () => {
  beforeEach(() => {
    resetTaskMockState();
    setMockTasksError(null);
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
  });

  it("renders collapsed tray header with toggle button, badge, and accessible ARIA attributes", () => {
    renderBacklogTray({
      isOpen: false,
      totalCount: 5,
    });

    const toggle = screen.getByTestId("backlog-tray-toggle");
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "backlog-tray-content");

    const badge = screen.getByTestId("backlog-count-badge");
    expect(badge).toHaveTextContent("5");

    // Content should not be visible when collapsed
    expect(screen.queryByTestId("backlog-tray-content")).not.toBeInTheDocument();
  });

  it("invokes onToggle when the tray header button is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    renderBacklogTray({
      isOpen: false,
      onToggle,
    });

    const toggle = screen.getByTestId("backlog-tray-toggle");
    await user.click(toggle);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders expanded tray with backlog tasks and metadata", () => {
    const task1 = makeTask({
      id: "task-1",
      taskKey: "ENG-101",
      title: "Research caching strategies",
      itemType: "TASK",
      priority: "HIGH",
    });
    const task2 = makeTask({
      id: "task-2",
      taskKey: "ENG-102",
      title: "Fix crash on logout",
      itemType: "BUG",
      priority: "URGENT",
    });

    renderBacklogTray({
      isOpen: true,
      tasks: [task1, task2],
      totalCount: 2,
    });

    expect(screen.getByTestId("backlog-tray-content")).toBeInTheDocument();
    expect(screen.getByTestId("backlog-task-item-ENG-101")).toBeInTheDocument();
    expect(screen.getByTestId("backlog-task-item-ENG-102")).toBeInTheDocument();

    expect(screen.getByText("Research caching strategies")).toBeInTheDocument();
    expect(screen.getByText("Fix crash on logout")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Urgent")).toBeInTheDocument();
  });

  it("renders empty state message when open with 0 backlog tasks", () => {
    renderBacklogTray({
      isOpen: true,
      tasks: [],
      totalCount: 0,
      viewType: "board",
    });

    expect(screen.getByTestId("backlog-empty-state")).toBeInTheDocument();
    expect(screen.getByText("Backlog is empty")).toBeInTheDocument();
    expect(
      screen.getByText(/All active tasks are staged on the board/i)
    ).toBeInTheDocument();
  });

  it("promotes backlog task to To Do via quick action button", async () => {
    const user = userEvent.setup();
    const task = getMockTasks().find((t) => t.workspaceId === WS_SHARED_ENG_ID)!;
    task.statusCategory = "BACKLOG";
    task.fieldRevisions = { statusCategory: 1 };

    renderBacklogTray({
      isOpen: true,
      tasks: [task],
      totalCount: 1,
    });

    const promoteBtn = screen.getByTestId(`backlog-promote-${task.taskKey}`);
    expect(promoteBtn).toBeInTheDocument();
    expect(promoteBtn).toHaveTextContent("To Do");

    await user.click(promoteBtn);

    // After mutation resolves, verify no error was produced
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("disables promote button when user lacks canUpdateStatus capability", () => {
    const task = makeTask({
      id: "task-no-perm",
      taskKey: "ENG-502-NO-PERM",
      title: "Task without update status permission",
      statusCategory: "BACKLOG",
      effectivePermissions: {
        ...makeTask().effectivePermissions,
        canUpdateStatus: false,
      },
    });

    renderBacklogTray({
      isOpen: true,
      tasks: [task],
      totalCount: 1,
    });

    const promoteBtn = screen.getByTestId("backlog-promote-ENG-502-NO-PERM");
    expect(promoteBtn).toBeDisabled();
    expect(promoteBtn).toHaveAttribute("aria-disabled", "true");
    expect(promoteBtn).toHaveAttribute(
      "title",
      "You do not have permission to update task status"
    );
  });

  it("fails closed when effectivePermissions is missing or task is archived", () => {
    const unpermittedTask = makeTask({
      id: "task-missing-perm",
      taskKey: "ENG-502-MISSING",
      title: "Task with missing permission data",
      statusCategory: "BACKLOG",
      effectivePermissions: undefined as any,
    });

    const archivedTask = makeTask({
      id: "task-archived",
      taskKey: "ENG-502-ARCHIVED",
      title: "Archived backlog task",
      statusCategory: "BACKLOG",
      archivedAt: "2026-11-01T12:00:00Z",
    });

    renderBacklogTray({
      isOpen: true,
      tasks: [unpermittedTask, archivedTask],
      totalCount: 2,
    });

    const missingBtn = screen.getByTestId("backlog-promote-ENG-502-MISSING");
    expect(missingBtn).toBeDisabled();

    const archivedBtn = screen.getByTestId("backlog-promote-ENG-502-ARCHIVED");
    expect(archivedBtn).toBeDisabled();
  });

  it("displays dismissible error banner when promote mutation fails", async () => {
    const user = userEvent.setup();
    const task = makeTask({
      id: "task-failing",
      taskKey: "ENG-503",
      title: "Task with failing mutation",
      statusCategory: "BACKLOG",
    });

    setMockTasksError({
      status: 403,
      problem: {
        type: "https://errors.sonder.platform/forbidden",
        title: "Forbidden",
        status: 403,
        detail: "You do not have permission to update task status in this workspace.",
        code: "PERMISSION_DENIED",
      },
      method: "PATCH",
    });

    renderBacklogTray({
      isOpen: true,
      tasks: [task],
      totalCount: 1,
    });

    const promoteBtn = screen.getByTestId("backlog-promote-ENG-503");
    await user.click(promoteBtn);

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(
      screen.getByText(/You do not have permission to update task status/i)
    ).toBeInTheDocument();

    // Dismiss error
    const dismissBtn = screen.getByLabelText("Dismiss promotion error");
    await user.click(dismissBtn);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("calls onTaskClick when a task row is clicked or activated with Enter/Space", async () => {
    const user = userEvent.setup();
    const onTaskClick = vi.fn();
    const task = makeTask({
      id: "task-click-test",
      taskKey: "ENG-504",
      title: "Clickable task",
    });

    renderBacklogTray({
      isOpen: true,
      tasks: [task],
      totalCount: 1,
      onTaskClick,
    });

    const taskItem = screen.getByTestId("backlog-task-item-ENG-504");
    await user.click(taskItem);
    expect(onTaskClick).toHaveBeenCalledWith(task);

    // Keyboard navigation: Enter
    taskItem.focus();
    await user.keyboard("{Enter}");
    expect(onTaskClick).toHaveBeenCalledTimes(2);

    // Keyboard navigation: Space
    await user.keyboard(" ");
    expect(onTaskClick).toHaveBeenCalledTimes(3);
  });

  it("shows truncation notice when totalCount exceeds the number of rendered preview tasks", () => {
    const tasks = [
      makeTask({ id: "t-1", taskKey: "ENG-1" }),
      makeTask({ id: "t-2", taskKey: "ENG-2" }),
    ];

    renderBacklogTray({
      isOpen: true,
      tasks,
      totalCount: 15,
    });

    expect(screen.getByText("Showing 2 of 15 backlog tasks.")).toBeInTheDocument();
  });

  it("integrates seamlessly into TaskListView", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });

    const activeTask = makeTask({
      id: "active-1",
      taskKey: "ENG-001",
      title: "Active task in table",
      statusCategory: "IN_PROGRESS",
    });
    const backlogTask = makeTask({
      id: "backlog-1",
      taskKey: "ENG-002",
      title: "Backlog task in tray",
      statusCategory: "BACKLOG",
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuthValue}>
          <WorkspaceProvider
            initialCommunityId={MOCK_COMMUNITY_1_ID}
            initialWorkspaceId={WS_SHARED_ENG_ID}
          >
            <MemoryRouter>
              <TaskListView
                tasks={[activeTask]}
                backlogTasks={[backlogTask]}
                backlogCount={1}
                isLoading={false}
                isError={false}
                error={null}
                onRetry={vi.fn()}
                workspaceId={WS_SHARED_ENG_ID}
                communityId={MOCK_COMMUNITY_1_ID}
              />
            </MemoryRouter>
          </WorkspaceProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );

    // List table renders active task
    expect(screen.getByText("Active task in table")).toBeInTheDocument();

    // Backlog tray toggle is rendered
    const toggle = screen.getByTestId("backlog-tray-toggle");
    expect(toggle).toBeInTheDocument();
    expect(screen.getByTestId("backlog-count-badge")).toHaveTextContent("1");

    // Click toggle to expand
    await user.click(toggle);

    // Backlog item now visible
    expect(screen.getByText("Backlog task in tray")).toBeInTheDocument();
  });

  it("integrates seamlessly into TaskBoardView", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });

    const groups: TaskQueryBucketDto[] = [
      {
        key: "TODO",
        label: "To Do",
        total: 1,
        nextCursor: null,
        children: [],
        items: [
          makeTask({
            id: "board-t1",
            taskKey: "ENG-010",
            title: "Task in board column",
            statusCategory: "TODO",
          }),
        ],
      },
    ];

    const backlogTask = makeTask({
      id: "backlog-b1",
      taskKey: "ENG-020",
      title: "Task in board backlog tray",
      statusCategory: "BACKLOG",
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuthValue}>
          <WorkspaceProvider
            initialCommunityId={MOCK_COMMUNITY_1_ID}
            initialWorkspaceId={WS_SHARED_ENG_ID}
          >
            <MemoryRouter>
              <TaskBoardView
                groups={groups}
                backlogTasks={[backlogTask]}
                backlogCount={1}
                isLoading={false}
                isError={false}
                error={null}
                onRetry={vi.fn()}
                workspaceId={WS_SHARED_ENG_ID}
                communityId={MOCK_COMMUNITY_1_ID}
              />
            </MemoryRouter>
          </WorkspaceProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );

    expect(screen.getByText("Task in board column")).toBeInTheDocument();

    const toggle = screen.getByTestId("backlog-tray-toggle");
    expect(toggle).toBeInTheDocument();

    await user.click(toggle);
    expect(screen.getByText("Task in board backlog tray")).toBeInTheDocument();
  });

  describe("Workspace-Scoped Persistence & Switcher Integration", () => {
    function renderWorkspaceView(workspaceId: string, queryClient: QueryClient) {
      return render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={mockAuthValue}>
            <WorkspaceProvider
              initialCommunityId={MOCK_COMMUNITY_1_ID}
              initialWorkspaceId={workspaceId}
            >
              <QuickTaskComposerProvider>
                <MemoryRouter initialEntries={[`/c/${MOCK_COMMUNITY_1_ID}/w/${workspaceId}/list`]}>
                  <Routes>
                    <Route
                      path="/c/:communityId/w/:workspaceId/list"
                      element={<WorkspaceTasksView defaultView="list" />}
                    />
                  </Routes>
                </MemoryRouter>
              </QuickTaskComposerProvider>
            </WorkspaceProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );
    }

    it("persists tray open state per workspace, unmounts/remounts, isolates workspace B, and restores workspace A", async () => {
      const user = userEvent.setup();

      // 1. Render in workspace A (WS_SHARED_ENG_ID)
      const queryClient1 = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 0 } },
      });
      const { unmount: unmount1 } = renderWorkspaceView(WS_SHARED_ENG_ID, queryClient1);

      const toggleA = await screen.findByTestId("backlog-tray-toggle");
      expect(toggleA).toHaveAttribute("aria-expanded", "false");

      // 2. Open the tray in workspace A
      await user.click(toggleA);
      expect(toggleA).toHaveAttribute("aria-expanded", "true");
      expect(storageMock[`sonder:backlog-tray-open:${WS_SHARED_ENG_ID}`]).toBe("true");

      // 3. Unmount view
      unmount1();

      // 4. Remount workspace A view - verify state restored
      const queryClient2 = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 0 } },
      });
      const { unmount: unmount2 } = renderWorkspaceView(WS_SHARED_ENG_ID, queryClient2);

      const restoredToggleA = await screen.findByTestId("backlog-tray-toggle");
      expect(restoredToggleA).toHaveAttribute("aria-expanded", "true");
      unmount2();

      // 5. Mount in workspace B (WS_SHARED_GALA_ID) - verify independent default state (closed)
      const queryClient3 = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 0 } },
      });
      const { unmount: unmount3 } = renderWorkspaceView(WS_SHARED_GALA_ID, queryClient3);

      const toggleB = await screen.findByTestId("backlog-tray-toggle");
      expect(toggleB).toHaveAttribute("aria-expanded", "false");
      unmount3();

      // 6. Switch back to workspace A - verify open state is restored
      const queryClient4 = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 0 } },
      });
      renderWorkspaceView(WS_SHARED_ENG_ID, queryClient4);

      const toggleAAgain = await screen.findByTestId("backlog-tray-toggle");
      expect(toggleAAgain).toHaveAttribute("aria-expanded", "true");
    });

    it("handles unavailable or failing localStorage safely without throwing errors", async () => {
      const user = userEvent.setup();
      // Mock localStorage throwing errors
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: vi.fn(() => {
            throw new Error("QuotaExceededError");
          }),
          setItem: vi.fn(() => {
            throw new Error("QuotaExceededError");
          }),
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
        configurable: true,
      });

      renderBacklogTray({
        isOpen: false,
        totalCount: 3,
      });

      const toggle = screen.getByTestId("backlog-tray-toggle");
      expect(toggle).toBeInTheDocument();
      // Clicking toggle should not crash
      await user.click(toggle);
    });
  });
});
