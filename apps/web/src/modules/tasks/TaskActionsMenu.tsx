import React, { useState, useCallback } from "react";
import { MoreHorizontal, Copy, Archive, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu.js";
import { cn } from "@/lib/utils.js";
import { useTaskUndo } from "./TaskUndoContext.js";
import type { TaskDto } from "./types.js";

export interface TaskActionsMenuProps {
  task: TaskDto;
  workspaceId: string;
  communityId?: string;
  className?: string;
}

export function TaskActionsMenu({
  task,
  workspaceId,
  communityId,
  className,
}: TaskActionsMenuProps): React.JSX.Element {
  const { archiveTask } = useTaskUndo();
  const [hasCopied, setHasCopied] = useState(false);
  const [open, setOpen] = useState(false);

  // Strict Fail-Closed Permission Gate
  const canArchive = Boolean(
    task?.effectivePermissions?.canArchive && !task.archivedAt
  );

  const handleCopyLink = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const path = communityId
        ? `/community/${communityId}/workspaces/${workspaceId}/tasks?task=${task.taskKey}`
        : `/workspaces/${workspaceId}/tasks?task=${task.taskKey}`;
      const url = `${origin}${path}`;

      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(url).catch(() => {});
      }
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
      setOpen(false);
    },
    [communityId, workspaceId, task.taskKey]
  );

  const handleArchive = useCallback(
    async (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
      if (!canArchive) return;

      setOpen(false);

      // Find nearest adjacent row or card before optimistic eviction
      const nextSibling =
        document.querySelector<HTMLElement>(
          `[data-testid^="task-list-row-"]:not([data-testid="task-list-row-${task.taskKey}"])`
        ) ||
        document.querySelector<HTMLElement>(
          `[data-testid^="task-board-card-"]:not([data-testid="task-board-card-${task.taskKey}"])`
        );

      try {
        await archiveTask(task, { communityId, workspaceId });
        nextSibling?.focus();
      } catch {
        // Handled in context
      }
    },
    [canArchive, archiveTask, task, communityId, workspaceId]
  );

  return (
    <div
      className={cn("inline-flex items-center", className)}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          aria-label={`Task actions for ${task.taskKey}`}
          data-testid={`task-actions-trigger-${task.taskKey}`}
          className="h-7 w-7 inline-flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-ring transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={4}
          className="w-40 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Copy Link Option */}
          <DropdownMenuItem
            onClick={handleCopyLink}
            data-testid={`task-action-copy-link-${task.taskKey}`}
          >
            {hasCopied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            )}
            <span>{hasCopied ? "Link Copied" : "Copy Link"}</span>
          </DropdownMenuItem>

          {/* Archive Task Option: Rendered ONLY if canArchive is true */}
          {canArchive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                destructive
                onClick={handleArchive}
                data-testid={`task-action-archive-${task.taskKey}`}
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Archive Task</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
