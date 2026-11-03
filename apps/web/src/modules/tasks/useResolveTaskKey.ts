import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { resolveTaskKey } from "./api.js";
import type { TaskKeyResolutionDto } from "./types.js";

export interface UseResolveTaskKeyOptions {
  communityId?: string | null;
  workspaceId?: string | null;
  taskKey?: string | null;
  enabled?: boolean;
}

export function taskKeyResolutionQueryKey(
  communityId?: string | null,
  workspaceId?: string | null,
  taskKey?: string | null
): readonly ["communities", string, "workspaces", string, "tasks", "by-key", string] | readonly ["tasks", "by-key", "disabled"] {
  if (!communityId || !workspaceId || !taskKey) {
    return ["tasks", "by-key", "disabled"] as const;
  }
  return ["communities", communityId, "workspaces", workspaceId, "tasks", "by-key", taskKey.toUpperCase()] as const;
}

/**
 * Hook to resolve a task key or historical alias.
 * Returns canonical currentKey, destination workspaceId, and taskId.
 */
export function useResolveTaskKey({
  communityId,
  workspaceId,
  taskKey,
  enabled = true,
}: UseResolveTaskKeyOptions): UseQueryResult<TaskKeyResolutionDto, Error> {
  const isQueryEnabled = Boolean(communityId && workspaceId && taskKey && enabled);

  return useQuery({
    queryKey: taskKeyResolutionQueryKey(communityId, workspaceId, taskKey),
    queryFn: () => {
      if (!communityId || !workspaceId || !taskKey) {
        throw new Error("Missing required parameters for useResolveTaskKey query.");
      }
      return resolveTaskKey({ communityId, workspaceId, taskKey });
    },
    enabled: isQueryEnabled,
    staleTime: 1000 * 60 * 5, // 5 minutes (keys/aliases are immutable)
    retry: false, // Don't retry 404s for unknown keys
  });
}
