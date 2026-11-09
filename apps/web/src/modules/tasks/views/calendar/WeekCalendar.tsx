import React from "react";
import { CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CalendarTaskItem } from "./CalendarTaskItem";
import type { WeekDayInfo } from "./calendar-date-utils";
import type { TaskDto } from "../../types";

export interface WeekCalendarProps {
  weekDays: WeekDayInfo[];
  tasksByDate: Record<string, TaskDto[]>;
  todayStr: string;
  onTaskClick: (task: TaskDto) => void;
  onCreateTask?: (dateStr: string, invoker?: HTMLElement | null) => void;
  className?: string;
}

export function WeekCalendar({
  weekDays,
  tasksByDate,
  todayStr,
  onTaskClick,
  onCreateTask,
  className,
}: WeekCalendarProps): React.JSX.Element {
  return (
    <div
      role="region"
      aria-label="Week calendar view"
      data-testid="week-calendar-grid"
      className={cn(
        "flex flex-col bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-2xs select-none",
        className
      )}
    >
      {/* 7-Column Layout Container */}
      <div className="grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] overflow-x-auto">
        {weekDays.map((dayInfo) => {
          const { dateStr, day, dayName, isToday } = dayInfo;
          const isPast = dateStr < todayStr;
          const tasks = tasksByDate[dateStr] ?? [];

          // Separate tasks into overdue, active scheduled, and completed
          const overdueTasks: TaskDto[] = [];
          const scheduledTasks: TaskDto[] = [];
          const completedTasks: TaskDto[] = [];

          for (const task of tasks) {
            const isTerminal = task.statusCategory === "DONE" || task.statusCategory === "CANCELED";
            if (isTerminal) {
              completedTasks.push(task);
            } else if (isPast) {
              overdueTasks.push(task);
            } else {
              scheduledTasks.push(task);
            }
          }

          return (
            <div
              key={dateStr}
              data-testid={`week-column-${dateStr}`}
              className={cn(
                "flex flex-col min-w-[130px] sm:min-w-0 min-h-[300px] md:min-h-[420px] p-2.5 transition-colors",
                isToday ? "bg-[var(--brand-accent-btn-bg)]/5" : "bg-[var(--surface-card)]"
              )}
            >
              {/* Day Column Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "text-xs font-bold uppercase",
                      isToday ? "text-[var(--brand-accent-text)] font-extrabold" : "text-[var(--text-secondary)]"
                    )}
                  >
                    {dayName}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-semibold inline-flex items-center justify-center rounded-full",
                      isToday
                        ? "h-6 w-6 bg-[var(--brand-accent-btn-bg)] text-[var(--brand-accent-btn-text)] shadow-xs font-bold"
                        : "text-[var(--text-primary)]"
                    )}
                  >
                    {day}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {onCreateTask && (
                    <button
                      type="button"
                      aria-label={`Create task on ${dateStr}`}
                      data-testid={`week-add-task-btn-${dateStr}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateTask(dateStr, e.currentTarget);
                      }}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer focus-ring"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                  {tasks.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                      {tasks.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Tasks Content Area */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {tasks.length === 0 ? (
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`Create task for ${dateStr}`}
                    data-testid={`week-empty-slot-${dateStr}`}
                    onClick={(e) => onCreateTask?.(dateStr, e.currentTarget)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onCreateTask?.(dateStr, e.currentTarget);
                      }
                    }}
                    className="h-28 flex flex-col items-center justify-center text-center p-2 rounded-lg border border-dashed border-[var(--border-subtle)] hover:border-[var(--brand-accent-text)]/50 hover:bg-[var(--surface-muted)]/50 cursor-pointer focus-ring transition-colors group"
                  >
                    <Plus className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--brand-accent-text)] mb-1 transition-colors" />
                    <span className="text-[11px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                      Add task
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Overdue Section */}
                    {overdueTasks.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-[var(--state-error)] tracking-wider px-1">
                          <AlertCircle className="h-2.5 w-2.5" />
                          <span>Overdue ({overdueTasks.length})</span>
                        </div>
                        {overdueTasks.map((task) => (
                          <CalendarTaskItem
                            key={task.id}
                            task={task}
                            onClick={onTaskClick}
                            isOverdue
                          />
                        ))}
                      </div>
                    )}

                    {/* Active Scheduled Section */}
                    {scheduledTasks.length > 0 && (
                      <div className="space-y-1">
                        {overdueTasks.length > 0 && (
                          <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider px-1 pt-1">
                            Scheduled ({scheduledTasks.length})
                          </div>
                        )}
                        {scheduledTasks.map((task) => (
                          <CalendarTaskItem
                            key={task.id}
                            task={task}
                            onClick={onTaskClick}
                          />
                        ))}
                      </div>
                    )}

                    {/* Completed Section */}
                    {completedTasks.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider px-1">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          <span>Completed ({completedTasks.length})</span>
                        </div>
                        {completedTasks.map((task) => (
                          <CalendarTaskItem
                            key={task.id}
                            task={task}
                            onClick={onTaskClick}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
