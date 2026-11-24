import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";

export type TaskViewDensity = "standard" | "compact";

export const TASK_VIEW_DENSITY_STORAGE_KEY = "sonder:task-list-density";

export interface TaskViewDensityContextValue {
  /** Effective density applied to rendering. If device is not compact-eligible, always "standard". */
  density: TaskViewDensity;
  /** Stored preference preserved even when coarse/hybrid device forces standard. */
  storedPreference: TaskViewDensity;
  /** True strictly when device has pure fine pointer and no coarse pointer capability. */
  isCompactEligible: boolean;
  /** Update density preference and persist to localStorage. */
  setDensity: (nextDensity: TaskViewDensity) => void;
}

/**
 * Checks whether the current device is eligible for Compact density.
 * Strictly adheres to DEC-M3.3-04:
 * - Pure fine pointer (@media (pointer: fine) and not (any-pointer: coarse)) is eligible.
 * - Coarse devices (tablets, phones) and hybrid devices (touchscreen laptops) are strictly NOT eligible.
 */
export function checkCompactEligibility(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    // In SSR or non-DOM/test environments where matchMedia is undefined, default to false (fail-closed pointer safety)
    return false;
  }
  try {
    const hasFine = window.matchMedia("(pointer: fine)").matches;
    const hasCoarse = window.matchMedia("(any-pointer: coarse)").matches;
    return hasFine && !hasCoarse;
  } catch {
    return false;
  }
}

/**
 * Reads stored density preference from localStorage.
 * Falls back to "standard" if missing, invalid, or during sandbox/private mode exceptions.
 */
export function getStoredDensityPreference(): TaskViewDensity {
  if (typeof window === "undefined" || !window.localStorage) {
    return "standard";
  }
  try {
    const stored = window.localStorage.getItem(TASK_VIEW_DENSITY_STORAGE_KEY);
    if (stored === "standard" || stored === "compact") {
      return stored;
    }
  } catch {
    // Storage access may be restricted
  }
  return "standard";
}

export const TaskViewDensityContext = createContext<
  TaskViewDensityContextValue | undefined
>(undefined);

export interface TaskViewDensityProviderProps {
  children: React.ReactNode;
  defaultPreference?: TaskViewDensity;
}

export function TaskViewDensityProvider({
  children,
  defaultPreference,
}: TaskViewDensityProviderProps): React.JSX.Element {
  const [storedPreference, setStoredPreferenceState] = useState<TaskViewDensity>(
    () => defaultPreference ?? getStoredDensityPreference()
  );
  const [isCompactEligible, setIsCompactEligible] = useState<boolean>(
    checkCompactEligibility
  );

  // Dynamic media-query detection for fine vs. coarse/hybrid pointer capabilities
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    try {
      const fineQuery = window.matchMedia("(pointer: fine)");
      const anyCoarseQuery = window.matchMedia("(any-pointer: coarse)");

      const updateEligibility = () => {
        setIsCompactEligible(fineQuery.matches && !anyCoarseQuery.matches);
      };

      // Set initial value
      updateEligibility();

      if (fineQuery.addEventListener) {
        fineQuery.addEventListener("change", updateEligibility);
        anyCoarseQuery.addEventListener("change", updateEligibility);
        return () => {
          fineQuery.removeEventListener("change", updateEligibility);
          anyCoarseQuery.removeEventListener("change", updateEligibility);
        };
      } else if ("addListener" in fineQuery) {
        // Safari fallback
        (fineQuery as { addListener: (cb: () => void) => void }).addListener(updateEligibility);
        (anyCoarseQuery as { addListener: (cb: () => void) => void }).addListener(updateEligibility);
        return () => {
          (fineQuery as { removeListener: (cb: () => void) => void }).removeListener(updateEligibility);
          (anyCoarseQuery as { removeListener: (cb: () => void) => void }).removeListener(updateEligibility);
        };
      }
    } catch {
      // Ignore media query evaluation failures
    }
  }, []);

  // Multi-tab storage synchronization
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === TASK_VIEW_DENSITY_STORAGE_KEY &&
        (e.newValue === "standard" || e.newValue === "compact")
      ) {
        setStoredPreferenceState(e.newValue);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setDensity = useCallback((nextDensity: TaskViewDensity): void => {
    setStoredPreferenceState(nextDensity);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(TASK_VIEW_DENSITY_STORAGE_KEY, nextDensity);
      }
    } catch {
      // Storage write error handled gracefully
    }
  }, []);

  // DEC-M3.3-04: If the device is not compact eligible, effective density is strictly forced to "standard"
  const density: TaskViewDensity = isCompactEligible ? storedPreference : "standard";

  const value = useMemo<TaskViewDensityContextValue>(
    () => ({
      density,
      storedPreference,
      isCompactEligible,
      setDensity,
    }),
    [density, storedPreference, isCompactEligible, setDensity]
  );

  return (
    <TaskViewDensityContext.Provider value={value}>
      {children}
    </TaskViewDensityContext.Provider>
  );
}

/**
 * Universal hook to access and manage task view density.
 * If used outside TaskViewDensityProvider (e.g. isolated unit tests),
 * it returns a safe fallback matching stored preference or "standard".
 */
export function useTaskViewDensity(): TaskViewDensityContextValue {
  const context = useContext(TaskViewDensityContext);
  if (context) {
    return context;
  }

  // Graceful standalone fallback
  const stored = getStoredDensityPreference();
  const isEligible = checkCompactEligibility();
  return {
    density: isEligible ? stored : "standard",
    storedPreference: stored,
    isCompactEligible: isEligible,
    setDensity: (next: TaskViewDensity) => {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(TASK_VIEW_DENSITY_STORAGE_KEY, next);
        }
      } catch {
        // Fallback no-op
      }
    },
  };
}
