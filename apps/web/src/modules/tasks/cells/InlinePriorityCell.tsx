import React, { useState, useRef } from "react";
import { AlertCircle } from "lucide-react";
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
  disabled?: boolean;
  density?: "standard" | "compact";
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
  disabled = false,
  density,
  className,
  onPriorityChange,
}: InlinePriorityCellProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const updateMutation = useUpdateTask();

  const canEdit = !disabled && Boolean(communityId && communityId.trim()) && !isArchived && (task.effectivePermissions?.canEditDatesPriority ?? true);

  if (!canEdit) {
    return (
      <span
        className={cn(
          "inline-flex items-center",
          (disabled || !communityId || !communityId.trim()) && "opacity-60 cursor-not-allowed",
          className
        )}
        data-testid={`inline-priority-cell-${task.id}`}
      >
        <Badge priority={task.priority} size={density === "compact" ? "sm" : "md"}>{formatPriority(task.priority)}</Badge>
      </span>
    );
  }

  const handleSelectPriority = async (
    e: React.MouseEvent | React.KeyboardEvent,
    priority: TaskPriority
  ) => {
    e.stopPropagation();
    setIsOpen(false);
    setError(null);

    if (!communityId || !communityId.trim()) {
      setError("Community context required");
      return;
    }

    if (priority === task.priority) return;

    try {
      if (onPriorityChange) {
        await onPriorityChange(priority);
        return;
      }

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update priority");
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
      className="inline-flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
      data-testid={`inline-priority-cell-${task.id}`}
    >
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (open) setError(null);
        }}
      >
        <PopoverTrigger
          data-testid={`inline-priority-trigger-${task.id}`}
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
            density === "compact" ? "min-h-[24px] min-w-[24px]" : "min-h-[44px] min-w-[44px]",
            updateMutation.isPending && "opacity-70 animate-pulse",
            error && "ring-1 ring-[var(--status-danger-border)]",
            className
          )}
          aria-label={`Priority: ${formatPriority(task.priority)}. Click to change.`}
          title={error ?? undefined}
        >
          <Badge priority={task.priority} size={density === "compact" ? "sm" : "md"}>{formatPriority(task.priority)}</Badge>
          {error && (
            <AlertCircle className="h-3 w-3 text-[var(--status-danger-text)] shrink-0 ml-0.5" />
          )}
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
            aria-label="Select priority"
            onKeyDown={handleKeyDown}
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
