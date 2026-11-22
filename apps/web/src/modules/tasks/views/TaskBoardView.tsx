import React, { useState } from "react";
import {
  RefreshCw,
  GitFork,
  Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Feedback } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useTaskPeekDrawer } from "../useTaskPeekDrawer";
import { useUpdateTask } from "../useUpdateTask";
import { TaskActionsMenu } from "../TaskActionsMenu.js";
import { TaskArchetypeBadge } from "../TaskArchetypeBadge.js";
import { BacklogTaskTray } from "./BacklogTaskTray.js";
import { InlineTitleCell } from "../cells/InlineTitleCell.js";
import { InlineStatusCell } from "../cells/InlineStatusCell.js";
import { InlinePriorityCell } from "../cells/InlinePriorityCell.js";
import { InlineAssigneeCell } from "../cells/InlineAssigneeCell.js";
import { InlineDueDateCell } from "../cells/InlineDueDateCell.js";
import { InlineCreationRow, type PendingTaskItem } from "../InlineCreationRow.js";
import type {
  TaskDto,
  TaskQueryBucketDto,
  TaskStatusCategory,
} from "../types";

export interface TaskBoardViewProps {
  groups: TaskQueryBucketDto[];
  backlogTasks?: TaskDto[];
  backlogCount?: number;
  isBacklogOpen?: boolean;
  onToggleBacklog?: () => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
  workspaceId: string;
  communityId: string;
  selectedMobileStage?: string;
  onSelectMobileStage?: (stage: string) => void;
  className?: string;
}

