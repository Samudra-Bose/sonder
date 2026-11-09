import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { defaultMockCommunities } from "../../../../mocks/handlers/auth.js";
import { AuthContext, type AuthContextType } from "@/modules/auth/index.js";
import { WorkspaceProvider } from "@/modules/workspace/index.js";
import { QuickTaskComposerProvider } from "../../QuickTaskComposerContext.js";
import { TaskPeekDrawer } from "../../TaskPeekDrawer.js";
import { WorkspaceTasksView } from "../WorkspaceTasksView.js";
import { TimelineView } from "./TimelineView.js";
import {
  WS_SHARED_ENG_ID,
  MOCK_COMMUNITY_1_ID,
} from "@/mocks/data/my-work.js";
import { resetTaskMockState } from "@/mocks/handlers/tasks.js";
import { resetMockMilestones } from "@/mocks/data/milestones.js";
import { makeTaskPermissions } from "@/mocks/data/tasks.js";
import type { TaskDto } from "../../types.js";
import type { MilestoneDto } from "@/modules/milestones/types.js";

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

function makeTestTask(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: `task-${Math.random().toString(36).substring(2, 9)}`,
    workspaceId: WS_SHARED_ENG_ID,
    parentTaskId: null,
    taskKey: "ENG-101",
    title: "Implement Timeline View",
    description: "Timeline view with milestone markers",
    itemType: "TASK",
    statusCategory: "IN_PROGRESS",
    priority: "HIGH",
    assigneeIds: [],
    creatorId: "018f98a2-3f12-7890-a001-23456789abcd",
    startDate: "2026-11-05",
    dueDate: "2026-11-12",
    estimatePoints: 5,
    labelIds: [],
    milestoneId: null,
    rankKey: "0|hzzzzz:",
    version: 1,
    fieldRevisions: {},
    effectivePermissions: makeTaskPermissions(true),
    createdAt: "2026-11-01T10:00:00Z",
    updatedAt: "2026-11-01T10:00:00Z",
    archivedAt: null,
    assigneeAssignments: [],
    assigneeEditableFieldGroups: [],
    ...overrides,
  };
}

