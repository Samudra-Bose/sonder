import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useWorkspace } from "@/modules/workspace/index.js";

// Global cache preserving task-to-workspace mapping established during in-session interactions (e.g. My Work clicks)
const taskWorkspaceMap = new Map<string, string>();

export function setCachedTaskWorkspace(taskKey: string, workspaceId: string): void {
  taskWorkspaceMap.set(taskKey.trim().toUpperCase(), workspaceId);
}

export function getCachedTaskWorkspace(taskKey: string): string | undefined {
  return taskWorkspaceMap.get(taskKey.trim().toUpperCase());
}

export interface OpenTaskOptions {
  /** If true, replaces current history entry instead of pushing a new one */
  replace?: boolean;
  /** Explicit destination workspace ID (e.g. from My Work cross-workspace task metadata) */
  workspaceId?: string;
}

export interface CloseTaskOptions {
  /** If true, replaces current history entry instead of pushing a new one */
  replace?: boolean;
}

export interface UseTaskPeekDrawerResult {
  /** Whether the Task Peek Drawer is open */
  isOpen: boolean;
  /** The current task key from the URL query parameter (null if closed) */
  taskKey: string | null;
  /** Resolved workspace ID for the active task key (if known from context or registry) */
  resolvedWorkspaceId: string | null;
  /** Opens a task by key and updates the '?task=KEY-123' query parameter */
  openTask: (key: string, options?: OpenTaskOptions) => void;
  /** Closes the drawer and cleanses only the 'task' query parameter from the URL */
  closeTask: (options?: CloseTaskOptions) => void;
}

/**
 * Hook to manage the deep-linked Task Peek Drawer.
 * Synchronizes with the '?task=KEY-123' URL query parameter.
 * Preserves unrelated query parameters on open and close.
 */
export function useTaskPeekDrawer(): UseTaskPeekDrawerResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const { workspaces, activeWorkspaceId } = useWorkspace();

  const rawKey = searchParams.get("task");
  const taskKey = rawKey && rawKey.trim().length > 0 ? rawKey.trim() : null;
  const isOpen = Boolean(taskKey);

  // Derive workspace ID for taskKey
  let resolvedWorkspaceId: string | null = null;
  if (taskKey) {
    const normalizedKey = taskKey.toUpperCase();

    // 1. Check in-session cache (e.g., clicked from My Work)
    const cachedWsId = taskWorkspaceMap.get(normalizedKey);
    if (cachedWsId) {
      resolvedWorkspaceId = cachedWsId;
    } else {
      // 2. Derive workspace from community-unique prefix registry (DEC-OPEN-02)
      const prefix = normalizedKey.split("-")[0] ?? "";
      const matchingWorkspace = workspaces.find(
        (w) => w.keyPrefix.toUpperCase() === prefix
      );

      if (matchingWorkspace) {
        resolvedWorkspaceId = matchingWorkspace.id;
      } else {
        // 3. Fallback: Check if prefix matches with start of key for historical aliases
        const aliasMatch = workspaces.find((w) =>
          normalizedKey.startsWith(w.keyPrefix.toUpperCase())
        );
        if (aliasMatch) {
          resolvedWorkspaceId = aliasMatch.id;
        } else {
          // 4. Default to active selected workspace
          resolvedWorkspaceId = activeWorkspaceId ?? null;
        }
      }
    }
  }

  const openTask = useCallback(
    (key: string, options: OpenTaskOptions = {}) => {
      const trimmedKey = key.trim();
      if (!trimmedKey) return;

      if (options.workspaceId) {
        setCachedTaskWorkspace(trimmedKey, options.workspaceId);
      }

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("task", trimmedKey);
          return next;
        },
        { replace: options.replace ?? false }
      );
    },
    [setSearchParams]
  );

  const closeTask = useCallback(
    (options: CloseTaskOptions = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("task");
          return next;
        },
        { replace: options.replace ?? false }
      );
    },
    [setSearchParams]
  );

  return {
    isOpen,
    taskKey,
    resolvedWorkspaceId,
    openTask,
    closeTask,
  };
}
