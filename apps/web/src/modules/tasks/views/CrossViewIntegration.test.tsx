import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation, useNavigate, Routes, Route } from "react-router-dom";

import { defaultMockCommunities } from "../../../mocks/handlers/auth.js";
import { resetWorkspaceMockState } from "../../../mocks/handlers/workspaces.js";
import {
  resetTaskMockState,
  setMockTasksError,
  setForceExpireSnapshot,
  getMockTasks,
} from "../../../mocks/handlers/tasks.js";
import {
  MOCK_COMMUNITY_1_ID,
  WS_SHARED_ENG_ID,
  MOCK_USER_ID,
} from "../../../mocks/data/my-work.js";
import { AuthContext, type AuthContextType } from "../../auth/AuthContext.js";
import { WorkspaceProvider } from "../../workspace/WorkspaceContext.js";
import { TaskPeekDrawer } from "../TaskPeekDrawer.js";
import {
  QuickTaskComposerProvider,
  useQuickTaskComposer,
} from "../QuickTaskComposerContext.js";
import { QuickTaskComposer } from "../QuickTaskComposer.js";
import { getDefaultReferenceDate, addCalendarDays } from "../../my-work/date-utils.js";
import { WorkspaceTasksView } from "./WorkspaceTasksView.js";

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
  const navigate = useNavigate();
  return (
    <div>
      <div data-testid="location-display">{location.pathname}{location.search}</div>
      <button
        type="button"
        data-testid="browser-back-btn"
        onClick={() => navigate(-1)}
      >
        Back
      </button>
      <button
        type="button"
        data-testid="browser-forward-btn"
        onClick={() => navigate(1)}
      >
        Forward
      </button>
    </div>
  );
}

function ComposerTriggerHarness() {
  const { open } = useQuickTaskComposer();
  return (
    <button
      type="button"
      data-testid="composer-generic-trigger"
      onClick={() => open()}
    >
      Open Default Composer
    </button>
  );
}

interface TestShellProps {
  initialEntries?: string[];
  initialCommunityId?: string;
  initialWorkspaceId?: string;
  defaultView?: "list" | "board" | "calendar" | "timeline";
}

