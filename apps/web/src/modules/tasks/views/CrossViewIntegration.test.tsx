import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation, useNavigate, Routes, Route } from "react-router-dom";

import { defaultMockCommunities } from "../../../mocks/handlers/auth.js";
import { resetWorkspaceMockState } from "../../../mocks/handlers/workspaces.js";
import {
  resetTaskMockState,
  setMockTasksError,
  setForceExpireSnapshot,
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
});
