import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useKeyboardShortcut } from "@/lib/keyboard";
import type { OmnibarContextValue } from "./types";

export const OmnibarContext = createContext<OmnibarContextValue | undefined>(
  undefined
);

export interface OmnibarProviderProps {
  children: React.ReactNode;
}

export function OmnibarProvider({ children }: OmnibarProviderProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const invokerRef = useRef<HTMLElement | null>(null);

  const open = useCallback((invoker?: HTMLElement | null) => {
    if (invoker) {
      invokerRef.current = invoker;
    } else if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      invokerRef.current = document.activeElement;
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
  }, []);

  const toggle = useCallback((invoker?: HTMLElement | null) => {
    setIsOpen((prev) => {
      if (prev) {
        setSearchQuery("");
        return false;
      }
      if (invoker) {
        invokerRef.current = invoker;
      } else if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
        invokerRef.current = document.activeElement;
      }
      return true;
    });
  }, []);

  // Global platform-aware keyboard shortcut: Cmd+K (Mac) / Ctrl+K (Win/Linux)
  useKeyboardShortcut(
    {
      key: "k",
      mod: true,
      preventDefault: true,
      allowInInput: true, // Allow pressing Cmd+K inside search or text inputs to toggle
    },
    () => {
      toggle();
    }
  );

  const value = useMemo<OmnibarContextValue>(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      searchQuery,
      setSearchQuery,
    }),
    [isOpen, open, close, toggle, searchQuery]
  );

  return (
    <OmnibarContext.Provider value={value}>
      {children}
    </OmnibarContext.Provider>
  );
}

export function useOmnibar(): OmnibarContextValue {
  const context = useContext(OmnibarContext);
  if (!context) {
    throw new Error("useOmnibar must be used within an OmnibarProvider");
  }
  return context;
}
