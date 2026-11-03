import React from "react";
import {
  Lock,
  Calendar,
  AlertCircle,
  Clock,
  Eye,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { WorkspaceBadge } from "@/modules/workspace";
import { cn } from "@/lib/utils";
import { formatDueDisplay } from "./date-utils";
import type { MyWorkTaskItem, TaskPriority } from "./types";

export interface TaskRowProps {
  task: MyWorkTaskItem;
  referenceDate: string;
  className?: string;
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  NONE: "None",
};

export function TaskRow({
  task,
  referenceDate,
  className,
}: TaskRowProps): React.JSX.Element {
  const isOverdue = task.temporalGroup === "overdue";
  const isDueToday = task.temporalGroup === "dueToday";
  const isUpcoming = task.temporalGroup === "upcoming";

  const dueLabel = formatDueDisplay(task.dueDate, referenceDate);

  return (
    <article
      data-testid={`my-work-task-${task.taskKey}`}
      className={cn(
        "group flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:px-4 sm:py-2.5 rounded-lg",
        "bg-[var(--surface-card)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)]",
        "transition-colors shadow-2xs gap-2.5 sm:gap-4 select-none",
        "min-h-[44px]",
        className
      )}
    >
      {/* Left section: Task Key, Workspace Badge, Title */}
      <div className="flex items-start sm:items-center space-x-2.5 min-w-0 flex-1">
        {/* Workspace Key Badge */}
        <div className="flex items-center space-x-1 flex-shrink-0 pt-0.5 sm:pt-0">
          <WorkspaceBadge
            prefix={task.workspaceKeyPrefix}
            size="sm"
            className={cn(
              task.workspaceKind === "PERSONAL" && "border-dashed"
            )}
          />
          {task.workspaceKind === "PERSONAL" && (
            <Lock
              className="h-3 w-3 text-[var(--text-muted)] flex-shrink-0"
              aria-label="Personal Workspace"
            />
          )}
        </div>

        {/* Task Key */}
        <span className="font-mono text-xs font-bold text-[var(--brand-accent-text)] flex-shrink-0 pt-0.5 sm:pt-0">
          {task.taskKey}
        </span>

        {/* Task Title & Workspace Name */}
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
            {task.title}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] truncate sm:hidden">
            {task.workspaceName}
          </p>
        </div>
      </div>

      {/* Right section: Relationship chips, Workspace label (desktop), Status, Due date */}
      <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 sm:gap-3 justify-between sm:justify-end flex-shrink-0">
        {/* Composite Relationship Chips */}
        <div className="flex items-center gap-1">
          {task.relationships.map((rel) => {
            if (rel === "ASSIGNED") {
              return (
                <span
                  key={rel}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--brand-accent-subtle)] text-[var(--brand-accent-text)] border border-[var(--brand-accent-border)]"
                  title="Assigned to you"
                >
                  <UserCheck className="h-2.5 w-2.5" />
                  <span>Assigned</span>
                </span>
              );
            }
            if (rel === "CREATED") {
              return (
                <span
                  key={rel}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                  title="Created by you"
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  <span>Creator</span>
                </span>
              );
            }
            if (rel === "WATCHING") {
              return (
                <span
                  key={rel}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                  title="Watching updates"
                >
                  <Eye className="h-2.5 w-2.5" />
                  <span>Watching</span>
                </span>
              );
            }
            return null;
          })}
        </div>

        {/* Desktop Workspace Name */}
        <span className="hidden md:inline-block text-xs text-[var(--text-muted)] truncate max-w-[120px]">
          {task.workspaceName}
        </span>

        {/* Priority Badge */}
        {task.priority !== "NONE" && (
          <Badge
            priority={task.priority}
            size="sm"
            className="text-[10px] uppercase font-semibold"
          >
            {PRIORITY_LABELS[task.priority]}
          </Badge>
        )}

        {/* Status Badge */}
        <Badge variant="outline" size="sm" className="text-[10px]">
          {task.statusCategory.replace("_", " ")}
        </Badge>

        {/* Due Date Indicator */}
        <div
          className={cn(
            "flex items-center gap-1 text-xs select-none min-w-[90px] justify-end",
            isOverdue && "text-red-600 dark:text-red-400 font-semibold",
            isDueToday && "text-amber-600 dark:text-amber-400 font-semibold",
            isUpcoming && "text-emerald-600 dark:text-emerald-400 font-medium",
            !isOverdue && !isDueToday && !isUpcoming && "text-[var(--text-muted)]"
          )}
        >
          {isOverdue && <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />}
          {isDueToday && <Clock className="h-3.5 w-3.5 flex-shrink-0" />}
          {isUpcoming && <Calendar className="h-3.5 w-3.5 flex-shrink-0" />}
          <span className="truncate">{dueLabel}</span>
        </div>
      </div>
    </article>
  );
}
