import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CalendarTaskItem } from "./CalendarTaskItem";
import type { CalendarDayInfo } from "./calendar-date-utils";
import type { TaskDto } from "../../types";

export interface CalendarDayCellProps {
  dayInfo: CalendarDayInfo;
  tasks: TaskDto[];
  todayStr: string;
  onTaskClick: (task: TaskDto) => void;
  maxVisibleTasks?: number;
}

export function CalendarDayCell({
  dayInfo,
  tasks,
  todayStr,
  onTaskClick,
  maxVisibleTasks = 2,
}: CalendarDayCellProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  const { dateStr, day, isCurrentMonth, isToday } = dayInfo;
  const isPast = dateStr < todayStr;
  const visibleTasks = tasks.slice(0, maxVisibleTasks);
  const hiddenCount = tasks.length - maxVisibleTasks;

  return (
    <div
      role="gridcell"
      data-testid={`calendar-day-cell-${dateStr}`}
      aria-label={`${dateStr}, ${tasks.length} task${tasks.length === 1 ? "" : "s"}${
        isToday ? ", today" : ""
      }`}
      className={cn(
        "relative flex flex-col min-h-[90px] md:min-h-[110px] p-1.5 border-b border-r border-[var(--border-subtle)] transition-colors select-none",
        isCurrentMonth
          ? "bg-[var(--surface-card)] hover:bg-[var(--surface-muted)]/40"
          : "bg-[var(--surface-muted)]/30 text-[var(--text-muted)]",
        isToday && "bg-[var(--brand-accent-btn-bg)]/5"
      )}
    >
      {/* Date Header Row */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            "text-xs font-semibold inline-flex items-center justify-center rounded-full transition-all",
            isToday
              ? "h-6 w-6 bg-[var(--brand-accent-btn-bg)] text-[var(--brand-accent-btn-text)] shadow-xs font-bold"
              : isCurrentMonth
              ? "text-[var(--text-primary)] px-1"
              : "text-[var(--text-muted)] px-1"
          )}
        >
          {day}
        </span>

        {tasks.length > 0 && (
          <span className="text-[10px] font-medium text-[var(--text-muted)] tabular-nums px-1">
            {tasks.length}
          </span>
        )}
      </div>

      {/* Visible Tasks Stack */}
      <div className="flex flex-col gap-1 overflow-hidden">
        {visibleTasks.map((task) => {
          const isOverdue =
            isPast && task.statusCategory !== "DONE" && task.statusCategory !== "CANCELED";
          return (
            <CalendarTaskItem
              key={task.id}
              task={task}
              onClick={onTaskClick}
              isOverdue={isOverdue}
              compact
            />
          );
        })}
      </div>

      {/* "+N more" expansion button */}
      {hiddenCount > 0 && (
        <button
          type="button"
          data-testid="calendar-more-tasks-btn"
          aria-expanded={isExpanded}
          aria-label={`Show ${hiddenCount} more tasks for ${dateStr}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-[var(--brand-accent-text)] hover:underline focus-ring rounded px-1 py-0.5 self-start cursor-pointer"
        >
          <Plus className="h-2.5 w-2.5" />
          {hiddenCount} more
        </button>
      )}

      {/* Expanded Task Popover Overlay */}
      {isExpanded && (
        <div
          role="dialog"
          aria-label={`All tasks for ${dateStr}`}
          className="absolute inset-0 z-30 flex flex-col p-2 bg-[var(--surface-card)] border-2 border-[var(--brand-accent-btn-bg)] rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-1.5 mb-1.5">
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {dateStr} ({tasks.length})
            </span>
            <button
              type="button"
              aria-label="Close tasks popover"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-ring cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
            {tasks.map((task) => {
              const isOverdue =
                isPast && task.statusCategory !== "DONE" && task.statusCategory !== "CANCELED";
              return (
                <CalendarTaskItem
                  key={task.id}
                  task={task}
                  onClick={(t) => {
                    setIsExpanded(false);
                    onTaskClick(t);
                  }}
                  isOverdue={isOverdue}
                  compact={false}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
