import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  TaskViewDensityProvider,
  useTaskViewDensity,
  checkCompactEligibility,
  getStoredDensityPreference,
  TASK_VIEW_DENSITY_STORAGE_KEY,
} from "./useTaskViewDensity";

describe("useTaskViewDensity & Pointer Capability Detection", () => {
  const originalMatchMedia = window.matchMedia;
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

  describe("checkCompactEligibility (DEC-M3.3-04)", () => {
    it("returns true on pure fine-pointer devices (desktop mouse/trackpad)", () => {
      setupMatchMedia({
        "(pointer: fine)": true,
        "(any-pointer: coarse)": false,
      });

      expect(checkCompactEligibility()).toBe(true);
    });

    it("returns false on coarse devices (tablets, smartphones)", () => {
      setupMatchMedia({
        "(pointer: fine)": false,
        "(any-pointer: coarse)": true,
      });

      expect(checkCompactEligibility()).toBe(false);
    });

    it("returns false on hybrid devices (touchscreen laptops with fine pointer but any coarse pointer)", () => {
      setupMatchMedia({
        "(pointer: fine)": true,
        "(any-pointer: coarse)": true,
      });

      // DEC-M3.3-04 invariant: hybrid devices strictly reject Compact to avoid touch collision
      expect(checkCompactEligibility()).toBe(false);
    });

    it("defaults to true in non-DOM/test environments where matchMedia is not present", () => {
      // @ts-expect-error - simulating missing matchMedia
      delete window.matchMedia;
      expect(checkCompactEligibility()).toBe(true);
    });
  });

  describe("getStoredDensityPreference", () => {
    it("returns 'standard' when localStorage is empty", () => {
      expect(getStoredDensityPreference()).toBe("standard");
    });

    it("returns 'compact' when stored preference is 'compact'", () => {
      window.localStorage.setItem(TASK_VIEW_DENSITY_STORAGE_KEY, "compact");
      expect(getStoredDensityPreference()).toBe("compact");
    });

    it("falls back to 'standard' on unknown values", () => {
      window.localStorage.setItem(TASK_VIEW_DENSITY_STORAGE_KEY, "ultra-dense");
      expect(getStoredDensityPreference()).toBe("standard");
    });

    it("handles failing localStorage safely without throwing", () => {
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: vi.fn(() => {
            throw new Error("SecurityError: Access is denied");
          }),
        },
        writable: true,
        configurable: true,
      });
      expect(getStoredDensityPreference()).toBe("standard");
    });
  });

  describe("TaskViewDensityProvider & useTaskViewDensity", () => {
    function TestConsumer() {
      const { density, storedPreference, isCompactEligible, setDensity } =
        useTaskViewDensity();
      return (
        <div>
          <span data-testid="effective-density">{density}</span>
          <span data-testid="stored-preference">{storedPreference}</span>
          <span data-testid="compact-eligible">
            {isCompactEligible ? "yes" : "no"}
          </span>
          <button
            type="button"
            data-testid="set-compact-btn"
            onClick={() => setDensity("compact")}
          >
            Compact
          </button>
          <button
            type="button"
            data-testid="set-standard-btn"
            onClick={() => setDensity("standard")}
          >
            Standard
          </button>
        </div>
      );
    }

    it("allows Compact density on eligible fine-pointer devices", async () => {
      setupMatchMedia({
        "(pointer: fine)": true,
        "(any-pointer: coarse)": false,
      });

      render(
        <TaskViewDensityProvider>
          <TestConsumer />
        </TaskViewDensityProvider>
      );

      expect(screen.getByTestId("effective-density").textContent).toBe("standard");
      expect(screen.getByTestId("stored-preference").textContent).toBe("standard");
      expect(screen.getByTestId("compact-eligible").textContent).toBe("yes");

      await userEvent.click(screen.getByTestId("set-compact-btn"));

      expect(screen.getByTestId("effective-density").textContent).toBe("compact");
      expect(screen.getByTestId("stored-preference").textContent).toBe("compact");
      expect(window.localStorage.getItem(TASK_VIEW_DENSITY_STORAGE_KEY)).toBe("compact");
    });

    it("forces effective density to 'standard' on coarse/hybrid devices while preserving stored preference", async () => {
      // Set stored preference to compact beforehand
      window.localStorage.setItem(TASK_VIEW_DENSITY_STORAGE_KEY, "compact");

      // Hybrid device with touchscreen active
      setupMatchMedia({
        "(pointer: fine)": true,
        "(any-pointer: coarse)": true,
      });

      render(
        <TaskViewDensityProvider>
          <TestConsumer />
        </TaskViewDensityProvider>
      );

      // Stored preference is preserved as "compact"
      expect(screen.getByTestId("stored-preference").textContent).toBe("compact");
      // But effective density is strictly forced to "standard"
      expect(screen.getByTestId("effective-density").textContent).toBe("standard");
      expect(screen.getByTestId("compact-eligible").textContent).toBe("no");
    });

    it("synchronizes stored preference across tabs via storage event", () => {
      setupMatchMedia({
        "(pointer: fine)": true,
        "(any-pointer: coarse)": false,
      });

      render(
        <TaskViewDensityProvider>
          <TestConsumer />
        </TaskViewDensityProvider>
      );

      expect(screen.getByTestId("effective-density").textContent).toBe("standard");

      // Dispatch cross-tab storage event
      act(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: TASK_VIEW_DENSITY_STORAGE_KEY,
            newValue: "compact",
          })
        );
      });

      expect(screen.getByTestId("effective-density").textContent).toBe("compact");
      expect(screen.getByTestId("stored-preference").textContent).toBe("compact");
    });

    it("falls back gracefully when hook is used outside Provider", () => {
      const { result } = renderHook(() => useTaskViewDensity());
      expect(result.current.density).toBe("standard");
      expect(result.current.storedPreference).toBe("standard");
      expect(typeof result.current.setDensity).toBe("function");
    });
  });
});
