import React, { useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog.js";
import { Button, type ButtonProps } from "@/components/ui/Button.js";
import { useWorkspace } from "@/modules/workspace/index.js";
import { ApiProblemError } from "@/lib/api-client.js";
import { useCreateTask } from "./useCreateTask.js";
import { useTaskPeekDrawer } from "./useTaskPeekDrawer.js";
import { useQuickTaskComposer } from "./QuickTaskComposerContext.js";
import type { TaskPriority, TaskType } from "./types.js";

export interface QuickTaskComposerProps {
  className?: string;
}

interface FormValidationErrors {
  title?: string;
  description?: string;
  workspace?: string;
}

/**
 * Quick Task Composer Component.
 * Enables fast, contract-faithful task creation from anywhere in the application.
 * Triggered via global 'C' shortcut or Quick Create button.
 * Supports progressive disclosure with at most 5 core fields:
 * 1. Title (required)
 * 2. Workspace (defaulted to active workspace)
 * 3. Description (optional)
 * 4. Priority (optional)
 * 5. Due Date (optional)
 */
export function QuickTaskComposer({
  className,
}: QuickTaskComposerProps): React.JSX.Element | null {
  const { isOpen, close, initialValues } = useQuickTaskComposer();
  const { currentCommunityId, workspaces, activeWorkspaceId } = useWorkspace();
  const createMutation = useCreateTask();
  const { openTask } = useTaskPeekDrawer();

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [itemType, setItemType] = useState<TaskType>("TASK");
  const [priority, setPriority] = useState<TaskPriority>("NONE");
  const [dueDate, setDueDate] = useState("");

  // Error States
  const [validationErrors, setValidationErrors] = useState<FormValidationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Initialize form fields and prefilled values when dialog opens
  useEffect(() => {
    if (isOpen) {
      const fallbackWsId = activeWorkspaceId ?? (workspaces.length > 0 ? workspaces[0]?.id : "");
      setSelectedWorkspaceId((current) => {
        if (initialValues?.workspaceId && workspaces.some((w) => w.id === initialValues.workspaceId)) {
          return initialValues.workspaceId;
        }
        if (current && workspaces.some((w) => w.id === current)) {
          return current;
        }
        return fallbackWsId ?? "";
      });

      // Initialize or reset form values to ensure no stale prefilled values persist on reopen
      setDueDate(initialValues?.dueDate ?? "");
      setPriority(initialValues?.priority ?? "NONE");
      setItemType(initialValues?.itemType ?? "TASK");
      setTitle(initialValues?.title ?? "");
      setDescription("");
      setValidationErrors({});
      setServerError(null);
    }
  }, [isOpen, activeWorkspaceId, workspaces, initialValues]);

  // Autofocus the title input when dialog opens
  useEffect(() => {
    if (isOpen) {
      const focusTimer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(focusTimer);
    }
  }, [isOpen]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setItemType("TASK");
    setPriority("NONE");
    setDueDate("");
    setValidationErrors({});
    setServerError(null);
  };

  const handleCancel = () => {
    resetForm();
    close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    const errors: FormValidationErrors = {};

    // 1. Client-Side Schema Validations
    if (!trimmedTitle) {
      errors.title = "Task title is required and cannot be empty.";
    } else if (trimmedTitle.length > 500) {
      errors.title = "Task title must be 500 characters or fewer.";
    }

    if (trimmedDesc.length > 20000) {
      errors.description = "Task description must be 20000 characters or fewer.";
    }

    if (!selectedWorkspaceId) {
      errors.workspace = "A workspace must be selected.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setServerError(null);

    try {
      const newTask = await createMutation.mutateAsync({
        communityId: currentCommunityId ?? "",
        workspaceId: selectedWorkspaceId,
        data: {
          title: trimmedTitle,
          itemType,
          ...(trimmedDesc ? { description: trimmedDesc } : {}),
          ...(priority !== "NONE" ? { priority } : {}),
          ...(dueDate ? { dueDate } : {}),
        },
      });

      // Successful creation: reset form state and close
      resetForm();
      close();

      // Deep-link / open newly created task in TaskPeekDrawer via canonical URL sync
      openTask(newTask.taskKey, { workspaceId: newTask.workspaceId });
    } catch (err) {
      // Retain user's draft on failure so they can modify and retry
      const message =
        err instanceof ApiProblemError
          ? err.detail || err.message
          : (err as Error).message || "An unexpected error occurred while creating the task.";
      setServerError(message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent
        data-testid="quick-task-composer-dialog"
        role="dialog"
        aria-labelledby="quick-task-composer-title"
        aria-describedby="quick-task-composer-desc"
        className={className}
      >
        <DialogHeader>
          <DialogTitle id="quick-task-composer-title">
            Create Task
          </DialogTitle>
          <DialogDescription id="quick-task-composer-desc">
            Quickly capture a new task in your current workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Server Error Alert */}
          {serverError && (
            <div
              data-testid="composer-server-error"
              role="alert"
              aria-live="assertive"
              className="p-3 rounded-md bg-[var(--feedback-danger-bg)] border border-[var(--border-strong)] text-xs text-[var(--feedback-danger-text)] font-medium"
            >
              {serverError}
            </div>
          )}

          {/* Field 1: Workspace Selection */}
          <div className="space-y-1">
            <label
              htmlFor="composer-workspace-select"
              className="text-xs font-semibold text-[var(--text-secondary)] select-none"
            >
              Workspace <span className="text-[var(--feedback-danger-text)]">*</span>
            </label>
            <select
              id="composer-workspace-select"
              data-testid="composer-workspace-select"
              aria-label="Target workspace"
              value={selectedWorkspaceId}
              onChange={(e) => {
                setSelectedWorkspaceId(e.target.value);
                if (validationErrors.workspace) {
                  setValidationErrors((prev) => ({ ...prev, workspace: undefined }));
                }
              }}
              disabled={createMutation.isPending}
              className="w-full h-9 px-3 text-sm rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} ({ws.keyPrefix}){ws.kind === "PERSONAL" ? " — Personal" : ""}
                </option>
              ))}
            </select>
            {validationErrors.workspace && (
              <p
                data-testid="composer-workspace-error"
                role="alert"
                className="text-xs text-[var(--feedback-danger-text)] font-medium"
              >
                {validationErrors.workspace}
              </p>
            )}
          </div>

          {/* Field 2: Title (Required) */}
          <div className="space-y-1">
            <label
              htmlFor="composer-title-input"
              className="text-xs font-semibold text-[var(--text-secondary)] select-none"
            >
              Title <span className="text-[var(--feedback-danger-text)]">*</span>
            </label>
            <input
              id="composer-title-input"
              ref={titleInputRef}
              type="text"
              data-testid="composer-title-input"
              placeholder="Task title..."
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (validationErrors.title) {
                  setValidationErrors((prev) => ({ ...prev, title: undefined }));
                }
              }}
              disabled={createMutation.isPending}
              maxLength={500}
              autoFocus
              aria-required="true"
              aria-invalid={Boolean(validationErrors.title)}
              aria-describedby={validationErrors.title ? "composer-title-error" : undefined}
              className="w-full h-9 px-3 text-sm rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)] placeholder:text-[var(--text-muted)]"
            />
            {validationErrors.title && (
              <p
                id="composer-title-error"
                data-testid="composer-title-error"
                role="alert"
                className="text-xs text-[var(--feedback-danger-text)] font-medium"
              >
                {validationErrors.title}
              </p>
            )}
          </div>

          {/* Field 3: Description (Optional) */}
          <div className="space-y-1">
            <label
              htmlFor="composer-description-input"
              className="text-xs font-semibold text-[var(--text-secondary)] select-none"
            >
              Description <span className="text-[var(--text-muted)] font-normal">(optional)</span>
            </label>
            <textarea
              id="composer-description-input"
              data-testid="composer-description-input"
              placeholder="Add description..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (validationErrors.description) {
                  setValidationErrors((prev) => ({ ...prev, description: undefined }));
                }
              }}
              disabled={createMutation.isPending}
              maxLength={20000}
              rows={3}
              aria-invalid={Boolean(validationErrors.description)}
              aria-describedby={validationErrors.description ? "composer-description-error" : undefined}
              className="w-full p-2.5 text-sm rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)] placeholder:text-[var(--text-muted)] resize-y min-h-[72px]"
            />
            {validationErrors.description && (
              <p
                id="composer-description-error"
                data-testid="composer-description-error"
                role="alert"
                className="text-xs text-[var(--feedback-danger-text)] font-medium"
              >
                {validationErrors.description}
              </p>
            )}
          </div>

          {/* Fields 4 & 5: Priority & Due Date (Conservative Field Scope) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Field 4: Priority */}
            <div className="space-y-1">
              <label
                htmlFor="composer-priority-select"
                className="text-xs font-semibold text-[var(--text-secondary)] select-none"
              >
                Priority
              </label>
              <select
                id="composer-priority-select"
                data-testid="composer-priority-select"
                aria-label="Task priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                disabled={createMutation.isPending}
                className="w-full h-9 px-3 text-sm rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
              >
                <option value="NONE">None</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Field 5: Due Date */}
            <div className="space-y-1">
              <label
                htmlFor="composer-due-date-input"
                className="text-xs font-semibold text-[var(--text-secondary)] select-none"
              >
                Due Date
              </label>
              <input
                id="composer-due-date-input"
                type="date"
                data-testid="composer-due-date-input"
                aria-label="Due date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={createMutation.isPending}
                className="w-full h-9 px-3 text-sm rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={createMutation.isPending}
              data-testid="composer-cancel-btn"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={createMutation.isPending || !title.trim() || title.trim().length > 500}
              data-testid="composer-submit-btn"
            >
              {createMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Quick Create entry point button trigger.
 * Can be placed in headers, omnibar or view actions.
 */
export function QuickCreateButton({
  className,
  ...props
}: ButtonProps): React.JSX.Element {
  const { open } = useQuickTaskComposer();

  return (
    <Button
      type="button"
      variant="primary"
      size="sm"
      onClick={(e) => open(e.currentTarget)}
      aria-label="Create task (C)"
      data-testid="quick-create-task-btn"
      className={className}
      {...props}
    >
      <Plus className="h-4 w-4 mr-1" />
      <span>Create</span>
    </Button>
  );
}
