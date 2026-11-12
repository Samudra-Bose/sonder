import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Trash2,
  RotateCcw,
  Clock,
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  X,
} from "lucide-react";
import { useWorkspace } from "@/modules/workspace/index.js";
import { Button } from "@/components/ui/Button.js";
import { Badge } from "@/components/ui/Badge.js";
import { Skeleton } from "@/components/ui/Skeleton.js";
import { EmptyState } from "@/components/ui/EmptyState.js";
import { Feedback } from "@/components/ui/Feedback.js";
import { cn } from "@/lib/utils.js";
import { useTrashedTasks } from "../useTrashedTasks.js";
import { useRestoreTrashedTask } from "../useRestoreTrashedTask.js";
import { useBulkMutateTasks } from "../useBulkMutateTasks.js";
import type { TaskDto, TaskStatusCategory, TaskPriority } from "../types.js";

export interface WorkspaceTrashViewProps {
  className?: string;
}

function formatStatus(status: TaskStatusCategory): string {
  switch (status) {
    case "BACKLOG":
      return "Backlog";
    case "TODO":
      return "To Do";
    case "IN_PROGRESS":
      return "In Progress";
    case "DONE":
      return "Done";
    case "CANCELED":
      return "Canceled";
    default:
      return status;
  }
}

function formatPriority(priority: TaskPriority): string {
  switch (priority) {
    case "URGENT":
      return "Urgent";
    case "HIGH":
      return "High";
    case "MEDIUM":
      return "Medium";
    case "LOW":
      return "Low";
    case "NONE":
      return "None";
    default:
      return priority;
  }
}

function calculateRetentionRemaining(recoverableUntil: string): {
  days: number;
  label: string;
  isUrgent: boolean;
} {
  const diffMs = new Date(recoverableUntil).getTime() - Date.now();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (days <= 0) {
    return { days: 0, label: "0 days (Safely Retained)", isUrgent: true };
  }
  if (days === 1) {
    return { days: 1, label: "1 day remaining", isUrgent: true };
  }
  return {
    days,
    label: `${days} days remaining`,
    isUrgent: days <= 5,
  };
}

