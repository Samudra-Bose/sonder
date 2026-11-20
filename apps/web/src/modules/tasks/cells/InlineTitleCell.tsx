import React, { useState, useRef, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils.js";
import { useUpdateTask } from "../useUpdateTask.js";
import type { TaskDto } from "../types.js";

export interface InlineTitleCellProps {
  task: Pick<TaskDto, "id" | "title"> & {
    effectivePermissions?: {
      canEditTitleDescription?: boolean;
    };
    fieldRevisions?: {
      title?: number;
      [key: string]: number | undefined;
    };
  };
  communityId: string;
  workspaceId: string;
  isArchived?: boolean;
  disabled?: boolean;
  className?: string;
  onTitleChange?: (newTitle: string) => Promise<void> | void;
}

export function InlineTitleCell({
  task,
  communityId,
  workspaceId,
  isArchived = false,
  disabled = false,
  className,
  onTitleChange,
}: InlineTitleCellProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(task.title);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSavingRef = useRef(false);
  const updateMutation = useUpdateTask();

  const canEdit = !disabled && !isArchived && (task.effectivePermissions?.canEditTitleDescription ?? true);

  useEffect(() => {
    setCurrentTitle(task.title);
  }, [task.title]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = async (titleToSave: string) => {
    if (isSavingRef.current) return;

    const trimmed = titleToSave.trim();

    // Validation: Title cannot be empty/whitespace or unchanged
    if (!trimmed) {
      setCurrentTitle(task.title);
      setIsEditing(false);
      return;
    }

    if (trimmed === task.title) {
      setIsEditing(false);
      return;
    }

    isSavingRef.current = true;
    setIsEditing(false);
    setError(null);

    try {
      if (onTitleChange) {
        await onTitleChange(trimmed);
        return;
      }

      await updateMutation.mutateAsync({
        communityId,
        workspaceId,
        taskId: task.id,
        data: {
          title: trimmed,
          baseFieldRevisions: {
            title: task.fieldRevisions?.title ?? 1,
          },
        },
      });
    } catch (err) {
      // Optimistic rollback
      setCurrentTitle(task.title);
      setError(err instanceof Error ? err.message : "Failed to save title");
    } finally {
      isSavingRef.current = false;
    }
  };

  const handleCancel = () => {
    isSavingRef.current = true; // Lock out blur save
    setCurrentTitle(task.title);
    setIsEditing(false);
    setTimeout(() => {
      isSavingRef.current = false;
    }, 50);
  };

  if (!canEdit) {
    return (
      <span
        className={cn(
          "font-medium text-[var(--text-primary)] line-clamp-1",
          disabled && "opacity-60 cursor-not-allowed",
          className
        )}
        data-testid={`inline-title-cell-${task.id}`}
      >
        {task.title}
      </span>
    );
  }

  if (isEditing) {
    return (
      <div
        className={cn("inline-flex items-center w-full", className)}
        onClick={(e) => e.stopPropagation()}
        data-testid={`inline-title-cell-${task.id}`}
      >
        <input
          ref={inputRef}
          type="text"
          data-testid={`inline-title-input-${task.id}`}
          value={currentTitle}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setCurrentTitle(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") {
              e.preventDefault();
              handleSave(currentTitle);
            } else if (e.key === "Escape") {
              e.preventDefault();
              handleCancel();
            }
          }}
          onBlur={() => handleSave(currentTitle)}
          className="w-full text-xs font-medium px-1.5 py-0.5 rounded bg-[var(--surface-canvas)] border border-[var(--border-focus)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
          aria-label="Edit task title"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 group/title text-left select-none rounded p-0.5 -m-0.5 cursor-pointer",
        "focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]",
        updateMutation.isPending && "opacity-70 animate-pulse",
        error && "ring-1 ring-[var(--status-danger-border)]",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        setError(null);
        setIsEditing(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.stopPropagation();
          e.preventDefault();
          setError(null);
          setIsEditing(true);
        }
      }}
      data-testid={`inline-title-cell-${task.id}`}
      aria-label={`Edit title: ${task.title}`}
      title={error ?? "Click or press Enter to edit title"}
    >
      <span className="font-medium text-[var(--text-primary)] group-hover/title:text-[var(--brand-accent-text)] line-clamp-1 transition-colors">
        {task.title}
      </span>
      {error && (
        <AlertCircle className="h-3 w-3 text-[var(--status-danger-text)] shrink-0 ml-0.5" />
      )}
    </button>
  );
}
