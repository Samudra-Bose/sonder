import React from "react";
import { GitFork } from "lucide-react";
import { cn } from "@/lib/utils.js";
import { TaskActionsMenu } from "../TaskActionsMenu.js";
import { TaskArchetypeBadge } from "../TaskArchetypeBadge.js";
import { InlineTitleCell } from "../cells/InlineTitleCell.js";
import { InlineStatusCell } from "../cells/InlineStatusCell.js";
import { InlinePriorityCell } from "../cells/InlinePriorityCell.js";
import { InlineAssigneeCell } from "../cells/InlineAssigneeCell.js";
import { InlineDueDateCell } from "../cells/InlineDueDateCell.js";
import type { TaskViewDensity } from "../density/index.js";
import type { TaskDto } from "../types.js";

export interface TaskListRowProps {
  task: TaskDto;
  workspaceId: string;
  communityId: string;
  density: TaskViewDensity;
  isSelected: boolean;
  onToggleSelect: (taskId: string) => void;
  onOpenTask: (taskKey: string) => void;
  bodyCellPadding: string;
  isCompact: boolean;
  isSelectionDisabled?: boolean;
  className?: string;
}

export function TaskListRow({
  task,
  workspaceId,
  communityId,
  density,
  isSelected,
  onToggleSelect,
  onOpenTask,
  bodyCellPadding,
  isCompact,
  isSelectionDisabled = false,
  className,
}: TaskListRowProps): React.JSX.Element {
  const handleRowClick = () => {
    onOpenTask(task.taskKey);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleRowClick();
    }
  };

  return (
    <tr
      data-testid={`task-list-row-${task.taskKey}`}
      data-density={density}
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      style={{ height: isCompact ? "38px" : "44px" }}
      className={cn(
        isCompact ? "h-[38px]" : "h-11",
        "hover:bg-[var(--surface-muted)] transition-colors cursor-pointer focus:bg-[var(--surface-muted)] focus:outline-none focus:ring-1 focus:ring-inset focus:ring-[var(--border-focus)] group shadow-[inset_0_-1px_0_var(--border-subtle)]",
        isSelected && "bg-[var(--surface-muted)]",
        className
      )}
    >
      {/* 1. Selection Checkbox */}
      <td
        className={cn(bodyCellPadding, "w-10 text-center")}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <label
          className={cn(
            "inline-flex items-center justify-center cursor-pointer rounded select-none",
            isCompact ? "min-h-[24px] min-w-[24px]" : "min-h-[44px] min-w-[44px] h-11 w-11"
          )}
        >
          <input
            type="checkbox"
            aria-label={`Select task ${task.taskKey}`}
            data-testid={`bulk-select-task-${task.taskKey}`}
            checked={isSelected}
            disabled={isSelectionDisabled && !isSelected}
            title={
              isSelectionDisabled && !isSelected
                ? "Selection limit of 100 tasks reached. Deselect tasks to free capacity."
                : undefined
            }
            onChange={() => onToggleSelect(task.id)}
            className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand-accent-btn-bg)] focus:ring-[var(--border-focus)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          />
        </label>
      </td>

      {/* 2. Task Key */}
      <td className={cn(bodyCellPadding, "font-mono font-bold text-[var(--brand-accent-text)] tabular-nums")}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick();
          }}
          className={cn(
            "hover:underline focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] rounded inline-flex items-center",
            isCompact ? "min-h-[24px] min-w-[24px] py-0.5 px-1" : "min-h-[44px] min-w-[44px] px-1"
          )}
        >
          {task.taskKey}
        </button>
      </td>

      {/* 3. Title & Archetype / Subtask icon */}
      <td className={cn(bodyCellPadding, "min-w-[200px]")}>
        <div className="flex items-center gap-2">
          <TaskArchetypeBadge archetype={task.itemType} size="sm" showLabel={false} />
          {task.parentTaskId && (
            <span
              title="Subtask"
              className="inline-flex items-center text-[var(--text-muted)] shrink-0"
            >
              <GitFork className="h-3 w-3 rotate-180" />
            </span>
          )}
          <InlineTitleCell
            task={task}
            communityId={communityId}
            workspaceId={workspaceId}
            density={density}
            className="flex-1 min-w-0"
          />
        </div>
      </td>

      {/* 4. Status Category */}
      <td className={cn(bodyCellPadding, "w-32")}>
        <InlineStatusCell
          task={task}
          communityId={communityId}
          workspaceId={workspaceId}
          density={density}
        />
      </td>

      {/* 5. Assignee */}
      <td className={cn(bodyCellPadding, "w-32")} data-testid={`task-list-assignee-${task.taskKey}`}>
        <InlineAssigneeCell
          task={task}
          communityId={communityId}
          workspaceId={workspaceId}
          density={density}
        />
      </td>

      {/* 6. Priority */}
      <td className={cn(bodyCellPadding, "w-28")}>
        <InlinePriorityCell
          task={task}
          communityId={communityId}
          workspaceId={workspaceId}
          density={density}
        />
      </td>

      {/* 7. Due Date */}
      <td className={cn(bodyCellPadding, "w-32")}>
        <InlineDueDateCell
          task={task}
          communityId={communityId}
          workspaceId={workspaceId}
          density={density}
        />
      </td>

      {/* 8. Subtask indicator */}
      <td className={cn(bodyCellPadding, "w-28 text-center text-[var(--text-muted)] whitespace-nowrap")}>
        {task.parentTaskId ? (
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--surface-muted)]">
            child
          </span>
        ) : (
          <span className="text-[var(--text-muted)] text-[11px]">—</span>
        )}
      </td>

      {/* 9. Actions Menu */}
      <td
        className={cn(bodyCellPadding, "w-10 text-right")}
        onClick={(e) => e.stopPropagation()}
      >
        <TaskActionsMenu
          task={task}
          workspaceId={workspaceId}
          communityId={communityId}
          density={density}
        />
      </td>
    </tr>
  );
}
