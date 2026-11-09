import React from "react";
import {
  Calendar,
  RefreshCw,
  GitFork,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Feedback } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useTaskPeekDrawer } from "../useTaskPeekDrawer";
import type { TaskDto, TaskStatusCategory, TaskPriority } from "../types";

export interface TaskListViewProps {
  tasks: TaskDto[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
  workspaceId: string;
  communityId: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSortChange?: (field: string, direction: "asc" | "desc") => void;
  className?: string;
}

function formatStatus(status: TaskStatusCategory): string {
  switch (status) {
    case "BACKLOG":
      return "Backlog";
    case "TODO":
      return "To Do";
    case "IN_PROGRESS":
      return "In Progress";
    case "DONE":
      return "Done";
    case "CANCELED":
      return "Canceled";
    default:
      return status;
  }
}

function formatPriority(priority: TaskPriority): string {
  switch (priority) {
    case "URGENT":
      return "Urgent";
    case "HIGH":
      return "High";
    case "MEDIUM":
      return "Medium";
    case "LOW":
      return "Low";
    case "NONE":
      return "None";
    default:
      return priority;
  }
}

export function TaskListView({
  tasks,
  isLoading,
  isError,
  error,
  onRetry,
  workspaceId,
  communityId: _communityId,
  sortBy = "priority",
  sortOrder = "desc",
  onSortChange,
  className,
}: TaskListViewProps): React.JSX.Element {
  const { openTask } = useTaskPeekDrawer();

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
      <div data-testid="task-list-empty" className={cn("py-8", className)}>
        <EmptyState
          title="No tasks match the active filters"
          description="Adjust your search query, priority, or status filters, or press 'C' to create a new task."
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
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-muted)] font-semibold select-none">
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
                className="py-2.5 px-3 w-28 font-mono"
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
              <th scope="col" className="py-2.5 px-3 min-w-[200px]">
                Title
              </th>

              {/* Non-sortable: Status */}
              <th scope="col" className="py-2.5 px-3 w-32">
                Status
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
                className="py-2.5 px-3 w-28"
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
                className="py-2.5 px-3 w-32"
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
              <th scope="col" className="py-2.5 px-3 w-24 text-center">
                Subtasks
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
                  tabIndex={0}
                  onClick={handleRowClick}
                  onKeyDown={handleKeyDown}
                  className="hover:bg-[var(--surface-muted)] transition-colors cursor-pointer focus:bg-[var(--surface-muted)] focus:outline-none focus:ring-1 focus:ring-inset focus:ring-[var(--border-focus)] group"
                >
                  {/* Task Key */}
                  <td className="py-2.5 px-3 font-mono font-bold text-[var(--brand-accent-text)]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick();
                      }}
                      className="hover:underline focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] rounded"
                    >
                      {task.taskKey}
                    </button>
                  </td>

                  {/* Title & Hierarchy parent badge */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      {task.parentTaskId && (
                        <span
                          title="Subtask"
                          className="inline-flex items-center text-[var(--text-muted)]"
                        >
                          <GitFork className="h-3 w-3 rotate-180" />
                        </span>
                      )}
                      <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-accent-text)] transition-colors line-clamp-1">
                        {task.title}
                      </span>
                    </div>
                  </td>

                  {/* Status Category Badge */}
                  <td className="py-2.5 px-3">
                    <Badge status={task.statusCategory}>
                      {formatStatus(task.statusCategory)}
                    </Badge>
                  </td>

                  {/* Priority Badge */}
                  <td className="py-2.5 px-3">
                    <Badge priority={task.priority}>
                      {formatPriority(task.priority)}
                    </Badge>
                  </td>

                  {/* Due Date */}
                  <td className="py-2.5 px-3 text-[var(--text-secondary)] font-mono text-[11px]">
                    {task.dueDate ? (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-[var(--text-muted)]" />
                        <span>{task.dueDate}</span>
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>

                  {/* Subtask indicator */}
                  <td className="py-2.5 px-3 text-center text-[var(--text-muted)]">
                    {task.parentTaskId ? (
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--surface-muted)]">
                        child
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)] text-[11px]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
