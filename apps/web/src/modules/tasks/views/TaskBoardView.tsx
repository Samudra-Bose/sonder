import React, { useState } from "react";
import {
  Calendar,
  RefreshCw,
  GitFork,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
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
import type {
  TaskDto,
  TaskQueryBucketDto,
  TaskStatusCategory,
  TaskPriority,
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

const ALL_STATUS_OPTIONS: Array<{ value: TaskStatusCategory; label: string }> = [
  { value: "BACKLOG", label: "Backlog" },
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "DONE", label: "Done" },
  { value: "CANCELED", label: "Canceled" },
];

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

  const totalTasksAcrossGroups = groups.reduce((acc, g) => acc + g.total, 0);

  if (groups.length === 0 || totalTasksAcrossGroups === 0) {
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
          onTaskClick={openTask}
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
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--surface-card)] border border-[var(--border-subtle)] font-mono">
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
                  className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border-subtle)] font-medium"
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

                    const handleCardClick = () => {
                      openTask(task.taskKey, { workspaceId });
                    };

                    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
                      if (e.key === "Enter" || e.key === " ") {
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
                        {/* Top: Task Key + Priority */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <TaskArchetypeBadge archetype={task.itemType} size="sm" showLabel={false} />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick();
                              }}
                              className="font-mono text-xs font-bold text-[var(--brand-accent-text)] hover:underline focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] rounded"
                            >
                              {task.taskKey}
                            </button>
                          </div>
                          <div
                            className="flex items-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Badge priority={task.priority} size="sm">
                              {formatPriority(task.priority)}
                            </Badge>
                            <TaskActionsMenu
                              task={task}
                              workspaceId={workspaceId}
                              communityId={communityId}
                            />
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-accent-text)] transition-colors line-clamp-2">
                          {task.title}
                        </h4>

                        {/* Hierarchy Indicator */}
                        {task.parentTaskId && (
                          <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                            <GitFork className="h-3 w-3 rotate-180" />
                            <span>Subtask</span>
                          </div>
                        )}

                        {/* Bottom Row: Due Date + Non-Drag Move Control */}
                        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 text-[11px]">
                          {/* Due date */}
                          <div className="text-[var(--text-secondary)] font-mono text-[10px]">
                            {task.dueDate ? (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-2.5 w-2.5 text-[var(--text-muted)]" />
                                <span>{task.dueDate}</span>
                              </span>
                            ) : (
                              <span className="text-[var(--text-muted)]">—</span>
                            )}
                          </div>

                          {/* Accessible Non-drag Status Move Dropdown */}
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <label
                              htmlFor={`board-status-select-${task.id}`}
                              className="sr-only"
                            >
                              Move {task.taskKey} status
                            </label>
                            <select
                              id={`board-status-select-${task.id}`}
                              aria-label={`Move ${task.taskKey} status`}
                              value={task.statusCategory}
                              onChange={(e) =>
                                handleStatusChange(
                                  task,
                                  e.target.value as TaskStatusCategory
                                )
                              }
                              className="text-[11px] bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-ring cursor-pointer"
                            >
                              {ALL_STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
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
        onTaskClick={openTask}
        workspaceId={workspaceId}
        communityId={communityId}
        viewType="board"
      />
    </div>
  );
}
