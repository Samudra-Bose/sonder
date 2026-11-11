import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { useKeyboardShortcut } from "@/lib/keyboard.js";
import { WorkspaceContext } from "@/modules/workspace/WorkspaceContext.js";
import { AuthContext } from "@/modules/auth/AuthContext.js";
import {
  useArchiveTask,
  useRestoreTask,
  type QueryMembershipAnchor,
} from "./useArchiveTask.js";
import type { TaskDto, ArchiveTaskResultDto } from "./types.js";

export interface UndoItemState {
  taskId: string;
  taskKey: string;
  communityId: string;
  workspaceId: string;
  undoToken: string;
  undoExpiresAt: string;
  status: "idle" | "restoring" | "restored" | "expired" | "error";
  taskSnapshot: TaskDto;
  queryMemberships: Map<string, QueryMembershipAnchor>;
  remainingMs: number;
  errorMessage?: string;
}

export interface TaskUndoContextValue {
  activeUndos: UndoItemState[];
  archiveTask: (
    task: TaskDto,
    options?: { reason?: string; communityId?: string; workspaceId?: string }
  ) => Promise<ArchiveTaskResultDto | void>;
  undoTask: (taskId: string) => Promise<TaskDto | void>;
  dismissUndo: (taskId: string) => void;
}

export const defaultTaskUndoContextValue: TaskUndoContextValue = {
  activeUndos: [],
  archiveTask: async () => {},
  undoTask: async () => {},
  dismissUndo: () => {},
};

export const TaskUndoContext = createContext<TaskUndoContextValue>(
  defaultTaskUndoContextValue
);

export interface TaskUndoProviderProps {
  children: React.ReactNode;
  communityId?: string | null;
  workspaceId?: string | null;
}

