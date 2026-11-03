import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "@/App";
import { THEME_STORAGE_KEY } from "@/lib/theme";

function renderApp(initialEntries: string[] = ["/"]) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App initialEntries={initialEntries} />
    </QueryClientProvider>
  );
}

describe("VS-02B: Application Shell & Responsive Navigation", () => {
  let storageMock: Record<string, string> = {};

  beforeEach(() => {
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

    document.documentElement.classList.remove("dark");

    // Ensure jsdom evaluates preventScroll on focus options for FloatingFocusManager runtime check
    const origFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function (options) {
      if (options && typeof options === "object") {
        void (options as { preventScroll?: boolean }).preventScroll;
      }
      return origFocus.call(this, options);
    };
  });

  describe("Desktop Shell Structure & Landmarks", () => {
    it("renders persistent landmarks, branding, and user context upon session resolution", async () => {
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("banner")).toBeInTheDocument();
        expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
        expect(screen.getByRole("main")).toBeInTheDocument();
        expect(screen.getByRole("contentinfo")).toBeInTheDocument();
      });

      // Brand Identity
      expect(screen.getByText("Sonder")).toBeInTheDocument();
      expect(screen.getByText("v1.5.0")).toBeInTheDocument();

      // User Context & Actions
      expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
      expect(screen.getByText("(alex.morgan@example.org)")).toBeInTheDocument();
      expect(screen.getByText("Sonder Community")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();

      // Ensure no active community assumption or internal milestone labels in user dashboard
      expect(screen.getByRole("heading", { name: "Community Work Management" })).toBeInTheDocument();
      expect(screen.getByText("Community Memberships")).toBeInTheDocument();
      expect(screen.queryByText(/Active Community/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Workspace Overview/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/VS-02B Shell Active/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/OpenAPI 0.3.20-draft/i)).not.toBeInTheDocument();

      // Verify factual workspace copy adhering strictly to canonical model
      expect(screen.getByText(/Community-unique task identifier prefixes for clear task keys/i)).toBeInTheDocument();
      expect(screen.getByText(/Role-based workspace permissions: Owner, Coordinator, Member, and Viewer/i)).toBeInTheDocument();
      expect(screen.queryByText(/workspace-scoped milestones/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/multi-owner governance/i)).not.toBeInTheDocument();
    });

    it("renders centralized primary navigation items and workspace extension point without fake previews", async () => {
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
      });

      const sidebarNav = screen.getByRole("navigation", { name: "Main navigation" });
      expect(within(sidebarNav).getByRole("link", { name: /^my work$/i })).toBeInTheDocument();
      expect(within(sidebarNav).getByRole("link", { name: /^inbox$/i })).toBeInTheDocument();

      // Workspace switcher integrated (VS-02C)
      expect(screen.getByRole("button", { name: /select a workspace/i })).toBeInTheDocument();
      expect(screen.queryByText("Engineering Platform")).not.toBeInTheDocument();
      expect(screen.queryByText("Spring Community Gala 2027")).not.toBeInTheDocument();
      expect(screen.queryByText("Alex's Personal")).not.toBeInTheDocument();
    });

    it("renders live Omnibar trigger and opens command palette modal", async () => {
      const user = userEvent.setup();
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("banner")).toBeInTheDocument();
      });

      // Omnibar trigger is present, enabled, and accessible
      const omnibarButton = screen.getByRole("button", {
        name: /open command palette/i,
      });
      expect(omnibarButton).toBeInTheDocument();
      expect(omnibarButton).toBeEnabled();

      // Clicking opens the command palette modal
      await user.click(omnibarButton);

      await waitFor(() => {
        expect(
          screen.getByRole("dialog", { name: /omnibar command palette/i })
        ).toBeInTheDocument();
      });

      // Quick Create remains omitted until task creation flow is ready in later slice
      expect(screen.queryByRole("button", { name: /create task/i })).not.toBeInTheDocument();
    });
  });

  describe("Sidebar Collapse & Keyboard Navigation", () => {
    it("toggles sidebar width via collapse button and persists state", async () => {
      const user = userEvent.setup();
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
      });

      const sidebar = screen.getByRole("navigation", { name: "Main navigation" });
      expect(sidebar).toHaveClass("w-60");

      // Click collapse button
      const collapseBtn = screen.getByRole("button", { name: "Collapse rail (Ctrl+B)" });
      await user.click(collapseBtn);

      expect(sidebar).toHaveClass("w-16");
      expect(storageMock["sonder-sidebar-collapsed"]).toBe("true");

      // Click expand button
      const expandBtn = screen.getByRole("button", { name: "Expand rail (Ctrl+B)" });
      await user.click(expandBtn);

      expect(sidebar).toHaveClass("w-60");
      expect(storageMock["sonder-sidebar-collapsed"]).toBe("false");
    });

    it("toggles sidebar collapse using Ctrl+B / Cmd+B keyboard shortcut", async () => {
      const user = userEvent.setup();
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
      });

      const sidebar = screen.getByRole("navigation", { name: "Main navigation" });
      expect(sidebar).toHaveClass("w-60");

      // Trigger Cmd/Ctrl+B
      await user.keyboard("{Control>}b{/Control}");
      expect(sidebar).toHaveClass("w-16");

      await user.keyboard("{Control>}b{/Control}");
      expect(sidebar).toHaveClass("w-60");
    });
  });

  describe("Route Navigation & Active States", () => {
    it("navigates to /my-work and displays active link indication", async () => {
      const user = userEvent.setup();
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
      });

      const sidebarNav = screen.getByRole("navigation", { name: "Main navigation" });
      const myWorkLink = within(sidebarNav).getByRole("link", { name: /^my work$/i });
      await user.click(myWorkLink);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "My Work" })).toBeInTheDocument();
      });

      expect(screen.getByTestId("my-work-view")).toBeInTheDocument();
      expect(myWorkLink).toHaveClass("text-[var(--brand-accent-text)]");
    });

    it("navigates to /inbox and renders the empty notification state", async () => {
      const user = userEvent.setup();
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
      });

      const sidebarNav = screen.getByRole("navigation", { name: "Main navigation" });
      const inboxLink = within(sidebarNav).getByRole("link", { name: /^inbox$/i });
      await user.click(inboxLink);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Notification Inbox" })).toBeInTheDocument();
      });

      expect(screen.getByText("All caught up")).toBeInTheDocument();
      expect(inboxLink).toHaveClass("text-[var(--brand-accent-text)]");
    });
  });

  describe("Mobile Navigation & Base UI Drawer Focus Management", () => {
    it("opens mobile navigation drawer and dismisses via close button with focus restoration", async () => {
      const user = userEvent.setup();
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Open navigation menu" })).toBeInTheDocument();
      });

      const openBtn = screen.getByRole("button", { name: "Open navigation menu" });
      await user.click(openBtn);

      // Drawer is open using Base UI Dialog modal
      const drawer = await screen.findByRole("dialog", { name: "Navigation drawer" });
      expect(drawer).toBeInTheDocument();

      // Close button inside drawer
      const closeBtn = screen.getByRole("button", { name: "Close navigation menu" });
      await user.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: "Navigation drawer" })).not.toBeInTheDocument();
      });

      // Focus should be restored to open button
      expect(document.activeElement).toBe(openBtn);
    });

    it("dismisses mobile drawer upon Escape key press with focus restoration", async () => {
      const user = userEvent.setup();
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Open navigation menu" })).toBeInTheDocument();
      });

      const openBtn = screen.getByRole("button", { name: "Open navigation menu" });
      await user.click(openBtn);

      expect(await screen.findByRole("dialog", { name: "Navigation drawer" })).toBeInTheDocument();

      // Press Escape
      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: "Navigation drawer" })).not.toBeInTheDocument();
      });

      // Focus restored to trigger button
      expect(document.activeElement).toBe(openBtn);
    });

    it("opens mobile drawer from bottom nav Menu button and restores focus to that trigger on Escape", async () => {
      const user = userEvent.setup();
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Open menu drawer" })).toBeInTheDocument();
      });

      const menuBtn = screen.getByRole("button", { name: "Open menu drawer" });
      await user.click(menuBtn);

      expect(await screen.findByRole("dialog", { name: "Navigation drawer" })).toBeInTheDocument();

      // Press Escape
      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: "Navigation drawer" })).not.toBeInTheDocument();
      });

      // Focus restored to the bottom nav menu trigger button
      expect(document.activeElement).toBe(menuBtn);
    });

    it("opens mobile drawer from bottom nav Menu button and restores focus on close button click", async () => {
      const user = userEvent.setup();
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Open menu drawer" })).toBeInTheDocument();
      });

      const menuBtn = screen.getByRole("button", { name: "Open menu drawer" });
      await user.click(menuBtn);

      const drawer = await screen.findByRole("dialog", { name: "Navigation drawer" });
      expect(drawer).toBeInTheDocument();

      // Click Close button
      const closeBtn = screen.getByRole("button", { name: "Close navigation menu" });
      await user.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: "Navigation drawer" })).not.toBeInTheDocument();
      });

      // Focus restored specifically to the bottom nav menu trigger button
      expect(document.activeElement).toBe(menuBtn);
    });

    it("restores focus to trigger upon backdrop click dismissal", async () => {
      const user = userEvent.setup();
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Open navigation menu" })).toBeInTheDocument();
      });

      const openBtn = screen.getByRole("button", { name: "Open navigation menu" });
      await user.click(openBtn);

      const drawer = await screen.findByRole("dialog", { name: "Navigation drawer" });
      expect(drawer).toBeInTheDocument();

      // Find backdrop element and assert that it exists before interaction
      const backdrop = screen.getByTestId("dialog-backdrop");
      expect(backdrop).toBeInTheDocument();

      // Click backdrop to dismiss
      await user.click(backdrop);

      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: "Navigation drawer" })).not.toBeInTheDocument();
      });

      // Verify focus returns to the opening trigger
      await waitFor(() => {
        expect(document.activeElement).toBe(openBtn);
      });
    });

    it("restores focus to bottom nav trigger upon backdrop click dismissal", async () => {
      const user = userEvent.setup();
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Open menu drawer" })).toBeInTheDocument();
      });

      const menuBtn = screen.getByRole("button", { name: "Open menu drawer" });
      await user.click(menuBtn);

      const drawer = await screen.findByRole("dialog", { name: "Navigation drawer" });
      expect(drawer).toBeInTheDocument();

      const backdrop = screen.getByTestId("dialog-backdrop");
      expect(backdrop).toBeInTheDocument();

      await user.click(backdrop);

      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: "Navigation drawer" })).not.toBeInTheDocument();
      });

      await waitFor(() => {
        expect(document.activeElement).toBe(menuBtn);
      });
    });

    it("keeps focus trapped inside drawer upon Tab navigation", async () => {
      const user = userEvent.setup();
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Open navigation menu" })).toBeInTheDocument();
      });

      const openBtn = screen.getByRole("button", { name: "Open navigation menu" });
      await user.click(openBtn);

      const drawer = await screen.findByRole("dialog", { name: "Navigation drawer" });
      expect(drawer).toBeInTheDocument();

      // Verify focused element is within drawer
      expect(drawer.contains(document.activeElement)).toBe(true);

      // Tab navigation remains inside drawer
      await user.tab();
      expect(drawer.contains(document.activeElement)).toBe(true);

      await user.tab({ shift: true });
      expect(drawer.contains(document.activeElement)).toBe(true);
    });

    it("navigating via route link inside drawer closes drawer and transfers focus to main content without restoring trigger focus", async () => {
      const user = userEvent.setup();
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Open navigation menu" })).toBeInTheDocument();
      });

      const openBtn = screen.getByRole("button", { name: "Open navigation menu" });
      await user.click(openBtn);

      const drawer = await screen.findByRole("dialog", { name: "Navigation drawer" });
      expect(drawer).toBeInTheDocument();

      // Find My Work link inside drawer
      const myWorkDrawerLink = within(drawer).getByRole("link", { name: /^my work$/i });
      await user.click(myWorkDrawerLink);

      // Drawer closes
      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: "Navigation drawer" })).not.toBeInTheDocument();
      });

      // Destination page heading renders
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "My Work" })).toBeInTheDocument();
      });

      // Main content landmark receives focus rather than the trigger button
      await waitFor(() => {
        const mainContent = document.getElementById("main-content");
        expect(mainContent).not.toBeNull();
        expect(document.activeElement).toBe(mainContent);
      });
      expect(document.activeElement).not.toBe(openBtn);
    });

    it("renders mobile bottom navigation bar with accessible touch targets and without hardcoded count", async () => {
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: "Mobile Bottom Navigation" })).toBeInTheDocument();
      });

      const bottomNav = screen.getByRole("navigation", { name: "Mobile Bottom Navigation" });
      expect(bottomNav).toBeInTheDocument();

      const links = bottomNav.querySelectorAll("a, button");
      expect(links.length).toBeGreaterThanOrEqual(4);
      links.forEach((element) => {
        expect(element).toHaveClass("min-w-[44px]");
        expect(element).toHaveClass("min-h-[44px]");
      });

      // Confirm no hardcoded "1" badge inside bottomNav
      expect(within(bottomNav).queryByText("1")).not.toBeInTheDocument();
    });
  });

  describe("Theme Provider Activation & Mode Switching", () => {
    it("toggles dark mode via header button and updates document element and storage", async () => {
      const user = userEvent.setup();
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("banner")).toBeInTheDocument();
      });

      const header = screen.getByRole("banner");
      const themeToggle = within(header).getByRole("button", { name: /toggle theme/i });
      expect(document.documentElement.classList.contains("dark")).toBe(false);

      // Click to switch to dark
      await user.click(themeToggle);

      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(storageMock[THEME_STORAGE_KEY]).toBe("dark");

      // Click again to switch back to light
      await user.click(themeToggle);

      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(storageMock[THEME_STORAGE_KEY]).toBe("light");
    });
  });
});