export function TaskBoardView({
  groups,
  backlogTasks,
  backlogCount,
  isBacklogOpen: propIsBacklogOpen,
  onToggleBacklog: propOnToggleBacklog,
  isLoading,
  isError,
  error,
  onRetry,
  workspaceId,
  communityId,
  selectedMobileStage: propMobileStage,
  onSelectMobileStage: propOnSelectMobileStage,
  className,
}: TaskBoardViewProps): React.JSX.Element {
  const { openTask } = useTaskPeekDrawer();
  const updateTaskMutation = useUpdateTask();

  const [internalBacklogOpen, setInternalBacklogOpen] = useState(false);
  const isTrayOpen = propIsBacklogOpen ?? internalBacklogOpen;
  const handleToggleTray = propOnToggleBacklog ?? (() => setInternalBacklogOpen((prev) => !prev));

  const effectiveBacklogCount = backlogCount ?? (backlogTasks ? backlogTasks.length : 0);
  const effectiveBacklogTasks = backlogTasks ?? [];

  const [internalMobileStage, setInternalMobileStage] = useState<string>(() => {
    return groups[0]?.key ?? "TODO";
  });
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [pendingTasksByColumn, setPendingTasksByColumn] = useState<Record<string, PendingTaskItem | null>>({});

  const handlePendingChange = (columnKey: string, pending: PendingTaskItem | null) => {
    setPendingTasksByColumn((prev) => {
      if (!pending) {
        const next = { ...prev };
        delete next[columnKey];
        return next;
      }
      return { ...prev, [columnKey]: pending };
    });
  };

  const activeMobileStage = propMobileStage ?? internalMobileStage;
  const handleSelectMobileStage = (stage: string) => {
    if (propOnSelectMobileStage) {
      propOnSelectMobileStage(stage);
    } else {
      setInternalMobileStage(stage);
    }
  };

  const handleStatusChange = async (
    task: TaskDto,
    newStatus: TaskStatusCategory
  ) => {
    if (task.statusCategory === newStatus) return;
    setMutationError(null);

    try {
      await updateTaskMutation.mutateAsync({
        communityId,
        workspaceId,
        taskId: task.id,
        data: {
          statusCategory: newStatus,
          baseFieldRevisions: {
            statusCategory: task.fieldRevisions.statusCategory ?? 1,
          },
        },
      });
    } catch (err: unknown) {
      const e = err as { message?: string; detail?: string };
      setMutationError(e.detail || e.message || "Failed to update task status.");
      throw err;
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div
        data-testid="task-board-loading"
        className={cn("grid grid-cols-1 md:grid-cols-4 gap-4 p-1", className)}
        role="status"
        aria-label="Loading task board"
      >
        {[1, 2, 3, 4].map((col) => (
          <div
            key={col}
            className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-3 space-y-3"
          >
            <Skeleton className="h-6 w-24 rounded" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div data-testid="task-board-error" className={cn("p-4", className)}>
        <Feedback variant="danger" title="Failed to load board">
          <div className="space-y-2 mt-1">
            <p>{error?.message || "An unexpected error occurred while fetching the board."}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </Button>
          </div>
        </Feedback>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div
        id="tasks-board-panel"
        role="tabpanel"
        aria-labelledby="tab-view-board"
        data-testid="task-board-view"
        className={cn("space-y-4", className)}
      >
        <div data-testid="task-board-empty" className="py-8">
          <EmptyState
            title="No tasks found on the board"
            description="Adjust your search query, priority, or status filters, or press 'C' to create a new task."
          />
        </div>
        <BacklogTaskTray
          tasks={effectiveBacklogTasks}
          totalCount={effectiveBacklogCount}
          isOpen={isTrayOpen}
          onToggle={handleToggleTray}
          onTaskClick={(task) => openTask(task.taskKey, { workspaceId })}
          workspaceId={workspaceId}
          communityId={communityId}
          viewType="board"
        />
      </div>
    );
  }

  return (
    <div
      id="tasks-board-panel"
      role="tabpanel"
      aria-labelledby="tab-view-board"
      data-testid="task-board-view"
      className={cn("space-y-4", className)}
    >
      {/* Mutation Error Notification */}
      {mutationError && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-[var(--feedback-danger-bg)] border border-[var(--feedback-danger-border)] rounded-lg px-3 py-2 text-xs text-[var(--feedback-danger-text)] flex items-center justify-between"
        >
          <span>{mutationError}</span>
          <button
            type="button"
            onClick={() => setMutationError(null)}
            className="font-bold ml-2 hover:opacity-80"
            aria-label="Dismiss status error"
          >
            &times;
          </button>
        </div>
      )}

      {/* Mobile Stage Switcher Tabs (visible on mobile only, md:hidden) */}
      <div className="md:hidden flex items-center gap-1 overflow-x-auto pb-1 border-b border-[var(--border-subtle)]">
        {groups.map((group) => {
          const isCurrent = group.key === activeMobileStage;
          return (
            <button
              key={group.key}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              data-testid={`mobile-stage-tab-${group.key}`}
              onClick={() => handleSelectMobileStage(group.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 focus-ring cursor-pointer",
                isCurrent
                  ? "bg-[var(--surface-muted)] text-[var(--text-primary)] font-semibold border border-[var(--border-strong)] shadow-2xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <span>{group.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--surface-card)] border border-[var(--border-subtle)] font-mono tabular-nums">
                {group.total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Columns Grid: Desktop shows all columns; Mobile renders active column only */}
      <div className="grid grid-cols-1 md:grid-flow-col md:auto-cols-fr gap-4 items-start overflow-x-auto pb-2">
        {groups.map((group) => {
          const isMobileActive = group.key === activeMobileStage;

          return (
            <section
              key={group.key}
              data-testid={`board-column-${group.key}`}
              aria-labelledby={`board-column-header-${group.key}`}
              className={cn(
                "flex flex-col bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-3 min-w-[260px] shadow-2xs space-y-3",
                !isMobileActive && "hidden md:flex"
              )}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] select-none">
                <h3
                  id={`board-column-header-${group.key}`}
                  className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5"
                >
                  <span>{group.label}</span>
                </h3>
                <span
                  data-testid={`board-column-count-${group.key}`}
                  className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border-subtle)] font-medium"
                >
                  {group.total}
                </span>
              </div>

              {/* Task Cards in this Column */}
              <div className="space-y-2.5 min-h-[120px]">
                {group.items.length === 0 ? (
                  <div className="text-xs text-[var(--text-muted)] text-center py-8 border border-dashed border-[var(--border-subtle)] rounded-lg">
                    No tasks in this stage
                  </div>
                ) : (
                  group.items.map((task) => {
                    const isPending =
                      updateTaskMutation.isPending &&
                      updateTaskMutation.variables?.taskId === task.id;

                    const handleCardClick = (e?: React.MouseEvent) => {
                      if (e?.defaultPrevented) return;
                      openTask(task.taskKey, { workspaceId });
                    };

                    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
                      if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
                        e.preventDefault();
                        handleCardClick();
                      }
                    };

                    return (
                      <div
                        key={task.id}
                        data-testid={`task-board-card-${task.taskKey}`}
                        tabIndex={0}
                        onClick={handleCardClick}
                        onKeyDown={handleKeyDown}
                        className={cn(
                          "bg-[var(--surface-canvas)] border border-[var(--border-subtle)] rounded-lg p-3 space-y-2.5 transition-all shadow-2xs hover:border-[var(--border-strong)] hover:shadow-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] group",
                          isPending && "opacity-60 pointer-events-none"
                        )}
                      >
                        {/* Top: Task Key + Priority + Actions Menu */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <TaskArchetypeBadge archetype={task.itemType} size="sm" showLabel={false} />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick(e);
                              }}
                              className="font-mono text-xs font-bold text-[var(--brand-accent-text)] tabular-nums hover:underline focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] rounded"
                            >
                              {task.taskKey}
                            </button>
                          </div>
                          <div
                            className="flex items-center gap-1.5 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <InlinePriorityCell
                              task={task}
                              communityId={communityId}
                              workspaceId={workspaceId}
                            />
                            <TaskActionsMenu
                              task={task}
                              workspaceId={workspaceId}
                              communityId={communityId}
                            />
                          </div>
                        </div>

                        {/* Title (InlineTitleCell) */}
                        <div className="min-w-0" onClick={(e) => e.stopPropagation()}>
                          <InlineTitleCell
                            task={task}
                            communityId={communityId}
                            workspaceId={workspaceId}
                            className="w-full"
                          />
                        </div>

                        {/* Hierarchy Indicator */}
                        {task.parentTaskId && (
                          <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                            <GitFork className="h-3 w-3 rotate-180" />
                            <span>Subtask</span>
                          </div>
                        )}

                        {/* Bottom Row: Assignee & Due Date + Status */}
                        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 text-[11px]">
                          {/* Left: Assignee & Due Date */}
                          <div
                            className="flex items-center gap-2 min-w-0 flex-wrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div data-testid={`board-card-assignee-${task.taskKey}`} className="shrink-0">
                              <InlineAssigneeCell
                                task={task}
                                communityId={communityId}
                                workspaceId={workspaceId}
                              />
                            </div>
                            <div className="shrink-0">
                              <InlineDueDateCell
                                task={task}
                                communityId={communityId}
                                workspaceId={workspaceId}
                              />
                            </div>
                          </div>

                          {/* Right: Status (InlineStatusCell primary status editor) */}
                          <div
                            className="shrink-0 flex items-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <InlineStatusCell
                              task={task}
                              communityId={communityId}
                              workspaceId={workspaceId}
                              onStatusChange={(newStatus) => handleStatusChange(task, newStatus)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Transient Pending Task Card in this Column (WP-B4) */}
                {pendingTasksByColumn[group.key] && (
                  <div
                    data-testid="task-board-pending-card"
                    role="status"
                    aria-label={`Creating task: ${pendingTasksByColumn[group.key]!.title}`}
                    className="bg-[var(--surface-canvas)] border border-dashed border-[var(--border-strong)] rounded-lg p-3 space-y-2 opacity-70 select-none shadow-2xs pointer-events-none"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--brand-accent-text)] shrink-0" aria-hidden="true" />
                        <span
                          data-testid="pending-task-badge"
                          className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-wider uppercase px-1.5 py-0.5 rounded bg-[var(--surface-muted)]"
                        >
                          Pending
                        </span>
                      </div>
                    </div>
                    <div
                      data-testid="pending-task-title"
                      className="text-xs font-medium text-[var(--text-secondary)] italic truncate"
                    >
                      {pendingTasksByColumn[group.key]!.title}
                    </div>
                  </div>
                )}
              </div>

              {/* Inline Card Creation for this Column (WP-B3) */}
              <div className="pt-1 mt-auto">
                <InlineCreationRow
                  communityId={communityId}
                  workspaceId={workspaceId}
                  variant="board"
                  initialStatusCategory={group.key as TaskStatusCategory}
                  triggerLabel="+ Add card"
                  onPendingChange={(pending) => handlePendingChange(group.key, pending)}
                  className="w-full"
                />
              </div>
            </section>
          );
        })}
      </div>

      {/* Collapsible Backlog Tray (FEAT-B02 / VS-09G) */}
      <BacklogTaskTray
        tasks={effectiveBacklogTasks}
        totalCount={effectiveBacklogCount}
        isOpen={isTrayOpen}
        onToggle={handleToggleTray}
        onTaskClick={(task) => openTask(task.taskKey, { workspaceId })}
        workspaceId={workspaceId}
        communityId={communityId}
        viewType="board"
      />
    </div>
  );
}
