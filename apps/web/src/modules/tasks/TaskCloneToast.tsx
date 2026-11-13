import React from "react";
import { X, ExternalLink, CopyCheck } from "lucide-react";
import { Button } from "@/components/ui/Button.js";
import { IconButton } from "@/components/ui/IconButton.js";
import { cn } from "@/lib/utils.js";
import { useTaskClone } from "./TaskCloneContext.js";
import { useTaskPeekDrawer } from "./useTaskPeekDrawer.js";

export interface TaskCloneToastProps {
  className?: string;
}

export function TaskCloneToast({ className }: TaskCloneToastProps): React.JSX.Element | null {
  const { activeClones, dismissClone } = useTaskClone();
  const { openTask } = useTaskPeekDrawer();

  if (!activeClones || activeClones.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="task-clone-toast-container"
      className={cn(
        "fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none",
        className
      )}
    >
      {activeClones.map((item) => (
        <div
          key={item.id}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid={`clone-toast-${item.clonedTask.taskKey}`}
          className="pointer-events-auto relative flex flex-col gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-overlay)] p-3 text-[var(--text-primary)] shadow-lg backdrop-blur-md transition-all duration-200"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-500 mt-0.5 shrink-0">
                <CopyCheck className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate">
                  Task {item.clonedTask.taskKey} created.
                </span>
                <span className="text-[11px] text-[var(--text-muted)] truncate">
                  Cloned from {item.sourceTaskKey}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  openTask(item.clonedTask.taskKey);
                  dismissClone(item.id);
                }}
                aria-label={`Open cloned task ${item.clonedTask.taskKey}`}
                data-testid={`clone-toast-open-${item.clonedTask.taskKey}`}
                className="min-h-[44px] min-w-[44px] sm:min-h-[30px] sm:min-w-[30px] text-xs font-semibold px-2.5 py-1 focus-ring"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Open
              </Button>
              <IconButton
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Dismiss clone notification for ${item.clonedTask.taskKey}`}
                data-testid={`clone-toast-dismiss-${item.clonedTask.taskKey}`}
                icon={<X className="h-3.5 w-3.5" />}
                onClick={() => dismissClone(item.id)}
                className="min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-ring rounded"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
