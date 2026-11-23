import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useSearchParams } from "react-router-dom";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext";
import { WorkspaceProvider } from "@/modules/workspace/WorkspaceContext";
import { DashboardView } from "./DashboardView";
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

function SearchParamsWatcher() {
  const [params] = useSearchParams();
  return <div data-testid="current-task-param">{params.get("task") ?? ""}</div>;
}

interface RenderDashboardOptions {
  authOverrides?: Partial<AuthContextType>;
  referenceDate?: string;
}

function renderDashboardView({
  authOverrides,
  referenceDate = MOCK_REFERENCE_DATE,
}: RenderDashboardOptions = {}) {
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
            <DashboardView referenceDate={referenceDate} />
            <SearchParamsWatcher />
          </MemoryRouter>
        </WorkspaceProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("DashboardView — Home Daily Focus Cockpit (Phase 2)", () => {
  beforeEach(() => {
    resetMyWorkMockState();
  });

  describe("Section A: Cockpit Greeting & Tenant Context", () => {
    it("renders page title, reference date banner and new community button", async () => {
      renderDashboardView();

      expect(
        screen.getByRole("heading", { name: "Community Work Management" })
      ).toBeInTheDocument();
      expect(screen.getByText(new RegExp(`Today: ${MOCK_REFERENCE_DATE}`))).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-create-community-btn")).toBeInTheDocument();
    });

    it("displays active community scope context", async () => {
      renderDashboardView();

      await waitFor(() => {
        expect(screen.getByTestId("home-community-scope-banner")).toBeInTheDocument();
      });
      const banner = screen.getByTestId("home-community-scope-banner");
      expect(within(banner).getByText(/Active Scope:/i)).toBeInTheDocument();
      expect(within(banner).getByText("Sonder Community")).toBeInTheDocument();
    });
  });

  describe("Section B: Actionable Attention Metrics", () => {
    it("renders 3 actionable metrics cards with accurate counts from real data", async () => {
      renderDashboardView();

      await waitFor(() => {
        expect(screen.getByTestId("home-attention-metrics")).toBeInTheDocument();
      });

      const metrics = screen.getByTestId("home-attention-metrics");
      expect(within(metrics).getByText("Overdue Tasks")).toBeInTheDocument();
      expect(within(metrics).getByText("Due Today")).toBeInTheDocument();
      expect(within(metrics).getByText("High Priority Incomplete")).toBeInTheDocument();

      // In default mock: 2 overdue, 2 due today
      await waitFor(() => {
        expect(within(metrics).getAllByText("2").length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("Section C: Daily Focus (Deterministic Prioritization)", () => {
    it("renders top prioritized actionable tasks (up to 5) with overdue first", async () => {
      renderDashboardView();

      await waitFor(() => {
        expect(screen.getByTestId("home-daily-focus")).toBeInTheDocument();
      });

      const focusSection = screen.getByTestId("home-daily-focus");
      expect(within(focusSection).getByRole("heading", { name: "Daily Focus" })).toBeInTheDocument();

      // Top tasks should include overdue tasks first: ENG-101 (2026-11-01), ENG-102 (2026-11-02)
      await waitFor(() => {
        expect(screen.getByTestId("daily-focus-task-ENG-101")).toBeInTheDocument();
        expect(screen.getByTestId("daily-focus-task-ENG-102")).toBeInTheDocument();
      });

      // Assert at most 5 focus tasks rendered
      const focusTasks = screen.getAllByTestId(/^daily-focus-task-/);
      expect(focusTasks.length).toBeLessThanOrEqual(5);
      expect(focusTasks.length).toBeGreaterThan(0);
    });

    it("clicking a daily focus task triggers Task Peek Drawer via search params", async () => {
      const user = userEvent.setup();
      renderDashboardView();

      await waitFor(() => {
        expect(screen.getByTestId("daily-focus-task-ENG-101")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("daily-focus-task-ENG-101"));
      expect(screen.getByTestId("current-task-param")).toHaveTextContent("ENG-101");
    });

    it("supports keyboard activation (Enter key) on daily focus items", async () => {
      const user = userEvent.setup();
      renderDashboardView();

      await waitFor(() => {
        expect(screen.getByTestId("daily-focus-task-ENG-101")).toBeInTheDocument();
      });

      const taskItem = screen.getByTestId("daily-focus-task-ENG-101");
      taskItem.focus();
      await user.keyboard("{Enter}");

      expect(screen.getByTestId("current-task-param")).toHaveTextContent("ENG-101");
    });
  });

  describe("Section D & E: Upcoming Obligations and Workspace Continuity", () => {
    it("renders upcoming obligations list", async () => {
      renderDashboardView();

      await waitFor(() => {
        expect(screen.getByTestId("home-upcoming-section")).toBeInTheDocument();
      });

      const upcomingSection = screen.getByTestId("home-upcoming-section");
      expect(within(upcomingSection).getByText("Upcoming Obligations")).toBeInTheDocument();
    });

    it("deduplicates upcoming obligations so tasks in Daily Focus do not repeat in Section D", async () => {
      renderDashboardView();

      await waitFor(() => {
        expect(screen.getByTestId("daily-focus-task-ENG-101")).toBeInTheDocument();
        expect(screen.getByTestId("home-upcoming-section")).toBeInTheDocument();
      });

      const dailyFocusSection = screen.getByTestId("home-daily-focus");
      const upcomingSection = screen.getByTestId("home-upcoming-section");

      // Extract all task keys from Daily Focus section
      const dailyFocusTaskKeys = within(dailyFocusSection)
        .getAllByRole("button")
        .map((el) => el.getAttribute("data-testid")?.replace("daily-focus-task-", ""))
        .filter(Boolean);

      // Verify that none of the upcoming obligations display any of the dailyFocusTaskKeys
      for (const key of dailyFocusTaskKeys) {
        expect(within(upcomingSection).queryByText(key!)).not.toBeInTheDocument();
      }
    });

    it("renders workspace continuity with List and Board navigation links", async () => {
      renderDashboardView();

      await waitFor(() => {
        expect(screen.getByTestId("home-workspaces-section")).toBeInTheDocument();
      });

      const wsSection = screen.getByTestId("home-workspaces-section");
      expect(within(wsSection).getByText("Your Workspaces")).toBeInTheDocument();

      // Check List and Board links for workspaces
      await waitFor(() => {
        expect(within(wsSection).getAllByRole("link", { name: /list/i }).length).toBeGreaterThan(0);
        expect(within(wsSection).getAllByRole("link", { name: /board/i }).length).toBeGreaterThan(0);
      });
    });
  });

  describe("Empty and Error Recovery States", () => {
    it("renders peaceful empty state when no tasks are actionable", async () => {
      setMockMyWorkEmpty(true);
      renderDashboardView();

      await waitFor(() => {
        expect(screen.getByText("All caught up for today!")).toBeInTheDocument();
      });

      expect(
        screen.getByText(/no overdue or high-priority tasks requiring your attention/i)
      ).toBeInTheDocument();
    });

    it("renders error feedback and allows user to retry query", async () => {
      const user = userEvent.setup();
      setMockMyWorkError({
        status: 500,
        problem: {
          type: "https://errors.sonder.platform/internal-error",
          title: "Internal Server Error",
          status: 500,
          detail: "Database query timeout.",
          code: "TIMEOUT",
        },
      });

      renderDashboardView();

      await waitFor(() => {
        expect(screen.getByText("Unable to load daily focus items")).toBeInTheDocument();
      });

      const retryBtn = screen.getByRole("button", { name: /retry/i });
      expect(retryBtn).toBeInTheDocument();

      // Reset mock and retry
      resetMyWorkMockState();
      await user.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByTestId("daily-focus-task-ENG-101")).toBeInTheDocument();
      });
      expect(screen.queryByText("Unable to load daily focus items")).not.toBeInTheDocument();
    });
  });
});