import React, { useState, useEffect } from "react";
import {
  Pencil,
  AlertCircle,
  Calendar,
  User,
  Tag,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/Button.js";
import { Badge } from "@/components/ui/Badge.js";
import { Avatar } from "@/components/ui/Avatar.js";
import { formatDueDisplay } from "@/modules/my-work/date-utils.js";
import { ApiProblemError } from "@/lib/api-client.js";
import { getTaskById } from "./api.js";
import { useUpdateTask } from "./useUpdateTask.js";
import type { TaskDto, TaskStatusCategory, TaskPriority } from "./types.js";

// ============================================================================
// Conflict Alert Component
// ============================================================================

export interface ConflictState {
  fieldName: string;
  serverValue: string;
  attemptedValue: string;
}

export interface ConflictAlertProps {
  conflict: ConflictState;
  onDiscard: () => void;
  onOverwrite: () => void;
  isOverwriting?: boolean;
  error?: string | null;
}

export function ConflictAlert({
  conflict,
  onDiscard,
  onOverwrite,
  isOverwriting = false,
  error = null,
}: ConflictAlertProps): React.JSX.Element {
  return (
    <div
      role="alert"
      data-testid={`conflict-alert-${conflict.fieldName}`}
      className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs space-y-2 mt-2"
    >
      <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Conflict on {conflict.fieldName}: modified concurrently by another user</span>
      </div>
      <div className="text-[11px] space-y-1 text-[var(--text-secondary)]">
        <div>
          <span className="font-medium text-[var(--text-primary)]">Current server value: </span>
          <span className="font-mono bg-[var(--surface-muted)] px-1 py-0.5 rounded">
            {conflict.serverValue || "(empty)"}
          </span>
        </div>
        <div>
          <span className="font-medium text-[var(--text-primary)]">Your attempted value: </span>
          <span className="font-mono bg-[var(--surface-muted)] px-1 py-0.5 rounded">
            {conflict.attemptedValue || "(empty)"}
          </span>
        </div>
      </div>
      {error && (
        <div
          data-testid={`conflict-error-${conflict.fieldName}`}
          className="text-xs text-[var(--feedback-danger-text)] font-medium p-1.5 rounded bg-[var(--surface-card)] border border-[var(--border-subtle)]"
        >
          {error}
        </div>
      )}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={onDiscard}
          disabled={isOverwriting}
          data-testid={`conflict-discard-${conflict.fieldName}-btn`}
        >
          Use Server Value
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={onOverwrite}
          disabled={isOverwriting}
          data-testid={`conflict-overwrite-${conflict.fieldName}-btn`}
        >
          {isOverwriting ? "Overwriting..." : "Overwrite with My Edit"}
        </Button>
      </div>
    </div>
  );
}

export function extractServerConflictValue(
  err: ApiProblemError,
  fieldName: string,
  fallback: unknown
): string {
  const problem = (err.problem || {}) as Record<string, unknown>;
  if (Array.isArray(problem.conflictDetails)) {
    const detail = (problem.conflictDetails as any[]).find((d: any) => d.fieldPath === fieldName);
    if (detail && detail.serverValue !== undefined && detail.serverValue !== null) {
      if (Array.isArray(detail.serverValue)) {
        return detail.serverValue.join(", ");
      }
      return typeof detail.serverValue === "string"
        ? detail.serverValue
        : JSON.stringify(detail.serverValue);
    }
  }
  if (Array.isArray(fallback)) {
    return fallback.join(", ");
  }
  return typeof fallback === "string" ? fallback : JSON.stringify(fallback);
}

// ============================================================================
// 1. Inline Title Editor
// ============================================================================

export interface InlineTitleEditorProps {
  task: TaskDto;
  communityId: string | null;
  workspaceId: string;
  isArchived?: boolean;
  titleRef?: React.Ref<HTMLHeadingElement>;
}

export function InlineTitleEditor({
  task,
  communityId,
  workspaceId,
  isArchived = false,
  titleRef,
}: InlineTitleEditorProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOverwriting, setIsOverwriting] = useState(false);

  const updateMutation = useUpdateTask();
  const canEdit = !isArchived && task.effectivePermissions.canEditTitleDescription;

  // Sync draft when task title changes externally while not editing
  useEffect(() => {
    if (!isEditing) {
      setTitleDraft(task.title);
    }
  }, [task.title, isEditing]);

  const handleStartEdit = () => {
    setTitleDraft(task.title);
    setValidationError(null);
    setConflict(null);
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setTitleDraft(task.title);
    setValidationError(null);
    setConflict(null);
    setError(null);
    setIsEditing(false);
  };

  const handleSave = async (titleToSave = titleDraft) => {
    const trimmed = titleToSave.trim();
    if (!trimmed) {
      setValidationError("Title must not be empty.");
      return;
    }
    if (trimmed.length > 500) {
      setValidationError("Title must be 500 characters or fewer.");
      return;
    }

    setValidationError(null);
    setError(null);

    try {
      await updateMutation.mutateAsync({
        communityId: communityId ?? "",
        workspaceId,
        taskId: task.id,
        data: {
          title: trimmed,
          baseFieldRevisions: {
            title: task.fieldRevisions.title ?? 1,
          },
        },
      });
      setIsEditing(false);
      setConflict(null);
    } catch (err) {
      if (err instanceof ApiProblemError && err.status === 409) {
        setConflict({
          fieldName: "title",
          serverValue: extractServerConflictValue(err, "title", task.title),
          attemptedValue: trimmed,
        });
      } else {
        setError(
          err instanceof ApiProblemError
            ? err.detail || err.message
            : (err as Error).message
        );
      }
    }
  };

  const handleOverwrite = async () => {
    if (!conflict) return;
    setIsOverwriting(true);
    setError(null);
    try {
      const latestTask = await getTaskById({ communityId: communityId ?? "", workspaceId, taskId: task.id });
      await updateMutation.mutateAsync({
        communityId: communityId ?? "",
        workspaceId,
        taskId: task.id,
        data: {
          title: conflict.attemptedValue,
          baseFieldRevisions: {
            title: latestTask.fieldRevisions.title ?? latestTask.version,
          },
        },
      });
      setConflict(null);
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ApiProblemError && err.status === 409) {
        const latestTask = await getTaskById({ communityId: communityId ?? "", workspaceId, taskId: task.id });
        setConflict({
          fieldName: "title",
          serverValue: latestTask.title,
          attemptedValue: conflict.attemptedValue,
        });
      } else {
        setError(
          err instanceof ApiProblemError
            ? err.detail || err.message
            : (err as Error).message
        );
      }
    } finally {
      setIsOverwriting(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="group flex items-start justify-between gap-2">
        <h2
          ref={titleRef}
          id="task-peek-drawer-title"
          tabIndex={-1}
          className="text-lg sm:text-xl font-bold text-[var(--text-primary)] leading-snug outline-none flex-1"
        >
          {task.title}
        </h2>
        {canEdit && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleStartEdit}
            data-testid="edit-title-btn"
            aria-label="Edit title"
            className="opacity-80 hover:opacity-100 flex-shrink-0 min-h-[32px] px-2 text-xs"
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            <span>Edit</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        data-testid="title-input"
        aria-label="Task title"
        value={titleDraft}
        onChange={(e) => {
          setTitleDraft(e.target.value);
          if (validationError) setValidationError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSave();
          } else if (e.key === "Escape") {
            e.preventDefault();
            handleCancel();
          }
        }}
        disabled={updateMutation.isPending || isOverwriting}
        maxLength={500}
        autoFocus
        className="w-full px-3 py-1.5 text-base font-semibold rounded-md border border-[var(--border-strong)] bg-[var(--surface-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
      />

      {validationError && (
        <p data-testid="title-error" role="alert" className="text-xs text-[var(--feedback-danger-text)]">
          {validationError}
        </p>
      )}

      {error && !conflict && (
        <p role="alert" className="text-xs text-[var(--feedback-danger-text)]">
          {error}
        </p>
      )}

      {conflict && (
        <ConflictAlert
          conflict={conflict}
          onDiscard={() => {
            setConflict(null);
            setIsEditing(false);
          }}
          onOverwrite={handleOverwrite}
          isOverwriting={isOverwriting}
          error={error}
        />
      )}

      {!conflict && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleSave()}
            disabled={updateMutation.isPending || !titleDraft.trim()}
            data-testid="save-title-btn"
          >
            {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={updateMutation.isPending}
            data-testid="cancel-title-btn"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. Inline Description Editor
// ============================================================================

export interface InlineDescriptionEditorProps {
  task: TaskDto;
  communityId: string | null;
  workspaceId: string;
  isArchived?: boolean;
}

export function InlineDescriptionEditor({
  task,
  communityId,
  workspaceId,
  isArchived = false,
}: InlineDescriptionEditorProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(task.description ?? "");
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOverwriting, setIsOverwriting] = useState(false);

  const updateMutation = useUpdateTask();
  const canEdit = !isArchived && task.effectivePermissions.canEditTitleDescription;

  useEffect(() => {
    if (!isEditing) {
      setDescriptionDraft(task.description ?? "");
    }
  }, [task.description, isEditing]);

  const handleStartEdit = () => {
    setDescriptionDraft(task.description ?? "");
    setConflict(null);
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDescriptionDraft(task.description ?? "");
    setConflict(null);
    setError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setError(null);
    const valueToSend = descriptionDraft.trim() ? descriptionDraft : null;

    try {
      await updateMutation.mutateAsync({
        communityId: communityId ?? "",
        workspaceId,
        taskId: task.id,
        data: {
          description: valueToSend,
          baseFieldRevisions: {
            description: task.fieldRevisions.description ?? 1,
          },
        },
      });
      setIsEditing(false);
      setConflict(null);
    } catch (err) {
      if (err instanceof ApiProblemError && err.status === 409) {
        setConflict({
          fieldName: "description",
          serverValue: extractServerConflictValue(err, "description", task.description ?? ""),
          attemptedValue: descriptionDraft,
        });
      } else {
        setError(
          err instanceof ApiProblemError
            ? err.detail || err.message
            : (err as Error).message
        );
      }
    }
  };

  const handleOverwrite = async () => {
    if (!conflict) return;
    setIsOverwriting(true);
    setError(null);
    try {
      const latestTask = await getTaskById({ communityId: communityId ?? "", workspaceId, taskId: task.id });
      const valueToSend = conflict.attemptedValue.trim() ? conflict.attemptedValue : null;
      await updateMutation.mutateAsync({
        communityId: communityId ?? "",
        workspaceId,
        taskId: task.id,
        data: {
          description: valueToSend,
          baseFieldRevisions: {
            description: latestTask.fieldRevisions.description ?? latestTask.version,
          },
        },
      });
      setConflict(null);
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ApiProblemError && err.status === 409) {
        const latestTask = await getTaskById({ communityId: communityId ?? "", workspaceId, taskId: task.id });
        setConflict({
          fieldName: "description",
          serverValue: latestTask.description ?? "",
          attemptedValue: conflict.attemptedValue,
        });
      } else {
        setError(
          err instanceof ApiProblemError
            ? err.detail || err.message
            : (err as Error).message
        );
      }
    } finally {
      setIsOverwriting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Description
        </h3>
        {canEdit && !isEditing && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleStartEdit}
            data-testid="edit-description-btn"
            aria-label="Edit description"
            className="min-h-[28px] h-7 px-2 text-xs"
          >
            <Pencil className="h-3 w-3 mr-1" />
            <span>Edit</span>
          </Button>
        )}
      </div>

      {!isEditing ? (
        <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap min-h-[90px]">
          {task.description && task.description.trim().length > 0 ? (
            task.description
          ) : (
            <span className="text-[var(--text-muted)] italic">No description provided.</span>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            data-testid="description-textarea"
            aria-label="Task description"
            value={descriptionDraft}
            onChange={(e) => setDescriptionDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                handleCancel();
              }
            }}
            disabled={updateMutation.isPending || isOverwriting}
            rows={5}
            maxLength={20000}
            className="w-full p-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)] resize-y min-h-[100px]"
          />

          {error && !conflict && (
            <p role="alert" className="text-xs text-[var(--feedback-danger-text)]">
              {error}
            </p>
          )}

          {conflict && (
            <ConflictAlert
              conflict={conflict}
              onDiscard={() => {
                setConflict(null);
                setIsEditing(false);
              }}
              onOverwrite={handleOverwrite}
              isOverwriting={isOverwriting}
              error={error}
            />
          )}

          {!conflict && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                data-testid="save-description-btn"
              >
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
                data-testid="cancel-description-btn"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. Inline Status Editor
// ============================================================================

export interface InlineStatusEditorProps {
  task: TaskDto;
  communityId: string | null;
  workspaceId: string;
  isArchived?: boolean;
}

const STATUS_OPTIONS: { value: TaskStatusCategory; label: string }[] = [
  { value: "BACKLOG", label: "Backlog" },
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "DONE", label: "Done" },
  { value: "CANCELED", label: "Canceled" },
];

export function InlineStatusEditor({
  task,
  communityId,
  workspaceId,
  isArchived = false,
}: InlineStatusEditorProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatusCategory>(task.statusCategory);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOverwriting, setIsOverwriting] = useState(false);

  const updateMutation = useUpdateTask();
  const canEdit = !isArchived && task.effectivePermissions.canUpdateStatus;

  useEffect(() => {
    if (!isEditing) {
      setSelectedStatus(task.statusCategory);
    }
  }, [task.statusCategory, isEditing]);

  const handleStartEdit = () => {
    setSelectedStatus(task.statusCategory);
    setConflict(null);
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setSelectedStatus(task.statusCategory);
    setConflict(null);
    setError(null);
    setIsEditing(false);
  };

  const handleSave = async (statusToSave = selectedStatus) => {
    setError(null);
    try {
      await updateMutation.mutateAsync({
        communityId: communityId ?? "",
        workspaceId,
        taskId: task.id,
        data: {
          statusCategory: statusToSave,
          baseFieldRevisions: {
            statusCategory: task.fieldRevisions.statusCategory ?? 1,
          },
        },
      });
      setIsEditing(false);
      setConflict(null);
    } catch (err) {
      if (err instanceof ApiProblemError && err.status === 409) {
        setConflict({
          fieldName: "statusCategory",
          serverValue: extractServerConflictValue(err, "statusCategory", task.statusCategory),
          attemptedValue: statusToSave,
        });
      } else {
        setError(
          err instanceof ApiProblemError
            ? err.detail || err.message
            : (err as Error).message
        );
      }
    }
  };

  const handleOverwrite = async () => {
    if (!conflict) return;
    setIsOverwriting(true);
    setError(null);
    try {
      const latestTask = await getTaskById({ communityId: communityId ?? "", workspaceId, taskId: task.id });
      await updateMutation.mutateAsync({
        communityId: communityId ?? "",
        workspaceId,
        taskId: task.id,
        data: {
          statusCategory: conflict.attemptedValue as TaskStatusCategory,
          baseFieldRevisions: {
            statusCategory: latestTask.fieldRevisions.statusCategory ?? latestTask.version,
          },
        },
      });
      setConflict(null);
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ApiProblemError && err.status === 409) {
        const latestTask = await getTaskById({ communityId: communityId ?? "", workspaceId, taskId: task.id });
        setConflict({
          fieldName: "statusCategory",
          serverValue: latestTask.statusCategory,
          attemptedValue: conflict.attemptedValue,
        });
      } else {
        setError(
          err instanceof ApiProblemError
            ? err.detail || err.message
            : (err as Error).message
        );
      }
    } finally {
      setIsOverwriting(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <Badge status={task.statusCategory} size="sm">
          {task.statusCategory.replace("_", " ")}
        </Badge>
        {canEdit && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleStartEdit}
            data-testid="edit-status-btn"
            aria-label="Edit status"
            className="min-h-[28px] h-6 px-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <Pencil className="h-3 w-3 mr-0.5" />
            <span>Edit</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)]">
      <div className="flex items-center gap-2">
        <select
          data-testid="status-select"
          aria-label="Select task status"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as TaskStatusCategory)}
          disabled={updateMutation.isPending || isOverwriting}
          className="h-8 px-2 text-xs rounded border border-[var(--border-strong)] bg-[var(--surface-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="primary"
          onClick={() => handleSave()}
          disabled={updateMutation.isPending}
          data-testid="save-status-btn"
          className="h-8 px-2.5 text-xs"
        >
          {updateMutation.isPending ? "Saving..." : "Save"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={updateMutation.isPending}
          data-testid="cancel-status-btn"
          className="h-8 px-2.5 text-xs"
        >
          Cancel
        </Button>
      </div>

      {error && !conflict && (
        <p role="alert" className="text-xs text-[var(--feedback-danger-text)]">
          {error}
        </p>
      )}

      {conflict && (
        <ConflictAlert
          conflict={conflict}
          onDiscard={() => {
            setConflict(null);
            setIsEditing(false);
          }}
          onOverwrite={handleOverwrite}
          isOverwriting={isOverwriting}
          error={error}
        />
      )}
    </div>
  );
}

// ============================================================================
// 4. Inline Priority Editor
// ============================================================================

export interface InlinePriorityEditorProps {
  task: TaskDto;
  communityId: string | null;
  workspaceId: string;
  isArchived?: boolean;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
  { value: "NONE", label: "None" },
];

export function InlinePriorityEditor({
  task,
  communityId,
  workspaceId,
  isArchived = false,
}: InlinePriorityEditorProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority>(task.priority);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOverwriting, setIsOverwriting] = useState(false);

  const updateMutation = useUpdateTask();
  const canEdit = !isArchived && task.effectivePermissions.canEditDatesPriority;

  useEffect(() => {
    if (!isEditing) {
      setSelectedPriority(task.priority);
    }
  }, [task.priority, isEditing]);

  const handleStartEdit = () => {
    setSelectedPriority(task.priority);
    setConflict(null);
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setSelectedPriority(task.priority);
    setConflict(null);
    setError(null);
    setIsEditing(false);
  };

  const handleSave = async (priorityToSave = selectedPriority) => {
    setError(null);
    try {
      await updateMutation.mutateAsync({
        communityId: communityId ?? "",
        workspaceId,
        taskId: task.id,
        data: {
          priority: priorityToSave,
          baseFieldRevisions: {
            priority: task.fieldRevisions.priority ?? 1,
          },
        },
      });
      setIsEditing(false);
      setConflict(null);
    } catch (err) {
      if (err instanceof ApiProblemError && err.status === 409) {
        setConflict({
          fieldName: "priority",
          serverValue: extractServerConflictValue(err, "priority", task.priority),
          attemptedValue: priorityToSave,
        });
      } else {
        setError(
          err instanceof ApiProblemError
            ? err.detail || err.message
            : (err as Error).message
        );
      }
    }
  };

  const handleOverwrite = async () => {
    if (!conflict) return;
    setIsOverwriting(true);
    setError(null);
    try {
      const latestTask = await getTaskById({ communityId: communityId ?? "", workspaceId, taskId: task.id });
      await updateMutation.mutateAsync({
        communityId: communityId ?? "",
        workspaceId,
        taskId: task.id,
        data: {
          priority: conflict.attemptedValue as TaskPriority,
          baseFieldRevisions: {
            priority: latestTask.fieldRevisions.priority ?? latestTask.version,
          },
        },
      });
      setConflict(null);
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ApiProblemError && err.status === 409) {
        const latestTask = await getTaskById({ communityId: communityId ?? "", workspaceId, taskId: task.id });
        setConflict({
          fieldName: "priority",
          serverValue: latestTask.priority,
          attemptedValue: conflict.attemptedValue,
        });
      } else {
        setError(
          err instanceof ApiProblemError
            ? err.detail || err.message
            : (err as Error).message
        );
      }
    } finally {
      setIsOverwriting(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="inline-flex items-center gap-1.5">
        {task.priority !== "NONE" ? (
          <Badge priority={task.priority} size="sm">
            {task.priority}
          </Badge>
        ) : (
          <span className="text-xs text-[var(--text-muted)] italic">No priority</span>
        )}
        {canEdit && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleStartEdit}
            data-testid="edit-priority-btn"
            aria-label="Edit priority"
            className="min-h-[28px] h-6 px-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <Pencil className="h-3 w-3 mr-0.5" />
            <span>Edit</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)]">
      <div className="flex items-center gap-2">
        <select
          data-testid="priority-select"
          aria-label="Select task priority"
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value as TaskPriority)}
          disabled={updateMutation.isPending || isOverwriting}
          className="h-8 px-2 text-xs rounded border border-[var(--border-strong)] bg-[var(--surface-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="primary"
          onClick={() => handleSave()}
          disabled={updateMutation.isPending}
          data-testid="save-priority-btn"
          className="h-8 px-2.5 text-xs"
        >
          {updateMutation.isPending ? "Saving..." : "Save"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={updateMutation.isPending}
          data-testid="cancel-priority-btn"
          className="h-8 px-2.5 text-xs"
        >
          Cancel
        </Button>
      </div>

      {error && !conflict && (
        <p role="alert" className="text-xs text-[var(--feedback-danger-text)]">
          {error}
        </p>
      )}

      {conflict && (
        <ConflictAlert
          conflict={conflict}
          onDiscard={() => {
            setConflict(null);
            setIsEditing(false);
          }}
          onOverwrite={handleOverwrite}
          isOverwriting={isOverwriting}
          error={error}
        />
      )}
    </div>
  );
}

