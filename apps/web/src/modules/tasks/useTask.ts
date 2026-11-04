import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getTaskById } from "./api.js";
import type { TaskDto } from "./types.js";

export interface UseTaskOptions {
  communityId?: string | null;
  workspaceId?: string | null;
  taskId?: string | null;
  enabled?: boolean;
}

export function taskQueryKey(
  communityId?: string | null,
  workspaceId?: string | null,
  taskId?: string | null
): readonly ["communities", string, "workspaces", string, "tasks", string] | readonly ["tasks", "disabled"] {
  if (!communityId || !workspaceId || !taskId) {
    return ["tasks", "disabled"] as const;
  }
  return ["communities", communityId, "workspaces", workspaceId, "tasks", taskId] as const;
}

/**
 * Hook to fetch a single task by its canonical task ID.
 * Binds to stable community- and workspace-scoped query keys.
 */
export function useTask({
  communityId,
  workspaceId,
  taskId,
  enabled = true,
}: UseTaskOptions): UseQueryResult<TaskDto, Error> {
  const isQueryEnabled = Boolean(communityId && workspaceId && taskId && enabled);

  return useQuery({
    queryKey: taskQueryKey(communityId, workspaceId, taskId),
    queryFn: () => {
      if (!communityId || !workspaceId || !taskId) {
        throw new Error("Missing required parameters for useTask query.");
      }
      return getTaskById({ communityId, workspaceId, taskId });
    },
    enabled: isQueryEnabled,
    staleTime: 1000 * 60, // 1 minute
  });
}
