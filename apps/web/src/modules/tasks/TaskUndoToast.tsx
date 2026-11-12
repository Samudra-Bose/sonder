import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button.js";
import { IconButton } from "@/components/ui/IconButton.js";
import { cn } from "@/lib/utils.js";
import { useTaskUndo } from "./TaskUndoContext.js";

export interface TaskUndoToastProps {
  className?: string;
}

export function TaskUndoToast({ className }: TaskUndoToastProps): React.JSX.Element | null {
  const { activeUndos, undoTask, dismissUndo } = useTaskUndo();

  if (!activeUndos || activeUndos.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="task-undo-toast-container"
      className={cn(
        "fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none",
        className
      )}
    >
      {activeUndos.map((item) => {
        const isRestoring = item.status === "restoring";
        const progressPercent = Math.min(
          100,
          Math.max(0, (item.remainingMs / 10000) * 100)
        );

        return (
          <div
            key={item.taskId}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-testid={`undo-toast-${item.taskKey}`}
            className="pointer-events-auto relative flex flex-col gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-overlay)] p-3 text-[var(--text-primary)] shadow-lg backdrop-blur-md transition-all duration-200"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate">
                  Task {item.taskKey} archived.
                </span>
                <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">
                  Press{" "}
                  <kbd className="px-1 py-0.5 rounded bg-[var(--surface-muted)] border border-[var(--border-subtle)] font-mono text-[9px]">
                    Z
                  </kbd>{" "}
                  or{" "}
                  <kbd className="px-1 py-0.5 rounded bg-[var(--surface-muted)] border border-[var(--border-subtle)] font-mono text-[9px]">
                    Mod+Z
                  </kbd>{" "}
                  to undo
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isRestoring || item.status === "error"}
                  onClick={() => {
                    void undoTask(item.taskId);
                  }}
                  aria-label={`Undo archive for task ${item.taskKey}`}
                  data-testid={`undo-button-${item.taskKey}`}
                  className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] text-xs font-semibold px-2.5 py-1 focus-ring"
                >
                  {isRestoring ? "Restoring..." : "Undo"}
                </Button>

                <IconButton
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => dismissUndo(item.taskId)}
                  aria-label={`Dismiss undo notification for task ${item.taskKey}`}
                  data-testid={`undo-dismiss-${item.taskKey}`}
                  icon={<X className="h-4 w-4" />}
                  className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-ring"
                />
              </div>
            </div>

            {/* Advisory Countdown Linear Progress Bar */}
            <div
              role="progressbar"
              aria-valuenow={Math.round(item.remainingMs / 1000)}
              aria-valuemin={0}
              aria-valuemax={10}
              aria-label={`Time remaining to undo archive for task ${item.taskKey}`}
              className="h-1 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]"
            >
              <div
                className="h-full bg-[var(--brand-accent-text)] transition-all duration-100 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {item.errorMessage && (
              <div
                role="alert"
                className="text-[11px] text-[var(--feedback-danger-text)] mt-0.5 font-medium"
              >
                {item.errorMessage}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
