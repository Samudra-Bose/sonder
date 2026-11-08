import React from "react";
import { ChevronDown, ChevronRight, Inbox, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge.js";
import type { TaskDto, TaskStatusCategory } from "../../types";

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

export interface UnscheduledTaskTrayProps {
  tasks: TaskDto[];
  isOpen: boolean;
  onToggle: () => void;
  onTaskClick: (task: TaskDto) => void;
  className?: string;
}

export function UnscheduledTaskTray({
  tasks,
  isOpen,
  onToggle,
  onTaskClick,
  className,
}: UnscheduledTaskTrayProps): React.JSX.Element {
  return (
    <div
      data-testid="unscheduled-task-tray"
      aria-label="Unscheduled tasks tray"
      className={cn(
        "flex flex-col bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl transition-all shadow-2xs select-none",
        className
      )}
    >
      {/* Tray Header Bar */}
      <button
        type="button"
        data-testid="unscheduled-tray-toggle"
        aria-expanded={isOpen}
        aria-controls="unscheduled-tasks-content"
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-[var(--surface-muted)] transition-colors focus-ring cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
          )}
          <Inbox className="h-4 w-4 text-[var(--brand-accent-text)] flex-shrink-0" />
          <span className="text-xs font-bold text-[var(--text-primary)]">
            Unscheduled Tasks
          </span>
          <span
            data-testid="unscheduled-count-badge"
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
          >
            {tasks.length}
          </span>
        </div>
        <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">
          {isOpen ? "Collapse tray" : "Expand tray"}
        </span>
      </button>

      {/* Tray Content */}
      {isOpen && (
        <div
          id="unscheduled-tasks-content"
          className="p-3 border-t border-[var(--border-subtle)] space-y-2 max-h-[380px] overflow-y-auto"
        >
          {tasks.length === 0 ? (
            <div
              data-testid="unscheduled-empty-state"
              className="flex flex-col items-center justify-center p-6 text-center text-[var(--text-muted)] space-y-1"
            >
              <CheckCircle2 className="h-6 w-6 text-[var(--state-success)] mb-1" />
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                All tasks are scheduled
              </p>
              <p className="text-[11px]">
                No unscheduled tasks found matching current workspace filters.
              </p>
            </div>
          ) : (
            tasks.map((task) => {
              const handleClick = () => onTaskClick(task);
              const handleKeyDown = (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onTaskClick(task);
                }
              };

              return (
                <div
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  data-testid={`unscheduled-task-item-${task.taskKey}`}
                  onClick={handleClick}
                  onKeyDown={handleKeyDown}
                  aria-label={`${task.taskKey}: ${task.title}, priority ${task.priority}, status ${task.statusCategory}`}
                  className="group flex items-center justify-between gap-2.5 p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] hover:border-[var(--brand-accent-btn-bg)] hover:shadow-2xs transition-all cursor-pointer focus-ring"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-xs text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] flex-shrink-0">
                      {task.taskKey}
                    </span>
                    <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Status Badge */}
                    <Badge status={task.statusCategory} size="sm">
                      {formatStatus(task.statusCategory)}
                    </Badge>

                    {/* Priority Badge */}
                    {task.priority !== "NONE" && (
                      <Badge priority={task.priority} size="sm">
                        {task.priority}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
