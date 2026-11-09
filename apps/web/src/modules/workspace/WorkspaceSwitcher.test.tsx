import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext";
import { WorkspaceProvider } from "./WorkspaceContext";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { MobileWorkspaceSelector } from "./MobileWorkspaceSelector";
import {
  resetWorkspaceMockState,
  setMockWorkspacesError,
  getMockActiveCommunityId,
} from "@/mocks/handlers/workspaces";
import { defaultMockCommunities } from "@/mocks/handlers/auth";

const testUser = {
  id: "018f98a2-3f12-7890-a123-456789abcdef",
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

function renderWorkspaceSwitcher({
  authOverrides,
  isCollapsed = false,
  initialWorkspaceId = null,
  initialCommunityId = "018f98a2-3f12-7890-b123-456789abcdef",
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  }),
}: {
  authOverrides?: Partial<AuthContextType>;
  isCollapsed?: boolean;
  initialWorkspaceId?: string | null;
  initialCommunityId?: string | null;
  queryClient?: QueryClient;
} = {}) {
  const authValue = createMockAuth(authOverrides);

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <WorkspaceProvider
            initialCommunityId={initialCommunityId}
            initialWorkspaceId={initialWorkspaceId}
          >
            <MemoryRouter>
              <WorkspaceSwitcher isCollapsed={isCollapsed} />
            </MemoryRouter>
          </WorkspaceProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    ),
  };
}

