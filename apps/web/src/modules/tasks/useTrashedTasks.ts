import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/index.js";
import { listTrashedTasks } from "./api.js";
import type { TrashedTaskListDto } from "./types.js";

export interface UseTrashedTasksOptions {
  communityId?: string | null;
  workspaceId?: string | null;
  enabled?: boolean;
}

export function workspaceTrashQueryKey(
  communityId?: string | null,
  workspaceId?: string | null
): readonly ["communities", string, "workspaces", string, "trash"] | readonly ["trash", "disabled"] {
  if (!communityId || !workspaceId) {
    return ["trash", "disabled"] as const;
  }
  return [
    "communities",
    communityId,
    "workspaces",
    workspaceId,
    "trash",
  ] as const;
}

/**
 * Queries recoverable archived/soft-deleted tasks in the workspace.
 * Retention window: 30 days before permanent eviction policy.
 */
export function useTrashedTasks({
  communityId,
  workspaceId,
  enabled = true,
}: UseTrashedTasksOptions): UseQueryResult<TrashedTaskListDto, Error> {
  const { csrfToken } = useAuth();
  const isQueryEnabled = Boolean(communityId && workspaceId && csrfToken && enabled);

  return useQuery({
    queryKey: workspaceTrashQueryKey(communityId, workspaceId),
    queryFn: async () => {
      if (!communityId || !workspaceId) {
        throw new Error("Missing required parameters for useTrashedTasks query.");
      }
      return listTrashedTasks({
        communityId,
        workspaceId,
      });
    },
    enabled: isQueryEnabled,
    staleTime: 1000 * 30, // 30 seconds
  });
}
