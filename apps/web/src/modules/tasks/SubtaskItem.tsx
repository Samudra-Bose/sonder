import React, { useState } from "react";
import { ChevronRight, ChevronDown, ArrowRightLeft } from "lucide-react";
import { Badge } from "@/components/ui/Badge.js";
import { IconButton } from "@/components/ui/IconButton.js";
import { useTaskPeekDrawer } from "./useTaskPeekDrawer.js";
import { ReparentTaskModal } from "./ReparentTaskModal.js";
import type { TaskDto } from "./types.js";
import { cn } from "@/lib/utils.js";

export interface SubtaskItemProps {
  subtask: TaskDto;
  allTasks: TaskDto[];
  depth: number;
  maxSubtaskDepth: number;
  communityId: string | null;
  workspaceId: string;
  isArchived?: boolean;
}

export function SubtaskItem({
  subtask,
  allTasks,
  depth,
  maxSubtaskDepth,
  communityId,
  workspaceId,
  isArchived = false,
}: SubtaskItemProps): React.JSX.Element {
  const { openTask } = useTaskPeekDrawer();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isReparentOpen, setIsReparentOpen] = useState(false);

  // Descendant children of this subtask
  const children = allTasks.filter((t) => t.parentTaskId === subtask.id);
  const hasChildren = children.length > 0;

  const isTerminal = subtask.statusCategory === "DONE" || subtask.statusCategory === "CANCELED";
  const canMove = Boolean(subtask.effectivePermissions?.canMove && !isArchived);

  return (
    <li
      className="space-y-1"
      data-testid={`subtask-item-${subtask.taskKey}`}
      data-task-id={subtask.id}
      data-depth={depth}
    >
      <div
        className={cn(
          "group flex items-center justify-between gap-2 p-1.5 rounded-md",
          "hover:bg-[var(--surface-muted)] transition-colors text-xs",
          depth > 1 && "ml-4 border-l-2 border-[var(--border-subtle)] pl-2"
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Expand/Collapse Toggle */}
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
              data-testid={`toggle-expand-${subtask.taskKey}`}
              className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-canvas)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            <span className="w-4.5 shrink-0" aria-hidden="true" />
          )}

          {/* Deep link button opening the subtask in TaskPeekDrawer */}
          <button
            type="button"
            onClick={() =>
              openTask(subtask.taskKey, {
                workspaceId: subtask.workspaceId,
              })
            }
            data-testid={`subtask-link-${subtask.taskKey}`}
            className="font-mono font-medium text-[var(--brand-primary)] hover:underline shrink-0 text-[11px] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] rounded px-1"
          >
            {subtask.taskKey}
          </button>

          {/* Title */}
          <span
            className={cn(
              "truncate font-medium text-[var(--text-primary)]",
              isTerminal && "line-through text-[var(--text-muted)]"
            )}
            title={subtask.title}
          >
            {subtask.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Status Badge */}
          <Badge
            status={subtask.statusCategory}
            size="sm"
            data-testid={`subtask-status-${subtask.taskKey}`}
          />

          {/* Priority Badge (if not NONE) */}
          {subtask.priority && subtask.priority !== "NONE" && (
            <Badge
              priority={subtask.priority}
              size="sm"
              className="hidden sm:inline-flex"
              data-testid={`subtask-priority-${subtask.taskKey}`}
            />
          )}

          {/* Reparent Button */}
          {canMove && (
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              icon={<ArrowRightLeft className="h-3 w-3" />}
              onClick={() => setIsReparentOpen(true)}
              aria-label={`Reparent subtask ${subtask.taskKey}`}
              data-testid={`reparent-btn-${subtask.taskKey}`}
              className="h-6 w-6 text-[var(--text-muted)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            />
          )}
        </div>
      </div>

      {/* Reparent Modal */}
      {isReparentOpen && (
        <ReparentTaskModal
          task={subtask}
          allTasks={allTasks}
          maxSubtaskDepth={maxSubtaskDepth}
          communityId={communityId}
          workspaceId={workspaceId}
          isOpen={isReparentOpen}
          onClose={() => setIsReparentOpen(false)}
        />
      )}

      {/* Nested Descendant Subtasks */}
      {hasChildren && isExpanded && (
        <ul
          role="list"
          className="space-y-1"
          data-testid={`nested-subtasks-${subtask.taskKey}`}
        >
          {children.map((child) => (
            <SubtaskItem
              key={child.id}
              subtask={child}
              allTasks={allTasks}
              depth={depth + 1}
              maxSubtaskDepth={maxSubtaskDepth}
              communityId={communityId}
              workspaceId={workspaceId}
              isArchived={isArchived}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
