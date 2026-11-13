import React, { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button.js";
import { ApiProblemError } from "@/lib/api-client.js";
import { getTaskById } from "./api.js";
import { useUpdateTask } from "./useUpdateTask.js";
import {
  TaskArchetypeBadge,
  ARCHETYPE_LABELS,
} from "./TaskArchetypeBadge.js";
import {
  ConflictAlert,
  extractServerConflictValue,
  type ConflictState,
} from "./InlineFieldEditors.js";
import type { TaskDto, TaskType } from "./types.js";

export interface InlineArchetypeEditorProps {
  task: TaskDto;
  communityId?: string | null;
  workspaceId: string;
  isArchived?: boolean;
}

const ARCHETYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: "TASK", label: "Task" },
  { value: "DELIVERABLE", label: "Deliverable" },
  { value: "BUG", label: "Bug" },
  { value: "DECISION", label: "Decision" },
];

export function InlineArchetypeEditor({
  task,
  communityId,
  workspaceId,
  isArchived = false,
}: InlineArchetypeEditorProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedArchetype, setSelectedArchetype] = useState<TaskType>(task.itemType);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOverwriting, setIsOverwriting] = useState(false);

  const updateMutation = useUpdateTask();
  const canEdit = !isArchived && task.effectivePermissions.canEditTitleDescription;

  useEffect(() => {
    if (!isEditing) {
      setSelectedArchetype(task.itemType);
    }
  }, [task.itemType, isEditing]);

  const handleStartEdit = () => {
    setSelectedArchetype(task.itemType);
    setConflict(null);
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setSelectedArchetype(task.itemType);
    setConflict(null);
    setError(null);
    setIsEditing(false);
  };

  const handleSave = async (archetypeToSave = selectedArchetype) => {
    setError(null);
    try {
      await updateMutation.mutateAsync({
        communityId: communityId ?? "",
        workspaceId,
        taskId: task.id,
        data: {
          itemType: archetypeToSave,
          baseFieldRevisions: {
            itemType: task.fieldRevisions?.itemType ?? task.version ?? 1,
          },
        },
      });
      setIsEditing(false);
      setConflict(null);
    } catch (err) {
      if (err instanceof ApiProblemError && err.status === 409) {
        setConflict({
          fieldName: "itemType",
          serverValue: extractServerConflictValue(err, "itemType", task.itemType),
          attemptedValue: archetypeToSave,
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
      const latestTask = await getTaskById({
        communityId: communityId ?? "",
        workspaceId,
        taskId: task.id,
      });
      await updateMutation.mutateAsync({
        communityId: communityId ?? "",
        workspaceId,
        taskId: task.id,
        data: {
          itemType: conflict.attemptedValue as TaskType,
          baseFieldRevisions: {
            itemType: latestTask.fieldRevisions?.itemType ?? latestTask.version,
          },
        },
      });
      setConflict(null);
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ApiProblemError && err.status === 409) {
        const latestTask = await getTaskById({
          communityId: communityId ?? "",
          workspaceId,
          taskId: task.id,
        });
        setConflict({
          fieldName: "itemType",
          serverValue: extractServerConflictValue(err, "itemType", latestTask.itemType),
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
      <div className="inline-flex items-center gap-1.5" data-testid="inline-archetype-view">
        <TaskArchetypeBadge archetype={task.itemType} size="sm" />
        {canEdit && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleStartEdit}
            data-testid="edit-archetype-btn"
            aria-label="Edit archetype"
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
    <div
      data-testid="inline-archetype-editing"
      className="space-y-2 p-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)]"
    >
      <div className="flex items-center gap-2">
        <select
          data-testid="archetype-select"
          aria-label="Select work-item archetype"
          value={selectedArchetype}
          onChange={(e) => setSelectedArchetype(e.target.value as TaskType)}
          disabled={updateMutation.isPending || isOverwriting}
          className="h-8 px-2 text-xs rounded border border-[var(--border-strong)] bg-[var(--surface-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] cursor-pointer"
        >
          {ARCHETYPE_OPTIONS.map((opt) => (
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
          data-testid="save-archetype-btn"
          className="h-8 px-2.5 text-xs"
        >
          {updateMutation.isPending ? "Saving..." : "Save"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={updateMutation.isPending || isOverwriting}
          data-testid="cancel-archetype-btn"
          className="h-8 px-2 text-xs"
        >
          Cancel
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          data-testid="archetype-error-message"
          className="text-xs text-[var(--feedback-danger-text)] font-medium p-1 rounded bg-[var(--feedback-danger-surface)]"
        >
          {error}
        </div>
      )}

      {conflict && (
        <ConflictAlert
          conflict={conflict}
          onDiscard={() => {
            setSelectedArchetype(conflict.serverValue as TaskType);
            setConflict(null);
            setIsEditing(false);
          }}
          onOverwrite={handleOverwrite}
          isOverwriting={isOverwriting}
        />
      )}
    </div>
  );
}