export function WorkspaceTrashView({ className }: WorkspaceTrashViewProps): React.JSX.Element {
  const params = useParams<{ communityId?: string; workspaceId?: string }>();
  const { activeWorkspace, currentCommunityId } = useWorkspace();

  const workspaceId = params.workspaceId ?? activeWorkspace?.id ?? "";
  const communityId = params.communityId ?? currentCommunityId ?? "";

  const {
    data: trashedData,
    isLoading,
    isError,
    error,
    refetch,
  } = useTrashedTasks({
    communityId,
    workspaceId,
    enabled: Boolean(communityId && workspaceId),
  });

  const restoreMutation = useRestoreTrashedTask();
  const bulkMutation = useBulkMutateTasks();

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const trashedItems = trashedData?.items ?? [];

  const maxSelectable = Math.min(trashedItems.length, 100);
  const isAllSelected =
    trashedItems.length > 0 &&
    selectedTaskIds.size >= maxSelectable &&
    trashedItems.slice(0, 100).every((item) => selectedTaskIds.has(item.task.id));
  const isIndeterminate = selectedTaskIds.size > 0 && !isAllSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleToggleSelectTask = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        if (next.size < 100) {
          next.add(taskId);
        }
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTaskIds(new Set());
    } else {
      const toSelect = trashedItems.slice(0, 100).map((item) => item.task.id);
      setSelectedTaskIds(new Set(toSelect));
    }
  };

  const handleSingleRestore = useCallback(
    async (task: TaskDto) => {
      try {
        await restoreMutation.mutateAsync({
          communityId,
          workspaceId,
          taskId: task.id,
        });
        setSelectedTaskIds((prev) => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
      } catch {
        // Error state handled in mutation
      }
    },
    [communityId, workspaceId, restoreMutation]
  );

  const handleBulkRestore = useCallback(async () => {
    if (selectedTaskIds.size === 0) return;

    try {
      // Execute bulk restore using bulk mutation
      await bulkMutation.mutateAsync({
        communityId,
        workspaceId,
        data: {
          taskIds: Array.from(selectedTaskIds),
          action: "RESTORE" as any,
        },
      });
      setSelectedTaskIds(new Set());
    } catch {
      // Fallback: restore sequentially if bulk RESTORE is unsupported
      const ids = Array.from(selectedTaskIds);
      await Promise.all(
        ids.map((id) =>
          restoreMutation.mutateAsync({ communityId, workspaceId, taskId: id }).catch(() => {})
        )
      );
      setSelectedTaskIds(new Set());
    }
  }, [selectedTaskIds, communityId, workspaceId, bulkMutation, restoreMutation]);

  return (
    <div
      data-testid="workspace-trash-view"
      className={cn("p-6 max-w-6xl mx-auto space-y-6 select-none", className)}
    >
      {/* Header & Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <Link
            to={
              communityId && workspaceId
                ? `/c/${communityId}/w/${workspaceId}/list`
                : workspaceId
                ? `/workspaces/${workspaceId}/list`
                : "/"
            }
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-ring transition-colors"
            aria-label="Back to tasks"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-amber-500" />
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Workspace Trash
              </h1>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Soft-deleted tasks from the last 30 days can be recovered to active views.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5"
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Safety Policy Callout (DEC-OPEN-03 Safety Invariant) */}
      <div
        data-testid="dec-open-03-banner"
        className="flex items-start gap-3 p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-blue-400"
      >
        <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
        <div className="space-y-0.5">
          <p className="font-semibold text-blue-300">
            DEC-OPEN-03 Safety Policy: Zero Automatic Permanent Deletion
          </p>
          <p className="text-blue-400/90 leading-relaxed">
            All archived items remain securely preserved in this workspace. No automated purge runs,
            and permanent hard-deletion remains strictly disabled pending formal Owner audit policy.
          </p>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div data-testid="trash-loading" className="space-y-2 p-1" role="status">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      )}

      {/* Error Feedback */}
      {isError && (
        <div data-testid="trash-error" className="p-4">
          <Feedback variant="danger" title="Failed to load workspace trash">
            <div className="space-y-2 mt-1">
              <p>{error?.message || "An unexpected error occurred while fetching trash."}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </Button>
            </div>
          </Feedback>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && trashedItems.length === 0 && (
        <div data-testid="trash-empty-state" className="py-12">
          <EmptyState
            title="Workspace Trash is empty"
            description="No tasks are currently archived in this workspace. When tasks are archived, they will appear here for 30-day recovery."
          />
        </div>
      )}

      {/* Trashed Tasks Table */}
      {!isLoading && !isError && trashedItems.length > 0 && (
        <div
          data-testid="trash-table-container"
          className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-2xs"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs" aria-label="Trash table">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-muted)] font-semibold select-none">
                  {/* Select All Checkbox */}
                  <th scope="col" className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      aria-label="Select all trashed tasks"
                      data-testid="trash-select-all"
                      ref={headerCheckboxRef}
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand-accent-btn-bg)] focus:ring-[var(--border-focus)] cursor-pointer"
                    />
                  </th>
                  <th scope="col" className="py-2.5 px-3 w-28 font-mono">
                    Key
                  </th>
                  <th scope="col" className="py-2.5 px-3 min-w-[200px]">
                    Title
                  </th>
                  <th scope="col" className="py-2.5 px-3 w-28">
                    Status
                  </th>
                  <th scope="col" className="py-2.5 px-3 w-28">
                    Priority
                  </th>
                  <th scope="col" className="py-2.5 px-3 w-36">
                    Archived Date
                  </th>
                  <th scope="col" className="py-2.5 px-3 w-44">
                    Retention Window
                  </th>
                  <th scope="col" className="py-2.5 px-3 w-24 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {trashedItems.map(({ task, archivedAt, recoverableUntil }) => {
                  const retention = calculateRetentionRemaining(recoverableUntil);
                  const isSelected = selectedTaskIds.has(task.id);

                  return (
                    <tr
                      key={task.id}
                      data-testid={`trash-row-${task.taskKey}`}
                      className={cn(
                        "hover:bg-[var(--surface-muted)] transition-colors",
                        isSelected && "bg-[var(--surface-muted)]"
                      )}
                    >
                      {/* Row Checkbox */}
                      <td className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Select trashed task ${task.taskKey}`}
                          data-testid={`trash-select-${task.taskKey}`}
                          checked={isSelected}
                          onChange={() => handleToggleSelectTask(task.id)}
                          className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand-accent-btn-bg)] focus:ring-[var(--border-focus)] cursor-pointer"
                        />
                      </td>

                      {/* Task Key */}
                      <td className="py-2.5 px-3 font-mono font-bold text-[var(--text-muted)] line-through">
                        {task.taskKey}
                      </td>

                      {/* Title */}
                      <td className="py-2.5 px-3 font-medium text-[var(--text-primary)]">
                        {task.title}
                      </td>

                      {/* Status Category */}
                      <td className="py-2.5 px-3">
                        <Badge status={task.statusCategory}>
                          {formatStatus(task.statusCategory)}
                        </Badge>
                      </td>

                      {/* Priority */}
                      <td className="py-2.5 px-3">
                        <Badge priority={task.priority}>
                          {formatPriority(task.priority)}
                        </Badge>
                      </td>

                      {/* Archived Date */}
                      <td className="py-2.5 px-3 text-[var(--text-secondary)] whitespace-nowrap">
                        {new Date(archivedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* Retention Countdown */}
                      <td className="py-2.5 px-3">
                        <span
                          data-testid={`retention-badge-${task.taskKey}`}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap",
                            retention.isUrgent
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              : "bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          <span>{retention.label}</span>
                        </span>
                      </td>

                      {/* Restore Action Button */}
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          data-testid={`restore-task-${task.taskKey}`}
                          disabled={restoreMutation.isPending || (task.effectivePermissions && task.effectivePermissions.canRestore === false)}
                          onClick={() => handleSingleRestore(task)}
                          className="gap-1 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Restore</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floating Bulk Restore Action Bar */}
      {selectedTaskIds.size > 0 && (
        <div
          role="toolbar"
          aria-label="Trash bulk actions toolbar"
          data-testid="trash-bulk-action-bar"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-2xl rounded-xl px-4 py-2.5 flex items-center gap-3 backdrop-blur-md select-none animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <span
            data-testid="trash-bulk-count"
            className="text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap pr-2 border-r border-[var(--border-subtle)]"
          >
            {selectedTaskIds.size} selected
          </span>

          <Button
            type="button"
            variant="primary"
            size="sm"
            data-testid="bulk-restore-button"
            disabled={bulkMutation.isPending || restoreMutation.isPending}
            onClick={handleBulkRestore}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restore ({selectedTaskIds.size})</span>
          </Button>

          <button
            type="button"
            onClick={() => setSelectedTaskIds(new Set())}
            aria-label="Clear selection"
            data-testid="trash-bulk-clear"
            className="h-7 w-7 rounded-md inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-ring transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
