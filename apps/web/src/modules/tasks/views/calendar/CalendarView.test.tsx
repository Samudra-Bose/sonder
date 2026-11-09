import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import fs from "node:fs";
import path from "node:path";
import { defaultMockCommunities } from "../../../../mocks/handlers/auth.js";
import { AuthContext, type AuthContextType } from "@/modules/auth";
import { WorkspaceProvider } from "@/modules/workspace";
import { QuickTaskComposerProvider } from "../../QuickTaskComposerContext.js";
import { TaskPeekDrawer } from "../../TaskPeekDrawer";
import { WorkspaceTasksView } from "../WorkspaceTasksView";
import { CalendarView } from "./CalendarView";
import { MonthCalendar } from "./MonthCalendar";
import { WeekCalendar } from "./WeekCalendar";
import { UnscheduledTaskTray } from "./UnscheduledTaskTray";
import {
  getMonthCalendarGrid,
  getWeekDays,
} from "./calendar-date-utils";
import type { TaskDto } from "../../types";

// Mock user context
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
  csrfToken: "mock-csrf-token",
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
    workspaceId: "018f98a2-3f12-7890-w003-456789abcdef",
    parentTaskId: null,
    taskKey: "GALA-999",
    title: "Test Calendar Task",
    description: "Task description for calendar test",
    itemType: "TASK",
    statusCategory: "TODO",
    priority: "MEDIUM",
    assigneeIds: [],
    creatorId: "018f98a2-3f12-7890-a001-23456789abcd",
    startDate: null,
    dueDate: "2026-11-09",
    estimatePoints: 2,
    labelIds: [],
    milestoneId: null,
    rankKey: "0|hzzzzz:",
    version: 1,
    fieldRevisions: {},
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

