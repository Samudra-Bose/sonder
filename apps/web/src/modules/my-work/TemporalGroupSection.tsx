import React from "react";
import {
  AlertCircle,
  Clock,
  Calendar,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { TaskRow } from "./TaskRow";
import { cn } from "@/lib/utils";
import type { MyWorkTaskItem } from "./types";
import type { TemporalGroupKey } from "./date-utils";

export interface TemporalGroupSectionProps {
  groupKey: TemporalGroupKey;
  tasks: MyWorkTaskItem[];
  referenceDate: string;
  className?: string;
}

interface GroupMetadata {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  headerColorClass: string;
  badgeColorClass: string;
  emptyTitle: string;
  emptyMessage: string;
}

const GROUP_METADATA: Record<TemporalGroupKey, GroupMetadata> = {
  overdue: {
    title: "Overdue",
    description: "Tasks past their calendar due date",
    icon: AlertCircle,
    headerColorClass: "text-red-600 dark:text-red-400",
    badgeColorClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    emptyTitle: "No overdue tasks",
    emptyMessage: "You're completely caught up on past-due deadlines.",
  },
  dueToday: {
    title: "Due Today",
    description: "Tasks with target completion date today",
    icon: Clock,
    headerColorClass: "text-amber-600 dark:text-amber-400",
    badgeColorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    emptyTitle: "No tasks due today",
    emptyMessage: "No work scheduled for deadline delivery today.",
  },
  upcoming: {
    title: "Upcoming",
    description: "Tasks due within the next 7 calendar days",
    icon: Calendar,
    headerColorClass: "text-emerald-600 dark:text-emerald-400",
    badgeColorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    emptyTitle: "No upcoming tasks",
    emptyMessage: "No deadlines scheduled over the next 7 days.",
  },
  unscheduled: {
    title: "Unscheduled",
    description: "Active backlog tasks without a scheduled due date",
    icon: Layers,
    headerColorClass: "text-[var(--text-secondary)]",
    badgeColorClass: "bg-[var(--surface-muted)] text-[var(--text-secondary)] border-[var(--border-subtle)]",
    emptyTitle: "No unscheduled tasks",
    emptyMessage: "All active work items have target due dates assigned.",
  },
};

export function TemporalGroupSection({
  groupKey,
  tasks,
  referenceDate,
  className,
}: TemporalGroupSectionProps): React.JSX.Element {
  const meta = GROUP_METADATA[groupKey];
  const Icon = meta.icon;
  const count = tasks.length;

  return (
    <section
      data-testid={`temporal-group-${groupKey}`}
      aria-labelledby={`heading-group-${groupKey}`}
      className={cn("space-y-3", className)}
    >
      {/* Group Header */}
      <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
        <div className="flex items-center space-x-2">
          <Icon className={cn("h-4 w-4 flex-shrink-0", meta.headerColorClass)} />
          <h2
            id={`heading-group-${groupKey}`}
            className="text-sm font-bold text-[var(--text-primary)]"
          >
            {meta.title}
          </h2>
          <span
            className={cn(
              "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-mono font-bold border",
              meta.badgeColorClass
            )}
          >
            {count}
          </span>
        </div>
        <p className="hidden sm:inline-block text-xs text-[var(--text-muted)]">
          {meta.description}
        </p>
      </div>

      {/* Task List or Contextual Empty State */}
      {count === 0 ? (
        <div className="py-6 px-4 rounded-lg bg-[var(--surface-card)]/50 border border-dashed border-[var(--border-subtle)] text-center flex flex-col items-center justify-center space-y-1 select-none">
          <CheckCircle2 className="h-5 w-5 text-[var(--text-muted)]" />
          <p className="text-xs font-semibold text-[var(--text-primary)]">
            {meta.emptyTitle}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] max-w-sm">
            {meta.emptyMessage}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              referenceDate={referenceDate}
            />
          ))}
        </div>
      )}
    </section>
  );
}
