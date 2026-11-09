import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge.js";
import type { TaskDto } from "../../types";

export interface CalendarTaskItemProps {
  task: TaskDto;
  onClick: (task: TaskDto) => void;
  isOverdue?: boolean;
  compact?: boolean;
  className?: string;
}

export function CalendarTaskItem({
  task,
  onClick,
  isOverdue = false,
  compact = false,
  className,
}: CalendarTaskItemProps): React.JSX.Element {
  const isTerminal = task.statusCategory === "DONE" || task.statusCategory === "CANCELED";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(task);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      onClick(task);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`calendar-task-item-${task.taskKey}`}
      data-calendar-task-card="true"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${task.taskKey}: ${task.title}, priority ${task.priority}, status ${task.statusCategory}${
        isOverdue ? ", overdue" : ""
      }`}
      className={cn(
        "group relative flex items-center gap-1.5 rounded-md border text-left transition-all cursor-pointer select-none focus-ring",
        compact ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1.5 text-xs",
        isTerminal
          ? "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border-subtle)] opacity-75 line-through"
          : isOverdue
          ? "bg-[var(--state-error-subtle)] text-[var(--text-primary)] border-[var(--state-error-border)] hover:bg-[var(--state-error-subtle)]/80"
          : "bg-[var(--surface-card)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--brand-accent-btn-bg)] hover:shadow-2xs",
        className
      )}
    >
      {/* Visual Indicator Icon */}
      {isTerminal ? (
        <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
      ) : isOverdue ? (
        <AlertCircle className="h-3 w-3 flex-shrink-0 text-[var(--state-error)]" aria-hidden="true" />
      ) : (
        <span
          className={cn(
            "h-1.5 w-1.5 flex-shrink-0 rounded-full",
            task.priority === "URGENT" || task.priority === "HIGH"
              ? "bg-[var(--state-error)]"
              : task.priority === "MEDIUM"
              ? "bg-[var(--state-warning)]"
              : "bg-[var(--text-muted)]"
          )}
          aria-hidden="true"
        />
      )}

      {/* Task Key */}
      <span className="font-semibold tracking-tight text-[10px] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] flex-shrink-0">
        {task.taskKey}
      </span>

      {/* Task Title */}
      <span className="truncate flex-1 font-medium text-[var(--text-primary)]">
        {task.title}
      </span>

      {/* Non-compact priority badge */}
      {!compact && task.priority !== "NONE" && (
        <Badge priority={task.priority} size="sm" className="flex-shrink-0">
          {task.priority}
        </Badge>
      )}
    </div>
  );
}
