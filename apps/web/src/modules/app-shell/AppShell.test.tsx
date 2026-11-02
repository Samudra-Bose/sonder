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
    });

    it("renders centralized primary navigation items and workspace extension previews", async () => {
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
      });

      const sidebarNav = screen.getByRole("navigation", { name: "Main navigation" });
      expect(within(sidebarNav).getByRole("link", { name: /my work/i })).toBeInTheDocument();
      expect(within(sidebarNav).getByRole("link", { name: /inbox/i })).toBeInTheDocument();

      // Workspace extension points
      expect(screen.getByText("Engineering Platform")).toBeInTheDocument();
      expect(screen.getByText("Spring Community Gala 2027")).toBeInTheDocument();
      expect(screen.getByText("Alex's Personal")).toBeInTheDocument();
      expect(screen.getByText(/workspace switcher extension point/i)).toBeInTheDocument();
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
      const myWorkLink = within(sidebarNav).getByRole("link", { name: /my work/i });
      await user.click(myWorkLink);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "My Work" })).toBeInTheDocument();
      });

      expect(myWorkLink).toHaveClass("text-[var(--brand-accent-text)]");
    });

    it("navigates to /inbox and renders the empty notification state", async () => {
      const user = userEvent.setup();
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
      });

      const sidebarNav = screen.getByRole("navigation", { name: "Main navigation" });
      const inboxLink = within(sidebarNav).getByRole("link", { name: /inbox/i });
      await user.click(inboxLink);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Notification Inbox" })).toBeInTheDocument();
      });

      expect(screen.getByText("All caught up")).toBeInTheDocument();
      expect(inboxLink).toHaveClass("text-[var(--brand-accent-text)]");
    });
  });

  describe("Mobile Navigation & Drawer Dismissal", () => {
    it("opens mobile navigation drawer and dismisses via close button", async () => {
      const user = userEvent.setup();
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Open navigation menu" })).toBeInTheDocument();
      });

      const openBtn = screen.getByRole("button", { name: "Open navigation menu" });
      await user.click(openBtn);

      // Drawer is open
      const drawer = screen.getByRole("dialog", { name: "Navigation drawer" });
      expect(drawer).toBeInTheDocument();

      // Close button
      const closeBtn = screen.getByRole("button", { name: "Close navigation menu" });
      await user.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: "Navigation drawer" })).not.toBeInTheDocument();
      });
    });

    it("dismisses mobile drawer upon Escape key press", async () => {
      const user = userEvent.setup();
      renderApp(["/"]);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Open navigation menu" })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Open navigation menu" }));
      expect(screen.getByRole("dialog", { name: "Navigation drawer" })).toBeInTheDocument();

      // Press Escape
      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: "Navigation drawer" })).not.toBeInTheDocument();
      });
    });

    it("renders mobile bottom navigation bar with accessible touch targets", async () => {
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