describe("Timeline View & Workspace Milestones (VS-05B)", () => {
  beforeEach(() => {
    resetTaskMockState();
    resetMockMilestones();
  });

  describe("TimelineView Component Unit Tests", () => {
    it("renders timeline header, controls, columns, task row and milestone marker", async () => {
      const task = makeTestTask({
        id: "task-eng-101",
        taskKey: "ENG-101",
        title: "Build Gantt Canvas",
        startDate: "2026-11-06",
        dueDate: "2026-11-10",
      });

      const milestone: MilestoneDto = {
        id: "ms-1",
        workspaceId: WS_SHARED_ENG_ID,
        name: "Sprint Demo",
        description: "Milestone for sprint demo",
        targetDate: "2026-11-09",
        createdAt: "2026-11-01T10:00:00Z",
        updatedAt: "2026-11-01T10:00:00Z",
      };

      const onModeChange = vi.fn();
      const onDateChange = vi.fn();
      const onTaskClick = vi.fn();

      const queryClient = createTestQueryClient();

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={mockAuthValue}>
            <TimelineView
              tasks={[task]}
              unscheduledTasks={[]}
              milestones={[milestone]}
              timelineMode="day"
              onTimelineModeChange={onModeChange}
              currentDate="2026-11-09"
              onCurrentDateChange={onDateChange}
              onTaskClick={onTaskClick}
              workspaceId={WS_SHARED_ENG_ID}
              communityId={MOCK_COMMUNITY_1_ID}
            />
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      // Verify header and controls
      expect(screen.getByTestId("timeline-header")).toBeInTheDocument();
      expect(screen.getByTestId("timeline-mode-day")).toBeInTheDocument();
      expect(screen.getByTestId("timeline-mode-week")).toBeInTheDocument();
      expect(screen.getByTestId("timeline-mode-month")).toBeInTheDocument();
      expect(screen.getByTestId("timeline-nav-prev")).toBeInTheDocument();
      expect(screen.getByTestId("timeline-nav-today")).toBeInTheDocument();
      expect(screen.getByTestId("timeline-nav-next")).toBeInTheDocument();
      expect(screen.getByTestId("timeline-range-title")).toBeInTheDocument();

      // Verify task row and bar
      expect(screen.getByTestId("timeline-task-row-task-eng-101")).toBeInTheDocument();
      expect(screen.getByTestId("timeline-task-bar-task-eng-101")).toBeInTheDocument();

      // Verify milestone marker
      expect(screen.getByTestId("milestone-marker-ms-1")).toBeInTheDocument();
    });

    it("triggers onTaskClick when task info or timeline bar is clicked", async () => {
      const user = userEvent.setup();
      const task = makeTestTask({
        id: "task-eng-102",
        taskKey: "ENG-102",
        title: "Clickable Task Bar",
        startDate: "2026-11-07",
        dueDate: "2026-11-11",
      });

      const onTaskClick = vi.fn();
      const queryClient = createTestQueryClient();

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={mockAuthValue}>
            <TimelineView
              tasks={[task]}
              unscheduledTasks={[]}
              milestones={[]}
              timelineMode="day"
              onTimelineModeChange={vi.fn()}
              currentDate="2026-11-09"
              onCurrentDateChange={vi.fn()}
              onTaskClick={onTaskClick}
              workspaceId={WS_SHARED_ENG_ID}
              communityId={MOCK_COMMUNITY_1_ID}
            />
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      const taskBar = screen.getByTestId("timeline-task-bar-task-eng-102");
      await user.click(taskBar);
      expect(onTaskClick).toHaveBeenCalledWith(task);
    });

    it("toggles unscheduled tasks tray and reveals unscheduled tasks", async () => {
      const user = userEvent.setup();
      const unscheduledTask = makeTestTask({
        id: "task-unscheduled-1",
        taskKey: "ENG-200",
        title: "Unscheduled Task Backlog Item",
        startDate: null,
        dueDate: null,
      });

      const onTaskClick = vi.fn();
      const queryClient = createTestQueryClient();

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={mockAuthValue}>
            <TimelineView
              tasks={[]}
              unscheduledTasks={[unscheduledTask]}
              milestones={[]}
              timelineMode="day"
              onTimelineModeChange={vi.fn()}
              currentDate="2026-11-09"
              onCurrentDateChange={vi.fn()}
              onTaskClick={onTaskClick}
              workspaceId={WS_SHARED_ENG_ID}
              communityId={MOCK_COMMUNITY_1_ID}
            />
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      const toggleBtn = screen.getByTestId("timeline-toggle-unscheduled");
      expect(toggleBtn).toBeInTheDocument();

      // Open unscheduled tray
      await user.click(toggleBtn);
      expect(screen.getByTestId("timeline-unscheduled-tray")).toBeInTheDocument();
      expect(screen.getByTestId("unscheduled-task-task-unscheduled-1")).toBeInTheDocument();

      // Clicking unscheduled task opens task
      await user.click(screen.getByTestId("unscheduled-task-task-unscheduled-1"));
      expect(onTaskClick).toHaveBeenCalledWith(unscheduledTask);
    });
  });

  describe("Synchronized 4-Way View Switching & Integration", () => {
    function renderAppWithRoute(initialEntries: string[]) {
      const queryClient = createTestQueryClient();
      return render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={mockAuthValue}>
            <WorkspaceProvider
              initialCommunityId={MOCK_COMMUNITY_1_ID}
              initialWorkspaceId={WS_SHARED_ENG_ID}
            >
              <QuickTaskComposerProvider>
                <MemoryRouter initialEntries={initialEntries}>
                  <Routes>
                    <Route path="/" element={<WorkspaceTasksView />} />
                    <Route path="/list" element={<WorkspaceTasksView defaultView="list" />} />
                    <Route path="/board" element={<WorkspaceTasksView defaultView="board" />} />
                    <Route path="/calendar" element={<WorkspaceTasksView defaultView="calendar" />} />
                    <Route path="/timeline" element={<WorkspaceTasksView defaultView="timeline" />} />
                    <Route
                      path="/c/:communityId/w/:workspaceId/*"
                      element={<WorkspaceTasksView defaultView="timeline" />}
                    />
                    <Route
                      path="/workspaces/:workspaceId/*"
                      element={<WorkspaceTasksView defaultView="list" />}
                    />
                  </Routes>
                  <TaskPeekDrawer />
                </MemoryRouter>
              </QuickTaskComposerProvider>
            </WorkspaceProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );
    }

    it("renders Timeline tab in toolbar and switches views cleanly", async () => {
      const user = userEvent.setup();
      renderAppWithRoute([`/workspaces/${WS_SHARED_ENG_ID}/list`]);

      // Verify all 4 view tabs are present in TaskViewToolbar
      await waitFor(() => {
        expect(screen.getByTestId("tab-view-list")).toBeInTheDocument();
        expect(screen.getByTestId("tab-view-board")).toBeInTheDocument();
        expect(screen.getByTestId("tab-view-calendar")).toBeInTheDocument();
        expect(screen.getByTestId("tab-view-timeline")).toBeInTheDocument();
      });

      // Switch to Timeline view
      await user.click(screen.getByTestId("tab-view-timeline"));

      // Verify Timeline view renders
      await waitFor(() => {
        expect(screen.getByTestId("timeline-view")).toBeInTheDocument();
        expect(screen.getByTestId("timeline-header")).toBeInTheDocument();
      });
    });

    it("navigates directly to timeline route and loads tasks and milestones", async () => {
      renderAppWithRoute([
        `/c/${MOCK_COMMUNITY_1_ID}/w/${WS_SHARED_ENG_ID}/timeline?date=2026-11-09&mode=day`,
      ]);

      await waitFor(() => {
        expect(screen.getByTestId("timeline-view")).toBeInTheDocument();
      });

      // Tasks should be rendered in timeline canvas
      await waitFor(() => {
        const rows = screen.getAllByTestId(/^timeline-task-row-/);
        expect(rows.length).toBeGreaterThan(0);
      });
    });

    it("opens TaskPeekDrawer with deep link when task row is clicked in timeline", async () => {
      const user = userEvent.setup();
      renderAppWithRoute([
        `/c/${MOCK_COMMUNITY_1_ID}/w/${WS_SHARED_ENG_ID}/timeline?date=2026-11-09&mode=day`,
      ]);

      await waitFor(() => {
        expect(screen.getByTestId("timeline-view")).toBeInTheDocument();
      });

      // Find first task info button
      let taskInfoBtn: HTMLElement | null = null;
      await waitFor(() => {
        const buttons = screen.getAllByTestId(/^timeline-task-info-/);
        expect(buttons.length).toBeGreaterThan(0);
        taskInfoBtn = buttons[0]!;
      });

      await user.click(taskInfoBtn!);

      // Drawer should open
      await waitFor(() => {
        expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();
      });
    });

    it("opens create milestone dialog and handles cancel", async () => {
      const user = userEvent.setup();
      renderAppWithRoute([
        `/c/${MOCK_COMMUNITY_1_ID}/w/${WS_SHARED_ENG_ID}/timeline?date=2026-11-09&mode=day`,
      ]);

      await waitFor(() => {
        expect(screen.getByTestId("timeline-add-milestone-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("timeline-add-milestone-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("timeline-milestone-modal")).toBeInTheDocument();
        expect(screen.getByTestId("milestone-name-input")).toBeInTheDocument();
      });

      // Cancel closing modal
      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelBtn);

      await waitFor(() => {
        expect(screen.queryByTestId("timeline-milestone-modal")).not.toBeInTheDocument();
      });
    });
  });
});
