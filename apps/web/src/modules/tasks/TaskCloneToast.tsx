import React from "react";
import { X, ExternalLink, CopyCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button.js";
import { IconButton } from "@/components/ui/IconButton.js";
import { cn } from "@/lib/utils.js";
import { useTaskClone } from "./TaskCloneContext.js";
import { useTaskUndo } from "./TaskUndoContext.js";
import { useTaskPeekDrawer } from "./useTaskPeekDrawer.js";

export interface TaskCloneToastProps {
  className?: string;
}

export function TaskCloneToast({ className }: TaskCloneToastProps): React.JSX.Element | null {
  const { activeClones, dismissClone } = useTaskClone();
  const { activeUndos } = useTaskUndo();
  const { openTask } = useTaskPeekDrawer();

  if (!activeClones || activeClones.length === 0) {
    return null;
  }

  // Prevent toast collision when Undo toast is visible
  const hasActiveUndo = Boolean(activeUndos && activeUndos.length > 0);

  return (
    <div
      data-testid="task-clone-toast-container"
      className={cn(
        "fixed right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none transition-all duration-300",
        hasActiveUndo ? "bottom-28" : "bottom-4",
        className
      )}
    >
      {activeClones.map((item) => {
        if (item.type === "error") {
          return (
            <div
              key={item.id}
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              data-testid={`clone-toast-error-${item.sourceTaskKey}`}
              className="pointer-events-auto relative flex flex-col gap-2 rounded-xl border border-[var(--feedback-danger-border,#f87171)] bg-[var(--surface-overlay)] p-3 text-[var(--text-primary)] shadow-lg backdrop-blur-md transition-all duration-200"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="p-1 rounded-md bg-red-500/10 text-[var(--feedback-danger-text,#ef4444)] mt-0.5 shrink-0">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold truncate text-[var(--feedback-danger-text,#ef4444)]">
                      Failed to clone task {item.sourceTaskKey}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] truncate">
                      {item.errorMessage ?? "An unexpected error occurred."}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <IconButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Dismiss clone error for ${item.sourceTaskKey}`}
                    data-testid={`clone-toast-dismiss-${item.sourceTaskKey}`}
                    icon={<X className="h-3.5 w-3.5" />}
                    onClick={() => dismissClone(item.id)}
                    className="min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-ring rounded"
                  />
                </div>
              </div>
            </div>
          );
        }

        const taskKey = item.clonedTask?.taskKey ?? item.sourceTaskKey;

        return (
          <div
            key={item.id}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-testid={`clone-toast-${taskKey}`}
            className="pointer-events-auto relative flex flex-col gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-overlay)] p-3 text-[var(--text-primary)] shadow-lg backdrop-blur-md transition-all duration-200"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-500 mt-0.5 shrink-0">
                  <CopyCheck className="h-4 w-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold truncate">
                    Task {taskKey} created.
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] truncate">
                    Cloned from {item.sourceTaskKey}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {item.clonedTask && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (item.clonedTask) {
                        openTask(item.clonedTask.taskKey);
                      }
                      dismissClone(item.id);
                    }}
                    aria-label={`Open cloned task ${taskKey}`}
                    data-testid={`clone-toast-open-${taskKey}`}
                    className="min-h-[44px] min-w-[44px] sm:min-h-[30px] sm:min-w-[30px] text-xs font-semibold px-2.5 py-1 focus-ring"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open
                  </Button>
                )}
                <IconButton
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={`Dismiss clone notification for ${taskKey}`}
                  data-testid={`clone-toast-dismiss-${taskKey}`}
                  icon={<X className="h-3.5 w-3.5" />}
                  onClick={() => dismissClone(item.id)}
                  className="min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-ring rounded"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
