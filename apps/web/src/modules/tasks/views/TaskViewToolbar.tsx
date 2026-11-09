import React from "react";
import {
  List,
  LayoutGrid,
  Calendar,
  GanttChart,
  Filter,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Plus,
  RefreshCw,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { cn } from "@/lib/utils";
import { useQuickTaskComposer } from "../QuickTaskComposerContext";

export interface TaskViewToolbarProps {
  activeView: "list" | "board" | "calendar" | "timeline";
  onViewChange: (view: "list" | "board" | "calendar" | "timeline") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  priorityFilter: string;
  onPriorityChange: (priority: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  sortBy: string;
  sortOrder?: "asc" | "desc";
  onSortChange: (sort: string) => void;
  onSortOrderToggle?: (order: "asc" | "desc") => void;
  includeBacklog: boolean;
  onIncludeBacklogChange: (include: boolean) => void;
  totalCount: number;
  isFetching?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function TaskViewToolbar({
  activeView,
  onViewChange,
  searchQuery,
  onSearchChange,
  priorityFilter,
  onPriorityChange,
  statusFilter,
  onStatusChange,
  sortBy,
  sortOrder = "desc",
  onSortChange,
  onSortOrderToggle,
  includeBacklog,
  onIncludeBacklogChange,
  totalCount,
  isFetching = false,
  onRefresh,
  className,
}: TaskViewToolbarProps): React.JSX.Element {
  const { open: openQuickComposer } = useQuickTaskComposer();

  return (
    <div
      data-testid="task-view-toolbar"
      className={cn(
        "flex flex-col gap-3 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-3 md:p-4 shadow-2xs",
        className
      )}
    >
      {/* Top row: View Switcher Tabs + Search + Quick Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* View Switcher Segmented Control */}
        <div
          role="tablist"
          aria-label="Workspace task view switcher"
          className="inline-flex h-9 items-center rounded-lg bg-[var(--surface-muted)] border border-[var(--border-subtle)] p-1 gap-1 select-none self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "list"}
            aria-controls="tasks-list-panel"
            id="tab-view-list"
            data-testid="tab-view-list"
            onClick={() => onViewChange("list")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer focus-ring",
              activeView === "list"
                ? "bg-[var(--surface-card)] text-[var(--text-primary)] shadow-xs font-semibold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <List className="h-3.5 w-3.5" aria-hidden="true" />
            <span>List</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeView === "board"}
            aria-controls="tasks-board-panel"
            id="tab-view-board"
            data-testid="tab-view-board"
            onClick={() => onViewChange("board")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer focus-ring",
              activeView === "board"
                ? "bg-[var(--surface-card)] text-[var(--text-primary)] shadow-xs font-semibold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Board</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeView === "calendar"}
            aria-controls="tasks-calendar-panel"
            id="tab-view-calendar"
            data-testid="tab-view-calendar"
            onClick={() => onViewChange("calendar")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer focus-ring",
              activeView === "calendar"
                ? "bg-[var(--surface-card)] text-[var(--text-primary)] shadow-xs font-semibold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Calendar</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeView === "timeline"}
            aria-controls="tasks-timeline-panel"
            id="tab-view-timeline"
            data-testid="tab-view-timeline"
            onClick={() => onViewChange("timeline")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer focus-ring",
              activeView === "timeline"
                ? "bg-[var(--surface-card)] text-[var(--text-primary)] shadow-xs font-semibold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <GanttChart className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Timeline</span>
          </button>
        </div>

        {/* Search input */}
        <div className="flex-1 max-w-sm min-w-0">
          <SearchInput
            placeholder="Search by key, title..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onClear={() => onSearchChange("")}
            className="h-9 text-xs"
            aria-label="Search tasks"
          />
        </div>

        {/* Actions: Refresh + New Task button */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isFetching}
              aria-label="Refresh tasks query"
              className={cn(
                "p-2 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-ring transition-colors",
                isFetching && "animate-spin text-[var(--brand-accent-text)]"
              )}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={() => openQuickComposer()}
            className="gap-1.5 text-xs h-9"
            data-testid="task-toolbar-new-task-btn"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* Bottom row: Filter selectors + Sort + Backlog toggle + Count */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[var(--border-subtle)] text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="task-priority-filter" className="text-[var(--text-muted)] flex items-center gap-1 font-medium">
              <Filter className="h-3 w-3" />
              <span>Priority:</span>
            </label>
            <select
              id="task-priority-filter"
              aria-label="Filter tasks by priority"
              value={priorityFilter}
              onChange={(e) => onPriorityChange(e.target.value)}
              className="bg-[var(--surface-muted)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-md px-2 py-1 text-xs focus-ring"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="NONE">None</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="task-status-filter" className="text-[var(--text-muted)] font-medium">
              Status:
            </label>
            <select
              id="task-status-filter"
              aria-label="Filter tasks by status"
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              className="bg-[var(--surface-muted)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-md px-2 py-1 text-xs focus-ring"
            >
              <option value="ALL">All Statuses</option>
              <option value="BACKLOG">Backlog</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
              <option value="CANCELED">Canceled</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="task-sort-by" className="text-[var(--text-muted)] flex items-center gap-1 font-medium">
              <ArrowUpDown className="h-3 w-3" />
              <span>Sort:</span>
            </label>
            <select
              id="task-sort-by"
              aria-label="Sort tasks by field"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-[var(--surface-muted)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-md px-2 py-1 text-xs focus-ring"
            >
              <option value="priority">Priority</option>
              <option value="dueDate">Due Date</option>
              <option value="createdAt">Created Date</option>
              <option value="currentKey">Task Key</option>
            </select>

            {onSortOrderToggle && (
              <button
                type="button"
                aria-label={`Toggle sort direction: currently ${
                  sortOrder === "desc" ? "descending" : "ascending"
                }`}
                title={`Sort direction: ${sortOrder === "desc" ? "Descending" : "Ascending"}`}
                data-testid="toolbar-sort-order-toggle"
                onClick={() => onSortOrderToggle(sortOrder === "asc" ? "desc" : "asc")}
                className="p-1 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-ring transition-colors cursor-pointer"
              >
                {sortOrder === "desc" ? (
                  <ArrowDown className="h-3.5 w-3.5" />
                ) : (
                  <ArrowUp className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>

          {/* Include Backlog toggle */}
          <label className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer select-none ml-1">
            <input
              type="checkbox"
              checked={includeBacklog}
              onChange={(e) => onIncludeBacklogChange(e.target.checked)}
              className="rounded border-[var(--border-subtle)] text-[var(--brand-accent-text)] focus-ring h-3.5 w-3.5"
            />
            <span>Include Backlog</span>
          </label>
        </div>

        {/* Task count metric */}
        <div className="flex items-center gap-1 text-[var(--text-muted)] font-mono text-[11px] self-end sm:self-auto">
          <Layers className="h-3.5 w-3.5" />
          <span>{totalCount} {totalCount === 1 ? "task" : "tasks"}</span>
        </div>
      </div>
    </div>
  );
}
