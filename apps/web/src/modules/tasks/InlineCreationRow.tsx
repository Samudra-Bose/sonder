import React, { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Loader2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils.js";
import { useCreateTask } from "./useCreateTask.js";
import type { TaskDto, TaskStatusCategory } from "./types.js";

export interface InlineCreationRowProps {
  communityId: string;
  workspaceId: string;
  initialStatusCategory?: TaskStatusCategory;
  parentTaskId?: string;
  onTaskCreated?: (task: TaskDto) => void;
  onCancel?: () => void;
  className?: string;
  placeholder?: string;
  triggerLabel?: string;
  variant?: "list" | "board" | "plain";
  colSpan?: number;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function InlineCreationRow({
  communityId,
  workspaceId,
  initialStatusCategory,
  parentTaskId,
  onTaskCreated,
  onCancel,
  className,
  placeholder = "Task title... (Press Enter to create)",
  triggerLabel = "New task...",
  variant = "list",
  colSpan = 9,
  autoFocus = false,
  disabled = false,
}: InlineCreationRowProps): React.JSX.Element {
  const [isCreating, setIsCreating] = useState(autoFocus);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);
  const createTaskMutation = useCreateTask();

  useEffect(() => {
    if (isCreating) {
      inputRef.current?.focus();
    }
  }, [isCreating]);

  const handleActivate = useCallback(() => {
    if (disabled) return;
    setError(null);
    setIsCreating(true);
  }, [disabled]);

  const handleCancel = useCallback(() => {
    isSubmittingRef.current = false;
    setTitle("");
    setError(null);
    setIsCreating(false);
    onCancel?.();
  }, [onCancel]);

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;

    const trimmed = title.trim();
    if (!trimmed) {
      // Empty input never creates a task
      return;
    }

    isSubmittingRef.current = true;
    setError(null);

    try {
      const newTask = await createTaskMutation.mutateAsync({
        communityId,
        workspaceId,
        data: {
          title: trimmed,
          statusCategory: initialStatusCategory,
          parentTaskId,
        },
      });

      // Rapid-fire creation: clear title, maintain focus and creation mode
      setTitle("");
      onTaskCreated?.(newTask);
      inputRef.current?.focus();
    } catch (err) {
      // Preserve input for user correction and retry
      setError(
        err instanceof Error ? err.message : "Failed to create task"
      );
      inputRef.current?.focus();
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // If blurring to another element inside the creation container, do nothing
    if (e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
      return;
    }

    const trimmed = title.trim();
    if (!trimmed) {
      handleCancel();
    } else if (!isSubmittingRef.current && !error) {
      handleSubmit();
    }
  };

  // Render Form Content
  const formContent = (
    <div
      className={cn(
        "flex flex-col gap-1 w-full",
        variant === "board" && "p-2 bg-[var(--surface-canvas)] border border-[var(--border-focus)] rounded-lg shadow-2xs"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 w-full">
        <div className="relative flex-1 flex items-center">
          <input
            ref={inputRef}
            type="text"
            data-testid="inline-creation-input"
            value={title}
            disabled={createTaskMutation.isPending}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="w-full text-xs font-medium px-2 py-1.5 rounded bg-[var(--surface-canvas)] border border-[var(--border-focus)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] transition-all"
            aria-label="New task title"
          />
          {createTaskMutation.isPending && (
            <div className="absolute right-2 flex items-center">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--text-muted)]" />
            </div>
          )}
        </div>

        <button
          type="button"
          data-testid="inline-creation-cancel"
          onClick={handleCancel}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] transition-colors"
          title="Cancel (Esc)"
          aria-label="Cancel task creation"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {error && (
        <div
          data-testid="inline-creation-error"
          className="flex items-center gap-1.5 text-[11px] text-[var(--status-danger-text)] px-1 py-0.5"
        >
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}
    </div>
  );

  // 1. List View Variant (Table Row)
  if (variant === "list") {
    if (!isCreating) {
      return (
        <tr
          data-testid="inline-creation-trigger"
          className={cn(
            "group/create hover:bg-[var(--surface-muted)] transition-colors cursor-pointer select-none",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          onClick={handleActivate}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleActivate();
            }
          }}
          tabIndex={disabled ? -1 : 0}
          role="button"
          aria-label="Add new task"
        >
          <td colSpan={colSpan} className="py-2.5 px-3">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] group-hover/create:text-[var(--brand-accent-text)] transition-colors">
              <Plus className="h-3.5 w-3.5" />
              <span>{triggerLabel}</span>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr
        data-testid="inline-creation-active-row"
        className={cn("bg-[var(--surface-muted)]/50", className)}
        onClick={(e) => e.stopPropagation()}
      >
        <td colSpan={colSpan} className="py-2 px-3">
          {formContent}
        </td>
      </tr>
    );
  }

  // 2. Board View or Plain Variant (Div-based)
  if (!isCreating) {
    return (
      <div
        data-testid="inline-creation-trigger"
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand-accent-text)] hover:bg-[var(--surface-muted)] rounded-md cursor-pointer transition-colors border border-dashed border-transparent hover:border-[var(--border-subtle)] select-none",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={handleActivate}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleActivate();
          }
        }}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label={`Add new task${initialStatusCategory ? ` in ${initialStatusCategory}` : ""}`}
      >
        <Plus className="h-3.5 w-3.5" />
        <span>{triggerLabel}</span>
      </div>
    );
  }

  return (
    <div
      data-testid="inline-creation-active-container"
      className={cn("w-full py-1", className)}
      onClick={(e) => e.stopPropagation()}
    >
      {formContent}
    </div>
  );
}