function renderMobileSelector({
  authOverrides,
  onWorkspaceSelected,
  initialCommunityId = "018f98a2-3f12-7890-b123-456789abcdef",
}: {
  authOverrides?: Partial<AuthContextType>;
  onWorkspaceSelected?: () => void;
  initialCommunityId?: string | null;
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
        <WorkspaceProvider initialCommunityId={initialCommunityId}>
          <MemoryRouter>
            <MobileWorkspaceSelector onWorkspaceSelected={onWorkspaceSelected} />
          </MemoryRouter>
        </WorkspaceProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("VS-02C: Workspace Switcher", () => {
  beforeEach(() => {
    resetWorkspaceMockState();
  });

  describe("Desktop Expanded Switcher", () => {
    it("renders unselected trigger initially without assuming first workspace is active", async () => {
      renderWorkspaceSwitcher();

      const trigger = screen.getByRole("button", { name: /select a workspace/i });
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(screen.getByText("Select Workspace")).toBeInTheDocument();
    });

    it("opens popover on click and renders community context and search input", async () => {
      const user = userEvent.setup();
      renderWorkspaceSwitcher();

      const trigger = screen.getByRole("button", { name: /select a workspace/i });
      await user.click(trigger);

      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByPlaceholderText("Filter workspaces...")).toBeInTheDocument();
      expect(screen.getByRole("listbox", { name: "Workspaces" })).toBeInTheDocument();
    });

    it("clearly demarcates Personal Workspace with privacy indicator from Shared Workspaces", async () => {
      const user = userEvent.setup();
      renderWorkspaceSwitcher();

      await user.click(screen.getByRole("button", { name: /select a workspace/i }));

      await waitFor(() => {
        expect(screen.getByRole("group", { name: "Personal Workspace" })).toBeInTheDocument();
        expect(screen.getByRole("group", { name: "Shared Workspaces" })).toBeInTheDocument();
      });

      const personalGroup = screen.getByRole("group", { name: "Personal Workspace" });
      expect(within(personalGroup).getByText("Alex Morgan's Workspace")).toBeInTheDocument();
      expect(within(personalGroup).getByText("ALEX")).toBeInTheDocument();
      expect(within(personalGroup).getByText("Personal")).toBeInTheDocument();

      const sharedGroup = screen.getByRole("group", { name: "Shared Workspaces" });
      expect(within(sharedGroup).getByText("Engineering Platform")).toBeInTheDocument();
      expect(within(sharedGroup).getByText("ENG")).toBeInTheDocument();
      expect(within(sharedGroup).getByText("Owner")).toBeInTheDocument();

      expect(within(sharedGroup).getByText("Spring Community Gala 2027")).toBeInTheDocument();
      expect(within(sharedGroup).getByText("GALA")).toBeInTheDocument();
      expect(within(sharedGroup).getByText("Coordinator")).toBeInTheDocument();

      expect(within(sharedGroup).getByText("Community Outreach")).toBeInTheDocument();
      expect(within(sharedGroup).getByText("OUT")).toBeInTheDocument();
      expect(within(sharedGroup).getByText("Member")).toBeInTheDocument();
    });

    it("selects a workspace, updates trigger identity, and closes popover", async () => {
      const user = userEvent.setup();
      renderWorkspaceSwitcher();

      // Open popover
      const trigger = screen.getByRole("button", { name: /select a workspace/i });
      await user.click(trigger);

      // Select "Engineering Platform"
      await waitFor(() => {
        expect(screen.getByText("Engineering Platform")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Engineering Platform"));

      // Popover should close and trigger reflects active workspace
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /workspace: engineering platform \(eng\)/i })).toBeInTheDocument();
      });
      expect(screen.getByText("ENG")).toBeInTheDocument();
      expect(screen.getByText("Engineering Platform")).toBeInTheDocument();
    });

    it("filters workspaces in real-time by title and prefix", async () => {
      const user = userEvent.setup();
      renderWorkspaceSwitcher();

      await user.click(screen.getByRole("button", { name: /select a workspace/i }));

      await waitFor(() => {
        expect(screen.getByText("Engineering Platform")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Filter workspaces...");

      // Filter by partial name
      await user.type(searchInput, "gala");
      expect(screen.getByText("Spring Community Gala 2027")).toBeInTheDocument();
      expect(screen.queryByText("Engineering Platform")).not.toBeInTheDocument();
      expect(screen.queryByText("Alex Morgan's Workspace")).not.toBeInTheDocument();

      // Filter by prefix
      await user.clear(searchInput);
      await user.type(searchInput, "ALEX");
      expect(screen.getByText("Alex Morgan's Workspace")).toBeInTheDocument();
      expect(screen.queryByText("Spring Community Gala 2027")).not.toBeInTheDocument();

      // Non-matching search displays empty state
      await user.clear(searchInput);
      await user.type(searchInput, "nonexistent");
      expect(screen.getByText(/no workspaces match “nonexistent”/i)).toBeInTheDocument();
    });
  });

  describe("Desktop Collapsed Rail Switcher", () => {
    it("renders compact trigger with accessible tooltip in collapsed state", async () => {
      renderWorkspaceSwitcher({ isCollapsed: true });

      const trigger = screen.getByRole("button", { name: /select a workspace/i });
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveClass("h-9", "w-9");
    });

    it("displays prefix abbreviation in collapsed rail when a workspace is active", async () => {
      renderWorkspaceSwitcher({
        isCollapsed: true,
        initialWorkspaceId: "018f98a2-3f12-7890-w002-456789abcdef",
      });

      await waitFor(() => {
        const trigger = screen.getByRole("button", { name: /workspace: engineering platform \(eng\)/i });
        expect(trigger).toBeInTheDocument();
        expect(within(trigger).getByText("ENG")).toBeInTheDocument();
      });
    });
  });

  describe("Multi-Community Switching & Cache Isolation", () => {
    it("provides community switcher when user belongs to multiple communities", async () => {
      const user = userEvent.setup();
      renderWorkspaceSwitcher();

      await user.click(screen.getByRole("button", { name: /select a workspace/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /switch/i })).toBeInTheDocument();
      });

      // Click "Switch" to show communities
      await user.click(screen.getByRole("button", { name: /switch/i }));
      expect(screen.getAllByText("Sonder Community").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Regional Arts Guild")).toBeInTheDocument();
    });

    it("switches community via contract PUT /me/active-community and loads new workspaces", async () => {
      const user = userEvent.setup();
      renderWorkspaceSwitcher();

      await user.click(screen.getByRole("button", { name: /select a workspace/i }));

      // Switch to "Regional Arts Guild"
      await user.click(screen.getByRole("button", { name: /switch/i }));
      await user.click(screen.getByRole("button", { name: /regional arts guild/i }));

      // MSW handler updates active community
      await waitFor(() => {
        expect(getMockActiveCommunityId()).toBe("018f98a2-3f12-7890-b999-456789abcdef");
      });

      // Workspaces from Community 2 should load and Community 1 workspaces must not leak
      await waitFor(() => {
        expect(screen.getByText("Alex Morgan's Studio")).toBeInTheDocument();
        expect(screen.getByText("Exhibition 2026")).toBeInTheDocument();
      });
      expect(screen.queryByText("Engineering Platform")).not.toBeInTheDocument();
    });

    it("evicts previous community queries from cache when switching communities", async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      const initialCommId = "018f98a2-3f12-7890-b123-456789abcdef";
      // Seed query data for previous community
      queryClient.setQueryData(["communities", initialCommId, "workspaces"], { dummy: true });
      expect(queryClient.getQueryData(["communities", initialCommId, "workspaces"])).toBeDefined();

      const user = userEvent.setup();
      renderWorkspaceSwitcher({ queryClient, initialCommunityId: initialCommId });

      await user.click(screen.getByRole("button", { name: /select a workspace/i }));
      await user.click(screen.getByRole("button", { name: /switch/i }));
      await user.click(screen.getByRole("button", { name: /regional arts guild/i }));

      await waitFor(() => {
        expect(getMockActiveCommunityId()).toBe("018f98a2-3f12-7890-b999-456789abcdef");
      });

      // The previous community's query cache must have been removed
      await waitFor(() => {
        expect(queryClient.getQueryData(["communities", initialCommId, "workspaces"])).toBeUndefined();
      });
    });
  });

  describe("Error Recovery & Loading States", () => {
    it("displays error alert and retry button when workspace fetch fails", async () => {
      setMockWorkspacesError({
        status: 500,
        problem: {
          type: "https://errors.sonder.platform/server-error",
          title: "Internal Error",
          status: 500,
          detail: "Database query timed out.",
        },
      });

      const user = userEvent.setup();
      renderWorkspaceSwitcher();

      await user.click(screen.getByRole("button", { name: /select a workspace/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to load workspaces/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
      });

      // Clear error and retry
      setMockWorkspacesError(null);
      await user.click(screen.getByRole("button", { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByText("Engineering Platform")).toBeInTheDocument();
      });
    });
  });

  describe("Mobile Drawer Integration", () => {
    it("renders comfortable touch targets (>=44x44px) and dismisses on selection", async () => {
      const onSelect = vi.fn();
      const user = userEvent.setup();
      renderMobileSelector({ onWorkspaceSelected: onSelect });

      // Click mobile trigger
      const mobileTrigger = screen.getByRole("button", { name: /select a workspace/i });
      expect(mobileTrigger).toHaveClass("min-h-[44px]");
      await user.click(mobileTrigger);

      // Verify workspaces are rendered with touch target styling
      await waitFor(() => {
        expect(screen.getByText("Engineering Platform")).toBeInTheDocument();
      });

      const itemButton = screen.getByRole("option", { name: /engineering platform/i });
      expect(itemButton).toHaveClass("min-h-[44px]");

      // Select item and assert callback called
      await user.click(itemButton);
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe("Defensive Authentication Loading & Hydration State", () => {
    it("renders WorkspaceSwitcher safely without error when communities are initially undefined", () => {
      expect(() => {
        renderWorkspaceSwitcher({
          authOverrides: {
            communities: undefined as any,
            status: "loading",
          },
          initialCommunityId: null,
        });
      }).not.toThrow();

      expect(screen.getByRole("button", { name: /select a workspace/i })).toBeInTheDocument();
      expect(screen.getByText("No community selected")).toBeInTheDocument();
    });

    it("renders MobileWorkspaceSelector safely without error when communities are initially undefined", () => {
      expect(() => {
        renderMobileSelector({
          authOverrides: {
            communities: undefined as any,
            status: "loading",
          },
          initialCommunityId: null,
        });
      }).not.toThrow();

      expect(screen.getByRole("button", { name: /select a workspace/i })).toBeInTheDocument();
      expect(screen.getByText("No community selected")).toBeInTheDocument();
    });
  });
});
