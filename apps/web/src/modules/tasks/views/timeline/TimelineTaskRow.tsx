import React from "react";
import { GitFork, Milestone, AlertTriangle, Lock } from "lucide-react";
import { Badge } from "@/components/ui/Badge.js";
import { cn } from "@/lib/utils";
import type { TaskDto } from "@/modules/tasks/types.js";
import type { MilestoneDto } from "@/modules/milestones/types.js";
import type { TaskTimelinePosition } from "./timeline-date-utils.js";

export interface TimelineTaskRowProps {
  task: TaskDto;
  position: TaskTimelinePosition;
  milestone?: MilestoneDto;
  conflictReason?: string | null;
  hasRestrictedDependency?: boolean;
  onTaskClick: (task: TaskDto) => void;
  className?: string;
}

export function TimelineTaskRow({
  task,
  position,
  milestone,
  conflictReason,
  hasRestrictedDependency,
  onTaskClick,
  className,
}: TimelineTaskRowProps): React.JSX.Element {
  const isSubtask = Boolean(task.parentTaskId);

  // Status-based bar styles
  const getStatusBarStyle = (status: TaskDto["statusCategory"]) => {
    switch (status) {
      case "DONE":
        return "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30";
      case "IN_PROGRESS":
        return "bg-[var(--brand-accent-subtle)] text-[var(--brand-accent-text)] border-[var(--brand-accent-border)] hover:bg-[var(--brand-accent-subtle)]/80";
      case "CANCELED":
        return "bg-neutral-500/10 text-neutral-400 border-neutral-500/20 line-through opacity-75 hover:bg-neutral-500/20";
      case "TODO":
      default:
        return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30 hover:bg-slate-500/25";
    }
  };

  return (
    <div
      data-testid={`timeline-task-row-${task.id}`}
      className={cn(
        "flex items-center h-11 border-b border-[var(--border-subtle)] hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors group",
        className
      )}
    >
      {/* Left Pane: Task Details (Sticky / Fixed width) */}
      <div
        onClick={() => onTaskClick(task)}
        data-testid={`timeline-task-info-${task.id}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onTaskClick(task);
          }
        }}
        aria-label={`Open task ${task.taskKey}: ${task.title}`}
        className="w-72 md:w-80 flex-shrink-0 flex items-center justify-between gap-2 px-3 h-full cursor-pointer border-r border-[var(--border-subtle)] bg-[var(--surface-card)] group-hover:bg-[var(--surface-muted)] transition-colors focus-ring z-10"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {isSubtask && (
            <span
              title="Subtask"
              className="text-[var(--text-muted)] flex-shrink-0"
              aria-label="Subtask"
            >
              <GitFork className="h-3 w-3 rotate-180" />
            </span>
          )}
          <span className="font-mono text-[11px] font-semibold text-[var(--text-secondary)] flex-shrink-0 group-hover:text-[var(--brand-accent-text)]">
            {task.taskKey}
          </span>
          <span className="text-xs font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--brand-accent-text)]">
            {task.title}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {conflictReason && (
            <span
              data-testid={`task-conflict-badge-${task.id}`}
              title={conflictReason}
              aria-label={conflictReason}
              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
            >
              <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="hidden xl:inline">Conflict</span>
            </span>
          )}
          {hasRestrictedDependency && (
            <span
              data-testid={`task-restricted-dep-badge-${task.id}`}
              title="Linked to a restricted task"
              aria-label="Linked to a restricted task"
              className="inline-flex items-center p-0.5 rounded text-[9px] font-medium text-[var(--text-muted)] bg-[var(--surface-muted)] border border-[var(--border-subtle)]"
            >
              <Lock className="h-2.5 w-2.5 flex-shrink-0" />
            </span>
          )}
          {milestone && (
            <span
              title={`Milestone: ${milestone.name}`}
              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
            >
              <Milestone className="h-2.5 w-2.5" />
              <span className="max-w-[50px] truncate">{milestone.name}</span>
            </span>
          )}
          <Badge status={task.statusCategory} size="sm">
            {task.statusCategory.replace("_", " ")}
          </Badge>
        </div>
      </div>

      {/* Right Pane: Timeline Canvas Task Bar */}
      <div className="flex-1 h-full relative flex items-center px-1 overflow-hidden">
        {position.isVisible ? (
          <div
            data-testid={`timeline-task-bar-${task.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onTaskClick(task);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onTaskClick(task);
              }
            }}
            style={{
              left: `${position.leftPercent}%`,
              width: `${position.widthPercent}%`,
            }}
            title={`${task.taskKey}: ${task.title} (${position.startDateFormatted ?? "No start"} → ${position.dueDateFormatted ?? "No due"})${conflictReason ? ` [${conflictReason}]` : ""}`}
            aria-label={`${task.taskKey}: ${task.title}${conflictReason ? " (Has scheduling conflict)" : ""}`}
            className={cn(
              "absolute h-7 rounded-md border text-xs font-medium px-2 flex items-center justify-between gap-1.5 shadow-2xs cursor-pointer select-none transition-transform active:scale-[0.99] focus-ring z-10",
              getStatusBarStyle(task.statusCategory),
              conflictReason && "ring-1 ring-amber-500/50 border-amber-500/60",
              position.isStartClipped && "rounded-l-none border-l-0",
              position.isEndClipped && "rounded-r-none border-r-0"
            )}
          >
            <div className="flex items-center gap-1 truncate min-w-0">
              {conflictReason && (
                <AlertTriangle
                  aria-hidden="true"
                  className="h-3 w-3 text-amber-500 flex-shrink-0"
                />
              )}
              <span className="truncate text-[11px] font-medium">
                {task.title}
              </span>
            </div>

            <span className="text-[10px] opacity-75 font-mono whitespace-nowrap hidden sm:inline">
              {position.spanType === "RANGE" && (
                <span>{position.startDateFormatted} – {position.dueDateFormatted}</span>
              )}
              {position.spanType === "START_ONLY" && (
                <span>From {position.startDateFormatted}</span>
              )}
              {position.spanType === "DUE_ONLY" && (
                <span>Due {position.dueDateFormatted}</span>
              )}
            </span>
          </div>
        ) : (
          <div className="text-[11px] text-[var(--text-muted)] italic px-3">
            Out of range
          </div>
        )}
      </div>
    </div>
  );
}
