import React, { useState } from "react";
import { Calendar, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover.js";
import { cn } from "@/lib/utils.js";
import { getDefaultReferenceDate, addCalendarDays } from "@/modules/my-work/date-utils.js";
import { useUpdateTask } from "../useUpdateTask.js";
import type { TaskDto } from "../types.js";

export interface InlineDueDateCellProps {
  task: Pick<TaskDto, "id" | "dueDate"> & {
    effectivePermissions?: {
      canEditDatesPriority?: boolean;
    };
    fieldRevisions?: {
      dueDate?: number;
      [key: string]: number | undefined;
    };
  };
  communityId: string;
  workspaceId: string;
  isArchived?: boolean;
  disabled?: boolean;
  className?: string;
  onDueDateChange?: (newDueDate: string | null) => Promise<void> | void;
}

export function InlineDueDateCell({
  task,
  communityId,
  workspaceId,
  isArchived = false,
  disabled = false,
  className,
  onDueDateChange,
}: InlineDueDateCellProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const updateMutation = useUpdateTask();

  const canEdit = !disabled && !isArchived && (task.effectivePermissions?.canEditDatesPriority ?? true);

  if (!canEdit) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 font-mono text-[11px] tabular-nums text-[var(--text-secondary)]",
          disabled && "opacity-60 cursor-not-allowed",
          className
        )}
        data-testid={`inline-duedate-cell-${task.id}`}
      >
        {task.dueDate ? (
          <>
            <Calendar className="h-3 w-3 text-[var(--text-muted)]" />
            <span>{task.dueDate}</span>
          </>
        ) : (
          <span className="text-[var(--text-muted)] italic">No due date</span>
        )}
      </span>
    );
  }

  const todayStr = getDefaultReferenceDate();
  const tomorrowStr = addCalendarDays(todayStr, 1);
  const nextWeekStr = addCalendarDays(todayStr, 7);

  const handleApplyDate = async (
    e: React.MouseEvent | React.ChangeEvent<HTMLInputElement>,
    newDate: string | null
  ) => {
    e.stopPropagation();
    setIsOpen(false);

    if (newDate === task.dueDate) return;

    if (onDueDateChange) {
      await onDueDateChange(newDate);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        communityId,
        workspaceId,
        taskId: task.id,
        data: {
          dueDate: newDate,
          baseFieldRevisions: {
            dueDate: task.fieldRevisions?.dueDate ?? 1,
          },
        },
      });
    } catch {
      // Optimistic update rollback handled by useUpdateTask
    }
  };

  return (
    <div
      className="inline-flex items-center"
      onClick={(e) => e.stopPropagation()}
      data-testid={`inline-duedate-cell-${task.id}`}
    >
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          data-testid={`inline-duedate-trigger-${task.id}`}
          onClick={(e) => {
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
            }
          }}
          className={cn(
            "inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[11px] font-mono tabular-nums transition-colors cursor-pointer select-none",
            "focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]",
            task.dueDate
              ? "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
              : "text-[var(--text-muted)] italic hover:text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]",
            updateMutation.isPending && "opacity-70 animate-pulse",
            className
          )}
          aria-label={`Due date: ${task.dueDate ?? "None"}. Click to change.`}
        >
          <Calendar className="h-3 w-3 text-[var(--text-muted)] shrink-0" />
          <span>{task.dueDate ?? "Set date"}</span>
        </PopoverTrigger>

        <PopoverContent
          size="compact"
          align="start"
          sideOffset={4}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            role="dialog"
            aria-label="Set due date"
            className="flex flex-col gap-2 p-1 min-w-[180px]"
          >
            {/* Native Date Input */}
            <div className="flex items-center gap-1">
              <input
                type="date"
                data-testid={`inline-duedate-input-${task.id}`}
                defaultValue={task.dueDate ?? ""}
                onChange={(e) => handleApplyDate(e, e.target.value || null)}
                className="w-full text-xs px-2 py-1 rounded bg-[var(--surface-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] cursor-pointer"
              />
            </div>

            {/* Quick presets */}
            <div className="flex flex-col gap-1 border-t border-[var(--border-subtle)] pt-1.5">
              <button
                type="button"
                data-testid="inline-duedate-today"
                onClick={(e) => handleApplyDate(e, todayStr)}
                className="text-xs text-left px-2 py-1 rounded hover:bg-[var(--surface-muted)] transition-colors cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Today
              </button>
              <button
                type="button"
                data-testid="inline-duedate-tomorrow"
                onClick={(e) => handleApplyDate(e, tomorrowStr)}
                className="text-xs text-left px-2 py-1 rounded hover:bg-[var(--surface-muted)] transition-colors cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Tomorrow
              </button>
              <button
                type="button"
                data-testid="inline-duedate-next-week"
                onClick={(e) => handleApplyDate(e, nextWeekStr)}
                className="text-xs text-left px-2 py-1 rounded hover:bg-[var(--surface-muted)] transition-colors cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Next week
              </button>
              {task.dueDate && (
                <button
                  type="button"
                  data-testid="inline-duedate-clear"
                  onClick={(e) => handleApplyDate(e, null)}
                  className="flex items-center gap-1 text-xs text-left px-2 py-1 rounded hover:bg-[var(--surface-muted)] text-[var(--status-danger-text)] transition-colors cursor-pointer"
                >
                  <X className="h-3 w-3" />
                  <span>Clear due date</span>
                </button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
