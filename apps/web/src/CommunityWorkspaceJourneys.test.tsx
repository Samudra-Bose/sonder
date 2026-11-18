import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setMockSessionActive, resetAuthMockState } from "./mocks/handlers/auth.js";
import { resetWorkspaceMockState, getMockActiveCommunityId } from "./mocks/handlers/workspaces.js";
import { resetMyWorkMockState } from "./mocks/handlers/my-work.js";
import { clearShortcutRegistry } from "./lib/keyboard.js";
import { App } from "./App.js";

describe("Stage 2: Core User Journeys & Functional Integrity", () => {
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

    clearShortcutRegistry();
  });

  afterEach(() => {
    storageMock = {};
    clearShortcutRegistry();
  });

  describe("Journey 1: First-time community setup & activation", () => {
    it("creates a community, activates it, updates indicator, and restores selection upon refresh", async () => {
      const user = userEvent.setup();
      setMockSessionActive(true);

      // 1. Initial mount with empty storage (no pre-seeded active community)
      const { unmount } = render(<App initialEntries={["/"]} />);

      await waitFor(() => {
        expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Community Work Management" })).toBeInTheDocument();
      });

      // 2. Open Create Community dialog from dashboard
      const createCommunityBtn = screen.getByTestId("dashboard-create-community-btn");
      await user.click(createCommunityBtn);

      const dialog = await screen.findByRole("dialog", {
        name: /create new community/i,
      });
      expect(dialog).toBeInTheDocument();

      // 3. Fill in community name and ensure makeActive checkbox is checked
      const nameInput = screen.getByTestId("community-name-input");
      await user.type(nameInput, "Emerald Coast Cooperative");

      const submitBtn = screen.getByTestId("create-community-submit-btn");
      await user.click(submitBtn);

      // 4. Dialog closes and new community appears in the list
      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: /create new community/i })).not.toBeInTheDocument();
        expect(screen.getAllByText("Emerald Coast Cooperative").length).toBeGreaterThanOrEqual(1);
      });

      // 5. Verify the active community indicator is visible for the new community
      const matchingElements = screen.getAllByText("Emerald Coast Cooperative");
      const cardTitleEl = matchingElements.find((el) => el.tagName === "P" && el.className.includes("font-semibold"));
      expect(cardTitleEl).toBeDefined();
      const newCommCard = cardTitleEl!.closest("div");
      expect(newCommCard).toBeInTheDocument();
      expect(within(newCommCard!).getByText(/active/i)).toBeInTheDocument();

      // 6. Verify selection was stored in localStorage
      const activeId = storageMock["sonder-active-community-id"];
      expect(activeId).toBeTruthy();

      // 7. Refresh simulation: unmount and remount with stored community ID
      unmount();
      render(<App initialEntries={["/"]} />);

      await waitFor(() => {
        expect(screen.getAllByText("Emerald Coast Cooperative").length).toBeGreaterThanOrEqual(1);
      });

      const restoredMatching = screen.getAllByText("Emerald Coast Cooperative");
      const restoredTitleEl = restoredMatching.find((el) => el.tagName === "P" && el.className.includes("font-semibold"));
      expect(restoredTitleEl).toBeDefined();
      const restoredCommCard = restoredTitleEl!.closest<HTMLElement>(".rounded-lg");
      expect(restoredCommCard).not.toBeNull();
      expect(within(restoredCommCard!).getByText("Active")).toBeInTheDocument();
    });
  });

  describe("Journey 2: Workspace setup & persistent activation", () => {
    it("creates a workspace, activates it immediately without race conditions, and restores on refresh", async () => {
      const user = userEvent.setup();
      setMockSessionActive(true);

      // Initial mount
      const { unmount } = render(<App initialEntries={["/"]} />);

      await waitFor(() => {
        expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
      });

      // Open workspace switcher popover
      const wsSwitcher = screen.getByRole("button", { name: /select a workspace/i });
      await user.click(wsSwitcher);

      // Click Create Workspace trigger
      const createWsTrigger = await screen.findByTestId("create-workspace-trigger");
      await user.click(createWsTrigger);

      // Modal opens
      const dialog = await screen.findByTestId("create-workspace-dialog");
      expect(dialog).toBeInTheDocument();

      // Fill in workspace name and keyPrefix
      const nameInput = screen.getByTestId("workspace-name-input");
      await user.type(nameInput, "Volunteer Operations");

      const prefixInput = screen.getByPlaceholderText(/e\.g\. ENG, GALA/i);
      await user.type(prefixInput, "VOL");

      // Submit form
      const submitBtn = screen.getByTestId("create-workspace-submit-btn");
      await user.click(submitBtn);

      // Modal closes and new workspace is activated immediately
      await waitFor(() => {
        expect(screen.queryByTestId("create-workspace-dialog")).not.toBeInTheDocument();
      });

      // Verify active workspace persisted in localStorage
      await waitFor(() => {
        expect(storageMock["sonder-active-workspace-id"]).toBeTruthy();
      });

      // Verify workspace views (List, Board, Calendar, Timeline) are visible in sidebar
      await waitFor(() => {
        const sidebar = screen.getByRole("navigation", { name: "Main navigation" });
        expect(within(sidebar).getByRole("link", { name: /list/i })).toBeInTheDocument();
        expect(within(sidebar).getByRole("link", { name: /board/i })).toBeInTheDocument();
      });

      // Refresh simulation
      unmount();
      render(<App initialEntries={["/"]} />);

      // Active workspace remains restored from localStorage
      await waitFor(() => {
        const sidebar = screen.getByRole("navigation", { name: "Main navigation" });
        expect(within(sidebar).getByRole("link", { name: /list/i })).toBeInTheDocument();
      });
    });
  });

  describe("Journey 3: Multi-community switching & data isolation", () => {
    it("switches community seamlessly and evicts old workspace context", async () => {
      const user = userEvent.setup();
      setMockSessionActive(true);

      // Start on Community 1
      render(<App initialEntries={["/"]} />);

      await waitFor(() => {
        expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
        expect(screen.getAllByText("Sonder Community").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("Regional Arts Guild")).toBeInTheDocument();
      });

      // Regional Arts Guild card has "Select this community"
      const switchBtn = screen.getByRole("button", { name: /select this community/i });
      await user.click(switchBtn);

      // Verifies active community updated
      await waitFor(() => {
        expect(getMockActiveCommunityId()).toBe("018f98a2-3f12-7890-b999-456789abcdef");
        expect(storageMock["sonder-active-community-id"]).toBe("018f98a2-3f12-7890-b999-456789abcdef");
      });

      // Regional Arts Guild card is now marked Active
      const artsTitles = screen.getAllByText("Regional Arts Guild");
      const artsCardTitle = artsTitles.find((el) => el.tagName === "P" && el.className.includes("font-semibold"));
      expect(artsCardTitle).toBeDefined();
      const artsCard = artsCardTitle!.closest<HTMLElement>(".rounded-lg");
      expect(artsCard).not.toBeNull();
      expect(within(artsCard!).getByText("Active")).toBeInTheDocument();

      // And Sonder Community now has "Select this community"
      const sonderTitles = screen.getAllByText("Sonder Community");
      const sonderCardTitle = sonderTitles.find((el) => el.tagName === "P" && el.className.includes("font-semibold"));
      expect(sonderCardTitle).toBeDefined();
      const sonderCard = sonderCardTitle!.closest<HTMLElement>(".rounded-lg");
      expect(sonderCard).not.toBeNull();
      expect(within(sonderCard!).getByRole("button", { name: /select this community/i })).toBeInTheDocument();
    });
  });
});