function renderTasksShell({
  initialEntries = ["/workspaces/018f98a2-3f12-7890-w002-456789abcdef/list"],
  initialCommunityId = MOCK_COMMUNITY_1_ID,
  initialWorkspaceId = WS_SHARED_ENG_ID,
  defaultView = "list",
}: TestShellProps = {}) {
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
                <ComposerTriggerHarness />
                <div className="flex flex-col min-h-screen">
                  <main className="flex-1">
                    <Routes>
                      <Route
                        path="workspaces/:workspaceId/*"
                        element={<WorkspaceTasksView defaultView={defaultView} />}
                      />
                    </Routes>
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

describe("VS-06B.1: Cross-View Integration & Hardening", () => {
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

  describe("1. URL-Driven Sorting & Contract Conformance", () => {
    it("honors direct navigation with ?sort=currentKey&order=asc", async () => {
      renderTasksShell({
        initialEntries: [
          "/workspaces/018f98a2-3f12-7890-w002-456789abcdef/list?sort=currentKey&order=asc",
        ],
      });

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      const keyHeader = screen.getByTestId("sort-header-currentKey").closest("th");
      expect(keyHeader).toHaveAttribute("aria-sort", "ascending");

      const dueDateHeader = screen.getByTestId("sort-header-dueDate").closest("th");
      expect(dueDateHeader).toHaveAttribute("aria-sort", "none");

      const toggleBtn = screen.getByTestId("toolbar-sort-order-toggle");
      expect(toggleBtn).toHaveAttribute(
        "aria-label",
        "Toggle sort direction: currently ascending"
      );
    });

    it("honors direct navigation with ?sort=dueDate&order=desc", async () => {
      renderTasksShell({
        initialEntries: [
          "/workspaces/018f98a2-3f12-7890-w002-456789abcdef/list?sort=dueDate&order=desc",
        ],
      });

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      const dueDateHeader = screen.getByTestId("sort-header-dueDate").closest("th");
      expect(dueDateHeader).toHaveAttribute("aria-sort", "descending");

      const toggleBtn = screen.getByTestId("toolbar-sort-order-toggle");
      expect(toggleBtn).toHaveAttribute(
        "aria-label",
        "Toggle sort direction: currently descending"
      );
    });

    it("clicking a column header updates the URL and toggles direction", async () => {
      const user = userEvent.setup();
      renderTasksShell({
        initialEntries: [
          "/workspaces/018f98a2-3f12-7890-w002-456789abcdef/list?sort=currentKey&order=asc",
        ],
      });

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      // Click Key header to toggle to desc
      const keyBtn = screen.getByTestId("sort-header-currentKey");
      await user.click(keyBtn);

      await waitFor(() => {
        expect(screen.getByTestId("location-display")).toHaveTextContent(
          "sort=currentKey&order=desc"
        );
      });

      const keyHeader = screen.getByTestId("sort-header-currentKey").closest("th");
      expect(keyHeader).toHaveAttribute("aria-sort", "descending");
    });

    it("safely falls back to priority sort when encountering invalid or unallowlisted sort field", async () => {
      renderTasksShell({
        initialEntries: [
          "/workspaces/018f98a2-3f12-7890-w002-456789abcdef/list?sort=unsupportedField&order=asc",
        ],
      });

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      // Unsupported sort field should fall back to priority
      const priorityHeader = screen.getByTestId("sort-header-priority").closest("th");
      expect(priorityHeader).toHaveAttribute("aria-sort", "ascending");
    });

    it("preserves sort state when switching views across List, Board, Calendar, and Timeline", async () => {
      const user = userEvent.setup();
      renderTasksShell({
        initialEntries: [
          "/workspaces/018f98a2-3f12-7890-w002-456789abcdef/list?sort=dueDate&order=desc",
        ],
      });

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      // Switch to Board View
      const boardTab = screen.getByTestId("tab-view-board");
      await user.click(boardTab);

      await waitFor(() => {
        expect(screen.getByTestId("task-board-view")).toBeInTheDocument();
        expect(screen.getByTestId("location-display")).toHaveTextContent(
          "/board?sort=dueDate&order=desc"
        );
      });

      // Switch to Calendar View
      const calendarTab = screen.getByTestId("tab-view-calendar");
      await user.click(calendarTab);

      await waitFor(() => {
        expect(screen.getByTestId("calendar-view-container")).toBeInTheDocument();
        expect(screen.getByTestId("location-display")).toHaveTextContent(
          "/calendar?sort=dueDate&order=desc"
        );
      });

      // Switch to Timeline View
      const timelineTab = screen.getByTestId("tab-view-timeline");
      await user.click(timelineTab);

      await waitFor(() => {
        expect(screen.getByTestId("timeline-view")).toBeInTheDocument();
        expect(screen.getByTestId("location-display")).toHaveTextContent(
          "/timeline?sort=dueDate&order=desc"
        );
      });

      // Switch back to List View
      const listTab = screen.getByTestId("tab-view-list");
      await user.click(listTab);

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
        expect(screen.getByTestId("location-display")).toHaveTextContent(
          "/list?sort=dueDate&order=desc"
        );
      });

      const dueDateHeader = screen.getByTestId("sort-header-dueDate").closest("th");
      expect(dueDateHeader).toHaveAttribute("aria-sort", "descending");
    });

    it("restores previous view and sort state on browser back/forward navigation", async () => {
      const user = userEvent.setup();
      renderTasksShell({
        initialEntries: [
          "/workspaces/018f98a2-3f12-7890-w002-456789abcdef/list?sort=currentKey&order=asc",
        ],
      });

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      // Switch to Calendar View
      const calendarTab = screen.getByTestId("tab-view-calendar");
      await user.click(calendarTab);

      await waitFor(() => {
        expect(screen.getByTestId("calendar-view-container")).toBeInTheDocument();
      });

      // Click browser back button
      const backBtn = screen.getByTestId("browser-back-btn");
      await user.click(backBtn);

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
        expect(screen.getByTestId("location-display")).toHaveTextContent(
          "/list?sort=currentKey&order=asc"
        );
      });

      // Click browser forward button
      const forwardBtn = screen.getByTestId("browser-forward-btn");
      await user.click(forwardBtn);

      await waitFor(() => {
        expect(screen.getByTestId("calendar-view-container")).toBeInTheDocument();
      });
    });
  });

  describe("2. Calendar-to-Task Creation & View Synchronization", () => {
    it("Month View: clicking an empty date opens QuickTaskComposer with exact YYYY-MM-DD prefilled, and creates task", async () => {
      const user = userEvent.setup();
      renderTasksShell({
        initialEntries: [
          "/workspaces/018f98a2-3f12-7890-w002-456789abcdef/calendar?mode=month&date=2026-11-09",
        ],
      });

      await waitFor(() => {
        expect(screen.getByTestId("calendar-view-container")).toBeInTheDocument();
      });

      // Click on an empty day cell: 2026-11-20
      const emptyDayCell = screen.getByTestId("calendar-day-cell-2026-11-20");
      await user.click(emptyDayCell);

      // Verify composer opened
      await waitFor(() => {
        expect(screen.getByTestId("quick-task-composer-dialog")).toBeInTheDocument();
      });

      // Verify exact date prefill without timezone shifts
      const dueDateInput = screen.getByTestId("composer-due-date-input") as HTMLInputElement;
      expect(dueDateInput.value).toBe("2026-11-20");

      // Enter title and submit
      const titleInput = screen.getByTestId("composer-title-input");
      await user.type(titleInput, "Verified Cross-View Sprint Task");

      const submitBtn = screen.getByRole("button", { name: "Create Task" });
      await user.click(submitBtn);

      // Composer closes and new task opens in drawer
      await waitFor(() => {
        expect(screen.queryByTestId("quick-task-composer-dialog")).not.toBeInTheDocument();
      });

      // Verify the task was created and appears on the calendar grid
      await waitFor(() => {
        expect(screen.getByText("Verified Cross-View Sprint Task")).toBeInTheDocument();
      });
    });

    it("clicking an existing calendar task opens TaskPeekDrawer without triggering task creation", async () => {
      const user = userEvent.setup();
      renderTasksShell({
        initialEntries: [
          "/workspaces/018f98a2-3f12-7890-w002-456789abcdef/calendar?mode=month&date=2026-11-09",
        ],
      });

      await waitFor(() => {
        expect(screen.getByTestId("calendar-view-container")).toBeInTheDocument();
      });

      // Find an existing task item (e.g. ENG-105 due 2026-11-04)
      const taskItem = screen.getByTestId("calendar-task-item-ENG-105");
      await user.click(taskItem);

      // TaskPeekDrawer opens
      await waitFor(() => {
        expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();
        expect(screen.getByTestId("location-display")).toHaveTextContent("task=ENG-105");
      });

      // QuickTaskComposer must NOT be open
      expect(screen.queryByTestId("quick-task-composer-dialog")).not.toBeInTheDocument();
    });

    it("Week View: empty-slot and date-header buttons trigger creation with column date", async () => {
      const user = userEvent.setup();
      renderTasksShell({
        initialEntries: [
          "/workspaces/018f98a2-3f12-7890-w002-456789abcdef/calendar?mode=week&date=2026-11-09",
        ],
      });

      await waitFor(() => {
        expect(screen.getByTestId("week-calendar-grid")).toBeInTheDocument();
      });

      // Click '+' button in day header for 2026-11-10
      const headerAddBtn = screen.getByTestId("week-add-task-btn-2026-11-10");
      await user.click(headerAddBtn);

      await waitFor(() => {
        expect(screen.getByTestId("quick-task-composer-dialog")).toBeInTheDocument();
      });

      const dueDateInput = screen.getByTestId("composer-due-date-input") as HTMLInputElement;
      expect(dueDateInput.value).toBe("2026-11-10");

      // Cancel to close
      const cancelBtn = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelBtn);

      await waitFor(() => {
        expect(screen.queryByTestId("quick-task-composer-dialog")).not.toBeInTheDocument();
      });
    });
  });

  describe("3. Composer State, Stale Prefill Prevention & Draft Safety", () => {
    it("reopening composer via generic trigger clears previously prefilled date and does NOT retain stale values", async () => {
      const user = userEvent.setup();
      renderTasksShell({
        initialEntries: [
          "/workspaces/018f98a2-3f12-7890-w002-456789abcdef/calendar?mode=month&date=2026-11-09",
        ],
      });

      await waitFor(() => {
        expect(screen.getByTestId("calendar-view-container")).toBeInTheDocument();
      });

      // 1. Open with prefilled date from day cell
      const dayCell = screen.getByTestId("calendar-day-cell-2026-11-25");
      await user.click(dayCell);

      await waitFor(() => {
        expect(screen.getByTestId("quick-task-composer-dialog")).toBeInTheDocument();
      });

      let dueDateInput = screen.getByTestId("composer-due-date-input") as HTMLInputElement;
      expect(dueDateInput.value).toBe("2026-11-25");

      // 2. Close composer via Cancel
      const cancelBtn = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelBtn);

      await waitFor(() => {
        expect(screen.queryByTestId("quick-task-composer-dialog")).not.toBeInTheDocument();
      });

      // 3. Open composer via standard/generic trigger without initial values
      const genericTrigger = screen.getByTestId("composer-generic-trigger");
      await user.click(genericTrigger);

      await waitFor(() => {
        expect(screen.getByTestId("quick-task-composer-dialog")).toBeInTheDocument();
      });

      // 4. Verify dueDate is completely blank (no stale '2026-11-25' retained!)
      dueDateInput = screen.getByTestId("composer-due-date-input") as HTMLInputElement;
      expect(dueDateInput.value).toBe("");

      const titleInput = screen.getByTestId("composer-title-input") as HTMLInputElement;
      expect(titleInput.value).toBe("");
    });
  });

  describe("4. Stage 5.3D: Cross-View Consistency & Actual Server Reconciliation", () => {
    it("creates a task in List View and reconciles into Board View without duplication", async () => {
      const user = userEvent.setup();
      renderTasksShell({
        initialEntries: ["/workspaces/018f98a2-3f12-7890-w002-456789abcdef/list"],
      });

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      // 1. Trigger inline creation at bottom of List View
      const listTrigger = screen.getByTestId("inline-creation-trigger");
      await user.click(listTrigger);

      const input = await screen.findByTestId("inline-creation-input");
      expect(input).toBeInTheDocument();

      // 2. Submit new task title
      await user.type(input, "Stage 5.3D Cross-View List Task{Enter}");

      // 3. Confirm task row appears in List View with authoritative server data
      await waitFor(() => {
        expect(screen.getByText("Stage 5.3D Cross-View List Task")).toBeInTheDocument();
      });

      // Find the created task in mock state
      const tasks = getMockTasks();
      const createdTask = tasks.find((t) => t.title === "Stage 5.3D Cross-View List Task");
      expect(createdTask).toBeDefined();
      expect(createdTask?.statusCategory).toBe("TODO");
      const createdKey = createdTask!.taskKey;

      const listRow = screen.getByTestId(`task-list-row-${createdKey}`);
      expect(listRow).toBeInTheDocument();

      // 4. Switch to Board View
      const boardTab = screen.getByTestId("tab-view-board");
      await user.click(boardTab);

      await waitFor(() => {
        expect(screen.getByTestId("task-board-view")).toBeInTheDocument();
      });

      // 5. Verify task appears in the TODO board column
      const todoCol = screen.getByTestId("board-column-TODO");
      const boardCard = within(todoCol).getByTestId(`task-board-card-${createdKey}`);
      expect(boardCard).toBeInTheDocument();
      expect(within(boardCard).getByText("Stage 5.3D Cross-View List Task")).toBeInTheDocument();

      // 6. Verify task is NOT duplicated across columns
      const allOccurrences = screen.getAllByTestId(`task-board-card-${createdKey}`);
      expect(allOccurrences).toHaveLength(1);
    });

    it("creates a task in Board View column and reconciles into List View with correct status", async () => {
      const user = userEvent.setup();
      renderTasksShell({
        initialEntries: ["/workspaces/018f98a2-3f12-7890-w002-456789abcdef/board"],
      });

      await waitFor(() => {
        expect(screen.getByTestId("task-board-view")).toBeInTheDocument();
      });

      // 1. Trigger inline creation inside the IN_PROGRESS board column
      const inProgressCol = screen.getByTestId("board-column-IN_PROGRESS");
      const colTrigger = within(inProgressCol).getByTestId("inline-creation-trigger");
      await user.click(colTrigger);

      const input = within(inProgressCol).getByTestId("inline-creation-input");
      await user.type(input, "Stage 5.3D Board Column Task{Enter}");

      // 2. Confirm card appears in IN_PROGRESS column
      await waitFor(() => {
        expect(within(inProgressCol).getByText("Stage 5.3D Board Column Task")).toBeInTheDocument();
      });

      const tasks = getMockTasks();
      const createdTask = tasks.find((t) => t.title === "Stage 5.3D Board Column Task");
      expect(createdTask).toBeDefined();
      expect(createdTask?.statusCategory).toBe("IN_PROGRESS");
      const createdKey = createdTask!.taskKey;

      // 3. Switch to List View
      const listTab = screen.getByTestId("tab-view-list");
      await user.click(listTab);

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      // 4. Verify task row appears in List View with correct status category
      const listRow = screen.getByTestId(`task-list-row-${createdKey}`);
      expect(listRow).toBeInTheDocument();
      expect(within(listRow).getByText("Stage 5.3D Board Column Task")).toBeInTheDocument();
      expect(within(listRow).getByRole("button", { name: /status: in progress/i })).toBeInTheDocument();
    });

    it("edits task title in List View and reconciles across Board View and Task Peek Drawer", async () => {
      const user = userEvent.setup();
      renderTasksShell({
        initialEntries: ["/workspaces/018f98a2-3f12-7890-w002-456789abcdef/list"],
      });

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      // 1. Edit title of ENG-101 in List View
      const row101 = screen.getByTestId("task-list-row-ENG-101");
      const titleBtn = within(row101).getByRole("button", { name: /edit title/i });
      await user.click(titleBtn);

      const titleInput = within(row101).getByRole("textbox");
      await user.clear(titleInput);
      await user.type(titleInput, "Synchronized Token Refresh Race Condition{Enter}");

      // 2. Wait for mutation reconciliation in List View
      await waitFor(() => {
        expect(within(row101).getByText("Synchronized Token Refresh Race Condition")).toBeInTheDocument();
      });

      // 3. Switch to Board View
      const boardTab = screen.getByTestId("tab-view-board");
      await user.click(boardTab);

      await waitFor(() => {
        expect(screen.getByTestId("task-board-view")).toBeInTheDocument();
      });

      // 4. Verify Board card reflects the updated title
      const card101 = screen.getByTestId("task-board-card-ENG-101");
      expect(within(card101).getByText("Synchronized Token Refresh Race Condition")).toBeInTheDocument();

      // 5. Open Task Peek Drawer by clicking task key button
      const keyBtn = within(card101).getByRole("button", { name: "ENG-101" });
      await user.click(keyBtn);

      await waitFor(() => {
        expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();
      });

      // 6. Verify Task Peek Drawer reflects updated title
      const drawer = screen.getByTestId("task-peek-drawer-desktop");
      expect(within(drawer).getByText("Synchronized Token Refresh Race Condition")).toBeInTheDocument();
    });

    it("transitions status in Board View and updates column placement, List View, and Task Peek Drawer", async () => {
      const user = userEvent.setup();
      renderTasksShell({
        initialEntries: ["/workspaces/018f98a2-3f12-7890-w002-456789abcdef/board"],
      });

      await waitFor(() => {
        expect(screen.getByTestId("task-board-view")).toBeInTheDocument();
      });

      // 1. ENG-105 starts in TODO column
      const todoCol = screen.getByTestId("board-column-TODO");
      const card105 = within(todoCol).getByTestId("task-board-card-ENG-105");
      expect(card105).toBeInTheDocument();

      // 2. Move ENG-105 to DONE using InlineStatusCell
      const statusTrigger = within(card105).getByRole("button", { name: /status: to do/i });
      await user.click(statusTrigger);

      const doneMenuItem = await screen.findByRole("menuitem", { name: /done/i });
      await user.click(doneMenuItem);

      // 3. Verify card moves to DONE column
      await waitFor(() => {
        const doneCol = screen.getByTestId("board-column-DONE");
        expect(within(doneCol).getByTestId("task-board-card-ENG-105")).toBeInTheDocument();
      });

      // 4. Switch to List View
      const listTab = screen.getByTestId("tab-view-list");
      await user.click(listTab);

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      // 5. Verify List View row displays Done status
      const row105 = screen.getByTestId("task-list-row-ENG-105");
      expect(within(row105).getByRole("button", { name: /status: done/i })).toBeInTheDocument();

      // 6. Open Task Peek Drawer
      const key105 = within(row105).getByRole("button", { name: "ENG-105" });
      await user.click(key105);

      await waitFor(() => {
        expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();
      });

      const drawer = screen.getByTestId("task-peek-drawer-desktop");
      await waitFor(() => {
        expect(within(drawer).getByText(/done/i)).toBeInTheDocument();
      });
    });

    it("preserves Assignee Option 3 hybrid model and reconciles across List, Board, and Drawer", async () => {
      const user = userEvent.setup();
      renderTasksShell({
        initialEntries: ["/workspaces/018f98a2-3f12-7890-w002-456789abcdef/board"],
      });

      await waitFor(() => {
        expect(screen.getByTestId("task-board-view")).toBeInTheDocument();
      });

      // 1. ENG-105 starts assigned to Alex Morgan. Click assignee cell in Board card
      const card105 = screen.getByTestId("task-board-card-ENG-105");
      const assigneeCell = within(card105).getByRole("button", { name: /assignee: alex morgan/i });
      await user.click(assigneeCell);

      // 2. Assignee selector dialog opens
      const dialog = await screen.findByRole("dialog", { name: /assign task/i });
      expect(dialog).toBeInTheDocument();

      // 3. Option 3: selecting another member (Jordan Lee) in single-mode replaces
      const jordanOption = within(dialog).getByRole("button", { name: /jordan lee/i });
      await user.click(jordanOption);

      // 4. Dialog closes on single replace; card now shows Jordan Lee
      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: /assign task/i })).not.toBeInTheDocument();
        expect(within(card105).getByRole("button", { name: /assignee: jordan lee/i })).toBeInTheDocument();
      });

      // 5. Switch to List View -> verify row reflects Jordan Lee
      const listTab = screen.getByTestId("tab-view-list");
      await user.click(listTab);

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      const row105 = screen.getByTestId("task-list-row-ENG-105");
      expect(within(row105).getByRole("button", { name: /assignee: jordan lee/i })).toBeInTheDocument();

      // 6. Open Task Peek Drawer -> verify drawer reflects Jordan Lee
      await user.click(within(row105).getByRole("button", { name: "ENG-105" }));
      await waitFor(() => {
        expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();
      });
      const drawer = screen.getByTestId("task-peek-drawer-desktop");
      expect(within(drawer).getByText("Jordan Lee")).toBeInTheDocument();
    });

    it("updates priority in List View and due date in Board View with full cross-view reflection", async () => {
      const user = userEvent.setup();
      renderTasksShell({
        initialEntries: ["/workspaces/018f98a2-3f12-7890-w002-456789abcdef/list"],
      });

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      // 1. Update priority of ENG-105 from High to Urgent in List View
      const row105 = screen.getByTestId("task-list-row-ENG-105");
      const priorityBtn = within(row105).getByRole("button", { name: /priority: high/i });
      await user.click(priorityBtn);

      const urgentOption = await screen.findByRole("menuitem", { name: /urgent/i });
      await user.click(urgentOption);

      await waitFor(() => {
        expect(within(row105).getByRole("button", { name: /priority: urgent/i })).toBeInTheDocument();
      });

      // 2. Switch to Board View -> verify card header shows Urgent
      const boardTab = screen.getByTestId("tab-view-board");
      await user.click(boardTab);

      await waitFor(() => {
        expect(screen.getByTestId("task-board-view")).toBeInTheDocument();
      });

      const card105 = screen.getByTestId("task-board-card-ENG-105");
      expect(within(card105).getByRole("button", { name: /priority: urgent/i })).toBeInTheDocument();

      // 3. Update Due Date in Board View via preset "Tomorrow"
      const dueDateBtn = within(card105).getByRole("button", { name: /due date/i });
      await user.click(dueDateBtn);

      const tomorrowBtn = await screen.findByTestId("inline-duedate-tomorrow");
      await user.click(tomorrowBtn);

      const expectedTomorrow = addCalendarDays(getDefaultReferenceDate(), 1);
      await waitFor(() => {
        const freshCard = screen.getByTestId("task-board-card-ENG-105");
        expect(within(freshCard).getByText(expectedTomorrow)).toBeInTheDocument();
      });

      // 4. Switch back to List View -> verify row reflects tomorrow's date
      const listTab = screen.getByTestId("tab-view-list");
      await user.click(listTab);

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      const updatedRow105 = screen.getByTestId("task-list-row-ENG-105");
      expect(within(updatedRow105).getByText(expectedTomorrow)).toBeInTheDocument();
    });

    it("recovers from mutation failure by rolling back optimistic state without corrupting persisted data", async () => {
      const user = userEvent.setup();
      renderTasksShell({
        initialEntries: ["/workspaces/018f98a2-3f12-7890-w002-456789abcdef/board"],
      });

      await waitFor(() => {
        expect(screen.getByTestId("task-board-view")).toBeInTheDocument();
      });

      const card101 = screen.getByTestId("task-board-card-ENG-101");

      // Inject server failure for PATCH
      setMockTasksError({
        status: 500,
        problem: {
          type: "https://errors.sonder.platform/server-error",
          title: "Internal Server Error",
          status: 500,
          detail: "Database write deadlock",
        },
      });

      // Try to change status from IN_PROGRESS to DONE
      const statusTrigger = within(card101).getByRole("button", { name: /status: in progress/i });
      await user.click(statusTrigger);

      const doneOption = await screen.findByRole("menuitem", { name: /done/i });
      await user.click(doneOption);

      // Verify feedback banner appears and status rolls back
      await waitFor(() => {
        expect(screen.getByText(/database write deadlock|failed to update task status/i)).toBeInTheDocument();
      });

      // Reset error override
      setMockTasksError(null);

      // ENG-101 remains in IN_PROGRESS column
      const inProgressCol = screen.getByTestId("board-column-IN_PROGRESS");
      expect(within(inProgressCol).getByTestId("task-board-card-ENG-101")).toBeInTheDocument();
    });

    it("persists edits made inside Task Peek Drawer and reconciles with both List and Board views", async () => {
      const user = userEvent.setup();
      renderTasksShell({
        initialEntries: ["/workspaces/018f98a2-3f12-7890-w002-456789abcdef/list?task=ENG-102"],
      });

      // Wait for drawer to open with ENG-102
      await waitFor(() => {
        expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();
      });

      const drawer = screen.getByTestId("task-peek-drawer-desktop");

      // Wait for drawer task details to finish loading
      await waitFor(() => {
        expect(within(drawer).getByText("Ship VS-02E My Work cross-workspace dashboard")).toBeInTheDocument();
      });

      // Edit title inside the drawer via explicit edit button
      const editTitleBtn = within(drawer).getByTestId("edit-title-btn");
      await user.click(editTitleBtn);

      const titleInput = await within(drawer).findByTestId("title-input");
      await user.clear(titleInput);
      await user.type(titleInput, "Ship Omnibar & My Work Cross-Workspace Hub{Enter}");

      // Verify title updated in drawer
      await waitFor(() => {
        expect(within(drawer).getByText("Ship Omnibar & My Work Cross-Workspace Hub")).toBeInTheDocument();
      });

      // Close drawer
      const closeBtn = within(drawer).getByRole("button", { name: /close task details/i });
      await user.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByTestId("task-peek-drawer-desktop")).not.toBeInTheDocument();
      });

      // Verify List View row displays new title
      const row102 = screen.getByTestId("task-list-row-ENG-102");
      expect(within(row102).getByText("Ship Omnibar & My Work Cross-Workspace Hub")).toBeInTheDocument();

      // Switch to Board View
      const boardTab = screen.getByTestId("tab-view-board");
      await user.click(boardTab);

      await waitFor(() => {
        expect(screen.getByTestId("task-board-view")).toBeInTheDocument();
      });

      const card102 = screen.getByTestId("task-board-card-ENG-102");
      expect(within(card102).getByText("Ship Omnibar & My Work Cross-Workspace Hub")).toBeInTheDocument();
    });
  });
});
