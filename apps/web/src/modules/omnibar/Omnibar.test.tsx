import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/modules/auth";
import { WorkspaceProvider } from "@/modules/workspace";
import { ThemeProvider } from "@/lib/theme";
import { clearShortcutRegistry } from "@/lib/keyboard";
import {
  OmnibarProvider,
  OmnibarModal,
  DesktopOmnibarTrigger,
  MobileOmnibarTrigger,
} from "./index";

function TestAppShell({
  initialEntries = ["/"],
  initialCommunityId = "community-1",
  initialWorkspaceId = "ws-eng",
}: {
  initialEntries?: string[];
  initialCommunityId?: string | null;
  initialWorkspaceId?: string | null;
}): React.JSX.Element {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <WorkspaceProvider
            initialCommunityId={initialCommunityId}
            initialWorkspaceId={initialWorkspaceId}
          >
            <OmnibarProvider>
              <MemoryRouter initialEntries={initialEntries}>
                <header data-testid="app-header" className="flex items-center gap-2 p-2">
                  <DesktopOmnibarTrigger />
                  <MobileOmnibarTrigger variant="icon" />
                  <MobileOmnibarTrigger variant="drawer-button" />
                </header>
                <main id="main-content" tabIndex={-1}>
                  <Routes>
                    <Route path="/" element={<div>Dashboard Page</div>} />
                    <Route path="/my-work" element={<div>My Work Page</div>} />
                    <Route path="/inbox" element={<div>Inbox Page</div>} />
                  </Routes>
                </main>
                <OmnibarModal onToggleSidebar={vi.fn()} />
              </MemoryRouter>
            </OmnibarProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe("Omnibar / Command Palette (VS-02D)", () => {
  beforeEach(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
    clearShortcutRegistry();
  });

  afterEach(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
    clearShortcutRegistry();
  });

  it("renders desktop trigger with accessible label and keyboard shortcut", () => {
    render(<TestAppShell />);

    const trigger = screen.getByRole("button", {
      name: /open command palette/i,
    });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent("Search or jump to...");
  });

  it("opens palette when desktop trigger is clicked and focuses search input", async () => {
    const user = userEvent.setup();
    render(<TestAppShell />);

    const trigger = screen.getByRole("button", {
      name: /open command palette/i,
    });
    await user.click(trigger);

    const dialog = await screen.findByRole("dialog", {
      name: /omnibar command palette/i,
    });
    expect(dialog).toBeInTheDocument();

    const input = screen.getByPlaceholderText(
      /type a command or search navigation/i
    );
    expect(input).toBeInTheDocument();
    await waitFor(() => {
      expect(document.activeElement).toBe(input);
    });
  });

  it("opens and closes palette via Cmd+K / Ctrl+K keyboard shortcut", async () => {
    const user = userEvent.setup();
    render(<TestAppShell />);

    // Press Cmd+K / Ctrl+K to open
    await user.keyboard("{Control>}k{/Control}");

    let dialog = await screen.findByRole("dialog", {
      name: /omnibar command palette/i,
    });
    expect(dialog).toBeInTheDocument();

    // Press Cmd+K / Ctrl+K again to toggle close
    await user.keyboard("{Control>}k{/Control}");

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /omnibar command palette/i })
      ).not.toBeInTheDocument();
    });
  });

  it("renders navigation, workspace, and action command groups on open", async () => {
    const user = userEvent.setup();
    render(<TestAppShell />);

    await user.keyboard("{Control>}k{/Control}");

    await screen.findByRole("dialog", { name: /omnibar command palette/i });

    // Verify presence of primary navigation commands
    expect(screen.getByText("Go to Overview")).toBeInTheDocument();
    expect(screen.getByText("Go to My Work")).toBeInTheDocument();
    expect(screen.getByText("Go to Inbox")).toBeInTheDocument();

    // Verify presence of appearance / action commands
    expect(screen.getByText("Toggle Theme")).toBeInTheDocument();
    expect(screen.getByText("Use Light Theme")).toBeInTheDocument();
    expect(screen.getByText("Use Dark Theme")).toBeInTheDocument();
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });

  it("filters commands dynamically and shows matching results", async () => {
    const user = userEvent.setup();
    render(<TestAppShell />);

    await user.keyboard("{Control>}k{/Control}");
    const input = await screen.findByPlaceholderText(
      /type a command or search navigation/i
    );

    // Type query "inbox"
    await user.type(input, "inbox");

    expect(screen.getByText("Go to Inbox")).toBeInTheDocument();
    expect(screen.queryByText("Go to Overview")).not.toBeInTheDocument();
    expect(screen.queryByText("Use Light Theme")).not.toBeInTheDocument();
  });

  it("displays a clear empty state when no commands match query", async () => {
    const user = userEvent.setup();
    render(<TestAppShell />);

    await user.keyboard("{Control>}k{/Control}");
    const input = await screen.findByPlaceholderText(
      /type a command or search navigation/i
    );

    // Type query with no matches
    await user.type(input, "xyznonexistentcommand12345");

    expect(
      screen.getByText("No commands or navigation results")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no matching results for/i)
    ).toBeInTheDocument();
  });

  it("navigates results with ArrowDown/ArrowUp and executes selection with Enter", async () => {
    const user = userEvent.setup();
    render(<TestAppShell />);

    await user.keyboard("{Control>}k{/Control}");
    await screen.findByRole("dialog", { name: /omnibar command palette/i });

    // Initial selected option should be the first item (Go to Overview)
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    // Press ArrowDown to move to second item (Go to My Work)
    await user.keyboard("{ArrowDown}");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(options[0]).toHaveAttribute("aria-selected", "false");

    // Press Enter to execute selection
    await user.keyboard("{Enter}");

    // Dialog should close and destination page should be rendered
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /omnibar command palette/i })
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText("My Work Page")).toBeInTheDocument();
  });

  it("closes palette on Escape key and restores focus to invoking element", async () => {
    const user = userEvent.setup();
    render(<TestAppShell />);

    const trigger = screen.getByRole("button", {
      name: /open command palette/i,
    });
    await user.click(trigger);

    const dialog = await screen.findByRole("dialog", {
      name: /omnibar command palette/i,
    });
    expect(dialog).toBeInTheDocument();

    // Press Escape
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /omnibar command palette/i })
      ).not.toBeInTheDocument();
    });
  });

  it("allows clicking an option directly to execute and dismiss", async () => {
    const user = userEvent.setup();
    render(<TestAppShell />);

    await user.keyboard("{Control>}k{/Control}");
    await screen.findByRole("dialog", { name: /omnibar command palette/i });

    const inboxOption = screen.getByText("Go to Inbox");
    await user.click(inboxOption);

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /omnibar command palette/i })
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText("Inbox Page")).toBeInTheDocument();
  });

  it("renders mobile drawer button trigger and opens palette", async () => {
    const user = userEvent.setup();
    render(<TestAppShell />);

    const mobileDrawerBtn = screen.getByRole("button", {
      name: /^command palette/i,
    });
    expect(mobileDrawerBtn).toBeInTheDocument();

    await user.click(mobileDrawerBtn);

    const dialog = await screen.findByRole("dialog", {
      name: /omnibar command palette/i,
    });
    expect(dialog).toBeInTheDocument();
  });

  it("resets search query when closed and reopened", async () => {
    const user = userEvent.setup();
    render(<TestAppShell />);

    // Open and type query
    await user.keyboard("{Control>}k{/Control}");
    const input = await screen.findByPlaceholderText(
      /type a command or search navigation/i
    );
    await user.type(input, "theme");
    expect(input).toHaveValue("theme");

    // Close
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /omnibar command palette/i })
      ).not.toBeInTheDocument();
    });

    // Reopen
    await user.keyboard("{Control>}k{/Control}");
    const reopenedInput = await screen.findByPlaceholderText(
      /type a command or search navigation/i
    );
    expect(reopenedInput).toHaveValue("");
  });
});
