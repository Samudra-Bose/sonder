import React, { useMemo, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useWorkspace } from "@/modules/workspace";
import { WorkspaceBadge } from "@/modules/workspace/WorkspaceBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useWorkspaceTasks } from "../useWorkspaceTasks";
import { TaskViewToolbar } from "./TaskViewToolbar";
import { TaskListView } from "./TaskListView";
import { TaskBoardView } from "./TaskBoardView";
import type {
  TaskViewQueryRequest,
  QueryFilterCondition,
  QuerySortTerm,
  TaskPriority,
  TaskStatusCategory,
} from "../types";

export interface WorkspaceTasksViewProps {
  defaultView?: "list" | "board";
  className?: string;
}

export function WorkspaceTasksView({
  defaultView = "list",
  className,
}: WorkspaceTasksViewProps): React.JSX.Element {
  const params = useParams<{ communityId?: string; workspaceId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    currentCommunityId,
    activeWorkspaceId,
    activeWorkspace,
    workspaces,
    isLoading: isWorkspacesLoading,
    selectWorkspace,
  } = useWorkspace();

  // Resolve target community & workspace
  const effectiveCommunityId = params.communityId || currentCommunityId;
  const effectiveWorkspaceId = params.workspaceId || activeWorkspaceId || workspaces[0]?.id || null;

  // Sync route params with WorkspaceContext if different
  useEffect(() => {
    if (params.workspaceId && params.workspaceId !== activeWorkspaceId) {
      selectWorkspace(params.workspaceId);
    }
  }, [params.workspaceId, activeWorkspaceId, selectWorkspace]);

  // Determine active view: route pathname (/board vs /list) has priority, then query param ?view=, then defaultView
  const routeView = location.pathname.endsWith("/board")
    ? "board"
    : location.pathname.endsWith("/list")
    ? "list"
    : null;

  const paramView = searchParams.get("view") === "board" || searchParams.get("view") === "list"
    ? (searchParams.get("view") as "list" | "board")
    : null;

  const activeView: "list" | "board" = routeView || paramView || defaultView;

  // Search, filter, and sort state from URL search params
  const searchQuery = searchParams.get("q") ?? "";
  const priorityFilter = searchParams.get("priority") ?? "ALL";
  const statusFilter = searchParams.get("status") ?? "ALL";
  const sortBy = searchParams.get("sort") ?? "priority";
  const includeBacklog = searchParams.get("backlog") === "true";
  const mobileStage = searchParams.get("stage") ?? "TODO";

  // Track snapshot ID strictly for projection transitions to ensure snapshot parity
  const transitionSnapshotIdRef = useRef<string | null>(null);

  // Helper to update URL search parameters while preserving unrelated params (e.g. ?task=)
  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, val] of Object.entries(updates)) {
            if (val === null || val === undefined || val === "" || (key === "priority" && val === "ALL") || (key === "status" && val === "ALL") || (key === "backlog" && val === "false")) {
              next.delete(key);
            } else {
              next.set(key, val);
            }
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const handleViewChange = (newView: "list" | "board") => {
    if (newView === activeView) return;

    // Capture current snapshotId so the new projection reuses the identical canonical snapshot
    if (queryResult?.querySnapshotId) {
      transitionSnapshotIdRef.current = queryResult.querySnapshotId;
    }

    // If current route has /list or /board in path, navigate to the sibling path while keeping search params
    if (location.pathname.endsWith("/list") || location.pathname.endsWith("/board")) {
      const basePath = location.pathname.replace(/\/(list|board)$/, "");
      navigate(`${basePath}/${newView}${location.search}`, { replace: true });
    } else {
      updateSearchParams({ view: newView });
    }
  };

  const handleSearchChange = (q: string) => updateSearchParams({ q: q || null });
  const handlePriorityChange = (priority: string) => updateSearchParams({ priority });
  const handleStatusChange = (status: string) => updateSearchParams({ status });
  const handleSortChange = (sort: string) => updateSearchParams({ sort });
  const handleIncludeBacklogChange = (include: boolean) =>
    updateSearchParams({ backlog: include ? "true" : "false" });
  const handleSelectMobileStage = (stage: string) => updateSearchParams({ stage });

  // Construct canonical querySpec
  const querySpec = useMemo<TaskViewQueryRequest["querySpec"]>(() => {
    const conditions: QueryFilterCondition[] = [];

    if (searchQuery.trim()) {
      conditions.push({
        field: "q",
        operator: "CONTAINS",
        value: searchQuery.trim(),
      });
    }

    if (priorityFilter && priorityFilter !== "ALL") {
      conditions.push({
        field: "priority",
        operator: "EQ",
        value: priorityFilter as TaskPriority,
      });
    }

    if (statusFilter && statusFilter !== "ALL") {
      conditions.push({
        field: "statusCategory",
        operator: "EQ",
        value: statusFilter as TaskStatusCategory,
      });
    }

    const sortTerms: QuerySortTerm[] = [
      {
        field: sortBy as any,
        direction: sortBy === "priority" ? "DESC" : "ASC",
      },
    ];

    return {
      subtaskMode: "NESTED",
      groupBy: "statusCategory",
      subGroupBy: "none",
      includeBacklog,
      includeCompleted: true,
      filter: {
        conjunction: "AND",
        conditions,
      },
      sortBy: sortTerms,
    };
  }, [searchQuery, priorityFilter, statusFilter, sortBy, includeBacklog]);

  // Execute workspace tasks query with snapshot reuse during view transitions
  const activeSnapshotId = transitionSnapshotIdRef.current ?? undefined;

  const {
    data: queryResult,
    isLoading: isTasksLoading,
    isFetching: isTasksFetching,
    isError: isTasksError,
    error: tasksError,
    refetch: refetchTasks,
  } = useWorkspaceTasks({
    communityId: effectiveCommunityId,
    workspaceId: effectiveWorkspaceId,
    query: {
      projection: activeView === "board" ? "BOARD" : "LIST",
      pageScope: "PRIMARY",
      querySnapshotId: activeSnapshotId,
      querySpec,
    },
    enabled: Boolean(effectiveCommunityId && effectiveWorkspaceId),
  });

  // Reset transition snapshot ID once query has executed
  useEffect(() => {
    if (queryResult && transitionSnapshotIdRef.current) {
      transitionSnapshotIdRef.current = null;
    }
  }, [queryResult]);

  // Loading state when resolving workspace
  if (isWorkspacesLoading) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto py-2">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // No accessible workspace
  if (!effectiveWorkspaceId) {
    return (
      <div className="py-12 max-w-lg mx-auto">
        <EmptyState
          title="No workspace selected"
          description="Select an active workspace from the left navigation rail to view its tasks."
        />
      </div>
    );
  }

  const currentWorkspaceInfo = activeWorkspace || workspaces.find((w) => w.id === effectiveWorkspaceId);
  const totalCount = queryResult?.total ?? 0;

  return (
    <div
      data-testid="workspace-tasks-view"
      className={cn("space-y-5 max-w-7xl mx-auto py-2", className)}
    >
      {/* Workspace Header Banner */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-4 md:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
              {currentWorkspaceInfo?.name || "Workspace Tasks"}
            </h1>
            {currentWorkspaceInfo && (
              <WorkspaceBadge prefix={currentWorkspaceInfo.keyPrefix} />
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Canonical workspace work management with synchronized List and Board views.
          </p>
        </div>

        {/* View mode indicator */}
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-[var(--text-muted)] bg-[var(--surface-muted)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] font-mono">
          <span className="font-semibold uppercase tracking-wider text-[var(--brand-accent-text)]">
            {activeView} view
          </span>
          {queryResult?.querySnapshotId && (
            <span
              title={`Snapshot sequence: ${queryResult.snapshotSequence}`}
              className="text-[10px] text-[var(--text-muted)] opacity-75"
            >
              • seq:{queryResult.snapshotSequence}
            </span>
          )}
        </div>
      </div>

      {/* Shared Task View Toolbar */}
      <TaskViewToolbar
        activeView={activeView}
        onViewChange={handleViewChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        priorityFilter={priorityFilter}
        onPriorityChange={handlePriorityChange}
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        includeBacklog={includeBacklog}
        onIncludeBacklogChange={handleIncludeBacklogChange}
        totalCount={totalCount}
        isFetching={isTasksFetching}
        onRefresh={() => refetchTasks()}
      />

      {/* Primary View Projection (List or Board) */}
      {activeView === "list" ? (
        <TaskListView
          tasks={queryResult?.items ?? []}
          isLoading={isTasksLoading}
          isError={isTasksError}
          error={tasksError}
          onRetry={() => refetchTasks()}
          workspaceId={effectiveWorkspaceId}
          communityId={effectiveCommunityId!}
        />
      ) : (
        <TaskBoardView
          groups={queryResult?.groups ?? []}
          isLoading={isTasksLoading}
          isError={isTasksError}
          error={tasksError}
          onRetry={() => refetchTasks()}
          workspaceId={effectiveWorkspaceId}
          communityId={effectiveCommunityId!}
          selectedMobileStage={mobileStage}
          onSelectMobileStage={handleSelectMobileStage}
        />
      )}

      {/* Bounded pagination continuation alert if more pages exist in List view */}
      {activeView === "list" && queryResult?.nextCursor && (
        <div
          role="note"
          aria-label="Partial results warning"
          className="bg-[var(--surface-muted)] border border-[var(--border-subtle)] rounded-lg p-3 text-xs text-[var(--text-secondary)] flex items-center justify-between"
        >
          <span>
            Showing first {queryResult.items.length} of {queryResult.total} tasks. Narrow your filters to see specific tasks.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetchTasks()}
            className="text-xs"
          >
            Refetch
          </Button>
        </div>
      )}
    </div>
  );
}
