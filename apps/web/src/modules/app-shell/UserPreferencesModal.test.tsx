import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/lib/theme";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { WorkspaceProvider } from "@/modules/workspace";
import { UserPreferencesModal } from "./UserPreferencesModal";
import {
  TaskViewDensityProvider,
  TASK_VIEW_DENSITY_STORAGE_KEY,
} from "@/modules/tasks/density/useTaskViewDensity";

const mockAuthValue: AuthContextType = {
  user: {
    id: "user-1",
    displayName: "Jane Doe",
    email: "jane@example.com",
    avatarUrl: null,
  },
  communities: [],
  csrfToken: "mock-csrf-token",
  status: "authenticated",
  error: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
  clearError: vi.fn(),
};

describe("UserPreferencesModal Density Controls (Batch 1)", () => {
  const originalMatchMedia = window.matchMedia;
  let storageMock: Record<string, string> = {};

  const mockUser = {
    id: "user-1",
    displayName: "Jane Doe",
    email: "jane@example.com",
    avatarUrl: null,
  };

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
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  function setupMatchMedia(matches: { [query: string]: boolean }) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: Boolean(matches[query]),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }

  function renderModal() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuthValue}>
          <ThemeProvider>
            <WorkspaceProvider>
              <TaskViewDensityProvider>
                <UserPreferencesModal isOpen={true} onClose={vi.fn()} user={mockUser} />
              </TaskViewDensityProvider>
            </WorkspaceProvider>
          </ThemeProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  }

  it("renders density controls with Standard active by default", () => {
    setupMatchMedia({
      "(pointer: fine)": true,
      "(any-pointer: coarse)": false,
    });

    renderModal();

    expect(screen.getByTestId("pref-density-status")).toHaveTextContent("Standard (44px) Active");
    expect(screen.getByTestId("pref-density-standard")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("pref-density-compact")).toHaveAttribute("aria-pressed", "false");
  });

  it("allows switching to Compact on fine-pointer devices and persists to localStorage", async () => {
    const user = userEvent.setup();
    setupMatchMedia({
      "(pointer: fine)": true,
      "(any-pointer: coarse)": false,
    });

    renderModal();

    const compactBtn = screen.getByTestId("pref-density-compact");
    expect(compactBtn).not.toBeDisabled();

    await user.click(compactBtn);

    expect(screen.getByTestId("pref-density-status")).toHaveTextContent("Compact (38px) Active");
    expect(screen.getByTestId("pref-density-compact")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("pref-density-standard")).toHaveAttribute("aria-pressed", "false");
    expect(window.localStorage.getItem(TASK_VIEW_DENSITY_STORAGE_KEY)).toBe("compact");
  });

  it("disables Compact and displays touch explanation notice on coarse/hybrid devices", () => {
    setupMatchMedia({
      "(pointer: fine)": false,
      "(any-pointer: coarse)": true,
    });

    renderModal();

    const compactBtn = screen.getByTestId("pref-density-compact");
    expect(compactBtn).toBeDisabled();
    expect(screen.getByTestId("pref-density-touch-notice")).toBeInTheDocument();
    expect(screen.getByTestId("pref-density-status")).toHaveTextContent("Standard (44px) Active");
  });
});
