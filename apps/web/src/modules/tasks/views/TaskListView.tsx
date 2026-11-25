import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Feedback } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useTaskPeekDrawer } from "../useTaskPeekDrawer";
import { BulkActionBar } from "./BulkActionBar.js";
import { BacklogTaskTray } from "./BacklogTaskTray.js";
import { useBulkMutateTasks } from "../useBulkMutateTasks.js";
import { taskQueryKey } from "../useTask.js";
import { InlineCreationRow, type PendingTaskItem } from "../InlineCreationRow.js";
import { PendingTaskRow } from "./PendingTaskRow.js";
import { TaskListRow } from "./TaskListRow.js";
import { TaskListTreeRow } from "./TaskListTreeRow.js";
import { buildTaskTree, useTaskTreeExpansion } from "../hierarchy/index.js";
import { useTaskViewDensity, type TaskViewDensity } from "../density/index.js";
import type { TaskDto, TaskStatusCategory, TaskPriority } from "../types";

export interface TaskListViewProps {
  tasks: TaskDto[];
  backlogTasks?: TaskDto[];
  backlogCount?: number;
  isBacklogOpen?: boolean;
  onToggleBacklog?: () => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
  workspaceId: string;
  communityId: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSortChange?: (field: string, direction: "asc" | "desc") => void;
  density?: TaskViewDensity;
  maxSubtaskDepth?: number;
  enableTreeHierarchy?: boolean;
  searchQuery?: string;
  className?: string;
}