export function TaskUndoProvider({
  children,
  communityId: propCommunityId,
  workspaceId: propWorkspaceId,
}: TaskUndoProviderProps): React.JSX.Element {
  const workspaceContext = useContext(WorkspaceContext);
  const authContext = useContext(AuthContext);

  const effCommunityId =
    propCommunityId ?? workspaceContext?.currentCommunityId ?? null;
  const effWorkspaceId =
    propWorkspaceId ?? workspaceContext?.activeWorkspaceId ?? null;
  const csrfToken = authContext?.csrfToken ?? undefined;

  const [activeUndos, setActiveUndos] = useState<UndoItemState[]>([]);

  // Mutation hooks
  const archiveMutation = useArchiveTask({
    communityId: effCommunityId,
    workspaceId: effWorkspaceId,
    csrfToken,
  });

  const restoreMutation = useRestoreTask({
    communityId: effCommunityId,
    workspaceId: effWorkspaceId,
    csrfToken,
  });

  const dismissUndo = useCallback((taskId: string) => {
    setActiveUndos((prev) => prev.filter((u) => u.taskId !== taskId));
  }, []);

  const archiveTaskAction = useCallback(
    async (
      task: TaskDto,
      options?: { reason?: string; communityId?: string; workspaceId?: string }
    ): Promise<ArchiveTaskResultDto | void> => {
      // 1. Strict Fail-Closed Permission Invariant
      const canArchive = Boolean(
        task?.effectivePermissions?.canArchive && !task.archivedAt
      );
      if (!canArchive) {
        throw new Error(
          "Task cannot be archived: insufficient permissions or task is already archived."
        );
      }

      const targetCommId =
        options?.communityId || effCommunityId || "";
      const targetWsId =
        options?.workspaceId || effWorkspaceId || task.workspaceId || "";

      try {
        const result = await archiveMutation.mutateAsync({
          task,
          reason: options?.reason,
          communityId: targetCommId,
          workspaceId: targetWsId,
        });

        // Query memberships captured during onMutate can be extracted from latest query cache or default map
        const expMs = Date.parse(result.undoExpiresAt);
        const initialRemainingMs = Math.max(0, expMs - Date.now());

        const newItem: UndoItemState = {
          taskId: task.id,
          taskKey: task.taskKey,
          communityId: targetCommId,
          workspaceId: targetWsId,
          undoToken: result.undoToken,
          undoExpiresAt: result.undoExpiresAt,
          status: "idle",
          taskSnapshot: task,
          queryMemberships: new Map(),
          remainingMs: initialRemainingMs,
        };

        setActiveUndos((prev) => [
          ...prev.filter((u) => u.taskId !== task.id),
          newItem,
        ]);

        return result;
      } catch (err) {
        // Rollback occurred in useArchiveTask.onError
        setActiveUndos((prev) => prev.filter((u) => u.taskId !== task.id));
        throw err;
      }
    },
    [archiveMutation, effCommunityId, effWorkspaceId]
  );

  const undoTaskAction = useCallback(
    async (taskId: string): Promise<TaskDto | void> => {
      const currentItem = activeUndos.find((u) => u.taskId === taskId);
      if (!currentItem || currentItem.status !== "idle") {
        // Duplicate submission lock & unknown item guard
        return;
      }

      // 1. Lock in-flight status immediately to block duplicates
      setActiveUndos((prev) =>
        prev.map((u) =>
          u.taskId === taskId ? { ...u, status: "restoring" as const } : u
        )
      );

      try {
        const restoredTask = await restoreMutation.mutateAsync({
          task: currentItem.taskSnapshot,
          undoToken: currentItem.undoToken,
          queryMemberships: currentItem.queryMemberships,
          communityId: currentItem.communityId,
          workspaceId: currentItem.workspaceId,
        });

        // 2. On success, remove from activeUndos
        setActiveUndos((prev) => prev.filter((u) => u.taskId !== taskId));
        return restoredTask;
      } catch (err: unknown) {
        // 3. On error, transition to error/expired safely without unhandled crashes
        const errMsg =
          err instanceof Error
            ? err.message
            : "Failed to restore task";

        setActiveUndos((prev) =>
          prev.map((u) =>
            u.taskId === taskId
              ? {
                  ...u,
                  status: "error" as const,
                  errorMessage: errMsg,
                }
              : u
          )
        );
        return undefined;
      }
    },
    [activeUndos, restoreMutation]
  );

  // Advisory Countdown Tick
  useEffect(() => {
    if (activeUndos.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setActiveUndos((prev) => {
        let hasChanges = false;
        const next = prev
          .map((item) => {
            if (item.status === "restoring") return item;
            const expMs = Date.parse(item.undoExpiresAt);
            const remaining = Math.max(0, expMs - now);

            if (remaining !== item.remainingMs) {
              hasChanges = true;
              if (remaining <= 0 && item.status === "idle") {
                return { ...item, remainingMs: 0, status: "expired" as const };
              }
              return { ...item, remainingMs: remaining };
            }
            return item;
          })
          .filter((item) => !(item.status === "expired" && item.remainingMs <= 0));

        return hasChanges ? next : prev;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeUndos.length]);

  // Tab Suspension Snap
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        setActiveUndos((prev) =>
          prev
            .map((item) => {
              if (item.status === "restoring") return item;
              const expMs = Date.parse(item.undoExpiresAt);
              const remaining = Math.max(0, expMs - now);
              if (remaining <= 0 && item.status === "idle") {
                return { ...item, remainingMs: 0, status: "expired" as const };
              }
              return { ...item, remainingMs: remaining };
            })
            .filter((item) => !(item.status === "expired" && item.remainingMs <= 0))
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Keyboard undo handler (Z and Mod+Z)
  // Deterministically targets the newest idle entry.
  // Fails closed if the newest entry is currently restoring.
  const activeUndosRef = useRef(activeUndos);
  activeUndosRef.current = activeUndos;

  const handleKeyboardUndo = useCallback(() => {
    const undos = activeUndosRef.current;
    if (undos.length === 0) return;
    const newestItem = undos[undos.length - 1];
    if (!newestItem || newestItem.status !== "idle") {
      return;
    }
    void undoTaskAction(newestItem.taskId);
  }, [undoTaskAction]);

  useKeyboardShortcut("z", handleKeyboardUndo, {
    allowInInput: false,
    enabled: activeUndos.some((u) => u.status === "idle"),
    priority: 10,
  });

  useKeyboardShortcut("mod+z", handleKeyboardUndo, {
    allowInInput: false,
    enabled: activeUndos.some((u) => u.status === "idle"),
    priority: 10,
  });

  const value = useMemo<TaskUndoContextValue>(
    () => ({
      activeUndos,
      archiveTask: archiveTaskAction,
      undoTask: undoTaskAction,
      dismissUndo,
    }),
    [activeUndos, archiveTaskAction, undoTaskAction, dismissUndo]
  );

  return (
    <TaskUndoContext.Provider value={value}>
      {children}
    </TaskUndoContext.Provider>
  );
}

export function useTaskUndo(): TaskUndoContextValue {
  const context = useContext(TaskUndoContext);
  return context ?? defaultTaskUndoContextValue;
}
