import React, { useState, useMemo } from "react";
import { Link2, Plus, Trash2, AlertTriangle, Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button.js";
import { Badge } from "@/components/ui/Badge.js";
import { Skeleton } from "@/components/ui/Skeleton.js";
import { Feedback } from "@/components/ui/Feedback.js";
import { cn } from "@/lib/utils.js";
import type { TaskDto } from "./types.js";
import {
  useTaskLinks,
  useCreateTaskLink,
  useDeleteTaskLink,
  type TaskLinkType,
  type TaskLinkDto,
} from "./dependencies/index.js";
import { detectLinkConflict } from "./dependencies/dependency-conflict-utils.js";

export interface TaskDependenciesProps {
  task: TaskDto;
  allTasks?: TaskDto[];
  communityId: string | null;
  workspaceId: string;
  isArchived?: boolean;
  onNavigateToTask?: (taskKey: string) => void;
  className?: string;
}

export function TaskDependencies({
  task,
  allTasks = [],
  communityId,
  workspaceId,
  isArchived = false,
  onNavigateToTask,
  className,
}: TaskDependenciesProps): React.JSX.Element {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedType, setSelectedType] = useState<TaskLinkType>("BLOCKS");
  const [targetTaskId, setTargetTaskId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [mutationError, setMutationError] = useState<string | null>(null);

  const canEditLinks = Boolean(
    task.effectivePermissions?.canEditCustomFieldsLinks && !isArchived
  );

  const {
    data: linksData,
    isLoading,
    isError,
    error: fetchError,
    refetch,
  } = useTaskLinks(communityId, workspaceId, task.id);

  const createMutation = useCreateTaskLink();
  const deleteMutation = useDeleteTaskLink();

  const links = linksData?.items ?? [];

  // Map of all tasks in workspace for conflict detection and quick details
  const tasksById = useMemo(() => new Map(allTasks.map((t) => [t.id, t])), [allTasks]);

  // Candidates for linking (exclude current task)
  const candidateTasks = useMemo(() => {
    return allTasks.filter((t) => t.id !== task.id);
  }, [allTasks, task.id]);

  // Filter candidate tasks by search term
  const filteredCandidates = useMemo(() => {
    if (!searchTerm.trim()) return candidateTasks.slice(0, 50);
    const term = searchTerm.toLowerCase();
    return candidateTasks
      .filter((t) => t.taskKey.toLowerCase().includes(term) || t.title.toLowerCase().includes(term))
      .slice(0, 50);
  }, [candidateTasks, searchTerm]);

  // Compute conflicts for all active links
  const linksWithConflicts = useMemo(() => {
    return links.map((link) => {
      const otherTask = tasksById.get(link.targetTaskId);
      const conflict = otherTask
        ? detectLinkConflict(task, otherTask, link.type)
        : { hasConflict: false };
      return { link, otherTask, conflict };
    });
  }, [links, tasksById, task]);

  const hasAnyConflict = linksWithConflicts.some((item) => item.conflict.hasConflict);

  const handleStartAdd = () => {
    setIsAdding(true);
    setMutationError(null);
    setSearchTerm("");
    setTargetTaskId(candidateTasks[0]?.id ?? "");
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setMutationError(null);
    setSearchTerm("");
    setTargetTaskId("");
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTaskId) {
      setMutationError("Please select a target task to link.");
      return;
    }

    setMutationError(null);

    try {
      await createMutation.mutateAsync({
        communityId: communityId ?? "",
        workspaceId,
        taskId: task.id,
        data: {
          targetTaskId,
          type: selectedType,
        },
      });
      setIsAdding(false);
      setTargetTaskId("");
      setSearchTerm("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create task relationship link.";
      setMutationError(message);
    }
  };

  const handleDeleteLink = async (link: TaskLinkDto) => {
    setMutationError(null);
    try {
      await deleteMutation.mutateAsync({
        communityId: communityId ?? "",
        workspaceId,
        taskId: task.id,
        linkId: link.id,
        targetTaskId: link.targetTaskId,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete task relationship link.";
      setMutationError(message);
    }
  };

  const formatLinkTypeLabel = (type: TaskLinkType) => {
    switch (type) {
      case "BLOCKS":
        return "Blocks";
      case "IS_BLOCKED_BY":
        return "Blocked by";
      case "RELATES_TO":
        return "Relates to";
      case "DUPLICATES":
        return "Duplicates";
      default:
        return type;
    }
  };

  const getLinkTypeBadgeClass = (type: TaskLinkType) => {
    switch (type) {
      case "BLOCKS":
        return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20";
      case "IS_BLOCKED_BY":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "RELATES_TO":
        return "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20";
      case "DUPLICATES":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
    }
  };

  return (
    <section
      data-testid="task-dependencies-section"
      aria-labelledby="task-dependencies-heading"
      className={cn("space-y-3 pt-4 border-t border-[var(--border-subtle)]", className)}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true" />
          <h3
            id="task-dependencies-heading"
            className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider"
          >
            Dependencies & Relations
          </h3>
          <span
            data-testid="dependencies-count-badge"
            className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
          >
            {links.length}
          </span>
          {hasAnyConflict && (
            <span
              data-testid="section-conflict-indicator"
              title="Scheduling conflict detected on one or more dependencies"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
            >
              <AlertTriangle className="h-2.5 w-2.5" />
              <span>Date Conflict</span>
            </span>
          )}
        </div>

        {canEditLinks && !isAdding && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleStartAdd}
            data-testid="add-dependency-button"
            className="h-7 text-xs text-[var(--brand-accent-text)] hover:bg-[var(--brand-accent-subtle)] px-2"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Link
          </Button>
        )}
      </div>

      {/* Mutation / Action Error Banner */}
      {mutationError && (
        <Feedback
          variant="danger"
          onDismiss={() => setMutationError(null)}
          className="text-xs py-2"
        >
          {mutationError}
        </Feedback>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div data-testid="dependencies-loading" className="space-y-2 py-1">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      )}

      {/* Fetch Error State */}
      {isError && (
        <div
          data-testid="dependencies-error"
          className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-600 dark:text-red-400 flex items-center justify-between"
        >
          <span>{fetchError?.message || "Failed to load task dependencies."}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-6 text-xs px-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Add Dependency Inline Form */}
      {isAdding && (
        <form
          onSubmit={handleCreateSubmit}
          data-testid="add-dependency-form"
          className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] space-y-3"
        >
          <div className="text-xs font-medium text-[var(--text-primary)]">
            Create task relationship
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Relationship Type */}
            <div>
              <label
                htmlFor="dependency-type-select"
                className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1"
              >
                Relationship
              </label>
              <select
                id="dependency-type-select"
                data-testid="dependency-type-select"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as TaskLinkType)}
                className="w-full text-xs bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-md px-2 py-1.5 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]"
              >
                <option value="BLOCKS">Blocks (this task blocks target)</option>
                <option value="IS_BLOCKED_BY">Is Blocked By (target blocks this)</option>
                <option value="RELATES_TO">Relates to</option>
                <option value="DUPLICATES">Duplicates</option>
              </select>
            </div>

            {/* Target Task Selector */}
            <div>
              <label
                htmlFor="dependency-target-select"
                className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1"
              >
                Target Task
              </label>
              <select
                id="dependency-target-select"
                data-testid="dependency-target-select"
                value={targetTaskId}
                onChange={(e) => setTargetTaskId(e.target.value)}
                className="w-full text-xs bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-md px-2 py-1.5 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]"
              >
                <option value="">Select a task...</option>
                {filteredCandidates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.taskKey}: {t.title.slice(0, 45)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancelAdd}
              disabled={createMutation.isPending}
              data-testid="cancel-dependency-button"
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={createMutation.isPending || !targetTaskId}
              data-testid="submit-dependency-button"
              className="h-7 text-xs"
            >
              {createMutation.isPending ? "Linking..." : "Link Task"}
            </Button>
          </div>
        </form>
      )}

      {/* Dependencies List */}
      {!isLoading && !isError && linksWithConflicts.length === 0 && !isAdding && (
        <div
          data-testid="dependencies-empty-state"
          className="py-4 text-center text-xs text-[var(--text-muted)] italic"
        >
          No dependencies or relations linked to this task.
        </div>
      )}

      <div className="space-y-1.5" data-testid="task-dependencies-list">
        {linksWithConflicts.map(({ link, conflict }) => {
          const isRestricted = link.targetAccessible === false || !link.targetKey;

          return (
            <div
              key={link.id}
              data-testid={`dependency-item-${link.id}`}
              className={cn(
                "flex flex-col p-2 rounded-md border text-xs transition-colors",
                conflict.hasConflict
                  ? "bg-amber-500/5 border-amber-500/30"
                  : "bg-[var(--surface-card)] border-[var(--border-subtle)] hover:bg-[var(--surface-muted)]"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Link Type Badge */}
                  <span
                    className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0",
                      getLinkTypeBadgeClass(link.type)
                    )}
                  >
                    {formatLinkTypeLabel(link.type)}
                  </span>

                  {/* Target Task Info or Restricted Pill */}
                  {isRestricted ? (
                    <span
                      data-testid={`restricted-target-${link.id}`}
                      title="You do not have permission to view details of this task"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-[var(--text-muted)] bg-[var(--surface-muted)] border border-[var(--border-subtle)]"
                    >
                      <Lock className="h-3 w-3" />
                      <span>Restricted Task</span>
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                      <button
                        type="button"
                        onClick={() => onNavigateToTask?.(link.targetKey!)}
                        className="font-mono text-[11px] font-semibold text-[var(--brand-accent-text)] hover:underline flex-shrink-0"
                      >
                        {link.targetKey}
                      </button>
                      <span className="truncate text-[11px] text-[var(--text-primary)]">
                        {link.targetTitle}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isRestricted && link.targetStatusCategory && (
                    <Badge status={link.targetStatusCategory} size="sm">
                      {link.targetStatusCategory.replace("_", " ")}
                    </Badge>
                  )}

                  {canEditLinks && (
                    <button
                      type="button"
                      onClick={() => handleDeleteLink(link)}
                      disabled={deleteMutation.isPending}
                      data-testid={`delete-dependency-${link.id}`}
                      aria-label={`Remove link to ${isRestricted ? "Restricted Task" : link.targetKey}`}
                      className="p-1 text-[var(--text-muted)] hover:text-red-500 rounded transition-colors focus-ring"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Conflict Explanation Message */}
              {conflict.hasConflict && (
                <div
                  data-testid={`dependency-conflict-alert-${link.id}`}
                  className="mt-1.5 pt-1.5 border-t border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1.5"
                >
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span>{conflict.reason}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
