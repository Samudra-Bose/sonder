import React from "react";
import { GitFork, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils.js";
import { TaskActionsMenu } from "../TaskActionsMenu.js";
import { TaskArchetypeBadge } from "../TaskArchetypeBadge.js";
import { InlineTitleCell } from "../cells/InlineTitleCell.js";
import { InlineStatusCell } from "../cells/InlineStatusCell.js";
import { InlinePriorityCell } from "../cells/InlinePriorityCell.js";
import { InlineAssigneeCell } from "../cells/InlineAssigneeCell.js";
import { InlineDueDateCell } from "../cells/InlineDueDateCell.js";
import type { TaskTreeNode } from "../hierarchy/types.js";
import type { TaskViewDensity } from "../density/index.js";

export interface TaskListTreeRowProps {
  node: TaskTreeNode;
  workspaceId: string;
  communityId: string;
  density: TaskViewDensity;
  isSelected: boolean;
  onToggleSelect: (taskId: string) => void;
  onOpenTask: (taskKey: string) => void;
  bodyCellPadding: string;
  isCompact: boolean;
  isSelectionDisabled?: boolean;
  /** Whether this node is currently expanded in the tree view. */
  isExpanded?: boolean;
  /** Callback to toggle expansion state for this task node. */
  onToggleExpand?: (taskId: string) => void;
  /** Indentation per depth level in pixels. Defaults to 24px per Sonder M3.3 specification. */
  indentSizePx?: number;
  className?: string;
}

export function TaskListTreeRow({
  node,
  workspaceId,
  communityId,
  density,
  isSelected,
  onToggleSelect,
  onOpenTask,
  bodyCellPadding,
  isCompact,
  isSelectionDisabled = false,
  isExpanded = false,
  onToggleExpand,
  indentSizePx = 24,
  className,
}: TaskListTreeRowProps): React.JSX.Element {
  const { task, depth, isOrphaned, orphanParentLabel, hasChildren, subtaskCount, completedSubtaskCount } = node;

  const handleRowClick = () => {
    onOpenTask(task.taskKey);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleRowClick();
    }
  };

  // Indentation offset: 0px at root, 24px at depth 1, 48px at depth 2
  const indentOffset = depth * indentSizePx;

  return (
    <tr
      data-testid={`task-list-tree-row-${task.taskKey}`}
      data-depth={depth}
      data-density={density}
      data-orphan={isOrphaned ? "true" : undefined}
      data-context-only={node.isContextOnly ? "true" : undefined}
      data-parent-id={node.parentId ?? undefined}
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      style={{ height: isCompact ? "38px" : "44px" }}
      className={cn(
        isCompact ? "h-[38px]" : "h-11",
        "hover:bg-[var(--surface-muted)] transition-colors cursor-pointer focus:bg-[var(--surface-muted)] focus:outline-none focus:ring-1 focus:ring-inset focus:ring-[var(--border-focus)] group shadow-[inset_0_-1px_0_var(--border-subtle)]",
        isSelected && "bg-[var(--surface-muted)]",
        depth > 0 && "bg-[var(--surface-card)]/50",
        node.isContextOnly && "bg-[var(--surface-muted)]/30 text-[var(--text-secondary)]",
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

      {/* 3. Title with Hierarchical Indentation, Vertical Guide, & Archetype */}
      <td className={cn(bodyCellPadding, "min-w-[200px]")}>
        <div
          className="flex items-center gap-2"
          style={{ paddingLeft: `${indentOffset}px` }}
        >
          {/* Restrained tree connector guide for nested descendants */}
          {depth > 0 && (
            <div
              className="flex items-center shrink-0 text-[var(--border-subtle)] mr-0.5"
              aria-hidden="true"
            >
              <div className="w-2.5 h-3.5 border-b border-l border-[var(--border-subtle)] rounded-bl -mt-1.5 opacity-70" />
            </div>
          )}

          {/* Expand/Collapse disclosure control or alignment spacer */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.(task.id);
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              aria-expanded={isExpanded}
              aria-label={
                isExpanded
                  ? `Collapse subtasks for ${task.taskKey}`
                  : `Expand subtasks for ${task.taskKey}`
              }
              data-testid={`tree-expand-button-${task.taskKey}`}
              className={cn(
                "inline-flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] transition-colors cursor-pointer select-none shrink-0",
                isCompact
                  ? "h-6 w-6 min-h-[24px] min-w-[24px] -mr-1"
                  : "h-11 w-11 min-h-[44px] min-w-[44px] -mr-2"
              )}
            >
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform duration-150 motion-reduce:transition-none text-[var(--text-muted)] group-hover:text-[var(--text-primary)]",
                  isExpanded && "rotate-90"
                )}
                aria-hidden="true"
              />
            </button>
          ) : (
            <div
              data-testid={`tree-spacer-${task.taskKey}`}
              aria-hidden="true"
              className={cn(
                "shrink-0",
                isCompact
                  ? "h-6 w-6 min-h-[24px] min-w-[24px] -mr-1"
                  : "h-11 w-11 min-h-[44px] min-w-[44px] -mr-2"
              )}
            />
          )}

          {/* Archetype badge */}
          <TaskArchetypeBadge archetype={task.itemType} size="sm" showLabel={false} />

          {/* Context-only indicator pill (M3.3 Batch 4) */}
          {node.isContextOnly && (
            <span
              data-testid={`context-only-badge-${task.taskKey}`}
              title="Hierarchy context only; does not match active filter"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border-subtle)] shrink-0 select-none whitespace-nowrap"
            >
              Context only
              <span className="sr-only">Hierarchy context only; does not match active filter</span>
            </span>
          )}

          {/* Orphan indicator pill (DEC-M3.3-02 / Section 3) */}
          {isOrphaned && orphanParentLabel && (
            <span
              data-testid={`orphan-badge-${task.taskKey}`}
              title={orphanParentLabel}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border-subtle)] shrink-0 select-none"
            >
              <GitFork className="h-2.5 w-2.5 rotate-180 opacity-70 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-[120px]">{orphanParentLabel}</span>
              <span className="sr-only">{orphanParentLabel}</span>
            </span>
          )}

          {/* Inline Title Editor */}
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

      {/* 8. Subtasks Indicator / Honest Progress Metric */}
      <td className={cn(bodyCellPadding, "w-28 text-center text-[var(--text-muted)] whitespace-nowrap")}>
        {hasChildren ? (
          <span
            data-testid={`subtask-progress-${task.taskKey}`}
            className="text-[11px] font-mono text-[var(--text-muted)] whitespace-nowrap"
          >
            {completedSubtaskCount} of {subtaskCount} loaded
          </span>
        ) : depth > 0 ? (
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--surface-muted)] whitespace-nowrap">
            child
          </span>
        ) : isOrphaned ? (
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--surface-muted)] whitespace-nowrap">
            orphan
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