describe("VS-05A: Calendar View & Unscheduled Task Tray", () => {
  describe("MonthCalendar Component", () => {
    it("renders calendar month grid with correct day cells and tasks", () => {
      const grid = getMonthCalendarGrid(2026, 11, "2026-11-09", 0);
      const task1 = makeTestTask({ taskKey: "GALA-201", dueDate: "2026-11-09", title: "Task for today" });
      const task2 = makeTestTask({ taskKey: "GALA-202", dueDate: "2026-11-15", title: "Task mid month" });

      const tasksByDate = {
        "2026-11-09": [task1],
        "2026-11-15": [task2],
      };

      const handleTaskClick = vi.fn();

      render(
        <MonthCalendar
          grid={grid}
          tasksByDate={tasksByDate}
          todayStr="2026-11-09"
          onTaskClick={handleTaskClick}
        />
      );

      expect(screen.getByTestId("month-calendar-grid")).toBeInTheDocument();
      expect(screen.getByTestId("calendar-day-cell-2026-11-09")).toBeInTheDocument();
      expect(screen.getByText("Task for today")).toBeInTheDocument();
      expect(screen.getByText("Task mid month")).toBeInTheDocument();
    });

    it("displays '+N more' button and reveals all tasks on expansion when a day cell exceeds maxVisibleTasks", async () => {
      const user = userEvent.setup();
      const grid = getMonthCalendarGrid(2026, 11, "2026-11-09", 0);

      const tasks = [
        makeTestTask({ taskKey: "GALA-101", dueDate: "2026-11-09", title: "Alpha Task" }),
        makeTestTask({ taskKey: "GALA-102", dueDate: "2026-11-09", title: "Beta Task" }),
        makeTestTask({ taskKey: "GALA-103", dueDate: "2026-11-09", title: "Gamma Task" }),
        makeTestTask({ taskKey: "GALA-104", dueDate: "2026-11-09", title: "Delta Task" }),
      ];

      const tasksByDate = {
        "2026-11-09": tasks,
      };

      render(
        <MonthCalendar
          grid={grid}
          tasksByDate={tasksByDate}
          todayStr="2026-11-09"
          onTaskClick={vi.fn()}
        />
      );

      // Max visible is 2, so 2 more should be indicated
      const moreBtn = screen.getByTestId("calendar-more-tasks-btn");
      expect(moreBtn).toBeInTheDocument();
      expect(moreBtn).toHaveTextContent("2 more");

      // Click '+2 more' to expand popover
      await user.click(moreBtn);

      // Popover should now display all 4 tasks
      expect(screen.getByRole("dialog", { name: "All tasks for 2026-11-09" })).toBeInTheDocument();
      expect(screen.getByText("Gamma Task")).toBeInTheDocument();
      expect(screen.getByText("Delta Task")).toBeInTheDocument();
    });
  });

  describe("WeekCalendar Component", () => {
    it("renders 7-day columns and distributes tasks into overdue, scheduled, and completed", () => {
      const weekDays = getWeekDays("2026-11-09", "2026-11-09", 0);
      const overdueTask = makeTestTask({
        taskKey: "GALA-301",
        dueDate: "2026-11-08", // Yesterday
        statusCategory: "IN_PROGRESS",
        title: "Overdue Item",
      });
      const scheduledTask = makeTestTask({
        taskKey: "GALA-302",
        dueDate: "2026-11-09", // Today
        statusCategory: "TODO",
        title: "Scheduled Item",
      });
      const completedTask = makeTestTask({
        taskKey: "GALA-303",
        dueDate: "2026-11-09",
        statusCategory: "DONE",
        title: "Completed Item",
      });

      const tasksByDate = {
        "2026-11-08": [overdueTask],
        "2026-11-09": [scheduledTask, completedTask],
      };

      render(
        <WeekCalendar
          weekDays={weekDays}
          tasksByDate={tasksByDate}
          todayStr="2026-11-09"
          onTaskClick={vi.fn()}
        />
      );

      expect(screen.getByTestId("week-calendar-grid")).toBeInTheDocument();
      expect(screen.getByTestId("week-column-2026-11-08")).toBeInTheDocument();
      expect(screen.getByTestId("week-column-2026-11-09")).toBeInTheDocument();

      // Check overdue section and item
      expect(screen.getByText(/Overdue \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText("Overdue Item")).toBeInTheDocument();

      // Check scheduled and completed items
      expect(screen.getByText("Scheduled Item")).toBeInTheDocument();
      expect(screen.getByText("Completed Item")).toBeInTheDocument();
    });
  });

  describe("UnscheduledTaskTray Component", () => {
    it("renders unscheduled tasks and opens task when clicked", async () => {
      const user = userEvent.setup();
      const unscheduled1 = makeTestTask({
        taskKey: "GALA-401",
        dueDate: null,
        title: "Unscheduled Task One",
        priority: "HIGH",
        statusCategory: "TODO",
      });
      const unscheduled2 = makeTestTask({
        taskKey: "GALA-402",
        dueDate: null,
        title: "Unscheduled Task Two",
        priority: "LOW",
        statusCategory: "BACKLOG",
      });

      const handleTaskClick = vi.fn();
      const handleToggle = vi.fn();

      const { rerender } = render(
        <UnscheduledTaskTray
          tasks={[unscheduled1, unscheduled2]}
          isOpen={true}
          onToggle={handleToggle}
          onTaskClick={handleTaskClick}
        />
      );

      expect(screen.getByTestId("unscheduled-count-badge")).toHaveTextContent("2");
      expect(screen.getByText("Unscheduled Task One")).toBeInTheDocument();
      expect(screen.getByText("Unscheduled Task Two")).toBeInTheDocument();

      // Click task item
      await user.click(screen.getByTestId("unscheduled-task-item-GALA-401"));
      expect(handleTaskClick).toHaveBeenCalledWith(unscheduled1);

      // Verify toggle button
      await user.click(screen.getByTestId("unscheduled-tray-toggle"));
      expect(handleToggle).toHaveBeenCalledTimes(1);

      // Verify empty state when no unscheduled tasks
      rerender(
        <UnscheduledTaskTray
          tasks={[]}
          isOpen={true}
          onToggle={handleToggle}
          onTaskClick={handleTaskClick}
        />
      );

      expect(screen.getByTestId("unscheduled-empty-state")).toBeInTheDocument();
      expect(screen.getByText("All tasks are scheduled")).toBeInTheDocument();
    });
  });

  describe("CalendarView Navigation & Mode Switching", () => {
    it("supports previous, next, today navigation and month/week mode toggle", async () => {
      const user = userEvent.setup();
      const handleModeChange = vi.fn();
      const handleDateChange = vi.fn();

      render(
        <CalendarView
          tasks={[]}
          unscheduledTasks={[]}
          isLoading={false}
          isError={false}
          calendarMode="month"
          onCalendarModeChange={handleModeChange}
          currentDate="2026-11-09"
          onCurrentDateChange={handleDateChange}
          onTaskClick={vi.fn()}
        />
      );

      expect(screen.getByTestId("calendar-title")).toHaveTextContent("November 2026");

      // Click next month
      await user.click(screen.getByTestId("calendar-next-btn"));
      expect(handleDateChange).toHaveBeenCalledWith("2026-12-01");

      // Click prev month
      await user.click(screen.getByTestId("calendar-prev-btn"));
      expect(handleDateChange).toHaveBeenCalledWith("2026-10-01");

      // Click today
      await user.click(screen.getByTestId("calendar-today-btn"));
      expect(handleDateChange).toHaveBeenCalled();

      // Click Week tab
      await user.click(screen.getByTestId("calendar-mode-week"));
      expect(handleModeChange).toHaveBeenCalledWith("week");
    });

    it("renders loading skeleton and error feedback states gracefully", () => {
      const { rerender } = render(
        <CalendarView
          tasks={[]}
          unscheduledTasks={[]}
          isLoading={true}
          isError={false}
          calendarMode="month"
          onCalendarModeChange={vi.fn()}
          currentDate="2026-11-09"
          onCurrentDateChange={vi.fn()}
          onTaskClick={vi.fn()}
        />
      );

      expect(screen.getByTestId("calendar-loading-skeleton")).toBeInTheDocument();

      const onRetry = vi.fn();
      rerender(
        <CalendarView
          tasks={[]}
          unscheduledTasks={[]}
          isLoading={false}
          isError={true}
          errorMessage="Failed to fetch workspace tasks"
          onRetry={onRetry}
          calendarMode="month"
          onCalendarModeChange={vi.fn()}
          currentDate="2026-11-09"
          onCurrentDateChange={vi.fn()}
          onTaskClick={vi.fn()}
        />
      );

      expect(screen.getByTestId("calendar-error-state")).toBeInTheDocument();
      expect(screen.getByText("Failed to fetch workspace tasks")).toBeInTheDocument();
    });
  });

  describe("Integration: WorkspaceTasksView with Calendar View & TaskPeekDrawer", () => {
    it("renders calendar view when navigating to /calendar and opens TaskPeekDrawer on task click", async () => {
      const queryClient = createTestQueryClient();
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={mockAuthValue}>
            <MemoryRouter initialEntries={["/workspaces/018f98a2-3f12-7890-w003-456789abcdef/calendar"]}>
              <WorkspaceProvider
                initialCommunityId="018f98a2-3f12-7890-b123-456789abcdef"
                initialWorkspaceId="018f98a2-3f12-7890-w003-456789abcdef"
              >
                <QuickTaskComposerProvider>
                  <Routes>
                    <Route
                      path="workspaces/:workspaceId/calendar"
                      element={
                        <>
                          <WorkspaceTasksView defaultView="calendar" />
                          <TaskPeekDrawer forceMode="desktop" />
                        </>
                      }
                    />
                  </Routes>
                </QuickTaskComposerProvider>
              </WorkspaceProvider>
            </MemoryRouter>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      // Wait for workspace tasks view and calendar grid to render
      await waitFor(() => {
        expect(screen.getByTestId("workspace-tasks-view")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId("calendar-view-container")).toBeInTheDocument();
      });

      // Verify the calendar tab is active in the toolbar
      const calendarTab = screen.getByTestId("tab-view-calendar");
      expect(calendarTab).toHaveAttribute("aria-selected", "true");

      // Verify unscheduled tray is rendered
      expect(screen.getByTestId("unscheduled-task-tray")).toBeInTheDocument();

      // Click on unscheduled task to verify TaskPeekDrawer opens
      const unscheduledItem = await screen.findByTestId("unscheduled-task-item-GALA-207");
      await user.click(unscheduledItem);

      // Verify drawer opens
      await waitFor(() => {
        expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();
      });
    });

    it("switches smoothly between List, Board, and Calendar views via Toolbar tabs", async () => {
      const queryClient = createTestQueryClient();
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={mockAuthValue}>
            <MemoryRouter initialEntries={["/workspaces/018f98a2-3f12-7890-w003-456789abcdef/list"]}>
              <WorkspaceProvider
                initialCommunityId="018f98a2-3f12-7890-b123-456789abcdef"
                initialWorkspaceId="018f98a2-3f12-7890-w003-456789abcdef"
              >
                <QuickTaskComposerProvider>
                  <Routes>
                    <Route
                      path="workspaces/:workspaceId/*"
                      element={<WorkspaceTasksView defaultView="list" />}
                    />
                  </Routes>
                </QuickTaskComposerProvider>
              </WorkspaceProvider>
            </MemoryRouter>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("workspace-tasks-view")).toBeInTheDocument();
      });

      // Click Calendar tab
      const calendarTab = screen.getByTestId("tab-view-calendar");
      await user.click(calendarTab);

      // Calendar view should now be displayed
      await waitFor(() => {
        expect(screen.getByTestId("calendar-view-container")).toBeInTheDocument();
      });

      // Click Board tab
      const boardTab = screen.getByTestId("tab-view-board");
      await user.click(boardTab);

      // Board view should now be displayed
      await waitFor(() => {
        expect(screen.getByTestId("task-board-view")).toBeInTheDocument();
      });

      // Click List tab
      const listTab = screen.getByTestId("tab-view-list");
      await user.click(listTab);

      // List view should be displayed
      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });
    });
  });

  describe("Architectural Boundary Rules", () => {
    it("strictly verifies zero mock imports in production calendar view modules", () => {
      const calendarDir = path.resolve(__dirname, ".");
      const files = fs.readdirSync(calendarDir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));

      for (const file of files) {
        if (file.endsWith(".test.tsx") || file.endsWith(".test.ts")) continue;
        const filePath = path.join(calendarDir, file);
        const content = fs.readFileSync(filePath, "utf-8");

        expect(content).not.toMatch(/from\s+["'].*\/mocks\/.*["']/);
        expect(content).not.toMatch(/from\s+["']@\/mocks\/.*["']/);
      }
    });
  });
});
