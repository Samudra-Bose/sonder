import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext";
import { WorkspaceProvider } from "@/modules/workspace/WorkspaceContext";
import { MyWorkView } from "./MyWorkView";
import {
  resetMyWorkMockState,
  setMockMyWorkError,
  setMockMyWorkEmpty,
} from "@/mocks/handlers/my-work";
import { defaultMockCommunities } from "@/mocks/handlers/auth";
import { MOCK_REFERENCE_DATE, MOCK_USER_ID, MOCK_COMMUNITY_1_ID } from "@/mocks/data/my-work";

const testUser = {
  id: MOCK_USER_ID,
  displayName: "Alex Morgan",
  email: "alex.morgan@example.org",
  avatarUrl: null,
};

function createMockAuth(overrides?: Partial<AuthContextType>): AuthContextType {
  return {
    user: testUser,
    communities: defaultMockCommunities,
    csrfToken: "test-csrf-token",
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

function renderMyWorkView({
  authOverrides,
  referenceDate = MOCK_REFERENCE_DATE,
}: {
  authOverrides?: Partial<AuthContextType>;
  referenceDate?: string;
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const authValue = createMockAuth(authOverrides);

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <WorkspaceProvider initialCommunityId={MOCK_COMMUNITY_1_ID}>
          <MemoryRouter>
            <MyWorkView referenceDate={referenceDate} />
          </MemoryRouter>
        </WorkspaceProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("MyWorkView Component (VS-02E)", () => {
  beforeEach(() => {
    resetMyWorkMockState();
  });

  describe("Initial Rendering and Temporal Grouping", () => {
    it("renders page header, user greeting, and reference date banner", async () => {
      renderMyWorkView();

      expect(screen.getByRole("heading", { name: "My Work" })).toBeInTheDocument();
      expect(screen.getByText(/personal triage for/i)).toBeInTheDocument();
      expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
      expect(screen.getByText(new RegExp(`Today: ${MOCK_REFERENCE_DATE}`))).toBeInTheDocument();
    });

    it("renders 5 summary metric cards with accurate initial counts", async () => {
      renderMyWorkView();

      await waitFor(() => {
        expect(screen.getByTestId("my-work-summary-metrics")).toBeInTheDocument();
      });

      const metrics = screen.getByTestId("my-work-summary-metrics");
      expect(within(metrics).getByText("Total Work")).toBeInTheDocument();
      expect(within(metrics).getByText("Overdue")).toBeInTheDocument();
      expect(within(metrics).getByText("Due Today")).toBeInTheDocument();
      expect(within(metrics).getByText("Upcoming")).toBeInTheDocument();
      expect(within(metrics).getByText("Unscheduled")).toBeInTheDocument();

      // Check numbers once loaded (8 total unique active tasks: 2 overdue + 2 due today + 2 upcoming + 2 unscheduled)
      await waitFor(() => {
        expect(within(metrics).getByText("8")).toBeInTheDocument();
      });
    });

    it("renders all four canonical temporal sections and strictly no 'Later' group", async () => {
      renderMyWorkView();

      await waitFor(() => {
        expect(screen.getByTestId("temporal-group-overdue")).toBeInTheDocument();
      });

      expect(screen.getByTestId("temporal-group-overdue")).toBeInTheDocument();
      expect(screen.getByTestId("temporal-group-dueToday")).toBeInTheDocument();
      expect(screen.getByTestId("temporal-group-upcoming")).toBeInTheDocument();
      expect(screen.getByTestId("temporal-group-unscheduled")).toBeInTheDocument();

      // Strict scope requirement: NO "Later" group
      expect(screen.queryByTestId("temporal-group-later")).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /^later$/i })).not.toBeInTheDocument();
    });

    it("renders active tasks with workspace badges, task keys, and composite chips", async () => {
      renderMyWorkView();

      await waitFor(() => {
        expect(screen.getByTestId("my-work-task-ENG-101")).toBeInTheDocument();
      });

      // ENG-101 is overdue and assigned
      const taskEng101 = screen.getByTestId("my-work-task-ENG-101");
      expect(within(taskEng101).getByText("ENG-101")).toBeInTheDocument();
      expect(within(taskEng101).getByText(/Fix critical auth token/i)).toBeInTheDocument();
      expect(within(taskEng101).getByText("Assigned")).toBeInTheDocument();

      // ENG-102 has composite relationship (Assigned + Creator)
      const taskEng102 = screen.getByTestId("my-work-task-ENG-102");
      expect(within(taskEng102).getByText("Assigned")).toBeInTheDocument();
      expect(within(taskEng102).getByText("Creator")).toBeInTheDocument();

      // ENG-103 is watched
      const taskEng103 = screen.getByTestId("my-work-task-ENG-103");
      expect(within(taskEng103).getByText("Watching")).toBeInTheDocument();

      // ALEX-1 is in personal workspace with lock indicator
      const taskAlex1 = screen.getByTestId("my-work-task-ALEX-1");
      expect(within(taskAlex1).getByLabelText("Personal Workspace")).toBeInTheDocument();
    });

    it("strictly excludes terminal tasks (DONE and CANCELED) from all active temporal groups", async () => {
      renderMyWorkView();

      await waitFor(() => {
        expect(screen.getByTestId("my-work-task-ENG-101")).toBeInTheDocument();
      });

      // In mock data: ENG-099 is DONE, GALA-190 is CANCELED
      expect(screen.queryByTestId("my-work-task-ENG-099")).not.toBeInTheDocument();
      expect(screen.queryByText("ENG-099")).not.toBeInTheDocument();
      expect(screen.queryByTestId("my-work-task-GALA-190")).not.toBeInTheDocument();
      expect(screen.queryByText("GALA-190")).not.toBeInTheDocument();
    });
  });

  describe("Relationship Filter Controls", () => {
    it("filters tasks by 'Assigned to Me'", async () => {
      const user = userEvent.setup();
      renderMyWorkView();

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /assigned to me/i })).toBeInTheDocument();
      });

      const assignedTab = screen.getByRole("tab", { name: /assigned to me/i });
      await user.click(assignedTab);

      expect(assignedTab).toHaveAttribute("aria-selected", "true");

      // ENG-101 is assigned -> must be visible
      expect(screen.getByTestId("my-work-task-ENG-101")).toBeInTheDocument();

      // GALA-201 is ONLY created by Alex, not assigned -> must NOT be visible
      expect(screen.queryByTestId("my-work-task-GALA-201")).not.toBeInTheDocument();

      // ENG-103 is ONLY watched, not assigned -> must NOT be visible
      expect(screen.queryByTestId("my-work-task-ENG-103")).not.toBeInTheDocument();
    });

    it("filters tasks by 'Created by Me'", async () => {
      const user = userEvent.setup();
      renderMyWorkView();

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /created by me/i })).toBeInTheDocument();
      });

      const createdTab = screen.getByRole("tab", { name: /created by me/i });
      await user.click(createdTab);

      expect(createdTab).toHaveAttribute("aria-selected", "true");

      // GALA-201 is created by Alex -> must be visible
      expect(screen.getByTestId("my-work-task-GALA-201")).toBeInTheDocument();

      // ENG-102 is both assigned and created -> must be visible
      expect(screen.getByTestId("my-work-task-ENG-102")).toBeInTheDocument();

      // ENG-101 was created by Jordan, not Alex -> must NOT be visible
      expect(screen.queryByTestId("my-work-task-ENG-101")).not.toBeInTheDocument();
    });

    it("filters tasks by 'Watching'", async () => {
      const user = userEvent.setup();
      renderMyWorkView();

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /watching/i })).toBeInTheDocument();
      });

      const watchingTab = screen.getByRole("tab", { name: /watching/i });
      await user.click(watchingTab);

      expect(watchingTab).toHaveAttribute("aria-selected", "true");

      // ENG-103 is watched -> must be visible
      expect(screen.getByTestId("my-work-task-ENG-103")).toBeInTheDocument();

      // ENG-101 is not watched -> must NOT be visible
      expect(screen.queryByTestId("my-work-task-ENG-101")).not.toBeInTheDocument();
    });

    it("resets back to 'All Work'", async () => {
      const user = userEvent.setup();
      renderMyWorkView();

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /watching/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /watching/i }));
      expect(screen.queryByTestId("my-work-task-ENG-101")).not.toBeInTheDocument();

      await user.click(screen.getByRole("tab", { name: /all work/i }));
      expect(screen.getByTestId("my-work-task-ENG-101")).toBeInTheDocument();
      expect(screen.getByTestId("my-work-task-ENG-103")).toBeInTheDocument();
    });
  });

  describe("Empty and Error States", () => {
    it("renders overall empty state when no tasks match", async () => {
      setMockMyWorkEmpty(true);
      renderMyWorkView();

      await waitFor(() => {
        expect(screen.getByTestId("my-work-empty-state")).toBeInTheDocument();
      });

      expect(screen.getByText("All caught up!")).toBeInTheDocument();
      expect(screen.queryByTestId("my-work-temporal-groups")).not.toBeInTheDocument();
    });

    it("renders error feedback card and supports retry upon failure", async () => {
      const user = userEvent.setup();
      setMockMyWorkError({
        status: 500,
        problem: {
          type: "https://errors.sonder.platform/internal-error",
          title: "Internal Server Error",
          status: 500,
          detail: "Database connection failed unexpectedly.",
          code: "INTERNAL_ERROR",
        },
      });

      renderMyWorkView();

      await waitFor(() => {
        expect(screen.getByText("Unable to load tasks")).toBeInTheDocument();
      });

      expect(screen.getByText(/Database connection failed/i)).toBeInTheDocument();
      const retryButton = screen.getByRole("button", { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      // Clear error and click retry
      resetMyWorkMockState();
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByTestId("my-work-task-ENG-101")).toBeInTheDocument();
      });
      expect(screen.queryByText("Unable to load tasks")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility and Keyboard Usability", () => {
    it("provides accessible navigation for relationship filter with ARIA attributes", async () => {
      renderMyWorkView();

      const filterNav = screen.getByRole("navigation", {
        name: "Filter tasks by relationship",
      });
      expect(filterNav).toBeInTheDocument();

      const tabs = within(filterNav).getAllByRole("tab");
      expect(tabs).toHaveLength(4);
      expect(tabs[0]).toHaveAttribute("aria-selected", "true");
      expect(tabs[1]).toHaveAttribute("aria-selected", "false");
    });

    it("provides section labels and accessible headings for temporal groups", async () => {
      renderMyWorkView();

      await waitFor(() => {
        expect(screen.getByRole("region", { name: /overdue/i })).toBeInTheDocument();
      });

      expect(screen.getByRole("region", { name: /overdue/i })).toBeInTheDocument();
      expect(screen.getByRole("region", { name: /due today/i })).toBeInTheDocument();
      expect(screen.getByRole("region", { name: /upcoming/i })).toBeInTheDocument();
      expect(screen.getByRole("region", { name: /unscheduled/i })).toBeInTheDocument();
    });
  });
});
