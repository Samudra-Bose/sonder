import { useMemo } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/index.js";
import { queryWorkspaceTasks } from "./api.js";
import type { TaskDto, TaskQueryResult, TaskViewQueryRequest } from "./types.js";

export interface UseWorkspaceTasksOptions {
  communityId?: string | null;
  workspaceId?: string | null;
  query?: Partial<TaskViewQueryRequest>;
  enabled?: boolean;
  fetchAllPages?: boolean;
  maxPages?: number;
}

export const DEFAULT_QUERY_SPEC: TaskViewQueryRequest["querySpec"] = {
  subtaskMode: "NESTED",
  groupBy: "none",
  subGroupBy: "none",
  includeBacklog: true,
  includeCompleted: true,
  filter: { conjunction: "AND", conditions: [] },
};

export function normalizeWorkspaceTasksQuery(
  query?: Partial<TaskViewQueryRequest>
): TaskViewQueryRequest {
  const isBoard = query?.projection === "BOARD";
  return {
    projection: query?.projection ?? "LIST",
    pageScope: query?.pageScope ?? "PRIMARY",
    querySpec: {
      subtaskMode: "NESTED",
      groupBy: isBoard ? "statusCategory" : "none",
      subGroupBy: "none",
      includeBacklog: query?.querySpec?.includeBacklog ?? true,
      includeCompleted: query?.querySpec?.includeCompleted ?? true,
      filter: { conjunction: "AND", conditions: [] },
      ...query?.querySpec,
    },
    ...query,
  };
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
 * Automatically traverses continuation pages up to a bounded limit (maxPages = 5)
 * and recovers from snapshot expiration (409 QUERY_SNAPSHOT_EXPIRED).
 */
export function useWorkspaceTasks({
  communityId,
  workspaceId,
  query,
  enabled = true,
  fetchAllPages = true,
  maxPages = 5,
}: UseWorkspaceTasksOptions): UseQueryResult<TaskQueryResult, Error> {
  const { csrfToken } = useAuth();
  const normalizedQuery = useMemo(() => normalizeWorkspaceTasksQuery(query), [query]);
  const querySpecJson = useMemo(() => JSON.stringify(normalizedQuery), [normalizedQuery]);
  const isQueryEnabled = Boolean(communityId && workspaceId && csrfToken && enabled);

  return useQuery({
    queryKey: workspaceTasksQueryKey(communityId, workspaceId, querySpecJson),
    queryFn: async () => {
      if (!communityId || !workspaceId) {
        throw new Error("Missing required parameters for useWorkspaceTasks query.");
      }

      let currentQuery: TaskViewQueryRequest = { ...normalizedQuery };
      const allItems: TaskDto[] = [];
      let pageCount = 0;
      let latestResult: TaskQueryResult | null = null;
      let restartCount = 0;

      while (true) {
        try {
          const result = await queryWorkspaceTasks({
            communityId,
            workspaceId,
            query: currentQuery,
            csrfToken: csrfToken ?? undefined,
          });

          if (
            normalizedQuery.projection === "BOARD" ||
            normalizedQuery.projection === "CALENDAR" ||
            normalizedQuery.projection === "TIMELINE"
          ) {
            latestResult = result;
            break;
          }

          allItems.push(...result.items);
          latestResult = result;
          pageCount++;

          // Continue pagination if requested and next page exists and under bounded limit
          if (fetchAllPages && result.nextCursor && pageCount < maxPages) {
            currentQuery = {
              ...normalizedQuery,
              cursor: result.nextCursor,
            };
          } else {
            break;
          }
        } catch (error: unknown) {
          const err = error as { code?: string; status?: number };
          // If query snapshot expired mid-traversal or with stale querySnapshotId, restart from page 1 once
          if (
            (err?.code === "QUERY_SNAPSHOT_EXPIRED" || err?.status === 409) &&
            restartCount === 0 &&
            (pageCount > 0 || currentQuery.querySnapshotId)
          ) {
            restartCount++;
            allItems.length = 0;
            pageCount = 0;
            const { cursor: _c, querySnapshotId: _s, ...baseQuery } = normalizedQuery;
            currentQuery = { ...baseQuery };
            continue;
          }
          throw error;
        }
      }

      if (!latestResult) {
        throw new Error("No query result returned from workspace tasks query.");
      }

      if (
        normalizedQuery.projection === "BOARD" ||
        normalizedQuery.projection === "CALENDAR" ||
        normalizedQuery.projection === "TIMELINE"
      ) {
        return latestResult;
      }

      return {
        ...latestResult,
        items: allItems,
        // If bounded pagination stopped before consuming all pages, preserve nextCursor to alert consumer
        nextCursor: pageCount >= maxPages ? latestResult.nextCursor : null,
      };
    },
    enabled: isQueryEnabled,
    staleTime: 1000 * 30, // 30 seconds
  });
}
