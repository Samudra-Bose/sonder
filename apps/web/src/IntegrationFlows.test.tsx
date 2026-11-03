import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setMockSessionActive, resetAuthMockState } from "./mocks/handlers/auth.js";
import { resetWorkspaceMockState } from "./mocks/handlers/workspaces.js";
import { resetMyWorkMockState } from "./mocks/handlers/my-work.js";
import { clearShortcutRegistry } from "./lib/keyboard.js";
import { MOCK_COMMUNITY_1_ID } from "./mocks/data/my-work.js";
import { App } from "./App.js";

describe("VS-02F: Frontend Integration & End-to-End User Journeys", () => {
  let storageMock: Record<string, string> = {};

  beforeEach(() => {
    resetAuthMockState();
    resetWorkspaceMockState();
    resetMyWorkMockState();

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

    storageMock["sonder-active-community-id"] = MOCK_COMMUNITY_1_ID;
    clearShortcutRegistry();
  });

  afterEach(() => {
    storageMock = {};
    clearShortcutRegistry();
  });

  describe("Complete User Journey: Auth -> Shell -> Omnibar -> My Work -> Switch Workspace -> Logout", () => {
    it("executes the continuous multi-slice workflow seamlessly", async () => {
      const user = userEvent.setup();
      setMockSessionActive(true);

      // 1. Initial application mount & session restoration (VS-01)
      render(<App initialEntries={["/"]} />);

      await waitFor(() => {
        expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
        expect(screen.getByRole("banner")).toBeInTheDocument();
        expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
      });

      // 2. Open Omnibar via desktop trigger button (VS-02D)
      const omnibarTrigger = screen.getByRole("button", { name: /open command palette/i });
      await user.click(omnibarTrigger);

      const dialog = await screen.findByRole("dialog", {
        name: /omnibar command palette/i,
      });
      expect(dialog).toBeInTheDocument();

      // 3. Search and navigate to My Work via Omnibar
      const searchInput = screen.getByPlaceholderText(/type a command or search navigation/i);
      await user.type(searchInput, "My Work");

      const myWorkOption = await screen.findByRole("option", { name: /Go to My Work/i });
      expect(myWorkOption).toBeInTheDocument();
      await user.click(myWorkOption);

      // Omnibar closes and route transitions to /my-work
      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: /omnibar command palette/i })).not.toBeInTheDocument();
        expect(screen.getByTestId("my-work-view")).toBeInTheDocument();
      });

      // 4. Verify My Work dashboard triage metrics and temporal grouping (VS-02E)
      const metrics = screen.getByTestId("my-work-summary-metrics");
      expect(within(metrics).getByText("Total Work")).toBeInTheDocument();
      await waitFor(() => {
        expect(within(metrics).getByText("8")).toBeInTheDocument();
      });

      // Verify the 4 canonical temporal groups exist (strictly no "Later" group)
      expect(screen.getByTestId("temporal-group-overdue")).toBeInTheDocument();
      expect(screen.getByTestId("temporal-group-dueToday")).toBeInTheDocument();
      expect(screen.getByTestId("temporal-group-upcoming")).toBeInTheDocument();
      expect(screen.getByTestId("temporal-group-unscheduled")).toBeInTheDocument();
      expect(screen.queryByTestId("temporal-group-later")).not.toBeInTheDocument();

      // 5. Test relationship filtering inside My Work
      const filterNav = screen.getByRole("navigation", { name: "Filter tasks by relationship" });
      const assignedTab = within(filterNav).getByRole("tab", { name: /assigned to me/i });
      await user.click(assignedTab);
      expect(assignedTab).toHaveAttribute("aria-selected", "true");

      // ENG-101 is assigned -> visible; GALA-201 is only created -> hidden
      expect(screen.getByTestId("my-work-task-ENG-101")).toBeInTheDocument();
      expect(screen.queryByTestId("my-work-task-GALA-201")).not.toBeInTheDocument();

      // Reset filter back to All Work
      const allTab = within(filterNav).getByRole("tab", { name: /all work/i });
      await user.click(allTab);
      expect(screen.getByTestId("my-work-task-GALA-201")).toBeInTheDocument();

      // 6. Switch workspace context via Omnibar
      await user.click(screen.getByRole("button", { name: /open command palette/i }));
      await screen.findByRole("dialog", { name: /omnibar command palette/i });

      const searchInput2 = screen.getByPlaceholderText(/type a command or search navigation/i);
      await user.type(searchInput2, "Switch to Engineering Platform");

      const engOption = await screen.findByRole("option", { name: /Switch to Engineering Platform/i });
      await user.click(engOption);

      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: /omnibar command palette/i })).not.toBeInTheDocument();
      });

      // 7. Sign out flow and state purge (VS-01)
      const signOutBtn = screen.getByRole("button", { name: "Sign out" });
      await user.click(signOutBtn);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Sign in to your account" })).toBeInTheDocument();
      });

      // Protected content and user indicators are completely cleared
      expect(screen.queryByText("Alex Morgan")).not.toBeInTheDocument();
      expect(screen.queryByTestId("my-work-view")).not.toBeInTheDocument();
    });
  });

  describe("Cross-Community Data Isolation & Context Switching", () => {
    it("switches communities and isolates workspace/task contexts", async () => {
      const user = userEvent.setup();
      setMockSessionActive(true);

      render(<App initialEntries={["/my-work"]} />);

      await waitFor(() => {
        expect(within(screen.getByRole("banner")).getByText("Sonder Community")).toBeInTheDocument();
        expect(screen.getByTestId("my-work-view")).toBeInTheDocument();
      });

      // Initially in Community 1: 8 tasks visible
      await waitFor(() => {
        expect(screen.getByTestId("my-work-task-ENG-101")).toBeInTheDocument();
      });

      // Open Omnibar to switch community
      await user.click(screen.getByRole("button", { name: /open command palette/i }));
      await screen.findByRole("dialog", { name: /omnibar command palette/i });

      const searchInput = screen.getByPlaceholderText(/type a command or search navigation/i);
      await user.type(searchInput, "Switch to community");

      const artsGuildOption = await screen.findByRole("option", {
        name: /Switch to community: Regional Arts Guild/i,
      });
      await user.click(artsGuildOption);

      // Active community context updates
      await waitFor(() => {
        expect(within(screen.getByRole("banner")).getByText("Regional Arts Guild")).toBeInTheDocument();
      });

      // In Community 2, user has 0 tasks -> renders empty state
      await waitFor(() => {
        expect(screen.getByTestId("my-work-empty-state")).toBeInTheDocument();
      });
      expect(screen.getByText("All caught up!")).toBeInTheDocument();
      expect(screen.queryByTestId("my-work-task-ENG-101")).not.toBeInTheDocument();
    });
  });

  describe("Personal Workspace Privacy & Security Invariants (DEC-OPEN-01)", () => {
    it("renders personal workspace indicators and prevents private data exposure", async () => {
      const user = userEvent.setup();
      setMockSessionActive(true);

      render(<App initialEntries={["/my-work"]} />);

      await waitFor(() => {
        expect(screen.getByTestId("my-work-view")).toBeInTheDocument();
      });

      // Personal task ALEX-1 has Lock indicator
      const alexTask = await screen.findByTestId("my-work-task-ALEX-1");
      expect(within(alexTask).getByLabelText("Personal Workspace")).toBeInTheDocument();

      // Open Omnibar and verify only caller's personal workspace is offered
      await user.click(screen.getByRole("button", { name: /open command palette/i }));
      await screen.findByRole("dialog", { name: /omnibar command palette/i });

      const searchInput = screen.getByPlaceholderText(/type a command or search navigation/i);
      await user.type(searchInput, "Personal");

      // Caller's personal workspace is found
      expect(screen.getByRole("option", { name: /Switch to Alex Morgan's Workspace/i })).toBeInTheDocument();

      // No other user's personal workspace is exposed
      expect(screen.queryByRole("option", { name: /Jordan's Notes/i })).not.toBeInTheDocument();
    });
  });

  describe("Accessibility & Responsive Shell Interactions", () => {
    it("supports sidebar collapse toggle and theme switching", async () => {
      const user = userEvent.setup();
      setMockSessionActive(true);

      render(<App initialEntries={["/"]} />);

      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
      });

      const sidebar = screen.getByRole("navigation", { name: "Main navigation" });
      expect(sidebar).toHaveClass("w-60");

      // Toggle sidebar collapse via header collapse button
      const collapseBtn = screen.getByRole("button", { name: /collapse sidebar/i });
      await user.click(collapseBtn);
      await waitFor(() => {
        expect(sidebar).toHaveClass("w-16");
      });

      // Toggle back to expanded
      const expandBtn = screen.getByRole("button", { name: /expand sidebar/i });
      await user.click(expandBtn);
      await waitFor(() => {
        expect(sidebar).toHaveClass("w-60");
      });

      // Toggle theme via header button
      const header = screen.getByRole("banner");
      const themeToggleBtn = within(header).getByRole("button", { name: /toggle theme/i });
      expect(themeToggleBtn).toBeInTheDocument();
      await user.click(themeToggleBtn);

      // Verify theme persists in document root
      expect(document.documentElement).toHaveClass("dark");
    });
  });
});