export function TaskListView({
  tasks,
  backlogTasks,
  backlogCount,
  isBacklogOpen: propIsBacklogOpen,
  onToggleBacklog: propOnToggleBacklog,
  isLoading,
  isError,
  error,
  onRetry,
  workspaceId,
  communityId,
  sortBy = "priority",
  sortOrder = "desc",
  onSortChange,
  density: propDensity,
  maxSubtaskDepth,
  enableTreeHierarchy = false,
  searchQuery = "",
  className,
}: TaskListViewProps): React.JSX.Element {
  const { openTask } = useTaskPeekDrawer();
  const densityContext = useTaskViewDensity();
  const effectiveDensity = propDensity ?? densityContext.density;
  const isCompact = effectiveDensity === "compact";
  const headerCellPadding = isCompact ? "py-1.5 px-3" : "py-0 px-3";
  const bodyCellPadding = isCompact ? "py-1 px-3" : "py-0 px-3";

  const [internalBacklogOpen, setInternalBacklogOpen] = useState(false);
  const [pendingTask, setPendingTask] = useState<PendingTaskItem | null>(null);
  const isTrayOpen = propIsBacklogOpen ?? internalBacklogOpen;
  const handleToggleTray = propOnToggleBacklog ?? (() => setInternalBacklogOpen((prev) => !prev));

  const effectiveBacklogCount = backlogCount ?? (backlogTasks ? backlogTasks.length : 0);
  const effectiveBacklogTasks = backlogTasks ?? [];

  const queryClient = useQueryClient();

  // Ancestor lookup from authorized same-workspace cache
  const getAncestorTask = useCallback(
    (parentTaskId: string): TaskDto | undefined => {
      // 1. Direct query lookup for this single task
      const single = queryClient.getQueryData<TaskDto>(
        taskQueryKey(communityId, workspaceId, parentTaskId)
      );
      if (single && single.workspaceId === workspaceId) {
        return single;
      }

      // 2. Check all loaded queries for this community and workspace
      const allQueries = queryClient.getQueriesData<{
        items?: TaskDto[];
        backlogPreview?: TaskDto[];
        groups?: Array<{ items?: TaskDto[] }>;
      }>({
        queryKey: ["communities", communityId, "workspaces", workspaceId, "tasks"],
      });

      for (const [, data] of allQueries) {
        if (data?.items) {
          const found = data.items.find(
            (t) => t.id === parentTaskId && t.workspaceId === workspaceId
          );
          if (found) return found;
        }
        if (data?.backlogPreview) {
          const found = data.backlogPreview.find(
            (t) => t.id === parentTaskId && t.workspaceId === workspaceId
          );
          if (found) return found;
        }
        if (data?.groups) {
          for (const group of data.groups) {
            if (group.items) {
              const found = group.items.find(
                (t) => t.id === parentTaskId && t.workspaceId === workspaceId
              );
              if (found) return found;
            }
          }
        }
      }

      // 3. Check backlog tasks if available
      if (backlogTasks) {
        const foundBacklog = backlogTasks.find(
          (t) => t.id === parentTaskId && t.workspaceId === workspaceId
        );
        if (foundBacklog) return foundBacklog;
      }

      return undefined;
    },
    [queryClient, communityId, workspaceId, backlogTasks]
  );

  const matchingTaskIds = useMemo(() => new Set(tasks.map((t) => t.id)), [tasks]);

  const treeResult = useMemo(() => {
    if (!enableTreeHierarchy) return null;
    return buildTaskTree(tasks, {
      maxSubtaskDepth,
      getAncestorTask,
      matchingTaskIds,
    });
  }, [tasks, enableTreeHierarchy, maxSubtaskDepth, getAncestorTask, matchingTaskIds]);

  const {
    visibleNodes,
    isExpanded,
    toggleExpanded,
  } = useTaskTreeExpansion({
    workspaceId,
    treeResult,
    searchQuery,
  });

  // Loaded matching tasks (excludes context-only ancestors)
  const matchingTasks = useMemo(() => {
    if (enableTreeHierarchy && treeResult) {
      return treeResult.flatNodes.filter((n) => !n.isContextOnly).map((n) => n.task);
    }
    return tasks;
  }, [enableTreeHierarchy, treeResult, tasks]);

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const bulkMutate = useBulkMutateTasks();

  // Reset selection when active workspace changes
  useEffect(() => {
    setSelectedTaskIds(new Set());
  }, [workspaceId]);

  // Context-only ancestors actually present in the current hierarchy
  const contextAncestorIds = useMemo(() => {
    if (!enableTreeHierarchy || !treeResult) return new Set<string>();
    const ids = new Set<string>();
    for (const node of treeResult.flatNodes) {
      if (node.isContextOnly) {
        ids.add(node.task.id);
      }
    }
    return ids;
  }, [enableTreeHierarchy, treeResult]);

  // 1. Matching selected count (selected tasks matching the active query/filter)
  const matchingSelectedCount = useMemo(() => {
    let count = 0;
    for (const id of selectedTaskIds) {
      if (matchingTaskIds.has(id)) count++;
    }
    return count;
  }, [selectedTaskIds, matchingTaskIds]);

  // 2. Context selected count (selected context ancestors present in current hierarchy)
  const contextSelectedCount = useMemo(() => {
    let count = 0;
    for (const id of selectedTaskIds) {
      if (contextAncestorIds.has(id)) count++;
    }
    return count;
  }, [selectedTaskIds, contextAncestorIds]);

  // 3. Previously selected tasks retained from earlier filters outside the current result
  const outsideFilterSelectedCount = useMemo(() => {
    return Math.max(0, selectedTaskIds.size - matchingSelectedCount - contextSelectedCount);
  }, [selectedTaskIds.size, matchingSelectedCount, contextSelectedCount]);

  // Maximum selectable matching tasks (established API cap = 100)
  const maxSelectable = Math.min(matchingTasks.length, 100);
  const eligibleMatchingTasks = useMemo(
    () => matchingTasks.slice(0, maxSelectable),
    [matchingTasks, maxSelectable]
  );
  const eligibleMatchingIds = useMemo(
    () => new Set(eligibleMatchingTasks.map((t) => t.id)),
    [eligibleMatchingTasks]
  );

  // Eligible matching selections count (strictly first 100 matching tasks)
  const eligibleSelectedCount = useMemo(() => {
    let count = 0;
    for (const id of selectedTaskIds) {
      if (eligibleMatchingIds.has(id)) count++;
    }
    return count;
  }, [selectedTaskIds, eligibleMatchingIds]);

  // Select All is checked ONLY when every eligible ID is selected
  const isAllSelected =
    eligibleMatchingTasks.length > 0 &&
    eligibleSelectedCount === eligibleMatchingTasks.length;

  // Indeterminate when some, but not all, eligible IDs are selected
  // (Tasks 101-200, context ancestors, or outside-filter selections do NOT trigger indeterminate)
  const isIndeterminate = eligibleSelectedCount > 0 && !isAllSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const canAddMoreEligible =
    selectedTaskIds.size < 100 &&
    eligibleSelectedCount < eligibleMatchingTasks.length;

  const isSelectionLimitReached = selectedTaskIds.size >= 100;
  const isSelectAllDisabled = isSelectionLimitReached && eligibleSelectedCount === 0;

  let selectAllAriaLabel = "";
  let selectAllTitle: string | undefined = undefined;

  if (matchingTasks.length === 0) {
    selectAllAriaLabel = "No matching tasks to select";
    selectAllTitle = "No matching tasks";
  } else if (isAllSelected) {
    selectAllAriaLabel =
      matchingTasks.length > 100
        ? "Deselect first 100 matching tasks"
        : "Deselect all tasks";
    selectAllTitle = "Deselect matching tasks";
  } else if (isSelectionLimitReached && eligibleSelectedCount > 0) {
    const blockerInfo =
      outsideFilterSelectedCount > 0
        ? `${outsideFilterSelectedCount} selection outside current filter is consuming capacity`
        : `${contextSelectedCount} context selection is consuming capacity`;
    selectAllAriaLabel = `Deselect ${eligibleSelectedCount} matching tasks (selection cap of 100 reached; ${blockerInfo})`;
    selectAllTitle = `Selection cap of 100 reached (${blockerInfo}). Click to deselect matching tasks and free capacity.`;
  } else if (isSelectionLimitReached && eligibleSelectedCount === 0) {
    const blockerInfo =
      outsideFilterSelectedCount > 0
        ? `${outsideFilterSelectedCount} selection outside current filter is consuming capacity`
        : `${contextSelectedCount} context selection is consuming capacity`;
    selectAllAriaLabel = `Select matching tasks disabled: selection cap of 100 reached (${blockerInfo})`;
    selectAllTitle = `Selection cap of 100 reached (${blockerInfo}). Deselect tasks or clear selection to free capacity.`;
  } else if (matchingTasks.length > 100) {
    const remainingEligible = Math.min(100 - selectedTaskIds.size, eligibleMatchingTasks.length);
    if ((outsideFilterSelectedCount > 0 || contextSelectedCount > 0) && remainingEligible < 100) {
      const blockerInfo =
        outsideFilterSelectedCount > 0
          ? `${outsideFilterSelectedCount} outside filter`
          : `${contextSelectedCount} context`;
      selectAllAriaLabel = `Select ${remainingEligible} of ${matchingTasks.length} matching tasks (100 cap, ${blockerInfo} consuming capacity)`;
      selectAllTitle = `Select up to ${remainingEligible} matching tasks (100 cap reached with ${blockerInfo})`;
    } else {
      selectAllAriaLabel = `Select first 100 of ${matchingTasks.length} matching tasks (100 cap)`;
      selectAllTitle = `Select first 100 of ${matchingTasks.length} matching tasks (100 cap)`;
    }
  } else {
    const remainingEligible = Math.min(100 - selectedTaskIds.size, eligibleMatchingTasks.length);
    if ((outsideFilterSelectedCount > 0 || contextSelectedCount > 0) && remainingEligible < matchingTasks.length) {
      selectAllAriaLabel = `Select ${remainingEligible} of ${matchingTasks.length} matching tasks (100 cap)`;
      selectAllTitle = `Select up to ${remainingEligible} matching tasks (100 cap)`;
    } else {
      selectAllAriaLabel = "Select all tasks";
      selectAllTitle = "Select all tasks";
    }
  }

  // Reconcile selection only when a task's removal is established (e.g. archived)
  useEffect(() => {
    setSelectedTaskIds((prev) => {
      if (prev.size === 0) return prev;
      let needsPruning = false;
      const toRemove = new Set<string>();

      // Remove any task observed as archived
      for (const t of tasks) {
        if (t.archivedAt && prev.has(t.id)) {
          toRemove.add(t.id);
          needsPruning = true;
        }
      }
      if (treeResult) {
        for (const node of treeResult.flatNodes) {
          if (node.task.archivedAt && prev.has(node.task.id)) {
            toRemove.add(node.task.id);
            needsPruning = true;
          }
        }
      }

      if (!needsPruning) return prev;
      const next = new Set(prev);
      for (const id of toRemove) {
        next.delete(id);
      }
      return next;
    });
  }, [tasks, treeResult]);

  const handleToggleSelectTask = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        if (next.size < 100) {
          next.add(taskId);
        }
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected || !canAddMoreEligible) {
      // Clear matching selections while preserving any individual context selections
      setSelectedTaskIds((prev) => {
        const next = new Set(prev);
        for (const t of eligibleMatchingTasks) {
          next.delete(t.id);
        }
        return next;
      });
    } else {
      setSelectedTaskIds((prev) => {
        const next = new Set(prev);
        for (const t of eligibleMatchingTasks) {
          if (next.size < 100) {
            next.add(t.id);
          }
        }
        return next;
      });
    }
  };

  const handleBulkArchive = async () => {
    if (selectedTaskIds.size === 0) return;
    try {
      await bulkMutate.mutateAsync({
        communityId,
        workspaceId,
        data: {
          taskIds: Array.from(selectedTaskIds),
          action: "ARCHIVE",
        },
      });
      setSelectedTaskIds(new Set());
    } catch {
      // Error state handled by mutation
    }
  };

  const handleBulkStatusChange = async (statusCategory: TaskStatusCategory) => {
    if (selectedTaskIds.size === 0) return;
    try {
      await bulkMutate.mutateAsync({
        communityId,
        workspaceId,
        data: {
          taskIds: Array.from(selectedTaskIds),
          action: "SET_STATUS",
          statusCategory,
        },
      });
      setSelectedTaskIds(new Set());
    } catch {
      // Error state handled by mutation
    }
  };

  const handleBulkPriorityChange = async (priority: TaskPriority) => {
    if (selectedTaskIds.size === 0) return;
    try {
      await bulkMutate.mutateAsync({
        communityId,
        workspaceId,
        data: {
          taskIds: Array.from(selectedTaskIds),
          action: "SET_PRIORITY",
          priority,
        },
      });
      setSelectedTaskIds(new Set());
    } catch {
      // Error state handled by mutation
    }
  };

  const handleSortClick = (field: string) => {
    if (!onSortChange) return;
    if (sortBy === field) {
      const nextOrder = sortOrder === "asc" ? "desc" : "asc";
      onSortChange(field, nextOrder);
    } else {
      const defaultOrder = (field === "priority" ? "desc" : "asc");
      onSortChange(field, defaultOrder);
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div
        data-testid="task-list-loading"
        className={cn("space-y-2 p-1", className)}
        role="status"
        aria-label="Loading tasks"
      >
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div data-testid="task-list-error" className={cn("p-4", className)}>
        <Feedback variant="danger" title="Failed to load tasks">
          <div className="space-y-2 mt-1">
            <p>{error?.message || "An unexpected error occurred while fetching tasks."}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </Button>
          </div>
        </Feedback>
      </div>
    );
  }

  // Empty state
  if (tasks.length === 0) {
    return (
      <div
        id="tasks-list-panel"
        role="tabpanel"
        aria-labelledby="tab-view-list"
        data-testid="task-list-view"
        className={cn("space-y-4", className)}
      >
        <div data-testid="task-list-empty" className="py-8">
          <EmptyState
            title="No tasks match the active filters"
            description="Adjust your search query, priority, or status filters, or press 'C' to create a new task."
            action={
              <div className="w-full max-w-xs mt-2 flex flex-col items-center">
                {pendingTask && (
                  <div
                    data-testid="task-list-pending-row"
                    role="status"
                    aria-label={`Creating task: ${pendingTask.title}`}
                    className="flex items-center gap-2 p-2 mb-2 rounded-lg bg-[var(--surface-muted)]/50 border border-[var(--border-subtle)] opacity-70 text-xs w-full text-left"
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--brand-accent-text)] shrink-0" aria-hidden="true" />
                    <span
                      data-testid="pending-task-badge"
                      className="px-1.5 py-0.5 rounded bg-[var(--surface-muted)] font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-wider uppercase"
                    >
                      Pending
                    </span>
                    <span
                      data-testid="pending-task-title"
                      className="font-medium text-[var(--text-secondary)] italic truncate"
                    >
                      {pendingTask.title}
                    </span>
                  </div>
                )}
                <InlineCreationRow
                  communityId={communityId}
                  workspaceId={workspaceId}
                  variant="plain"
                  triggerLabel="New task..."
                  onPendingChange={setPendingTask}
                  className="w-full justify-center"
                />
              </div>
            }
          />
        </div>
        <BacklogTaskTray
          tasks={effectiveBacklogTasks}
          totalCount={effectiveBacklogCount}
          isOpen={isTrayOpen}
          onToggle={handleToggleTray}
          onTaskClick={(task) => openTask(task.taskKey, { workspaceId })}
          workspaceId={workspaceId}
          communityId={communityId}
          viewType="list"
        />
      </div>
    );
  }

  return (
    <div
      id="tasks-list-panel"
      role="tabpanel"
      aria-labelledby="tab-view-list"
      data-testid="task-list-view"
      className={cn(
        "bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-2xs",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-0 text-xs" aria-label="Tasks table">
          <thead>
            <tr className={cn(isCompact ? "h-9" : "h-10", "border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-muted)] font-semibold select-none shadow-[inset_0_-1px_0_var(--border-subtle)]")}>
              {/* Multi-Select Header Checkbox */}
              <th scope="col" className={cn(headerCellPadding, "w-10 text-center")}>
                <label className={cn(
                  "inline-flex items-center justify-center cursor-pointer rounded select-none",
                  isCompact ? "min-h-[24px] min-w-[24px]" : "min-h-[44px] min-w-[44px] h-11 w-11"
                )}>
                  <input
                    type="checkbox"
                    aria-label={selectAllAriaLabel}
                    title={selectAllTitle}
                    disabled={isSelectAllDisabled}
                    data-testid="bulk-select-all"
                    ref={headerCheckboxRef}
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand-accent-btn-bg)] focus:ring-[var(--border-focus)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </label>
              </th>

              {/* Sortable: Key */}
              <th
                scope="col"
                aria-sort={
                  sortBy === "currentKey"
                    ? sortOrder === "desc"
                      ? "descending"
                      : "ascending"
                    : "none"
                }
                className={cn(headerCellPadding, "w-28 font-mono")}
              >
                <button
                  type="button"
                  onClick={() => handleSortClick("currentKey")}
                  aria-label={`Sort by Key, currently ${
                    sortBy === "currentKey"
                      ? sortOrder === "desc"
                        ? "descending"
                        : "ascending"
                      : "not sorted"
                  }`}
                  data-testid="sort-header-currentKey"
                  className="inline-flex items-center gap-1.5 font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-ring rounded py-0.5 px-1 -mx-1 transition-colors cursor-pointer"
                >
                  <span>Key</span>
                  {sortBy === "currentKey" ? (
                    sortOrder === "desc" ? (
                      <ArrowDown className="h-3 w-3 text-[var(--brand-accent-text)]" aria-hidden="true" />
                    ) : (
                      <ArrowUp className="h-3 w-3 text-[var(--brand-accent-text)]" aria-hidden="true" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" aria-hidden="true" />
                  )}
                </button>
              </th>

              {/* Non-sortable: Title */}
              <th scope="col" className={cn(headerCellPadding, "min-w-[200px]")}>
                Title
              </th>

              {/* Non-sortable: Status */}
              <th scope="col" className={cn(headerCellPadding, "w-32")}>
                Status
              </th>

              {/* Non-sortable: Assignee */}
              <th scope="col" className={cn(headerCellPadding, "w-32")}>
                Assignee
              </th>

              {/* Sortable: Priority */}
              <th
                scope="col"
                aria-sort={
                  sortBy === "priority"
                    ? sortOrder === "desc"
                      ? "descending"
                      : "ascending"
                    : "none"
                }
                className={cn(headerCellPadding, "w-28")}
              >
                <button
                  type="button"
                  onClick={() => handleSortClick("priority")}
                  aria-label={`Sort by Priority, currently ${
                    sortBy === "priority"
                      ? sortOrder === "desc"
                        ? "descending"
                        : "ascending"
                      : "not sorted"
                  }`}
                  data-testid="sort-header-priority"
                  className="inline-flex items-center gap-1.5 font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-ring rounded py-0.5 px-1 -mx-1 transition-colors cursor-pointer"
                >
                  <span>Priority</span>
                  {sortBy === "priority" ? (
                    sortOrder === "desc" ? (
                      <ArrowDown className="h-3 w-3 text-[var(--brand-accent-text)]" aria-hidden="true" />
                    ) : (
                      <ArrowUp className="h-3 w-3 text-[var(--brand-accent-text)]" aria-hidden="true" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" aria-hidden="true" />
                  )}
                </button>
              </th>

              {/* Sortable: Due Date */}
              <th
                scope="col"
                aria-sort={
                  sortBy === "dueDate"
                    ? sortOrder === "desc"
                      ? "descending"
                      : "ascending"
                    : "none"
                }
                className={cn(headerCellPadding, "w-32")}
              >
                <button
                  type="button"
                  onClick={() => handleSortClick("dueDate")}
                  aria-label={`Sort by Due Date, currently ${
                    sortBy === "dueDate"
                      ? sortOrder === "desc"
                        ? "descending"
                        : "ascending"
                      : "not sorted"
                  }`}
                  data-testid="sort-header-dueDate"
                  className="inline-flex items-center gap-1.5 font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-ring rounded py-0.5 px-1 -mx-1 transition-colors cursor-pointer"
                >
                  <span>Due Date</span>
                  {sortBy === "dueDate" ? (
                    sortOrder === "desc" ? (
                      <ArrowDown className="h-3 w-3 text-[var(--brand-accent-text)]" aria-hidden="true" />
                    ) : (
                      <ArrowUp className="h-3 w-3 text-[var(--brand-accent-text)]" aria-hidden="true" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" aria-hidden="true" />
                  )}
                </button>
              </th>

              {/* Non-sortable: Subtasks */}
              <th scope="col" className={cn(headerCellPadding, "w-28 text-center")}>
                Subtasks
              </th>

              {/* Actions */}
              <th scope="col" className={cn(headerCellPadding, "w-10 text-right")}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {enableTreeHierarchy && treeResult
              ? visibleNodes.map((node) => (
                  <TaskListTreeRow
                    key={node.task.id}
                    node={node}
                    workspaceId={workspaceId}
                    communityId={communityId}
                    density={effectiveDensity}
                    isSelected={selectedTaskIds.has(node.task.id)}
                    isSelectionDisabled={isSelectionLimitReached}
                    onToggleSelect={handleToggleSelectTask}
                    onOpenTask={(taskKey) => openTask(taskKey, { workspaceId })}
                    bodyCellPadding={bodyCellPadding}
                    isCompact={isCompact}
                    isExpanded={isExpanded(node.task.id)}
                    onToggleExpand={toggleExpanded}
                  />
                ))
              : tasks.map((task) => (
                  <TaskListRow
                    key={task.id}
                    task={task}
                    workspaceId={workspaceId}
                    communityId={communityId}
                    density={effectiveDensity}
                    isSelected={selectedTaskIds.has(task.id)}
                    isSelectionDisabled={isSelectionLimitReached}
                    onToggleSelect={handleToggleSelectTask}
                    onOpenTask={(taskKey) => openTask(taskKey, { workspaceId })}
                    bodyCellPadding={bodyCellPadding}
                    isCompact={isCompact}
                  />
                ))}

            {/* Transient Pending-Task Row (WP-A4) */}
            {pendingTask && (
              <PendingTaskRow pendingTask={pendingTask} density={effectiveDensity} />
            )}

            {/* Persistent Inline Task Creation Row (WP-A3) */}
            <InlineCreationRow
              communityId={communityId}
              workspaceId={workspaceId}
              variant="list"
              colSpan={9}
              onPendingChange={setPendingTask}
              density={effectiveDensity}
            />
          </tbody>
        </table>
      </div>

      {/* Collapsible Backlog Tray (FEAT-B02 / VS-09G) */}
      <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)]/30">
        <BacklogTaskTray
          tasks={effectiveBacklogTasks}
          totalCount={effectiveBacklogCount}
          isOpen={isTrayOpen}
          onToggle={handleToggleTray}
          onTaskClick={(task) => openTask(task.taskKey, { workspaceId })}
          workspaceId={workspaceId}
          communityId={communityId}
          viewType="list"
        />
      </div>

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedTaskIds.size}
        totalCount={matchingTasks.length}
        matchingCount={matchingSelectedCount}
        contextCount={contextSelectedCount}
        outsideCount={outsideFilterSelectedCount}
        maxLimit={100}
        onClearSelection={() => setSelectedTaskIds(new Set())}
        onArchive={handleBulkArchive}
        onStatusChange={handleBulkStatusChange}
        onPriorityChange={handleBulkPriorityChange}
        isMutating={bulkMutate.isPending}
      />
    </div>
  );
}
