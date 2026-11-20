import React, { useState } from "react";
import { Badge } from "@/components/ui/Badge.js";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover.js";
import { cn } from "@/lib/utils.js";
import { useUpdateTask } from "../useUpdateTask.js";
import type { TaskDto, TaskPriority } from "../types.js";

export interface InlinePriorityCellProps {
  task: Pick<TaskDto, "id" | "priority"> & {
    effectivePermissions?: {
      canEditDatesPriority?: boolean;
    };
    fieldRevisions?: {
      priority?: number;
      [key: string]: number | undefined;
    };
  };
  communityId: string;
  workspaceId: string;
  isArchived?: boolean;
  className?: string;
  onPriorityChange?: (newPriority: TaskPriority) => Promise<void> | void;
}

const PRIORITY_OPTIONS: { priority: TaskPriority; label: string }[] = [
  { priority: "URGENT", label: "Urgent" },
  { priority: "HIGH", label: "High" },
  { priority: "MEDIUM", label: "Medium" },
  { priority: "LOW", label: "Low" },
  { priority: "NONE", label: "None" },
];

export function formatPriority(priority: TaskPriority): string {
  switch (priority) {
    case "URGENT":
      return "Urgent";
    case "HIGH":
      return "High";
    case "MEDIUM":
      return "Medium";
    case "LOW":
      return "Low";
    case "NONE":
      return "None";
    default:
      return priority;
  }
}

export function InlinePriorityCell({
  task,
  communityId,
  workspaceId,
  isArchived = false,
  className,
  onPriorityChange,
}: InlinePriorityCellProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const updateMutation = useUpdateTask();

  const canEdit = !isArchived && (task.effectivePermissions?.canEditDatesPriority ?? true);

  if (!canEdit) {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <Badge priority={task.priority}>{formatPriority(task.priority)}</Badge>
      </span>
    );
  }

  const handleSelectPriority = async (
    e: React.MouseEvent | React.KeyboardEvent,
    priority: TaskPriority
  ) => {
    e.stopPropagation();
    setIsOpen(false);

    if (priority === task.priority) return;

    if (onPriorityChange) {
      await onPriorityChange(priority);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        communityId,
        workspaceId,
        taskId: task.id,
        data: {
          priority,
          baseFieldRevisions: {
            priority: task.fieldRevisions?.priority ?? 1,
          },
        },
      });
    } catch {
      // Error rollback is handled optimistically by useUpdateTask
    }
  };

  return (
    <div
      className="inline-flex items-center"
      onClick={(e) => e.stopPropagation()}
      data-testid={`inline-priority-cell-${task.id}`}
    >
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          data-testid={`inline-priority-trigger-${task.id}`}
          onClick={(e) => {
            e.stopPropagation();
          }}
          className={cn(
            "inline-flex items-center rounded focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] transition-opacity hover:opacity-80 cursor-pointer select-none",
            className
          )}
          aria-label={`Priority: ${formatPriority(task.priority)}. Click to change.`}
        >
          <Badge priority={task.priority}>{formatPriority(task.priority)}</Badge>
        </PopoverTrigger>

        <PopoverContent
          size="compact"
          align="start"
          sideOffset={4}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            role="menu"
            aria-label="Select priority"
            className="flex flex-col gap-0.5 p-0.5 min-w-[140px]"
          >
            {PRIORITY_OPTIONS.map(({ priority, label }) => {
              const isSelected = task.priority === priority;
              return (
                <button
                  key={priority}
                  type="button"
                  role="menuitem"
                  data-testid={`inline-priority-option-${priority}`}
                  onClick={(e) => handleSelectPriority(e, priority)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1 rounded text-xs text-left w-full transition-colors cursor-pointer",
                    "hover:bg-[var(--surface-muted)] focus:bg-[var(--surface-muted)] focus:outline-none",
                    isSelected && "bg-[var(--surface-muted)] font-semibold text-[var(--brand-accent-text)]"
                  )}
                >
                  <Badge priority={priority} size="sm">
                    {label}
                  </Badge>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
