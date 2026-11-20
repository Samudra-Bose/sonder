import React, { useState, useRef } from "react";
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
  disabled?: boolean;
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
  disabled = false,
  className,
  onStatusChange,
}: InlineStatusCellProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const updateMutation = useUpdateTask();

  const canEdit = !disabled && !isArchived && (task.effectivePermissions?.canUpdateStatus ?? true);

  if (!canEdit) {
    return (
      <span
        className={cn(
          "inline-flex items-center",
          disabled && "opacity-60 cursor-not-allowed",
          className
        )}
        data-testid={`inline-status-cell-${task.id}`}
      >
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

    try {
      if (onStatusChange) {
        await onStatusChange(status);
        return;
      }

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
      // Optimistic update rollback handled by useUpdateTask
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      setIsOpen(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const buttons = menuRef.current?.querySelectorAll<HTMLButtonElement>("button[role='menuitem']");
      if (!buttons || buttons.length === 0) return;
      const currentIndex = Array.from(buttons).indexOf(document.activeElement as HTMLButtonElement);
      if (e.key === "ArrowDown") {
        const nextIndex = (currentIndex + 1) % buttons.length;
        buttons[nextIndex]?.focus();
      } else {
        const prevIndex = (currentIndex - 1 + buttons.length) % buttons.length;
        buttons[prevIndex]?.focus();
      }
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
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
            }
          }}
          className={cn(
            "inline-flex items-center rounded focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] transition-opacity hover:opacity-80 cursor-pointer select-none",
            updateMutation.isPending && "opacity-70 animate-pulse",
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
            ref={menuRef}
            role="menu"
            aria-label="Select status"
            onKeyDown={handleKeyDown}
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
