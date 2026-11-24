import React, { useState, useRef, useEffect } from "react";
import {
  RefreshCw,
  GitFork,
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
import { TaskActionsMenu } from "../TaskActionsMenu.js";
import { TaskArchetypeBadge } from "../TaskArchetypeBadge.js";
import { BulkActionBar } from "./BulkActionBar.js";
import { BacklogTaskTray } from "./BacklogTaskTray.js";
import { useBulkMutateTasks } from "../useBulkMutateTasks.js";
import { InlineTitleCell } from "../cells/InlineTitleCell.js";
import { InlineStatusCell } from "../cells/InlineStatusCell.js";
import { InlinePriorityCell } from "../cells/InlinePriorityCell.js";
import { InlineAssigneeCell } from "../cells/InlineAssigneeCell.js";
import { InlineDueDateCell } from "../cells/InlineDueDateCell.js";
import { InlineCreationRow, type PendingTaskItem } from "../InlineCreationRow.js";
import { PendingTaskRow } from "./PendingTaskRow.js";
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
  className,
}: TaskListViewProps): React.JSX.Element {
  const { openTask } = useTaskPeekDrawer();
  const densityContext = useTaskViewDensity();
  const effectiveDensity = propDensity ?? densityContext.density;
  const isCompact = effectiveDensity === "compact";
  const headerCellPadding = isCompact ? "py-1.5 px-3" : "py-2 px-3";
  const bodyCellPadding = isCompact ? "py-1 px-3" : "py-1.5 px-3";

  const [internalBacklogOpen, setInternalBacklogOpen] = useState(false);
  const [pendingTask, setPendingTask] = useState<PendingTaskItem | null>(null);
  const isTrayOpen = propIsBacklogOpen ?? internalBacklogOpen;
  const handleToggleTray = propOnToggleBacklog ?? (() => setInternalBacklogOpen((prev) => !prev));

  const effectiveBacklogCount = backlogCount ?? (backlogTasks ? backlogTasks.length : 0);
  const effectiveBacklogTasks = backlogTasks ?? [];

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const bulkMutate = useBulkMutateTasks();

  const maxSelectable = Math.min(tasks.length, 100);
  const isAllSelected =
    tasks.length > 0 &&
    selectedTaskIds.size >= maxSelectable &&
    tasks.slice(0, 100).every((t) => selectedTaskIds.has(t.id));
  const isIndeterminate = selectedTaskIds.size > 0 && !isAllSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

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
    if (isAllSelected) {
      setSelectedTaskIds(new Set());
    } else {
      const toSelect = tasks.slice(0, 100).map((t) => t.id);
      setSelectedTaskIds(new Set(toSelect));
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
        <table className="w-full text-left border-collapse text-xs" aria-label="Tasks table">
          <thead>
            <tr className={cn(isCompact ? "h-9" : "h-10", "border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-muted)] font-semibold select-none")}>
              {/* Multi-Select Header Checkbox */}
              <th scope="col" className={cn(headerCellPadding, "w-10 text-center")}>
                <input
                  type="checkbox"
                  aria-label="Select all tasks"
                  data-testid="bulk-select-all"
                  ref={headerCheckboxRef}
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand-accent-btn-bg)] focus:ring-[var(--border-focus)] cursor-pointer"
                />
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
              <th scope="col" className={cn(headerCellPadding, "w-24 text-center")}>
                Subtasks
              </th>

              {/* Actions */}
              <th scope="col" className={cn(headerCellPadding, "w-10 text-right")}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {tasks.map((task) => {
              const handleRowClick = () => {
                openTask(task.taskKey, { workspaceId });
              };

              const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleRowClick();
                }
              };

              return (
                <tr
                  key={task.id}
                  data-testid={`task-list-row-${task.taskKey}`}
                  data-density={effectiveDensity}
                  tabIndex={0}
                  onClick={handleRowClick}
                  onKeyDown={handleKeyDown}
                  style={{ height: isCompact ? "38px" : "44px" }}
                  className={cn(
                    isCompact ? "h-[38px]" : "h-11",
                    "hover:bg-[var(--surface-muted)] transition-colors cursor-pointer focus:bg-[var(--surface-muted)] focus:outline-none focus:ring-1 focus:ring-inset focus:ring-[var(--border-focus)] group",
                    selectedTaskIds.has(task.id) && "bg-[var(--surface-muted)]"
                  )}
                >
                  {/* Selection Checkbox */}
                  <td
                    className={cn(bodyCellPadding, "w-10 text-center")}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Select task ${task.taskKey}`}
                      data-testid={`bulk-select-task-${task.taskKey}`}
                      checked={selectedTaskIds.has(task.id)}
                      onChange={() => handleToggleSelectTask(task.id)}
                      className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand-accent-btn-bg)] focus:ring-[var(--border-focus)] cursor-pointer"
                    />
                  </td>

                  {/* Task Key */}
                  <td className={cn(bodyCellPadding, "font-mono font-bold text-[var(--brand-accent-text)] tabular-nums")}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick();
                      }}
                      className={cn(
                        "hover:underline focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] rounded inline-flex items-center",
                        isCompact ? "min-h-[24px] min-w-[24px] py-0.5 px-1" : "min-h-[28px] py-0.5 px-1"
                      )}
                    >
                      {task.taskKey}
                    </button>
                  </td>

                  {/* Title & Hierarchy parent badge */}
                  <td className={cn(bodyCellPadding, "min-w-[200px]")}>
                    <div className="flex items-center gap-2">
                      <TaskArchetypeBadge archetype={task.itemType} size="sm" showLabel={false} />
                      {task.parentTaskId && (
                        <span
                          title="Subtask"
                          className="inline-flex items-center text-[var(--text-muted)] shrink-0"
                        >
                          <GitFork className="h-3 w-3 rotate-180" />
                        </span>
                      )}
                      <InlineTitleCell
                        task={task}
                        communityId={communityId}
                        workspaceId={workspaceId}
                        className="flex-1 min-w-0"
                      />
                    </div>
                  </td>

                  {/* Status Category */}
                  <td className={cn(bodyCellPadding, "w-32")}>
                    <InlineStatusCell
                      task={task}
                      communityId={communityId}
                      workspaceId={workspaceId}
                      density={effectiveDensity}
                    />
                  </td>

                  {/* Assignee */}
                  <td className={cn(bodyCellPadding, "w-32")} data-testid={`task-list-assignee-${task.taskKey}`}>
                    <InlineAssigneeCell
                      task={task}
                      communityId={communityId}
                      workspaceId={workspaceId}
                    />
                  </td>

                  {/* Priority */}
                  <td className={cn(bodyCellPadding, "w-28")}>
                    <InlinePriorityCell
                      task={task}
                      communityId={communityId}
                      workspaceId={workspaceId}
                      density={effectiveDensity}
                    />
                  </td>

                  {/* Due Date */}
                  <td className={cn(bodyCellPadding, "w-32")}>
                    <InlineDueDateCell
                      task={task}
                      communityId={communityId}
                      workspaceId={workspaceId}
                    />
                  </td>

                  {/* Subtask indicator */}
                  <td className={cn(bodyCellPadding, "w-24 text-center text-[var(--text-muted)]")}>
                    {task.parentTaskId ? (
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--surface-muted)]">
                        child
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)] text-[11px]">—</span>
                    )}
                  </td>

                  {/* Actions Menu */}
                  <td
                    className={cn(bodyCellPadding, "w-10 text-right")}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <TaskActionsMenu
                      task={task}
                      workspaceId={workspaceId}
                      communityId={communityId}
                    />
                  </td>
                </tr>
              );
            })}

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
        totalCount={tasks.length}
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
