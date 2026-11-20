import React, { useState } from "react";
import { Badge } from "@/components/ui/Badge.js";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover.js";
import { cn } from "@/lib/utils.js";
import { useUpdateTask } from "../useUpdateTask.js";
import type { TaskDto, TaskStatusCategory } from "../types.js";

export interface InlineStatusCellProps {
  task: Pick<TaskDto, "id" | "statusCategory"> & {
    effectivePermissions?: {
      canUpdateStatus?: boolean;
    };
    fieldRevisions?: {
      statusCategory?: number;
      [key: string]: number | undefined;
    };
  };
  communityId: string;
  workspaceId: string;
  isArchived?: boolean;
  className?: string;
  onStatusChange?: (newStatus: TaskStatusCategory) => Promise<void> | void;
}

const STATUS_OPTIONS: { category: TaskStatusCategory; label: string }[] = [
  { category: "BACKLOG", label: "Backlog" },
  { category: "TODO", label: "To Do" },
  { category: "IN_PROGRESS", label: "In Progress" },
  { category: "DONE", label: "Done" },
  { category: "CANCELED", label: "Canceled" },
];

export function formatStatus(status: TaskStatusCategory): string {
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

export function InlineStatusCell({
  task,
  communityId,
  workspaceId,
  isArchived = false,
  className,
  onStatusChange,
}: InlineStatusCellProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const updateMutation = useUpdateTask();

  const canEdit = !isArchived && (task.effectivePermissions?.canUpdateStatus ?? true);

  if (!canEdit) {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <Badge status={task.statusCategory}>{formatStatus(task.statusCategory)}</Badge>
      </span>
    );
  }

  const handleSelectStatus = async (
    e: React.MouseEvent | React.KeyboardEvent,
    status: TaskStatusCategory
  ) => {
    e.stopPropagation();
    setIsOpen(false);

    if (status === task.statusCategory) return;

    if (onStatusChange) {
      await onStatusChange(status);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        communityId,
        workspaceId,
        taskId: task.id,
        data: {
          statusCategory: status,
          baseFieldRevisions: {
            statusCategory: task.fieldRevisions?.statusCategory ?? 1,
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
      data-testid={`inline-status-cell-${task.id}`}
    >
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          data-testid={`inline-status-trigger-${task.id}`}
          onClick={(e) => {
            e.stopPropagation();
          }}
          className={cn(
            "inline-flex items-center rounded focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] transition-opacity hover:opacity-80 cursor-pointer select-none",
            className
          )}
          aria-label={`Status: ${formatStatus(task.statusCategory)}. Click to change.`}
        >
          <Badge status={task.statusCategory}>{formatStatus(task.statusCategory)}</Badge>
        </PopoverTrigger>

        <PopoverContent
          size="compact"
          align="start"
          sideOffset={4}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            role="menu"
            aria-label="Select status"
            className="flex flex-col gap-0.5 p-0.5 min-w-[140px]"
          >
            {STATUS_OPTIONS.map(({ category, label }) => {
              const isSelected = task.statusCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  role="menuitem"
                  data-testid={`inline-status-option-${category}`}
                  onClick={(e) => handleSelectStatus(e, category)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1 rounded text-xs text-left w-full transition-colors cursor-pointer",
                    "hover:bg-[var(--surface-muted)] focus:bg-[var(--surface-muted)] focus:outline-none",
                    isSelected && "bg-[var(--surface-muted)] font-semibold text-[var(--brand-accent-text)]"
                  )}
                >
                  <Badge status={category} size="sm">
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
