import React, { useState, useRef, useEffect } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);
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
    const trimmed = titleToSave.trim();
    setIsEditing(false);

    // Validation: Title cannot be empty/whitespace or unchanged
    if (!trimmed) {
      setCurrentTitle(task.title);
      return;
    }

    if (trimmed === task.title) {
      return;
    }

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
    } catch {
      // Optimistic rollback handled by useUpdateTask
      setCurrentTitle(task.title);
    }
  };

  const handleCancel = () => {
    setCurrentTitle(task.title);
    setIsEditing(false);
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
              handleSave(currentTitle);
            } else if (e.key === "Escape") {
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
    <div
      className={cn(
        "inline-flex items-center group/title cursor-text select-none",
        updateMutation.isPending && "opacity-70 animate-pulse",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      data-testid={`inline-title-cell-${task.id}`}
    >
      <span
        className="font-medium text-[var(--text-primary)] group-hover/title:text-[var(--brand-accent-text)] line-clamp-1 transition-colors"
        title="Click to edit title"
      >
        {task.title}
      </span>
    </div>
  );
}
