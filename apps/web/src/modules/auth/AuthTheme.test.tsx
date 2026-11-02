import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setMockSessionActive, resetAuthMockState } from "../../mocks/handlers/auth.js";
import { App } from "@/App";
import { THEME_STORAGE_KEY } from "@/lib/theme";

function renderApp(initialEntries: string[] = ["/login"]) {
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

describe("Authentication Screens — Semantic Token & Theme Support", () => {
  let storageMock: Record<string, string> = {};

  beforeEach(() => {
    resetAuthMockState();
    setMockSessionActive(false);
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

  describe("Login Screen Theme & Semantic Tokens", () => {
    it("renders login form using semantic surface and text tokens in light mode", async () => {
      renderApp(["/login"]);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Sign in to your account" })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText("Email address");
      const passwordInput = screen.getByLabelText("Password");
      const submitBtn = screen.getByRole("button", { name: "Sign in" });

      expect(emailInput).toHaveClass("bg-[var(--surface-card)]");
      expect(emailInput).toHaveClass("text-[var(--text-primary)]");
      expect(emailInput).toHaveClass("border-[var(--border-control)]");

      expect(passwordInput).toHaveClass("bg-[var(--surface-card)]");
      expect(passwordInput).toHaveClass("text-[var(--text-primary)]");

      expect(submitBtn).toBeInTheDocument();
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("renders login form correctly under dark mode", async () => {
      storageMock[THEME_STORAGE_KEY] = "dark";
      renderApp(["/login"]);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Sign in to your account" })).toBeInTheDocument();
      });

      expect(document.documentElement.classList.contains("dark")).toBe(true);

      const emailInput = screen.getByLabelText("Email address");
      expect(emailInput).toHaveClass("bg-[var(--surface-card)]");
      expect(emailInput).toHaveClass("text-[var(--text-primary)]");
    });

    it("displays validation and error feedback in both themes using feedback tokens", async () => {
      const user = userEvent.setup();
      renderApp(["/login"]);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Sign in to your account" })).toBeInTheDocument();
      });

      const submitBtn = screen.getByRole("button", { name: "Sign in" });
      await user.click(submitBtn);

      const emailError = await screen.findByText("Email address is required.");
      const passwordError = screen.getByText("Password is required.");

      expect(emailError).toHaveClass("text-[var(--feedback-danger-text)]");
      expect(passwordError).toHaveClass("text-[var(--feedback-danger-text)]");

      // Verify input borders switch to danger feedback token
      const emailInput = screen.getByLabelText("Email address");
      expect(emailInput).toHaveClass("border-[var(--feedback-danger-text)]");

      // Verify dark theme retains identical semantic classes
      document.documentElement.classList.add("dark");
      expect(emailError).toHaveClass("text-[var(--feedback-danger-text)]");
    });
  });

  describe("Registration Screen Theme & Semantic Tokens", () => {
    it("renders registration form using semantic tokens in light and dark modes", async () => {
      renderApp(["/register"]);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
      });

      const displayNameInput = screen.getByLabelText("Display Name");
      const emailInput = screen.getByLabelText("Email address");
      const passwordInput = screen.getByLabelText("Password");
      const submitBtn = screen.getByRole("button", { name: "Create account" });

      expect(displayNameInput).toHaveClass("bg-[var(--surface-card)]");
      expect(displayNameInput).toHaveClass("text-[var(--text-primary)]");
      expect(emailInput).toHaveClass("bg-[var(--surface-card)]");
      expect(passwordInput).toHaveClass("bg-[var(--surface-card)]");
      expect(submitBtn).toBeInTheDocument();

      // Switch to dark theme
      document.documentElement.classList.add("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(displayNameInput).toHaveClass("text-[var(--text-primary)]");
    });

    it("renders registration success screen using semantic tokens in both themes", async () => {
      const user = userEvent.setup();
      renderApp(["/register"]);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText("Display Name"), "Jordan Lee");
      await user.type(screen.getByLabelText("Email address"), "jordan.lee@example.org");
      await user.type(screen.getByLabelText("Password"), "strongPassword123!");

      const submitBtn = screen.getByRole("button", { name: "Create account" });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Registration Request Received" })
        ).toBeInTheDocument();
      });

      const statusMsg = screen.getByRole("status");
      expect(statusMsg).toHaveClass("text-[var(--text-secondary)]");

      const backLink = screen.getByRole("link", { name: "Back to Sign in" });
      expect(backLink).toHaveClass("bg-[var(--brand-accent-btn-bg)]");
      expect(backLink).toHaveClass("text-[var(--brand-accent-btn-text)]");

      // Verify dark mode class addition retains semantic styling
      document.documentElement.classList.add("dark");
      expect(statusMsg).toHaveClass("text-[var(--text-secondary)]");
      expect(backLink).toHaveClass("bg-[var(--brand-accent-btn-bg)]");
    });
  });
});
