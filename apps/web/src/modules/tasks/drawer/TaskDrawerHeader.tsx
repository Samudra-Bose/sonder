import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Lock,
  Archive,
  CopyPlus,
  Loader2,
} from "lucide-react";
import { IconButton } from "@/components/ui/IconButton.js";
import { Tooltip } from "@/components/ui/Tooltip.js";
import { WorkspaceBadge } from "@/modules/workspace/WorkspaceBadge.js";
import { TaskWatchButton } from "../comments/TaskWatchButton.js";
import { cn } from "@/lib/utils.js";
import type { TaskDto } from "../types.js";
import type { WorkspaceDto } from "@/modules/workspace/types.js";

export interface TaskDrawerHeaderProps {
  taskKey?: string | null;
  task?: TaskDto;
  targetWorkspace?: WorkspaceDto | null;
  isNotFound?: boolean;
  error?: unknown;
  isArchived?: boolean;
  canArchive?: boolean;
  canClone?: boolean;
  isCurrentTaskCloning?: boolean;
  isWatching?: boolean;
  currentCommunityId: string | null;
  closeButtonRef?: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onArchive: () => void;
  onClone: () => void;
}

export function TaskDrawerHeader({
  taskKey,
  task,
  targetWorkspace,
  isNotFound,
  error,
  isArchived,
  canArchive,
  canClone,
  isCurrentTaskCloning,
  isWatching = false,
  currentCommunityId,
  closeButtonRef,
  onClose,
  onArchive,
  onClone,
}: TaskDrawerHeaderProps): React.JSX.Element {
  const [hasCopiedKey, setHasCopiedKey] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);

  const handleCopyKey = async () => {
    if (!taskKey) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(taskKey);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = taskKey;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setHasCopiedKey(true);
      setTimeout(() => setHasCopiedKey(false), 2000);
    } catch {
      // Best-effort clipboard copy fallback
    }
  };

  const handleCopyLink = async () => {
    if (!taskKey) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("task", taskKey);
      await navigator.clipboard.writeText(url.toString());
      setHasCopiedLink(true);
      setTimeout(() => setHasCopiedLink(false), 2000);
    } catch {
      // Best-effort clipboard copy fallback
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] bg-[var(--surface-card)] shrink-0 z-20">
      <div className="flex items-center space-x-2 min-w-0">
        {!isNotFound && !error && targetWorkspace && (
          <div className="flex items-center space-x-1.5 shrink-0">
            <WorkspaceBadge
              prefix={targetWorkspace.keyPrefix}
              size="sm"
              className={cn(targetWorkspace.kind === "PERSONAL" && "border-dashed")}
            />
            {targetWorkspace.kind === "PERSONAL" && (
              <Lock className="h-3 w-3 text-[var(--text-muted)]" aria-label="Personal Workspace" />
            )}
            <span className="text-xs font-medium text-[var(--text-muted)] truncate max-w-[140px]">
              {targetWorkspace.name}
            </span>
          </div>
        )}

        {/* Copy Task Key Action */}
        <Tooltip content={hasCopiedKey ? "Key copied!" : "Copy task key"}>
          <button
            type="button"
            onClick={handleCopyKey}
            aria-label={`Copy task key ${taskKey ?? ""}`}
            data-testid="copy-task-key-button"
            className="font-mono text-xs font-bold text-[var(--brand-accent-text)] px-1.5 py-0.5 rounded bg-[var(--brand-accent-subtle)] border border-[var(--brand-accent-border)] shrink-0 hover:bg-[var(--brand-accent-subtle)]/80 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] transition-colors"
          >
            {hasCopiedKey ? (
              <span className="inline-flex items-center gap-1">
                <Check className="h-3 w-3 text-emerald-500" />
                <span>{taskKey}</span>
              </span>
            ) : (
              taskKey
            )}
          </button>
        </Tooltip>

        {/* Copy Link Action */}
        <Tooltip content={hasCopiedLink ? "Link copied!" : "Copy task link"}>
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Copy task link"
            icon={
              hasCopiedLink ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )
            }
            onClick={handleCopyLink}
            className="h-7 w-7 text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] rounded"
          />
        </Tooltip>
      </div>

      <div className="flex items-center space-x-1.5 shrink-0">
        {task && !isNotFound && !error && currentCommunityId && (
          <TaskWatchButton
            communityId={currentCommunityId}
            workspaceId={task.workspaceId}
            taskId={task.id}
            isWatching={isWatching}
            canWatch={Boolean(task.effectivePermissions?.canWatch && !isArchived)}
            size="sm"
            className="h-7 text-xs px-2"
          />
        )}

        {task && !isNotFound && !error && canClone && (
          <Tooltip content="Clone task">
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Clone task"
              data-testid="clone-task-button"
              disabled={isCurrentTaskCloning}
              icon={
                isCurrentTaskCloning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CopyPlus className="h-3.5 w-3.5" />
                )
              }
              onClick={onClone}
              className="h-7 w-7 text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-ring rounded"
            />
          </Tooltip>
        )}

        {task && !isNotFound && !error && canArchive && (
          <Tooltip content="Archive task">
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Archive task"
              data-testid="archive-task-button"
              icon={<Archive className="h-3.5 w-3.5" />}
              onClick={onArchive}
              className="h-7 w-7 text-[var(--text-muted)] hover:text-[var(--feedback-danger-text)] focus-ring rounded"
            />
          </Tooltip>
        )}

        <IconButton
          ref={closeButtonRef}
          size="sm"
          variant="ghost"
          aria-label="Close task details"
          icon={<X className="h-4 w-4" />}
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-ring rounded"
        />
      </div>
    </div>
  );
}
