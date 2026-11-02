import { useEffect, useRef, useId } from "react";

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
  /** Priority level for conflict resolution (higher wins; default: 0) */
  priority?: number;
  /** Enable/disable shortcut listener */
  enabled?: boolean;
}

export type ShortcutDefinition = string | ShortcutOptions;

export interface RegisteredShortcutEntry {
  id: string;
  key: string;
  mod: boolean;
  shift: boolean;
  alt: boolean;
  allowInInput: boolean;
  preventDefault: boolean;
  priority: number;
  createdAt: number;
  enabled: boolean;
  handler: (e: KeyboardEvent) => void;
}

// Module-level registry for deterministic conflict handling and single event listener
const registry = new Map<string, RegisteredShortcutEntry>();
let isGlobalListenerAttached = false;
let registrationCounter = 0;

export function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  const contentEditable = target.getAttribute("contenteditable");
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable ||
    contentEditable === "true" ||
    contentEditable === "" ||
    contentEditable === "plaintext-only"
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

function handleGlobalKeyDown(e: KeyboardEvent): void {
  const eKey = e.key ? e.key.toLowerCase() : "";
  const eCode = e.code ? e.code.toLowerCase() : "";
  const mac = isMac();

  // Active modifier state from event
  const isModPressed = mac ? e.metaKey : e.ctrlKey;
  const isShiftPressed = e.shiftKey;
  const isAltPressed = e.altKey;
  // Unrelated OS modifier (e.g. Ctrl on Mac, or Meta/Windows key on Windows/Linux)
  const isUnrelatedModPressed = mac ? e.ctrlKey : e.metaKey;

  const inInput = isInputElement(e.target);

  // Find all matching active shortcuts
  const candidates: RegisteredShortcutEntry[] = [];

  for (const entry of registry.values()) {
    if (!entry.enabled) continue;

    // Suppress inside inputs unless explicitly allowed
    if (inInput && !entry.allowInInput) continue;

    // Strict modifier matching: must match requested modifiers exactly
    if (entry.mod !== isModPressed) continue;
    if (entry.shift !== isShiftPressed) continue;
    if (entry.alt !== isAltPressed) continue;

    // Unrelated modifiers must NOT activate the shortcut unless requested
    if (isUnrelatedModPressed) continue;

    // Key match (case-insensitive)
    const targetKey = entry.key.toLowerCase();
    if (eKey === targetKey || eCode === targetKey) {
      candidates.push(entry);
    }
  }

  if (candidates.length === 0) return;

  // Conflict Resolution Policy:
  // 1. Higher priority wins
  // 2. If priorities are equal, most recently registered (LIFO) wins
  candidates.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return b.createdAt - a.createdAt;
  });

  const winner = candidates[0];
  if (!winner) return;

  if (winner.preventDefault) {
    e.preventDefault();
  }
  winner.handler(e);
}

function ensureGlobalListener(): void {
  if (typeof window === "undefined" || isGlobalListenerAttached) return;
  window.addEventListener("keydown", handleGlobalKeyDown);
  isGlobalListenerAttached = true;
}

function checkGlobalListener(): void {
  if (typeof window === "undefined" || !isGlobalListenerAttached) return;
  if (registry.size === 0) {
    window.removeEventListener("keydown", handleGlobalKeyDown);
    isGlobalListenerAttached = false;
  }
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
  const generatedId = useId();
  const idRef = useRef(generatedId);

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
    priority = 0,
    enabled = true,
  } = resolvedOptions;

  // Keep latest handler in a ref to avoid re-subscribing unnecessarily
  const handlerRef = useRef(resolvedHandler);
  handlerRef.current = resolvedHandler;

  useEffect(() => {
    const id = `${idRef.current}-${++registrationCounter}`;

    registry.set(id, {
      id,
      key,
      mod,
      shift,
      alt,
      allowInInput,
      preventDefault,
      priority,
      createdAt: Date.now() + registrationCounter,
      enabled,
      handler: (e) => handlerRef.current(e),
    });

    ensureGlobalListener();

    return () => {
      registry.delete(id);
      checkGlobalListener();
    };
  }, [key, mod, shift, alt, allowInInput, preventDefault, priority, enabled]);
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

/**
 * Testing helper: clears all registered shortcuts and resets listeners.
 */
export function clearShortcutRegistry(): void {
  registry.clear();
  checkGlobalListener();
}

/**
 * Testing helper: returns the count of currently registered shortcuts.
 */
export function getRegisteredShortcutsCount(): number {
  return registry.size;
}
