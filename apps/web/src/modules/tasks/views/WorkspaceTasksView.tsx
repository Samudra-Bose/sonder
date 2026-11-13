import React, { useState, useMemo, useEffect, useRef, useCallback, useContext } from "react";
import { useParams, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import { useWorkspace } from "@/modules/workspace";
import { WorkspaceBadge } from "@/modules/workspace/WorkspaceBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useWorkspaceTasks } from "../useWorkspaceTasks";
import { useTaskExportCsv } from "../useTaskExportCsv.js";
import { TaskViewToolbar } from "./TaskViewToolbar";
import { TaskListView } from "./TaskListView";
import { TaskBoardView } from "./TaskBoardView";
import {
  CalendarView,
  parseDateParts,
  getMonthCalendarGrid,
  getWeekDays,
  getTodayString,
} from "./calendar";
import {
  TimelineView,
  getTimelineRange,
  type TimelineMode,
} from "./timeline";
import { useMilestones } from "@/modules/milestones";
import { useTaskPeekDrawer } from "../useTaskPeekDrawer";
import { useQuickTaskComposer } from "../QuickTaskComposerContext";
import {
  TaskUndoContext,
  defaultTaskUndoContextValue,
  TaskUndoProvider,
} from "../TaskUndoContext.js";
import { TaskUndoToast } from "../TaskUndoToast.js";
import {
  TaskCloneContext,
  defaultTaskCloneContextValue,
  TaskCloneProvider,
} from "../TaskCloneContext.js";
import { TaskCloneToast } from "../TaskCloneToast.js";
import type {
  TaskViewQueryRequest,
  QueryFilterCondition,
  QuerySortTerm,
  QueryDateWindow,
  TaskPriority,
  TaskStatusCategory,
} from "../types";

export interface WorkspaceTasksViewProps {
  defaultView?: "list" | "board" | "calendar" | "timeline";
  className?: string;
}

const ALLOWED_SORT_FIELDS = new Set([
  "rankKey",
  "priority",
  "dueDate",
  "startDate",
  "createdAt",
  "currentKey",
]);

function isValidSortField(field: string): boolean {
  if (ALLOWED_SORT_FIELDS.has(field)) return true;
  return /^cf\.[a-z][a-z0-9_]{0,47}$/.test(field);
}

function WorkspaceTasksViewInner({
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

  // Determine active view: route pathname (/timeline vs /calendar vs /board vs /list) has priority, then query param ?view=, then defaultView
  const routeView = location.pathname.endsWith("/timeline")
    ? "timeline"
    : location.pathname.endsWith("/calendar")
    ? "calendar"
    : location.pathname.endsWith("/board")
    ? "board"
    : location.pathname.endsWith("/list")
    ? "list"
    : null;

  const validViews = ["list", "board", "calendar", "timeline"];
  const paramView = validViews.includes(searchParams.get("view") || "")
    ? (searchParams.get("view") as "list" | "board" | "calendar" | "timeline")
    : null;

  const activeView: "list" | "board" | "calendar" | "timeline" = routeView || paramView || defaultView;

  // Search, filter, and sort state from URL search params
  const searchQuery = searchParams.get("q") ?? "";
  const priorityFilter = searchParams.get("priority") ?? "ALL";
  const statusFilter = searchParams.get("status") ?? "ALL";
  const rawSortBy = searchParams.get("sort");
  const sortBy = rawSortBy && isValidSortField(rawSortBy) ? rawSortBy : "priority";
  const sortOrderParam = searchParams.get("order")?.toLowerCase();
  const sortOrder: "asc" | "desc" =
    sortOrderParam === "asc" || sortOrderParam === "desc"
      ? sortOrderParam
      : sortBy === "priority" || sortBy === "createdAt"
      ? "desc"
      : "asc";
  const includeBacklog = searchParams.get("backlog") === "true";
  const mobileStage = searchParams.get("stage") ?? "TODO";
  const calendarMode = (searchParams.get("mode") === "week" ? "week" : "month") as "month" | "week";
  const timelineMode = (["day", "week", "month"].includes(searchParams.get("mode") || "")
    ? searchParams.get("mode")
    : "day") as TimelineMode;
  const calendarDate = searchParams.get("date") ?? getTodayString();

  // Track snapshot ID strictly for projection transitions to ensure snapshot parity
  const transitionSnapshotIdRef = useRef<string | null>(null);

  // Helper to update URL search parameters while preserving unrelated params (e.g. ?task=)
  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>, options?: { replace?: boolean }) => {
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
        { replace: options?.replace ?? false }
      );
    },
    [setSearchParams]
  );

  const handleViewChange = (newView: "list" | "board" | "calendar" | "timeline") => {
    if (newView === activeView) return;

    // Capture current snapshotId so the new projection reuses the identical canonical snapshot
    if (queryResult?.querySnapshotId) {
      transitionSnapshotIdRef.current = queryResult.querySnapshotId;
    }

    // If current route has /list, /board, /calendar, or /timeline in path, navigate to the sibling path while keeping search params
    if (
      location.pathname.endsWith("/list") ||
      location.pathname.endsWith("/board") ||
      location.pathname.endsWith("/calendar") ||
      location.pathname.endsWith("/timeline")
    ) {
      const basePath = location.pathname.replace(/\/(list|board|calendar|timeline)$/, "");
      navigate(`${basePath}/${newView}${location.search}`, { replace: false });
    } else {
      updateSearchParams({ view: newView }, { replace: false });
    }
  };

  const handleCalendarModeChange = (mode: "month" | "week") => updateSearchParams({ mode });
  const handleTimelineModeChange = (mode: TimelineMode) => updateSearchParams({ mode });
  const handleCalendarDateChange = (date: string) => updateSearchParams({ date });

  const { openTask } = useTaskPeekDrawer();
  const { open: openQuickComposer } = useQuickTaskComposer();

  const handleCalendarCreateTask = useCallback(
    (dateStr: string, invoker?: HTMLElement | null) => {
      openQuickComposer(invoker, { dueDate: dateStr });
    },
    [openQuickComposer]
  );

  // Date window calculation for Calendar and Timeline views
  const dateWindow = useMemo<QueryDateWindow | undefined>(() => {
    if (activeView === "calendar") {
      try {
        const { year, month } = parseDateParts(calendarDate);
        const todayStr = getTodayString();
        if (calendarMode === "month") {
          const grid = getMonthCalendarGrid(year, month, todayStr);
          return {
            dateField: "DUE_DATE",
            from: grid[0]!.dateStr,
            to: grid[grid.length - 1]!.dateStr,
            includeUnscheduled: true,
          };
        } else {
          const week = getWeekDays(calendarDate, todayStr);
          return {
            dateField: "DUE_DATE",
            from: week[0]!.dateStr,
            to: week[6]!.dateStr,
            includeUnscheduled: true,
          };
        }
      } catch {
        return undefined;
      }
    }

    if (activeView === "timeline") {
      try {
        const todayStr = getTodayString();
        const range = getTimelineRange(calendarDate, timelineMode, todayStr);
        return {
          dateField: "START_TO_DUE_SPAN",
          from: range.startDate,
          to: range.endDate,
          includeUnscheduled: true,
        };
      } catch {
        return undefined;
      }
    }

    return undefined;
  }, [activeView, calendarDate, calendarMode, timelineMode]);

  const handleSearchChange = (q: string) => updateSearchParams({ q: q || null }, { replace: true });
  const handlePriorityChange = (priority: string) => updateSearchParams({ priority });
  const handleStatusChange = (status: string) => updateSearchParams({ status });
  const handleSortChange = (sort: string) => {
    const defaultOrder = sort === "priority" || sort === "createdAt" ? "desc" : "asc";
    updateSearchParams({ sort, order: defaultOrder });
  };
  const handleSortOrderToggle = (order: "asc" | "desc") => {
    updateSearchParams({ order });
  };
  const handleColumnSortChange = (field: string, direction: "asc" | "desc") => {
    updateSearchParams({ sort: field, order: direction });
  };
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
        direction: sortOrder === "desc" ? "DESC" : "ASC",
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
      ...(dateWindow ? { dateWindow } : {}),
    };
  }, [searchQuery, priorityFilter, statusFilter, sortBy, sortOrder, includeBacklog, dateWindow]);

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
      projection:
        activeView === "board"
          ? "BOARD"
          : activeView === "calendar"
          ? "CALENDAR"
          : activeView === "timeline"
          ? "TIMELINE"
          : "LIST",
      pageScope: "PRIMARY",
      querySnapshotId: activeSnapshotId,
      querySpec,
    },
    enabled: Boolean(effectiveCommunityId && effectiveWorkspaceId),
  });

  // Fetch workspace milestones for Timeline view
  const { data: milestonesData } = useMilestones(
    effectiveCommunityId,
    effectiveWorkspaceId,
    { enabled: Boolean(effectiveCommunityId && effectiveWorkspaceId) }
  );

  // CSV Export Hook (FEAT-J01a / VS-09F)
  const {
    isExporting,
    canExport,
    feedback: exportFeedback,
    clearFeedback: clearExportFeedback,
    exportFilteredTasksCsv,
  } = useTaskExportCsv({
    communityId: effectiveCommunityId,
    workspaceId: effectiveWorkspaceId,
    activeWorkspace,
  });

  // Reset transition snapshot ID once query has executed
  useEffect(() => {
    if (queryResult && transitionSnapshotIdRef.current) {
      transitionSnapshotIdRef.current = null;
    }
  }, [queryResult]);

  // Backlog Tray Tasks & Count (FEAT-B02 / VS-09G)
  const backlogTasks = useMemo(() => {
    if (queryResult?.backlogPreview && queryResult.backlogPreview.length > 0) {
      return queryResult.backlogPreview;
    }
    if (queryResult?.items) {
      return queryResult.items.filter((t) => t.statusCategory === "BACKLOG");
    }
    return [];
  }, [queryResult]);

  const backlogCount = queryResult?.backlogCount ?? backlogTasks.length;

  // Workspace-Scoped Collapsible Tray Persistence (FEAT-B02 / VS-09G)
  const [isBacklogTrayOpen, setIsBacklogTrayOpen] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.localStorage || !effectiveWorkspaceId) return false;
    try {
      return localStorage.getItem(`sonder:backlog-tray-open:${effectiveWorkspaceId}`) === "true";
    } catch {
      return false;
    }
  });

  const handleToggleBacklogTray = useCallback(() => {
    setIsBacklogTrayOpen((prev) => {
      const next = !prev;
      try {
        if (typeof window !== "undefined" && window.localStorage && effectiveWorkspaceId) {
          localStorage.setItem(`sonder:backlog-tray-open:${effectiveWorkspaceId}`, String(next));
        }
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, [effectiveWorkspaceId]);

  useEffect(() => {
    if (!effectiveWorkspaceId) return;
    try {
      const saved = localStorage.getItem(`sonder:backlog-tray-open:${effectiveWorkspaceId}`);
      setIsBacklogTrayOpen(saved === "true");
    } catch {
      setIsBacklogTrayOpen(false);
    }
  }, [effectiveWorkspaceId]);

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
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        onSortOrderToggle={handleSortOrderToggle}
        includeBacklog={includeBacklog}
        onIncludeBacklogChange={handleIncludeBacklogChange}
        totalCount={totalCount}
        isFetching={isTasksFetching}
        onRefresh={() => refetchTasks()}
        onExportCsv={() => exportFilteredTasksCsv(querySpec)}
        isExporting={isExporting}
        canExport={canExport}
      />

      {/* Export CSV status / error feedback banner */}
      {exportFeedback && (
        <div
          role={exportFeedback.type === "error" ? "alert" : "status"}
          aria-live={exportFeedback.type === "error" ? "assertive" : "polite"}
          data-testid={`export-feedback-${exportFeedback.type}`}
          className={cn(
            "flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs border transition-all",
            exportFeedback.type === "error" &&
              "bg-[var(--status-canceled-surface)] border-[var(--status-canceled-border)] text-[var(--status-canceled-text)]",
            exportFeedback.type === "success" &&
              "bg-[var(--status-done-surface)] border-[var(--status-done-border)] text-[var(--status-done-text)]",
            exportFeedback.type === "info" &&
              "bg-[var(--surface-muted)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
          )}
        >
          <div className="flex items-center gap-2">
            {exportFeedback.type === "error" ? (
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : exportFeedback.type === "success" ? (
              <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>{exportFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={clearExportFeedback}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            aria-label="Dismiss export notice"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Primary View Projection (List, Board, Calendar, or Timeline) */}
      {activeView === "list" ? (
        <TaskListView
          tasks={queryResult?.items ?? []}
          backlogTasks={backlogTasks}
          backlogCount={backlogCount}
          isBacklogOpen={isBacklogTrayOpen}
          onToggleBacklog={handleToggleBacklogTray}
          isLoading={isTasksLoading}
          isError={isTasksError}
          error={tasksError}
          onRetry={() => refetchTasks()}
          workspaceId={effectiveWorkspaceId}
          communityId={effectiveCommunityId!}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleColumnSortChange}
        />
      ) : activeView === "board" ? (
        <TaskBoardView
          groups={queryResult?.groups ?? []}
          backlogTasks={backlogTasks}
          backlogCount={backlogCount}
          isBacklogOpen={isBacklogTrayOpen}
          onToggleBacklog={handleToggleBacklogTray}
          isLoading={isTasksLoading}
          isError={isTasksError}
          error={tasksError}
          onRetry={() => refetchTasks()}
          workspaceId={effectiveWorkspaceId}
          communityId={effectiveCommunityId!}
          selectedMobileStage={mobileStage}
          onSelectMobileStage={handleSelectMobileStage}
        />
      ) : activeView === "calendar" ? (
        <CalendarView
          tasks={queryResult?.items ?? []}
          unscheduledTasks={queryResult?.unscheduledPreview ?? []}
          isLoading={isTasksLoading}
          isError={isTasksError}
          errorMessage={tasksError?.message}
          onRetry={() => refetchTasks()}
          calendarMode={calendarMode}
          onCalendarModeChange={handleCalendarModeChange}
          currentDate={calendarDate}
          onCurrentDateChange={handleCalendarDateChange}
          onTaskClick={(task) =>
            openTask(task.taskKey, {
              workspaceId: effectiveWorkspaceId ?? undefined,
            })
          }
          onCreateTask={handleCalendarCreateTask}
        />
      ) : (
        <TimelineView
          tasks={queryResult?.items ?? []}
          unscheduledTasks={queryResult?.unscheduledPreview ?? []}
          milestones={milestonesData?.items ?? []}
          dependencyEdges={queryResult?.dependencyEdges ?? []}
          isLoading={isTasksLoading}
          isError={isTasksError}
          errorMessage={tasksError?.message}
          onRetry={() => refetchTasks()}
          timelineMode={timelineMode}
          onTimelineModeChange={handleTimelineModeChange}
          currentDate={calendarDate}
          onCurrentDateChange={handleCalendarDateChange}
          workspaceId={effectiveWorkspaceId!}
          communityId={effectiveCommunityId!}
          onTaskClick={(task) =>
            openTask(task.taskKey, {
              workspaceId: effectiveWorkspaceId ?? undefined,
            })
          }
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

export function WorkspaceTasksView(props: WorkspaceTasksViewProps): React.JSX.Element {
  const undoContext = useContext(TaskUndoContext);
  const cloneContext = useContext(TaskCloneContext);
  const isUndoWrapped = undoContext !== defaultTaskUndoContextValue;
  const isCloneWrapped = cloneContext !== defaultTaskCloneContextValue;

  let content = <WorkspaceTasksViewInner {...props} />;

  if (!isCloneWrapped) {
    content = (
      <TaskCloneProvider>
        {content}
        <TaskCloneToast />
      </TaskCloneProvider>
    );
  }

  if (!isUndoWrapped) {
    content = (
      <TaskUndoProvider>
        {content}
        <TaskUndoToast />
      </TaskUndoProvider>
    );
  }

  return content;
}
