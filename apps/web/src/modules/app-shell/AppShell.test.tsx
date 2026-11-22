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
      expect(screen.getAllByText("Sonder Community").length).toBeGreaterThanOrEqual(1);
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

  describe("Phase 1: Design System & Shell Architecture Transformation", () => {
    it("renders Two-Zone Navigation with distinct Personal Space and Workspace Explorer regions", async () => {
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
      });

      const sidebar = screen.getByRole("navigation", { name: "Main navigation" });

      // Zone 1: Personal Space
      expect(within(sidebar).getByText("Personal Space")).toBeInTheDocument();
      expect(within(sidebar).getByRole("link", { name: /^home$/i })).toBeInTheDocument();
      expect(within(sidebar).getByRole("link", { name: /^my work$/i })).toBeInTheDocument();
      expect(within(sidebar).getByRole("link", { name: /^inbox$/i })).toBeInTheDocument();

      // Zone 2: Workspace Explorer
      expect(within(sidebar).getByText("Workspace Explorer")).toBeInTheDocument();
      expect(within(sidebar).getByRole("button", { name: /select a workspace/i })).toBeInTheDocument();
    });

    it("dynamically updates desktop breadcrumb context according to active route", async () => {
      renderApp(["/my-work"]);

      await waitFor(() => {
        expect(screen.getByRole("banner")).toBeInTheDocument();
      });

      const header = screen.getByRole("banner");
      const breadcrumbs = within(header).getByRole("navigation", { name: "Breadcrumbs" });
      expect(within(breadcrumbs).getByText("My Work")).toBeInTheDocument();
    });

    it("opens User Preferences modal from user dropdown menu and allows theme selection", async () => {
      const user = userEvent.setup();
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Open user menu" })).toBeInTheDocument();
      });

      // Open user dropdown menu
      const avatarTrigger = screen.getByRole("button", { name: "Open user menu" });
      await user.click(avatarTrigger);

      // Verify Preferences item exists and click it
      const preferencesItem = await screen.findByRole("menuitem", { name: /preferences/i });
      expect(preferencesItem).toBeInTheDocument();
      await user.click(preferencesItem);

      // Verify Preferences dialog appears with accessibility landmarks
      const preferencesDialog = await screen.findByRole("dialog", { name: /user preferences/i });
      expect(preferencesDialog).toBeInTheDocument();

      // Check View Density standard (44px) information
      expect(within(preferencesDialog).getByText(/standard \(44px\) active/i)).toBeInTheDocument();
      expect(within(preferencesDialog).getByText(/conforming strictly to wcag 2\.2 aa/i)).toBeInTheDocument();

      // Test theme buttons inside dialog
      const darkBtn = within(preferencesDialog).getByRole("button", { name: /dark/i });
      await user.click(darkBtn);
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      // Close dialog via close button
      const closeBtn = within(preferencesDialog).getByRole("button", { name: /close dialog/i });
      await user.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: /user preferences/i })).not.toBeInTheDocument();
      });
    });
  });

  describe("DEF-02 Breadcrumb Context Remediation & Route Hierarchy", () => {
    it("renders 'Overview' breadcrumb without community/workspace crumb on home route (/) when no workspace is selected", async () => {
      renderApp(["/"]);

      const breadcrumbs = await screen.findByRole("navigation", { name: "Breadcrumbs" });
      expect(within(breadcrumbs).getByText("Overview")).toBeInTheDocument();
      expect(within(breadcrumbs).queryByText("Sonder Community")).not.toBeInTheDocument();
      expect(within(breadcrumbs).queryByText("Engineering Platform")).not.toBeInTheDocument();
      expect(within(breadcrumbs).queryByText("/")).not.toBeInTheDocument();
    });

    it("suppresses community and workspace crumbs on home route (/) even when a workspace was previously selected", async () => {
      storageMock["sonder-active-workspace-id"] = "018f98a2-3f12-7890-w002-456789abcdef";
      renderApp(["/"]);

      const breadcrumbs = await screen.findByRole("navigation", { name: "Breadcrumbs" });
      expect(within(breadcrumbs).getByText("Overview")).toBeInTheDocument();
      expect(within(breadcrumbs).queryByText("Sonder Community")).not.toBeInTheDocument();
      expect(within(breadcrumbs).queryByText("Engineering Platform")).not.toBeInTheDocument();
      expect(within(breadcrumbs).queryByText("/")).not.toBeInTheDocument();
    });

    it("renders only 'My Work' breadcrumb on /my-work when a workspace was previously selected", async () => {
      storageMock["sonder-active-workspace-id"] = "018f98a2-3f12-7890-w002-456789abcdef";
      renderApp(["/my-work"]);

      const breadcrumbs = await screen.findByRole("navigation", { name: "Breadcrumbs" });
      expect(within(breadcrumbs).getByText("My Work")).toBeInTheDocument();
      expect(within(breadcrumbs).queryByText("Sonder Community")).not.toBeInTheDocument();
      expect(within(breadcrumbs).queryByText("Engineering Platform")).not.toBeInTheDocument();
      expect(within(breadcrumbs).queryByText("/")).not.toBeInTheDocument();
    });

    it("renders only 'Inbox' breadcrumb on /inbox when a workspace was previously selected", async () => {
      storageMock["sonder-active-workspace-id"] = "018f98a2-3f12-7890-w002-456789abcdef";
      renderApp(["/inbox"]);

      const breadcrumbs = await screen.findByRole("navigation", { name: "Breadcrumbs" });
      expect(within(breadcrumbs).getByText("Inbox")).toBeInTheDocument();
      expect(within(breadcrumbs).queryByText("Sonder Community")).not.toBeInTheDocument();
      expect(within(breadcrumbs).queryByText("Engineering Platform")).not.toBeInTheDocument();
      expect(within(breadcrumbs).queryByText("/")).not.toBeInTheDocument();
    });

    it("has no community or workspace crumb upon direct load across all personal routes", async () => {
      storageMock["sonder-active-workspace-id"] = "018f98a2-3f12-7890-w002-456789abcdef";

      const personalRoutes = [
        { path: "/", expectedCrumb: "Overview" },
        { path: "/my-work", expectedCrumb: "My Work" },
        { path: "/inbox", expectedCrumb: "Inbox" },
      ];

      for (const { path, expectedCrumb } of personalRoutes) {
        const { unmount } = renderApp([path]);

        const breadcrumbs = await screen.findByRole("navigation", { name: "Breadcrumbs" });
        expect(within(breadcrumbs).getByText(expectedCrumb)).toBeInTheDocument();
        expect(within(breadcrumbs).queryByText("Sonder Community")).not.toBeInTheDocument();
        expect(within(breadcrumbs).queryByText("Engineering Platform")).not.toBeInTheDocument();

        unmount();
      }
    });

    it("suppresses workspace crumb upon navigating from workspace to personal space without destroying active workspace state", async () => {
      const user = userEvent.setup();
      storageMock["sonder-active-workspace-id"] = "018f98a2-3f12-7890-w002-456789abcdef";

      renderApp(["/list"]);

      const breadcrumbs = await screen.findByRole("navigation", { name: "Breadcrumbs" });

      // On workspace route, full hierarchy is visible
      await waitFor(() => {
        expect(within(breadcrumbs).getByText("Sonder Community")).toBeInTheDocument();
        expect(within(breadcrumbs).getByText("Engineering Platform")).toBeInTheDocument();
        expect(within(breadcrumbs).getByText("List")).toBeInTheDocument();
      });

      // Navigate to Personal Space: My Work
      const sidebarNav = screen.getByRole("navigation", { name: "Main navigation" });
      const myWorkLink = within(sidebarNav).getByRole("link", { name: /^my work$/i });
      await user.click(myWorkLink);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "My Work" })).toBeInTheDocument();
      });

      // Breadcrumbs now suppress workspace and community
      expect(within(breadcrumbs).getByText("My Work")).toBeInTheDocument();
      expect(within(breadcrumbs).queryByText("Sonder Community")).not.toBeInTheDocument();
      expect(within(breadcrumbs).queryByText("Engineering Platform")).not.toBeInTheDocument();

      // Active workspace state in storage remains intact
      expect(storageMock["sonder-active-workspace-id"]).toBe("018f98a2-3f12-7890-w002-456789abcdef");
    });

    it("restores workspace breadcrumb when navigating back from personal space to workspace view", async () => {
      const user = userEvent.setup();
      storageMock["sonder-active-workspace-id"] = "018f98a2-3f12-7890-w002-456789abcdef";

      renderApp(["/my-work"]);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "My Work" })).toBeInTheDocument();
      });

      const breadcrumbs = await screen.findByRole("navigation", { name: "Breadcrumbs" });
      expect(within(breadcrumbs).getByText("My Work")).toBeInTheDocument();
      expect(within(breadcrumbs).queryByText("Engineering Platform")).not.toBeInTheDocument();

      // Navigate to workspace Board view from sidebar (waits for activeWorkspace to resolve)
      const boardLink = await screen.findByRole("link", { name: /^board$/i });
      await user.click(boardLink);

      // Breadcrumb context is restored
      await waitFor(() => {
        expect(within(breadcrumbs).getByText("Sonder Community")).toBeInTheDocument();
        expect(within(breadcrumbs).getByText("Engineering Platform")).toBeInTheDocument();
        expect(within(breadcrumbs).getByText("Board")).toBeInTheDocument();
      });
    });

    it("retains full Community / Workspace / View breadcrumbs across all workspace routes", async () => {
      storageMock["sonder-active-workspace-id"] = "018f98a2-3f12-7890-w002-456789abcdef";

      const workspaceRoutes = [
        { path: "/list", expectedView: "List" },
        { path: "/board", expectedView: "Board" },
        { path: "/calendar", expectedView: "Calendar" },
        { path: "/timeline", expectedView: "Timeline" },
        { path: "/trash", expectedView: "Trash" },
        { path: "/settings", expectedView: "Settings" },
      ];

      for (const { path, expectedView } of workspaceRoutes) {
        const { unmount } = renderApp([path]);

        const breadcrumbs = await screen.findByRole("navigation", { name: "Breadcrumbs" });

        await waitFor(() => {
          expect(within(breadcrumbs).getByText("Sonder Community")).toBeInTheDocument();
          expect(within(breadcrumbs).getByText("Engineering Platform")).toBeInTheDocument();
          expect(within(breadcrumbs).getByText(expectedView)).toBeInTheDocument();
        });

        unmount();
      }
    });

    it("retains correct breadcrumb context on nested parameterized workspace routes", async () => {
      const nestedRoutes = [
        {
          path: "/workspaces/018f98a2-3f12-7890-w002-456789abcdef/list",
          expectedCommunity: "Sonder Community",
          expectedWorkspace: "Engineering Platform",
          expectedView: "List",
        },
        {
          path: "/c/018f98a2-3f12-7890-b123-456789abcdef/w/018f98a2-3f12-7890-w002-456789abcdef/board",
          expectedCommunity: "Sonder Community",
          expectedWorkspace: "Engineering Platform",
          expectedView: "Board",
        },
        {
          path: "/c/018f98a2-3f12-7890-b123-456789abcdef/w/018f98a2-3f12-7890-w002-456789abcdef/trash",
          expectedCommunity: "Sonder Community",
          expectedWorkspace: "Engineering Platform",
          expectedView: "Trash",
        },
      ];

      for (const { path, expectedCommunity, expectedWorkspace, expectedView } of nestedRoutes) {
        const { unmount } = renderApp([path]);

        const breadcrumbs = await screen.findByRole("navigation", { name: "Breadcrumbs" });

        await waitFor(() => {
          expect(within(breadcrumbs).getByText(expectedCommunity)).toBeInTheDocument();
          expect(within(breadcrumbs).getByText(expectedWorkspace)).toBeInTheDocument();
          expect(within(breadcrumbs).getByText(expectedView)).toBeInTheDocument();
        });

        unmount();
      }
    });

    it("renders exactly one instance of each crumb and correct separator counts without duplicate entries", async () => {
      storageMock["sonder-active-workspace-id"] = "018f98a2-3f12-7890-w002-456789abcdef";

      // Test 1: Workspace route (/board)
      const { unmount: unmountWorkspace } = renderApp(["/board"]);

      const wsBreadcrumbs = await screen.findByRole("navigation", { name: "Breadcrumbs" });

      await waitFor(() => {
        expect(within(wsBreadcrumbs).getByText("Board")).toBeInTheDocument();
      });

      // Verify unique occurrences
      expect(within(wsBreadcrumbs).getAllByText("Sonder Community")).toHaveLength(1);
      expect(within(wsBreadcrumbs).getAllByText("Engineering Platform")).toHaveLength(1);
      expect(within(wsBreadcrumbs).getAllByText("Board")).toHaveLength(1);

      // Exactly two separators for three hierarchy levels
      const separators = within(wsBreadcrumbs).getAllByText("/");
      expect(separators).toHaveLength(2);

      unmountWorkspace();

      // Test 2: Personal route (/overview or /)
      const { unmount: unmountPersonal } = renderApp(["/"]);

      const pBreadcrumbs = await screen.findByRole("navigation", { name: "Breadcrumbs" });

      expect(within(pBreadcrumbs).getAllByText("Overview")).toHaveLength(1);
      expect(within(pBreadcrumbs).queryAllByText("/")).toHaveLength(0);

      unmountPersonal();
    });
  });
});
