import React, { useState } from "react";
import { Plus, AlertCircle, RefreshCw, Layers } from "lucide-react";
import { Button } from "@/components/ui/Button.js";
import { Skeleton } from "@/components/ui/Skeleton.js";
import { Feedback } from "@/components/ui/Feedback.js";
import { useWorkspace } from "@/modules/workspace/index.js";
import { useWorkspaceTasks } from "./useWorkspaceTasks.js";
import { useCreateTask } from "./useCreateTask.js";
import { SubtaskItem } from "./SubtaskItem.js";
import { computeTaskDepth } from "./ReparentTaskModal.js";
import type { TaskDto } from "./types.js";

export interface SubtaskListProps {
  task: TaskDto;
  communityId: string | null;
  workspaceId: string;
  isArchived?: boolean;
}

export function SubtaskList({
  task,
  communityId,
  workspaceId,
  isArchived = false,
}: SubtaskListProps): React.JSX.Element {
  const { workspaces } = useWorkspace();
  const workspace = workspaces.find((w) => w.id === workspaceId);
  const maxSubtaskDepth = workspace?.maxSubtaskDepth ?? 1;

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const createMutation = useCreateTask();

  const {
    data: queryResult,
    isLoading,
    isError,
    refetch,
  } = useWorkspaceTasks({
    communityId,
    workspaceId,
    query: {
      projection: "LIST",
      pageScope: "PRIMARY",
      querySpec: {
        subtaskMode: "NESTED",
        groupBy: "none",
        subGroupBy: "none",
        includeBacklog: true,
        includeCompleted: true,
        filter: { conjunction: "AND", conditions: [] },
      },
    },
  });

  const allTasks = queryResult?.items ?? [];
  const currentDepth = computeTaskDepth(task, allTasks);

  // Direct subtasks under this parent
  const directSubtasks = allTasks.filter((t) => t.parentTaskId === task.id);

  // Depth & permission checks
  const hasRemainingDepth = currentDepth < maxSubtaskDepth;
  const canCreateSubtask = Boolean(
    task.effectivePermissions?.canCreateSubtask &&
      !isArchived &&
      hasRemainingDepth
  );

  const handleStartCreate = () => {
    setIsCreating(true);
    setCreateError(null);
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewTitle("");
    setCreateError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = newTitle.trim();

    if (!trimmedTitle) {
      setCreateError("Subtask title is required.");
      return;
    }
    if (trimmedTitle.length > 500) {
      setCreateError("Subtask title must be 500 characters or fewer.");
      return;
    }

    setCreateError(null);

    try {
      await createMutation.mutateAsync({
        communityId: communityId ?? "",
        workspaceId,
        data: {
          title: trimmedTitle,
          parentTaskId: task.id,
        },
      });
      setNewTitle("");
      setIsCreating(false);
    } catch (err: unknown) {
      const errObj = err as { detail?: string; message?: string };
      setCreateError(
        errObj.detail ?? errObj.message ?? "Failed to create subtask. Please try again."
      );
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]" data-testid="subtasks-section">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-[var(--text-muted)]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Subtasks {directSubtasks.length > 0 && `(${directSubtasks.length})`}
          </h3>
        </div>

        {/* Action Button: Add Subtask */}
        {canCreateSubtask && !isCreating && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleStartCreate}
            data-testid="add-subtask-btn"
            className="h-7 px-2 text-xs gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Subtask</span>
          </Button>
        )}
      </div>

      {/* Depth limit reached notification */}
      {!hasRemainingDepth && (
        <div
          data-testid="subtask-depth-limit-notice"
          className="text-[11px] text-[var(--text-muted)] italic px-2 py-1 rounded bg-[var(--surface-muted)]"
        >
          Maximum subtask depth ({maxSubtaskDepth}) reached for this workspace.
        </div>
      )}

      {/* Inline Subtask Creation Form */}
      {isCreating && (
        <form
          onSubmit={handleCreateSubmit}
          data-testid="subtask-create-form"
          className="p-2.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-canvas)] space-y-2.5"
        >
          {createError && (
            <Feedback
              variant="danger"
              data-testid="subtask-create-error"
            >
              {createError}
            </Feedback>
          )}

          <div className="space-y-1">
            <input
              type="text"
              autoFocus
              maxLength={500}
              placeholder="What needs to be done?"
              value={newTitle}
              onChange={(e) => {
                setNewTitle(e.target.value);
                setCreateError(null);
              }}
              disabled={createMutation.isPending}
              data-testid="subtask-title-input"
              className="w-full h-8 px-2.5 text-xs rounded border border-[var(--border-strong)] bg-[var(--surface-canvas)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)] disabled:opacity-50"
            />
          </div>

          <div className="flex justify-end gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancelCreate}
              disabled={createMutation.isPending}
              data-testid="subtask-create-cancel-btn"
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={createMutation.isPending || !newTitle.trim()}
              data-testid="subtask-create-submit-btn"
              className="h-7 text-xs"
            >
              {createMutation.isPending ? "Adding..." : "Add"}
            </Button>
          </div>
        </form>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-2" data-testid="subtasks-loading">
          <Skeleton className="h-7 w-full rounded" />
          <Skeleton className="h-7 w-full rounded" />
        </div>
      )}

      {/* Error state with retry */}
      {isError && (
        <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-xs space-y-2" data-testid="subtasks-error">
          <div className="flex items-center gap-1.5 text-destructive font-medium">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Failed to load subtasks.</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            data-testid="subtask-retry-btn"
            className="h-6 text-[11px] gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry</span>
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && directSubtasks.length === 0 && !isCreating && (
        <div
          data-testid="subtasks-empty"
          className="text-xs text-[var(--text-muted)] py-2 px-1 text-center sm:text-left italic"
        >
          No subtasks yet.
        </div>
      )}

      {/* Subtask Hierarchy List */}
      {!isLoading && !isError && directSubtasks.length > 0 && (
        <ul
          role="list"
          data-testid="subtask-list"
          className="space-y-1"
        >
          {directSubtasks.map((subtask) => (
            <SubtaskItem
              key={subtask.id}
              subtask={subtask}
              allTasks={allTasks}
              depth={currentDepth + 1}
              maxSubtaskDepth={maxSubtaskDepth}
              communityId={communityId}
              workspaceId={workspaceId}
              isArchived={isArchived}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
