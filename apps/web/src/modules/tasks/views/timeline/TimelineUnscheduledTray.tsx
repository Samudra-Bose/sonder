import React from "react";
import { X, CalendarPlus, Layers } from "lucide-react";
import { Badge } from "@/components/ui/Badge.js";
import { Button } from "@/components/ui/Button.js";
import { cn } from "@/lib/utils";
import type { TaskDto } from "@/modules/tasks/types.js";

export interface TimelineUnscheduledTrayProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskDto[];
  onTaskClick: (task: TaskDto) => void;
  className?: string;
}

export function TimelineUnscheduledTray({
  isOpen,
  onClose,
  tasks,
  onTaskClick,
  className,
}: TimelineUnscheduledTrayProps): React.JSX.Element | null {
  if (!isOpen) return null;

  return (
    <div
      data-testid="timeline-unscheduled-tray"
      className={cn(
        "bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-4 shadow-sm space-y-3 transition-all",
        className
      )}
    >
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[var(--text-muted)]" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Unscheduled Tasks
          </h2>
          <span className="px-1.5 py-0.5 rounded-full bg-[var(--surface-muted)] text-[10px] font-mono font-medium text-[var(--text-muted)]">
            {tasks.length}
          </span>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label="Close unscheduled tasks tray"
          className="h-7 w-7 p-0 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="py-6 text-center text-xs text-[var(--text-muted)]">
          All tasks in this workspace have scheduled dates.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onTaskClick(task)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onTaskClick(task);
                }
              }}
              data-testid={`unscheduled-task-${task.id}`}
              className="p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] hover:bg-[var(--surface-card)] hover:border-[var(--brand-accent-border)] transition-all cursor-pointer space-y-1.5 focus-ring"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[11px] font-semibold text-[var(--text-secondary)]">
                  {task.taskKey}
                </span>
                <Badge status={task.statusCategory} size="sm">
                  {task.statusCategory.replace("_", " ")}
                </Badge>
              </div>

              <div className="text-xs font-medium text-[var(--text-primary)] line-clamp-2">
                {task.title}
              </div>

              <div className="flex items-center gap-1 text-[10px] text-[var(--brand-accent-text)] pt-0.5">
                <CalendarPlus className="h-3 w-3" />
                <span>Click to set dates</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