// ============================================================================
// 5. Inline Date Editor (Start Date & Due Date)
// ============================================================================

export interface InlineDateEditorProps {
  task: TaskDto;
  field: "startDate" | "dueDate";
  label: string;
  communityId: string | null;
  workspaceId: string;
  referenceDate: string;
  isArchived?: boolean;
}

export function InlineDateEditor({
  task,
  field,
  label,
  communityId,
  workspaceId,
  referenceDate,
  isArchived = false,
}: InlineDateEditorProps): React.JSX.Element {
  const currentValue = task[field];
  const [isEditing, setIsEditing] = useState(false);
  const [dateDraft, setDateDraft] = useState(currentValue ?? "");
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOverwriting, setIsOverwriting] = useState(false);

  const updateMutation = useUpdateTask();
  const canEdit = !isArchived && task.effectivePermissions.canEditDatesPriority;
  const testPrefix = field === "dueDate" ? "due-date" : "start-date";

  useEffect(() => {
    if (!isEditing) {
      setDateDraft(currentValue ?? "");
    }
  }, [currentValue, isEditing]);

  const handleStartEdit = () => {
    setDateDraft(currentValue ?? "");
    setConflict(null);
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDateDraft(currentValue ?? "");
    setConflict(null);
    setError(null);
    setIsEditing(false);
  };

  const handleSave = async (valueToSave = dateDraft) => {
    setError(null);
    const finalValue = valueToSave.trim() ? valueToSave.trim() : null;

    try {
      await updateMutation.mutateAsync({
        communityId: communityId ?? "",
        workspaceId,
        taskId: task.id,
        data: {
          [field]: finalValue,
          baseFieldRevisions: {
            [field]: task.fieldRevisions[field] ?? 1,
          },
        },
      });
      setIsEditing(false);
      setConflict(null);
    } catch (err) {
      if (err instanceof ApiProblemError && err.status === 409) {
        setConflict({
          fieldName: field,
          serverValue: extractServerConflictValue(err, field, currentValue ?? ""),
          attemptedValue: finalValue ?? "",
        });
      } else {
        setError(
          err instanceof ApiProblemError
            ? err.detail || err.message
            : (err as Error).message
        );
      }
    }
  };

  const handleOverwrite = async () => {
    if (!conflict) return;
    setIsOverwriting(true);
    setError(null);
    try {
      const latestTask = await getTaskById({ communityId: communityId ?? "", workspaceId, taskId: task.id });
      const finalValue = conflict.attemptedValue.trim() ? conflict.attemptedValue : null;
      await updateMutation.mutateAsync({
        communityId: communityId ?? "",
        workspaceId,
        taskId: task.id,
        data: {
          [field]: finalValue,
          baseFieldRevisions: {
            [field]: latestTask.fieldRevisions[field] ?? latestTask.version,
          },
        },
      });
      setConflict(null);
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ApiProblemError && err.status === 409) {
        const latestTask = await getTaskById({ communityId: communityId ?? "", workspaceId, taskId: task.id });
        setConflict({
          fieldName: field,
          serverValue: String(latestTask[field] ?? ""),
          attemptedValue: conflict.attemptedValue,
        });
      } else {
        setError(
          err instanceof ApiProblemError
            ? err.detail || err.message
            : (err as Error).message
        );
      }
    } finally {
      setIsOverwriting(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-[var(--text-muted)] flex items-center gap-1">
          <Calendar className="h-3 w-3" /> {label}
        </span>
        {canEdit && !isEditing && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleStartEdit}
            data-testid={`edit-${testPrefix}-btn`}
            aria-label={`Edit ${label}`}
            className="min-h-[24px] h-6 px-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <Pencil className="h-3 w-3 mr-0.5" />
            <span>Edit</span>
          </Button>
        )}
      </div>

      {!isEditing ? (
        <div className="pt-0.5">
          {currentValue ? (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[var(--text-primary)]">{currentValue}</span>
              {field === "dueDate" && (
                <span className="text-[11px] text-[var(--text-muted)]">
                  ({formatDueDisplay(currentValue, referenceDate)})
                </span>
              )}
            </div>
          ) : (
            <span className="text-[var(--text-muted)] italic">
              {field === "dueDate" ? "No due date" : "None"}
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <input
              type="date"
              data-testid={`${testPrefix}-input`}
              aria-label={label}
              value={dateDraft}
              onChange={(e) => setDateDraft(e.target.value)}
              disabled={updateMutation.isPending || isOverwriting}
              className="h-8 px-2 text-xs rounded border border-[var(--border-strong)] bg-[var(--surface-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
            />
            {dateDraft && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDateDraft("")}
                disabled={updateMutation.isPending}
                className="h-8 px-2 text-xs text-[var(--text-muted)]"
              >
                Clear
              </Button>
            )}
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleSave()}
              disabled={updateMutation.isPending}
              data-testid={`save-${testPrefix}-btn`}
              className="h-8 px-2.5 text-xs"
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
              data-testid={`cancel-${testPrefix}-btn`}
              className="h-8 px-2.5 text-xs"
            >
              Cancel
            </Button>
          </div>

          {error && !conflict && (
            <p role="alert" className="text-xs text-[var(--feedback-danger-text)]">
              {error}
            </p>
          )}

          {conflict && (
            <ConflictAlert
              conflict={conflict}
              onDiscard={() => {
                setConflict(null);
                setIsEditing(false);
              }}
              onOverwrite={handleOverwrite}
              isOverwriting={isOverwriting}
              error={error}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 6. Inline Estimate Points Editor
// ============================================================================

export interface InlineEstimateEditorProps {
  task: TaskDto;
  communityId: string | null;
  workspaceId: string;
  isArchived?: boolean;
}

export function InlineEstimateEditor({
  task,
  communityId,
  workspaceId,
  isArchived = false,
}: InlineEstimateEditorProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [estimateDraft, setEstimateDraft] = useState(
    task.estimatePoints !== null && task.estimatePoints !== undefined
      ? String(task.estimatePoints)
      : ""
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOverwriting, setIsOverwriting] = useState(false);

  const updateMutation = useUpdateTask();
  const canEdit = !isArchived && task.effectivePermissions.canEditEstimate;

  useEffect(() => {
    if (!isEditing) {
      setEstimateDraft(
        task.estimatePoints !== null && task.estimatePoints !== undefined
          ? String(task.estimatePoints)
          : ""
      );
    }
  }, [task.estimatePoints, isEditing]);

  const handleStartEdit = () => {
    setEstimateDraft(
      task.estimatePoints !== null && task.estimatePoints !== undefined
        ? String(task.estimatePoints)
        : ""
    );
    setValidationError(null);
    setConflict(null);
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEstimateDraft(
      task.estimatePoints !== null && task.estimatePoints !== undefined
        ? String(task.estimatePoints)
        : ""
    );
    setValidationError(null);
    setConflict(null);
    setError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setError(null);
    let numValue: number | null = null;

    if (estimateDraft.trim()) {
      const parsed = Number(estimateDraft);
      if (isNaN(parsed) || parsed < 0) {
        setValidationError("Estimate points must be a non-negative number.");
        return;
      }
      numValue = parsed;
    }

    setValidationError(null);

    try {
      await updateMutation.mutateAsync({
        communityId: communityId ?? "",
        workspaceId,
        taskId: task.id,
        data: {
          estimatePoints: numValue,
          baseFieldRevisions: {
            estimatePoints: task.fieldRevisions.estimatePoints ?? 1,
          },
        },
      });
      setIsEditing(false);
      setConflict(null);
    } catch (err) {
      if (err instanceof ApiProblemError && err.status === 409) {
        setConflict({
          fieldName: "estimatePoints",
          serverValue: extractServerConflictValue(
            err,
            "estimatePoints",
            task.estimatePoints !== null ? String(task.estimatePoints) : ""
          ),
          attemptedValue: estimateDraft,
        });
      } else {
        setError(
          err instanceof ApiProblemError
            ? err.detail || err.message
            : (err as Error).message
        );
      }
    }
  };

  const handleOverwrite = async () => {
    if (!conflict) return;
    setIsOverwriting(true);
    setError(null);
    try {
      const latestTask = await getTaskById({ communityId: communityId ?? "", workspaceId, taskId: task.id });
      const numValue = conflict.attemptedValue.trim() ? Number(conflict.attemptedValue) : null;
      await updateMutation.mutateAsync({
        communityId: communityId ?? "",
        workspaceId,
        taskId: task.id,
        data: {
          estimatePoints: numValue,
          baseFieldRevisions: {
            estimatePoints: latestTask.fieldRevisions.estimatePoints ?? latestTask.version,
          },
        },
      });
      setConflict(null);
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ApiProblemError && err.status === 409) {
        const latestTask = await getTaskById({ communityId: communityId ?? "", workspaceId, taskId: task.id });
        setConflict({
          fieldName: "estimatePoints",
          serverValue: String(latestTask.estimatePoints ?? ""),
          attemptedValue: conflict.attemptedValue,
        });
      } else {
        setError(
          err instanceof ApiProblemError
            ? err.detail || err.message
            : (err as Error).message
        );
      }
    } finally {
      setIsOverwriting(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-[var(--text-muted)] flex items-center gap-1">
          <BarChart2 className="h-3 w-3" /> Estimate
        </span>
        {canEdit && !isEditing && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleStartEdit}
            data-testid="edit-estimate-btn"
            aria-label="Edit estimate"
            className="min-h-[24px] h-6 px-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <Pencil className="h-3 w-3 mr-0.5" />
            <span>Edit</span>
          </Button>
        )}
      </div>

      {!isEditing ? (
        <div className="pt-0.5">
          {task.estimatePoints !== null && task.estimatePoints !== undefined ? (
            <span className="font-semibold text-[var(--text-primary)]">
              {task.estimatePoints} {task.estimatePoints === 1 ? "point" : "points"}
            </span>
          ) : (
            <span className="text-[var(--text-muted)] italic">None</span>
          )}
        </div>
      ) : (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="any"
              data-testid="estimate-input"
              aria-label="Estimate points"
              value={estimateDraft}
              onChange={(e) => {
                setEstimateDraft(e.target.value);
                if (validationError) setValidationError(null);
              }}
              disabled={updateMutation.isPending || isOverwriting}
              className="h-8 w-24 px-2 text-xs rounded border border-[var(--border-strong)] bg-[var(--surface-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
            />
            {estimateDraft && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEstimateDraft("")}
                disabled={updateMutation.isPending}
                className="h-8 px-2 text-xs text-[var(--text-muted)]"
              >
                Clear
              </Button>
            )}
            <Button
              size="sm"
              variant="primary"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              data-testid="save-estimate-btn"
              className="h-8 px-2.5 text-xs"
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
              data-testid="cancel-estimate-btn"
              className="h-8 px-2.5 text-xs"
            >
              Cancel
            </Button>
          </div>

          {validationError && (
            <p data-testid="estimate-error" role="alert" className="text-xs text-[var(--feedback-danger-text)]">
              {validationError}
            </p>
          )}

          {error && !conflict && (
            <p role="alert" className="text-xs text-[var(--feedback-danger-text)]">
              {error}
            </p>
          )}

          {conflict && (
            <ConflictAlert
              conflict={conflict}
              onDiscard={() => {
                setConflict(null);
                setIsEditing(false);
              }}
              onOverwrite={handleOverwrite}
              isOverwriting={isOverwriting}
              error={error}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 7. Inline Assignees Editor
// ============================================================================

export interface InlineAssigneeEditorProps {
  task: TaskDto;
  communityId: string | null;
  workspaceId: string;
  isArchived?: boolean;
}

export function InlineAssigneeEditor({
  task,
  communityId: _communityId,
  workspaceId: _workspaceId,
  isArchived: _isArchived = false,
}: InlineAssigneeEditorProps): React.JSX.Element {
  // Authoritative workspace member lookup is currently unavailable in the frontend.
  // Per VS-03 Stage 3.1 requirements, existing assignees remain fully readable with avatars and names,
  // but changing assignees is deferred until a real workspace membership data source is wired.
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-[var(--text-muted)] flex items-center gap-1">
          <User className="h-3 w-3" /> Assignee
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {task.assigneeAssignments && task.assigneeAssignments.length > 0 ? (
          task.assigneeAssignments.map((assignee) => (
            <div
              key={assignee.userId}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-medium text-xs shadow-2xs"
            >
              <Avatar
                name={assignee.user.displayName}
                src={assignee.user.avatarUrl ?? undefined}
                size="xs"
              />
              <span>{assignee.user.displayName}</span>
            </div>
          ))
        ) : (
          <span className="text-[var(--text-muted)] italic">Unassigned</span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 8. Inline Labels Editor
// ============================================================================

export interface InlineLabelsEditorProps {
  task: TaskDto;
  communityId: string | null;
  workspaceId: string;
  isArchived?: boolean;
}

export function InlineLabelsEditor({
  task,
  communityId: _communityId,
  workspaceId: _workspaceId,
  isArchived: _isArchived = false,
}: InlineLabelsEditorProps): React.JSX.Element {
  // Authoritative workspace label catalogue is not defined in the OpenAPI contract.
  // Per VS-03 Stage 3.1 requirements, arbitrary typed text must not be converted into fabricated label IDs.
  // Existing assigned labels are preserved and rendered read-only until an authoritative workspace label collection is available.
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5" /> Labels
        </h3>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {task.labelIds && task.labelIds.length > 0 ? (
          task.labelIds.map((labelId) => (
            <span
              key={labelId}
              className="px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
            >
              {labelId.replace(/^018f98a2-lbl-/, "")}
            </span>
          ))
        ) : (
          <span className="text-xs text-[var(--text-muted)] italic">No labels</span>
        )}
      </div>
    </div>
  );
}
