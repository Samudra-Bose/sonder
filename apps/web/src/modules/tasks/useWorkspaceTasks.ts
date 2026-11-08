import { useMemo } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/index.js";
import { queryWorkspaceTasks } from "./api.js";
import type { TaskQueryResult, TaskViewQueryRequest } from "./types.js";

export interface UseWorkspaceTasksOptions {
  communityId?: string | null;
  workspaceId?: string | null;
  query?: Partial<TaskViewQueryRequest>;
  enabled?: boolean;
}

export function workspaceTasksQueryKey(
  communityId?: string | null,
  workspaceId?: string | null,
  querySpecJson?: string
): readonly ["communities", string, "workspaces", string, "tasks", "query", string] | readonly ["tasks", "disabled"] {
  if (!communityId || !workspaceId) {
    return ["tasks", "disabled"] as const;
  }
  return [
    "communities",
    communityId,
    "workspaces",
    workspaceId,
    "tasks",
    "query",
    querySpecJson ?? "default",
  ] as const;
}

/**
 * Queries workspace tasks using the canonical task query endpoint.
 * Supports NESTED subtaskMode for hierarchy reconstruction.
 */
export function useWorkspaceTasks({
  communityId,
  workspaceId,
  query,
  enabled = true,
}: UseWorkspaceTasksOptions): UseQueryResult<TaskQueryResult, Error> {
  const { csrfToken } = useAuth();
  const querySpecJson = useMemo(() => JSON.stringify(query ?? {}), [query]);
  const isQueryEnabled = Boolean(communityId && workspaceId && enabled);

  return useQuery({
    queryKey: workspaceTasksQueryKey(communityId, workspaceId, querySpecJson),
    queryFn: () => {
      if (!communityId || !workspaceId) {
        throw new Error("Missing required parameters for useWorkspaceTasks query.");
      }
      return queryWorkspaceTasks({
        communityId,
        workspaceId,
        query,
        csrfToken: csrfToken ?? undefined,
      });
    },
    enabled: isQueryEnabled,
    staleTime: 1000 * 30, // 30 seconds
  });
}
