import { useEffect, useCallback } from "react";

export interface ShortcutOptions {
  /** Main key (e.g., 'k', 'Enter', 'Escape', '/') */
  key: string;
  /** Require Cmd on Mac, Ctrl on Windows/Linux */
  mod?: boolean;
  /** Require Shift key */
  shift?: boolean;
  /** Require Alt/Option key */
  alt?: boolean;
  /** Allow triggering while focusing input/textarea/select/contenteditable */
  allowInInput?: boolean;
  /** Inverse alias for allowInInput */
  ignoreInputs?: boolean;
  /** Automatically call e.preventDefault() */
  preventDefault?: boolean;
  /** Enable/disable shortcut listener */
  enabled?: boolean;
}

export type ShortcutDefinition = string | ShortcutOptions;

function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

export function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent || "");
}

export function parseShortcut(def: ShortcutDefinition): ShortcutOptions {
  if (typeof def !== "string") {
    return def;
  }

  const parts = def.toLowerCase().split("+").map((s) => s.trim());
  let mod = false;
  let shift = false;
  let alt = false;
  let key = "";

  for (const part of parts) {
    if (part === "mod" || part === "cmd" || part === "ctrl") {
      mod = true;
    } else if (part === "shift") {
      shift = true;
    } else if (part === "alt" || part === "option" || part === "opt") {
      alt = true;
    } else {
      key = part;
    }
  }

  return { key, mod, shift, alt };
}

/**
 * Hook to register global keyboard shortcuts with conflict protection.
 * Supports string format ('mod+k', 'shift+d') or object configuration.
 */
export function useKeyboardShortcut(
  shortcutOrHandler: ShortcutDefinition | ((e: KeyboardEvent) => void),
  handlerOrOptions: ((e: KeyboardEvent) => void) | ShortcutOptions,
  extraOptions?: Partial<ShortcutOptions>
): void {
  let resolvedOptions: ShortcutOptions;
  let resolvedHandler: (e: KeyboardEvent) => void;

  if (typeof shortcutOrHandler === "function") {
    resolvedHandler = shortcutOrHandler;
    resolvedOptions = handlerOrOptions as ShortcutOptions;
  } else {
    resolvedHandler = handlerOrOptions as (e: KeyboardEvent) => void;
    const parsed = parseShortcut(shortcutOrHandler);
    resolvedOptions = { ...parsed, ...extraOptions };
  }

  const allowInInput =
    resolvedOptions.allowInInput ??
    (resolvedOptions.ignoreInputs !== undefined
      ? !resolvedOptions.ignoreInputs
      : false);

  const {
    key,
    mod = false,
    shift = false,
    alt = false,
    preventDefault = true,
    enabled = true,
  } = resolvedOptions;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if currently typing in an input element unless explicitly permitted
      if (!allowInInput && isInputElement(e.target)) {
        return;
      }

      // Modifier checks
      if (mod) {
        const isModActive = isMac() ? e.metaKey : e.ctrlKey;
        if (!isModActive) return;
      }

      if (shift && !e.shiftKey) return;
      if (alt && !e.altKey) return;

      // Match key (case-insensitive for letters)
      const eKey = e.key ? e.key.toLowerCase() : "";
      const eCode = e.code ? e.code.toLowerCase() : "";
      const targetKey = key ? key.toLowerCase() : "";

      if (targetKey && (eKey === targetKey || eCode === targetKey)) {
        if (preventDefault) {
          e.preventDefault();
        }
        resolvedHandler(e);
      }
    },
    [resolvedHandler, key, mod, shift, alt, allowInInput, preventDefault, enabled]
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);
}

/**
 * Returns a human-readable display string for a shortcut.
 */
export function formatShortcut(
  shortcut: ShortcutDefinition
): string {
  const options = parseShortcut(shortcut);
  const mac = isMac();
  const parts: string[] = [];

  if (options.mod) parts.push(mac ? "⌘" : "Ctrl");
  if (options.alt) parts.push(mac ? "⌥" : "Alt");
  if (options.shift) parts.push(mac ? "⇧" : "Shift");

  if (options.key) {
    parts.push(options.key.toUpperCase());
  }

  return mac ? parts.join("") : parts.join("+");
}
