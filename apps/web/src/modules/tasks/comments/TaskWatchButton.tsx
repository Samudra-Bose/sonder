import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button.js";
import { Tooltip } from "@/components/ui/Tooltip.js";
import { cn } from "@/lib/utils.js";
import { useSetTaskWatch } from "./useTaskComments.js";

export interface TaskWatchButtonProps {
  communityId: string;
  workspaceId: string;
  taskId: string;
  isWatching?: boolean;
  canWatch?: boolean;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Task Watch/Unwatch toggle action.
 * Optimistically toggles the authenticated user's explicit follow preference,
 * provides clear pending feedback, and rolls back cleanly on error.
 */
export function TaskWatchButton({
  communityId,
  workspaceId,
  taskId,
  isWatching = false,
  canWatch = true,
  className,
  size = "sm",
}: TaskWatchButtonProps): React.JSX.Element {
  const [localWatching, setLocalWatching] = useState(isWatching);
  const setWatchMutation = useSetTaskWatch();

  // Keep in sync with incoming server/cache changes
  useEffect(() => {
    setLocalWatching(isWatching);
  }, [isWatching]);

  const handleToggleWatch = async () => {
    if (!canWatch || setWatchMutation.isPending) return;

    const nextState = !localWatching;
    setLocalWatching(nextState);

    try {
      await setWatchMutation.mutateAsync({
        communityId,
        workspaceId,
        taskId,
        watching: nextState,
      });
    } catch {
      // Roll back optimistic toggle on error
      setLocalWatching(!nextState);
    }
  };

  const isPending = setWatchMutation.isPending;
  const label = localWatching ? "Watching" : "Watch";
  const tooltipText = !canWatch
    ? "You do not have permission to watch tasks in this workspace"
    : localWatching
      ? "You are watching this task. Click to stop receiving updates."
      : "Watch this task to receive updates on comments and changes.";

  return (
    <Tooltip content={tooltipText}>
      <Button
        type="button"
        size={size}
        variant={localWatching ? "secondary" : "outline"}
        disabled={!canWatch || isPending}
        onClick={handleToggleWatch}
        aria-pressed={localWatching}
        aria-label={label}
        data-testid="task-watch-button"
        className={cn(
          "gap-1.5 transition-colors select-none",
          localWatching && "bg-[var(--brand-accent-subtle)] border-[var(--brand-accent-border)] text-[var(--brand-accent-text)] hover:bg-[var(--brand-accent-subtle)]/80",
          className
        )}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : localWatching ? (
          <Eye className="h-3.5 w-3.5 text-[var(--brand-accent-text)]" aria-hidden="true" />
        ) : (
          <EyeOff className="h-3.5 w-3.5 text-[var(--text-muted)]" aria-hidden="true" />
        )}
        <span className="text-xs font-medium">{label}</span>
      </Button>
    </Tooltip>
  );
}
