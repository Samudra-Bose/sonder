import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ThemeProvider, useTheme, THEME_STORAGE_KEY } from "./theme";

function ThemeConsumer() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <button onClick={() => setTheme("dark")}>Set Dark</button>
      <button onClick={() => setTheme("light")}>Set Light</button>
      <button onClick={() => setTheme("system")}>Set System</button>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}

describe("ThemeProvider and useTheme", () => {
  let matchMediaMock: ReturnType<typeof vi.fn>;
  let changeListeners: Array<(e: { matches: boolean }) => void> = [];
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
    changeListeners = [];

    matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_event: string, cb: (e: { matches: boolean }) => void) => {
        changeListeners.push(cb);
      }),
      removeEventListener: vi.fn((_event: string, cb: (e: { matches: boolean }) => void) => {
        changeListeners = changeListeners.filter((l) => l !== cb);
      }),
      dispatchEvent: vi.fn(),
    }));

    window.matchMedia = matchMediaMock;
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("defaults to system theme and resolves to light when matchMedia is false", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme").textContent).toBe("system");
    expect(screen.getByTestId("resolved-theme").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("applies dark class and stores preference when setting theme to dark", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await user.click(screen.getByText("Set Dark"));

    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("toggles between dark and light themes", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultTheme="light">
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("resolved-theme").textContent).toBe("light");

    await user.click(screen.getByText("Toggle Theme"));
    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await user.click(screen.getByText("Toggle Theme"));
    expect(screen.getByTestId("resolved-theme").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("updates resolved theme when system preference changes under system mode", () => {
    render(
      <ThemeProvider defaultTheme="system">
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("resolved-theme").textContent).toBe("light");

    act(() => {
      for (const listener of changeListeners) {
        listener({ matches: true });
      }
    });

    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("throws error when useTheme is used outside of ThemeProvider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ThemeConsumer />)).toThrow("useTheme must be used within a ThemeProvider");
    consoleError.mockRestore();
  });
});
