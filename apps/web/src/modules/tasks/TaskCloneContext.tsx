import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { WorkspaceContext } from "@/modules/workspace/WorkspaceContext.js";
import { useCloneTask } from "./useCloneTask.js";
import type { TaskDto } from "./types.js";

export interface CloneToastItem {
  id: string; // cloned task id
  clonedTask: TaskDto;
  sourceTaskKey: string;
  sourceTaskId: string;
  remainingMs: number;
}

export interface TaskCloneContextValue {
  activeClones: CloneToastItem[];
  cloneTask: (
    task: TaskDto,
    options?: {
      includeSubtasks?: boolean;
      titleSuffix?: string;
      communityId?: string;
      workspaceId?: string;
    }
  ) => Promise<TaskDto>;
  isCloning: boolean;
  cloningTaskId: string | null;
  dismissClone: (id: string) => void;
}

export const defaultTaskCloneContextValue: TaskCloneContextValue = {
  activeClones: [],
  cloneTask: async () => {
    throw new Error("TaskCloneProvider not mounted");
  },
  isCloning: false,
  cloningTaskId: null,
  dismissClone: () => {},
};

export const TaskCloneContext = createContext<TaskCloneContextValue>(
  defaultTaskCloneContextValue
);

export interface TaskCloneProviderProps {
  children: React.ReactNode;
  communityId?: string | null;
  workspaceId?: string | null;
}

export function TaskCloneProvider({
  children,
  communityId: propCommunityId,
  workspaceId: propWorkspaceId,
}: TaskCloneProviderProps): React.JSX.Element {
  const workspaceContext = useContext(WorkspaceContext);

  const effCommunityId =
    propCommunityId ?? workspaceContext?.currentCommunityId ?? null;
  const effWorkspaceId =
    propWorkspaceId ?? workspaceContext?.activeWorkspaceId ?? null;

  const [activeClones, setActiveClones] = useState<CloneToastItem[]>([]);
  const [cloningTaskId, setCloningTaskId] = useState<string | null>(null);

  const cloneMutation = useCloneTask();

  const dismissClone = useCallback((id: string) => {
    setActiveClones((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Tick timers for active clone toasts (8-second window)
  useEffect(() => {
    if (activeClones.length === 0) return;

    const interval = setInterval(() => {
      setActiveClones((prev) => {
        const next = prev
          .map((item) => ({ ...item, remainingMs: item.remainingMs - 250 }))
          .filter((item) => item.remainingMs > 0);
        return next;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [activeClones.length]);

  const cloneTaskAction = useCallback(
    async (
      task: TaskDto,
      options?: {
        includeSubtasks?: boolean;
        titleSuffix?: string;
        communityId?: string;
        workspaceId?: string;
      }
    ): Promise<TaskDto> => {
      // Prevent duplicate submissions while in progress
      if (cloningTaskId === task.id) {
        throw new Error("Cloning already in progress for this task.");
      }

      const communityId = options?.communityId ?? effCommunityId ?? task.workspaceId;
      const workspaceId = options?.workspaceId ?? effWorkspaceId ?? task.workspaceId;

      if (!communityId || !workspaceId) {
        throw new Error("Missing active community or workspace context for cloning.");
      }

      setCloningTaskId(task.id);
      try {
        const cloned = await cloneMutation.mutateAsync({
          communityId,
          workspaceId,
          taskId: task.id,
          data: {
            includeSubtasks: options?.includeSubtasks ?? true,
            titleSuffix: options?.titleSuffix ?? " (Copy)",
          },
        });

        // Add toast item
        setActiveClones((prev) => [
          ...prev.filter((c) => c.id !== cloned.id),
          {
            id: cloned.id,
            clonedTask: cloned,
            sourceTaskKey: task.taskKey,
            sourceTaskId: task.id,
            remainingMs: 8000,
          },
        ]);

        return cloned;
      } finally {
        setCloningTaskId(null);
      }
    },
    [cloningTaskId, effCommunityId, effWorkspaceId, cloneMutation]
  );

  const value = useMemo<TaskCloneContextValue>(
    () => ({
      activeClones,
      cloneTask: cloneTaskAction,
      isCloning: cloneMutation.isPending || cloningTaskId !== null,
      cloningTaskId,
      dismissClone,
    }),
    [activeClones, cloneTaskAction, cloneMutation.isPending, cloningTaskId, dismissClone]
  );

  return (
    <TaskCloneContext.Provider value={value}>
      {children}
    </TaskCloneContext.Provider>
  );
}

export function useTaskClone(): TaskCloneContextValue {
  const context = useContext(TaskCloneContext);
  return context ?? defaultTaskCloneContextValue;
}
