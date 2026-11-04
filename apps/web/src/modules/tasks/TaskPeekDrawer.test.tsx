import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import React from "react";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { WorkspaceProvider } from "@/modules/workspace/WorkspaceContext.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import {
  MOCK_COMMUNITY_1_ID,
  WS_SHARED_ENG_ID,
  WS_PERSONAL_ALEX_ID,
  MOCK_USER_ID,
} from "@/mocks/data/my-work.js";
import { resetTaskMockState, setMockTasksError } from "@/mocks/handlers/tasks.js";
import { TaskPeekDrawer } from "./TaskPeekDrawer.js";
import { useTaskPeekDrawer } from "./useTaskPeekDrawer.js";
import { MyWorkView } from "@/modules/my-work/MyWorkView.js";

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

function renderTaskDrawerTest({
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
            <MemoryRouter initialEntries={initialEntries}>
              <LocationDisplay />
              <div className="flex">
                <main className="flex-1">
                  {children ?? (
                    <div>
                      <h1>Main Canvas Content</h1>
                      <TaskTestTrigger />
                    </div>
                  )}
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

function TaskTestTrigger() {
  const { openTask, closeTask } = useTaskPeekDrawer();
  return (
    <div>
      <button
        type="button"
        data-testid="open-eng-101-btn"
        onClick={() => openTask("ENG-101", { workspaceId: WS_SHARED_ENG_ID })}
      >
        Open ENG-101
      </button>
      <button
        type="button"
        data-testid="open-alex-1-btn"
        onClick={() => openTask("ALEX-1", { workspaceId: WS_PERSONAL_ALEX_ID })}
      >
        Open ALEX-1
      </button>
      <button
        type="button"
        data-testid="close-drawer-btn"
        onClick={() => closeTask()}
      >
        Close Drawer
      </button>
    </div>
  );
}

describe("VS-03 Stage 2: Task Peek Drawer & Deep Linking", () => {
  beforeEach(() => {
    resetTaskMockState();
  });

  describe("Deep Linking & Router Integration", () => {
    it("renders nothing when no task parameter is present in URL", () => {
      renderTaskDrawerTest({ initialEntries: ["/?filter=assigned"] });

      expect(screen.queryByTestId("task-peek-drawer-desktop")).not.toBeInTheDocument();
      expect(screen.queryByTestId("task-peek-drawer-mobile")).not.toBeInTheDocument();
    });

    it("opens drawer automatically upon direct deep link navigation (?task=ENG-101)", async () => {
      renderTaskDrawerTest({ initialEntries: ["/?task=ENG-101"] });

      expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();

      // Wait for task details to resolve and render
      await waitFor(() => {
        expect(screen.getByText("Fix critical auth token refresh race condition")).toBeInTheDocument();
      });

      expect(screen.getByText("ENG-101")).toBeInTheDocument();
      expect(screen.getByText("Engineering Platform")).toBeInTheDocument();
    });

    it("updates URL with ?task=ENG-101 when opening a task and preserves unrelated query params", async () => {
      const user = userEvent.setup();
      renderTaskDrawerTest({ initialEntries: ["/?filter=assigned&sort=due"] });

      expect(screen.getByTestId("location-display")).toHaveTextContent("/?filter=assigned&sort=due");

      // Click trigger to open task
      await user.click(screen.getByTestId("open-eng-101-btn"));

      expect(screen.getByTestId("location-display")).toHaveTextContent(
        "/?filter=assigned&sort=due&task=ENG-101"
      );
      expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Fix critical auth token refresh race condition")).toBeInTheDocument();
      });
    });

    it("cleanses only the task parameter when closing the drawer", async () => {
      const user = userEvent.setup();
      renderTaskDrawerTest({ initialEntries: ["/?filter=assigned&task=ENG-101"] });

      await waitFor(() => {
        expect(screen.getByText("Fix critical auth token refresh race condition")).toBeInTheDocument();
      });

      // Click close button inside drawer
      const closeButton = screen.getByRole("button", { name: /close task details/i });
      await user.click(closeButton);

      // Drawer should disappear and URL must preserve filter=assigned
      await waitFor(() => {
        expect(screen.queryByTestId("task-peek-drawer-desktop")).not.toBeInTheDocument();
      });
      expect(screen.getByTestId("location-display")).toHaveTextContent("/?filter=assigned");
      expect(screen.getByTestId("location-display")).not.toHaveTextContent("task=ENG-101");
    });

    it("switches displayed task seamlessly when navigating between tasks", async () => {
      const user = userEvent.setup();
      renderTaskDrawerTest({ initialEntries: ["/?task=ENG-101"] });

      await waitFor(() => {
        expect(screen.getByText("Fix critical auth token refresh race condition")).toBeInTheDocument();
      });

      // Switch to ALEX-1
      await user.click(screen.getByTestId("open-alex-1-btn"));

      expect(screen.getByTestId("location-display")).toHaveTextContent("/?task=ALEX-1");

      await waitFor(() => {
        expect(screen.getByText("Review quarter 4 personal development goals")).toBeInTheDocument();
      });
      expect(screen.getByText("ALEX-1")).toBeInTheDocument();
    });
  });

  describe("Task Presentation & Contract-Faithful Detail Fields", () => {
    it("renders complete task fields: status, priority, description, dates, estimate, labels, assignees", async () => {
      renderTaskDrawerTest({ initialEntries: ["/?task=ENG-101"] });

      await waitFor(() => {
        expect(screen.getByText("Fix critical auth token refresh race condition")).toBeInTheDocument();
      });

      // Title & Key
      expect(screen.getByRole("heading", { name: "Fix critical auth token refresh race condition" })).toBeInTheDocument();
      expect(screen.getByText("ENG-101")).toBeInTheDocument();

      // Status & Priority
      expect(screen.getByText("IN PROGRESS")).toBeInTheDocument();
      expect(screen.getByText("URGENT")).toBeInTheDocument();

      // Description
      expect(
        screen.getByText(/Session token renewal intermittent failure on parallel requests/i)
      ).toBeInTheDocument();

      // Assignee
      expect(screen.getByText("Alex Morgan")).toBeInTheDocument();

      // Dates
      expect(screen.getByText("2026-10-28")).toBeInTheDocument();
      expect(screen.getByText("2026-10-20")).toBeInTheDocument();

      // Estimate
      expect(screen.getByText("5 points")).toBeInTheDocument();

      // Labels
      expect(screen.getByText("security")).toBeInTheDocument();
      expect(screen.getByText("backend")).toBeInTheDocument();

      // Audit footer
      expect(screen.getByText(/Version 3/i)).toBeInTheDocument();
    });

    it("displays canonical CANCELED badge without legacy spelling in presentation", async () => {
      // In mock data, GALA-190 has statusCategory: "CANCELED"
      renderTaskDrawerTest({
        initialEntries: ["/?task=GALA-190"],
        initialWorkspaceId: "018f98a2-3f12-7890-c123-456789abcde1",
      });

      await waitFor(() => {
        expect(screen.getByText("Deprecated legacy spreadsheet export script")).toBeInTheDocument();
      });

      expect(screen.getByText("CANCELED")).toBeInTheDocument();
      expect(screen.getByTestId("status-icon-CANCELED")).toBeInTheDocument();
    });

    it("resolves historical alias with redirection metadata and notice banner", async () => {
      renderTaskDrawerTest({ initialEntries: ["/?task=ENG-OLD-1"] });

      await waitFor(() => {
        expect(screen.getByText("Fix critical auth token refresh race condition")).toBeInTheDocument();
      });

      // Redirection notice banner should be present
      expect(screen.getByRole("status")).toHaveTextContent(
        /redirected from historical key ENG-OLD-1/i
      );
    });

    it("displays archived task banner when task is archived", async () => {
      // In mock data, ENG-088 is archived
      renderTaskDrawerTest({ initialEntries: ["/?task=ENG-088"] });

      await waitFor(() => {
        expect(screen.getByText("Migrate Redis cluster to Sentinel v2")).toBeInTheDocument();
      });

      expect(screen.getByRole("status")).toHaveTextContent(
        /this task is archived/i
      );
    });
  });

  describe("Security, Privacy & Indistinguishable 404s", () => {
    it("renders accessible 'Task Not Found' state for non-existent key without disclosing private metadata", async () => {
      renderTaskDrawerTest({ initialEntries: ["/?task=NONEXISTENT-999"] });

      await waitFor(() => {
        expect(screen.getByTestId("task-not-found-state")).toBeInTheDocument();
      });

      expect(screen.getByRole("heading", { name: "Task Not Found" })).toBeInTheDocument();
      expect(screen.getByText(/could not be found or is not accessible/i)).toBeInTheDocument();
      // Zero leakage of private workspace information
      expect(screen.queryByText("Engineering Platform")).not.toBeInTheDocument();
    });

    it("resolves personal workspace task using caller's personal workspace context", async () => {
      renderTaskDrawerTest({
        initialEntries: ["/?task=ALEX-1"],
        initialWorkspaceId: WS_SHARED_ENG_ID, // active workspace is ENG, but ALEX-1 is Personal
      });

      await waitFor(() => {
        expect(screen.getByText("Review quarter 4 personal development goals")).toBeInTheDocument();
      });

      expect(screen.getByLabelText("Personal Workspace")).toBeInTheDocument();
    });

    it("displays error alert and retry button upon server error", async () => {
      setMockTasksError({
        status: 500,
        problem: {
          type: "https://errors.sonder.platform/server-error",
          title: "Internal Server Error",
          status: 500,
          detail: "Database replication lag exceeded threshold.",
        },
      });

      renderTaskDrawerTest({ initialEntries: ["/?task=ENG-101"] });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText(/failed to load task details/i)).toBeInTheDocument();
        expect(screen.getByText(/database replication lag exceeded/i)).toBeInTheDocument();
      });

      // Clear error and retry
      setMockTasksError(null);
      const retryBtn = screen.getByRole("button", { name: /retry/i });
      await userEvent.setup().click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText("Fix critical auth token refresh race condition")).toBeInTheDocument();
      });
    });
  });

  describe("Responsive Presentation: Desktop vs Mobile", () => {
    it("renders right-docked non-modal panel on desktop without blocking main canvas", async () => {
      renderTaskDrawerTest({
        initialEntries: ["/?task=ENG-101"],
        forceMode: "desktop",
      });

      await waitFor(() => {
        expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();
      });

      // Main canvas remains visible and interactive
      expect(screen.getByText("Main Canvas Content")).toBeInTheDocument();
      expect(screen.queryByTestId("dialog-backdrop")).not.toBeInTheDocument();
    });

    it("renders modal bottom sheet with backdrop on mobile", async () => {
      renderTaskDrawerTest({
        initialEntries: ["/?task=ENG-101"],
        forceMode: "mobile",
      });

      await waitFor(() => {
        expect(screen.getByTestId("task-peek-drawer-mobile")).toBeInTheDocument();
      });

      // Modal dialog semantics
      const mobileDrawer = screen.getByTestId("task-peek-drawer-mobile");
      expect(mobileDrawer).toHaveAttribute("role", "dialog");
      expect(mobileDrawer).toHaveAttribute("aria-modal", "true");
    });
  });

  describe("Accessibility & Keyboard Interaction", () => {
    it("closes drawer when Escape key is pressed", async () => {
      const user = userEvent.setup();
      renderTaskDrawerTest({ initialEntries: ["/?task=ENG-101"] });

      await waitFor(() => {
        expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();
      });

      // Press Escape
      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByTestId("task-peek-drawer-desktop")).not.toBeInTheDocument();
      });
      expect(screen.getByTestId("location-display")).not.toHaveTextContent("task=ENG-101");
    });

    it("restores focus to the triggering element when drawer is closed", async () => {
      const user = userEvent.setup();
      renderTaskDrawerTest({ initialEntries: ["/"] });

      const openButton = screen.getByTestId("open-eng-101-btn");
      openButton.focus();
      expect(document.activeElement).toBe(openButton);

      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();
      });

      // Close via close button
      const closeButton = screen.getByRole("button", { name: /close task details/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId("task-peek-drawer-desktop")).not.toBeInTheDocument();
      });

      // Focus should be restored to openButton
      expect(document.activeElement).toBe(openButton);
    });

    it("copies task link to clipboard and renders visual confirmation", async () => {
      const user = userEvent.setup();
      // Mock clipboard writeText
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: writeTextMock,
        },
        configurable: true,
        writable: true,
      });

      renderTaskDrawerTest({ initialEntries: ["/?task=ENG-101"] });

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /copy task link/i })).toBeInTheDocument();
      });

      const copyBtn = screen.getByRole("button", { name: /copy task link/i });
      await user.click(copyBtn);

      expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining("task=ENG-101"));
    });
  });

  describe("Integration with My Work View", () => {
    it("opens task peek drawer when clicking a task card in My Work with proper workspace context", async () => {
      const user = userEvent.setup();
      const queryClient = createTestQueryClient();
      const authValue = createMockAuth();

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={authValue}>
            <WorkspaceProvider
              initialCommunityId={MOCK_COMMUNITY_1_ID}
              initialWorkspaceId={WS_SHARED_ENG_ID}
            >
              <MemoryRouter initialEntries={["/my-work?filter=ALL"]}>
                <LocationDisplay />
                <div className="flex">
                  <main className="flex-1">
                    <MyWorkView referenceDate="2026-11-03" />
                  </main>
                  <TaskPeekDrawer forceMode="desktop" />
                </div>
              </MemoryRouter>
            </WorkspaceProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      // Wait for My Work tasks to render
      await waitFor(() => {
        expect(screen.getByTestId("my-work-task-ENG-101")).toBeInTheDocument();
      });

      // Click on ENG-101 card
      await user.click(screen.getByTestId("my-work-task-ENG-101"));

      // Location should update with task=ENG-101 while keeping filter=ALL
      expect(screen.getByTestId("location-display")).toHaveTextContent(
        "/my-work?filter=ALL&task=ENG-101"
      );

      // Drawer should open and load details
      await waitFor(() => {
        expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Fix critical auth token refresh race condition" })).toBeInTheDocument();
      });

      // Now click on ALEX-1 personal workspace card from My Work
      await user.click(screen.getByTestId("my-work-task-ALEX-1"));

      expect(screen.getByTestId("location-display")).toHaveTextContent(
        "/my-work?filter=ALL&task=ALEX-1"
      );

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Review quarter 4 personal development goals" })).toBeInTheDocument();
      });
    });

    it("opens task peek drawer via keyboard Enter key on focused task card", async () => {
      const user = userEvent.setup();
      const queryClient = createTestQueryClient();
      const authValue = createMockAuth();

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={authValue}>
            <WorkspaceProvider
              initialCommunityId={MOCK_COMMUNITY_1_ID}
              initialWorkspaceId={WS_SHARED_ENG_ID}
            >
              <MemoryRouter initialEntries={["/my-work"]}>
                <LocationDisplay />
                <div className="flex">
                  <main className="flex-1">
                    <MyWorkView referenceDate="2026-11-03" />
                  </main>
                  <TaskPeekDrawer forceMode="desktop" />
                </div>
              </MemoryRouter>
            </WorkspaceProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("my-work-task-ENG-101")).toBeInTheDocument();
      });

      const taskCard = screen.getByTestId("my-work-task-ENG-101");
      taskCard.focus();
      expect(document.activeElement).toBe(taskCard);

      // Press Enter
      await user.keyboard("{Enter}");

      expect(screen.getByTestId("location-display")).toHaveTextContent("task=ENG-101");

      await waitFor(() => {
        expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Fix critical auth token refresh race condition" })).toBeInTheDocument();
      });
    });
  });
});
