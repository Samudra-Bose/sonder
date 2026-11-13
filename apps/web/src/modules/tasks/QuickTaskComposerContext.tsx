import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useKeyboardShortcut } from "@/lib/keyboard.js";
import type { TaskPriority, TaskType } from "./types.js";

export interface QuickTaskComposerInitialValues {
  /** Optional prefilled due date (YYYY-MM-DD) */
  dueDate?: string;
  /** Optional prefilled priority */
  priority?: TaskPriority;
  /** Optional prefilled title */
  title?: string;
  /** Optional prefilled workspace ID */
  workspaceId?: string;
  /** Optional prefilled work-item archetype */
  itemType?: TaskType;
}

export interface QuickTaskComposerContextValue {
  /** Whether the Quick Task Composer dialog is currently open */
  isOpen: boolean;
  /** Current initial/prefilled values when opened */
  initialValues?: QuickTaskComposerInitialValues | null;
  /** Opens the composer, optionally capturing the triggering invoker element and prefilled values */
  open: (
    invoker?: HTMLElement | null,
    initialValues?: QuickTaskComposerInitialValues | null
  ) => void;
  /** Closes the composer and restores focus to the initiating element */
  close: () => void;
  /** Toggles the open state of the composer */
  toggle: (invoker?: HTMLElement | null) => void;
}

export const QuickTaskComposerContext = createContext<
  QuickTaskComposerContextValue | undefined
>(undefined);

export interface QuickTaskComposerProviderProps {
  children: React.ReactNode;
  /** Optional initial open state (useful for isolated component testing) */
  defaultOpen?: boolean;
  /** Optional flag to enable/disable the global 'C' keyboard shortcut */
  enableShortcut?: boolean;
}

/**
 * Checks whether another modal or dialog is actively open in the DOM.
 * Prevents triggering the single-character 'C' shortcut over active dialogs or overlays.
 */
function isAnotherModalActive(): boolean {
  if (typeof document === "undefined") return false;

  // Check for any visible dialog element that is not the composer itself
  const openDialogs = document.querySelectorAll(
    '[role="dialog"]:not([data-state="closed"]):not([aria-hidden="true"]), [data-testid="dialog-backdrop"], [data-testid="omnibar-modal"]'
  );

  return openDialogs.length > 0;
}

/**
 * Context provider managing state and global keyboard invocation for QuickTaskComposer.
 * Implements:
 * - Global single-character 'C' shortcut (suppressed inside inputs and active dialogs)
 * - Strict focus restoration to the triggering invoker element on close
 */
export function QuickTaskComposerProvider({
  children,
  defaultOpen = false,
  enableShortcut = true,
}: QuickTaskComposerProviderProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [initialValues, setInitialValues] = useState<QuickTaskComposerInitialValues | null>(null);
  const invokerRef = useRef<HTMLElement | null>(null);

  const open = useCallback(
    (
      invoker?: HTMLElement | null,
      values?: QuickTaskComposerInitialValues | null
    ) => {
      if (invoker) {
        invokerRef.current = invoker;
      } else if (
        typeof document !== "undefined" &&
        document.activeElement instanceof HTMLElement &&
        document.activeElement !== document.body
      ) {
        invokerRef.current = document.activeElement;
      }
      setInitialValues(values ?? null);
      setIsOpen(true);
    },
    []
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setInitialValues(null);
    // Restore focus to invoker asynchronously once dialog transition unmounts
    const targetEl = invokerRef.current;
    if (targetEl && typeof targetEl.focus === "function") {
      setTimeout(() => {
        if (document.body.contains(targetEl)) {
          targetEl.focus();
        }
      }, 0);
    }
    invokerRef.current = null;
  }, []);

  const toggle = useCallback(
    (invoker?: HTMLElement | null) => {
      if (isOpen) {
        close();
      } else {
        open(invoker);
      }
    },
    [isOpen, open, close]
  );

  // Global 'C' shortcut registration:
  // - Suppressed inside input, textarea, select, contenteditable (via allowInInput: false)
  // - Suppressed when composer is already open or another modal is active
  useKeyboardShortcut(
    {
      key: "c",
      preventDefault: true,
      enabled: !isOpen && enableShortcut,
    },
    () => {
      if (isAnotherModalActive()) {
        return;
      }
      open();
    }
  );

  const value = useMemo<QuickTaskComposerContextValue>(
    () => ({
      isOpen,
      initialValues,
      open,
      close,
      toggle,
    }),
    [isOpen, initialValues, open, close, toggle]
  );

  return (
    <QuickTaskComposerContext.Provider value={value}>
      {children}
    </QuickTaskComposerContext.Provider>
  );
}

/**
 * Hook to consume the QuickTaskComposer context.
 */
export function useQuickTaskComposer(): QuickTaskComposerContextValue {
  const context = useContext(QuickTaskComposerContext);
  if (!context) {
    throw new Error(
      "useQuickTaskComposer must be used within a QuickTaskComposerProvider"
    );
  }
  return context;
}
