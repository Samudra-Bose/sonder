import React, { useState, useCallback } from "react";
import { MoreHorizontal, Copy, Archive, Check, CopyPlus, Loader2, Hash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu.js";
import { cn } from "@/lib/utils.js";
import { useTaskUndo } from "./TaskUndoContext.js";
import { useTaskClone, canCloneTask } from "./TaskCloneContext.js";
import { useWorkspace } from "@/modules/workspace/index.js";
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
  const { cloneTask, isCloning, cloningTaskId } = useTaskClone();
  const { activeWorkspace, workspaces } = useWorkspace();
  const [hasCopiedLink, setHasCopiedLink] = useState(false);
  const [hasCopiedKey, setHasCopiedKey] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<"key" | "link" | null>(null);
  const [open, setOpen] = useState(false);

  const isCurrentTaskCloning = isCloning && cloningTaskId === task.id;

  // Strict Fail-Closed Permission Gate
  const canArchive = Boolean(
    task?.effectivePermissions?.canArchive && !task.archivedAt
  );

  const targetWorkspace = workspaces.find((w) => w.id === workspaceId) || activeWorkspace;
  const canClone = canCloneTask(task, targetWorkspace);

  const handleCopyKey = useCallback(
    async (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(task.taskKey);
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = task.taskKey;
          textArea.style.position = "fixed";
          textArea.style.opacity = "0";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
        }
        setHasCopiedKey(true);
        setCopyFeedback("key");
        setTimeout(() => {
          setHasCopiedKey(false);
          setCopyFeedback((prev) => (prev === "key" ? null : prev));
        }, 2000);
      } catch {
        // Fallback or clipboard error handled silently
      }
      setOpen(false);
    },
    [task.taskKey]
  );

  const handleCopyLink = useCallback(
    async (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      let path = "";
      if (typeof window !== "undefined" && window.location.pathname.includes(`/workspaces/${workspaceId}`)) {
        const url = new URL(window.location.href);
        url.searchParams.set("task", task.taskKey);
        path = url.pathname + url.search;
      } else {
        path = communityId
          ? `/community/${communityId}/workspaces/${workspaceId}/tasks?task=${task.taskKey}`
          : `/workspaces/${workspaceId}/tasks?task=${task.taskKey}`;
      }
      const url = `${origin}${path}`;

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = url;
          textArea.style.position = "fixed";
          textArea.style.opacity = "0";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
        }
        setHasCopiedLink(true);
        setCopyFeedback("link");
        setTimeout(() => {
          setHasCopiedLink(false);
          setCopyFeedback((prev) => (prev === "link" ? null : prev));
        }, 2000);
      } catch {
        // Fallback or clipboard error handled silently
      }
      setOpen(false);
    },
    [communityId, workspaceId, task.taskKey]
  );

  const handleClone = useCallback(
    async (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
      if (!canClone || isCurrentTaskCloning) return;

      setOpen(false);
      try {
        await cloneTask(task, { communityId, workspaceId, includeSubtasks: true });
      } catch {
        // Handled in context / mutation
      }
    },
    [canClone, isCurrentTaskCloning, cloneTask, task, communityId, workspaceId]
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
          aria-label={
            copyFeedback === "key"
              ? `Copied ${task.taskKey} key`
              : copyFeedback === "link"
                ? `Copied ${task.taskKey} link`
                : `Task actions for ${task.taskKey}`
          }
          data-testid={`task-actions-trigger-${task.taskKey}`}
          className={cn(
            "h-7 w-7 inline-flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-ring transition-colors cursor-pointer",
            copyFeedback && "text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20"
          )}
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
          {copyFeedback ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <MoreHorizontal className="h-3.5 w-3.5" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={4}
          className="w-44 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Copy Key Option */}
          <DropdownMenuItem
            onClick={handleCopyKey}
            data-testid={`task-action-copy-key-${task.taskKey}`}
          >
            {hasCopiedKey ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Hash className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            )}
            <span>{hasCopiedKey ? "Key Copied" : "Copy Task Key"}</span>
          </DropdownMenuItem>

          {/* Copy Link Option */}
          <DropdownMenuItem
            onClick={handleCopyLink}
            data-testid={`task-action-copy-link-${task.taskKey}`}
          >
            {hasCopiedLink ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            )}
            <span>{hasCopiedLink ? "Link Copied" : "Copy Task Link"}</span>
          </DropdownMenuItem>

          {/* Clone / Duplicate Task Option */}
          {canClone && (
            <DropdownMenuItem
              onClick={handleClone}
              disabled={isCurrentTaskCloning}
              data-testid={`task-action-clone-${task.taskKey}`}
            >
              {isCurrentTaskCloning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CopyPlus className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              )}
              <span>{isCurrentTaskCloning ? "Cloning..." : "Clone Task"}</span>
            </DropdownMenuItem>
          )}

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
