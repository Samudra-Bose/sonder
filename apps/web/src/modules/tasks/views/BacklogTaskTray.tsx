/**
 * Collapsible Backlog Tray Component (FEAT-B02 / VS-09G)
 *
 * Provides a dedicated, collapsible triage tray in List and Board views
 * for staging unscheduled ideas and tasks away from active work columns.
 * Supports:
 * - 1-click expand/collapse with accessible ARIA semantics.
 * - Accurate backlog task counts and previews.
 * - Single-click status promotion from BACKLOG to active TODO.
 * - Integration with TaskPeekDrawer and TaskActionsMenu.
 * - Keyboard navigation (Enter / Space).
 * - Responsive desktop and mobile layouts.
 */

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Inbox,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge.js";
import { Button } from "@/components/ui/Button.js";
import { cn } from "@/lib/utils.js";
import { TaskArchetypeBadge } from "../TaskArchetypeBadge.js";
import { TaskActionsMenu } from "../TaskActionsMenu.js";
import { useUpdateTask } from "../useUpdateTask.js";
import type { TaskDto, TaskPriority } from "../types.js";

export interface BacklogTaskTrayProps {
  tasks: TaskDto[];
  totalCount: number;
  isOpen: boolean;
  onToggle: () => void;
  onTaskClick: (task: TaskDto) => void;
  workspaceId: string;
  communityId: string;
  viewType?: "list" | "board";
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

export function BacklogTaskTray({
  tasks,
  totalCount,
  isOpen,
  onToggle,
  onTaskClick,
  workspaceId,
  communityId,
  viewType = "list",
  className,
}: BacklogTaskTrayProps): React.JSX.Element {
  const updateTaskMutation = useUpdateTask();
  const [promotingTaskId, setPromotingTaskId] = useState<string | null>(null);
  const [promotionError, setPromotionError] = useState<string | null>(null);

  const handlePromoteToTodo = async (e: React.MouseEvent, task: TaskDto) => {
    e.stopPropagation();
    const canPromoteTask = !task.archivedAt && Boolean(task.effectivePermissions?.canUpdateStatus);
    if (!canPromoteTask || promotingTaskId) return;

    setPromotingTaskId(task.id);
    setPromotionError(null);

    try {
      await updateTaskMutation.mutateAsync({
        communityId,
        workspaceId,
        taskId: task.id,
        data: {
          statusCategory: "TODO",
          baseFieldRevisions: {
            statusCategory: task.fieldRevisions.statusCategory ?? 1,
          },
        },
      });
    } catch (err: unknown) {
      const e = err as { message?: string; detail?: string };
      setPromotionError(
        e.detail || e.message || `Failed to move ${task.taskKey} to To Do.`
      );
    } finally {
      setPromotingTaskId(null);
    }
  };

  return (
    <div
      data-testid="backlog-task-tray"
      aria-label="Workspace backlog tray"
      className={cn(
        "flex flex-col bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl transition-all shadow-2xs select-none",
        className
      )}
    >
      {/* Tray Header Bar / Toggle Button */}
      <button
        type="button"
        data-testid="backlog-tray-toggle"
        aria-expanded={isOpen}
        aria-controls="backlog-tray-content"
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-[var(--surface-muted)] transition-colors focus-ring cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
          )}
          <Inbox className="h-4 w-4 text-[var(--brand-accent-text)] flex-shrink-0" />
          <span className="text-xs font-bold text-[var(--text-primary)]">
            Backlog
          </span>
          <span
            data-testid="backlog-count-badge"
            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border-subtle)] font-mono"
          >
            {totalCount}
          </span>
          <span className="text-[11px] text-[var(--text-muted)] truncate hidden sm:inline ml-1 font-normal">
            — Staged unscheduled ideas & tasks
          </span>
        </div>

        <span className="text-[11px] text-[var(--text-muted)] flex-shrink-0 hidden sm:inline font-medium">
          {isOpen ? "Collapse tray" : "Expand tray"}
        </span>
      </button>

      {/* Tray Expanded Content */}
      {isOpen && (
        <div
          id="backlog-tray-content"
          data-testid="backlog-tray-content"
          className="p-3 border-t border-[var(--border-subtle)] space-y-2.5"
        >
          {/* Promotion Error Feedback */}
          {promotionError && (
            <div
              role="alert"
              className="bg-[var(--status-canceled-surface)] border border-[var(--status-canceled-border)] text-[var(--status-canceled-text)] rounded-lg px-3 py-2 text-xs flex items-center justify-between"
            >
              <span>{promotionError}</span>
              <button
                type="button"
                onClick={() => setPromotionError(null)}
                className="font-bold hover:opacity-80"
                aria-label="Dismiss promotion error"
              >
                &times;
              </button>
            </div>
          )}

          {tasks.length === 0 ? (
            <div
              data-testid="backlog-empty-state"
              className="flex flex-col items-center justify-center p-6 text-center text-[var(--text-muted)] space-y-1"
            >
              <CheckCircle2 className="h-6 w-6 text-[var(--state-success)] mb-1" />
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                Backlog is empty
              </p>
              <p className="text-[11px]">
                No backlog tasks match current filters. All active tasks are staged on the {viewType}.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {tasks.map((task) => {
                const isPromoting = promotingTaskId === task.id;

                const handleClick = () => onTaskClick(task);
                const handleKeyDown = (e: React.KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onTaskClick(task);
                  }
                };

                return (
                  <div
                    key={task.id}
                    role="button"
                    tabIndex={0}
                    data-testid={`backlog-task-item-${task.taskKey}`}
                    onClick={handleClick}
                    onKeyDown={handleKeyDown}
                    aria-label={`${task.taskKey}: ${task.title}, priority ${task.priority}, status Backlog`}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] hover:border-[var(--brand-accent-btn-bg)] hover:shadow-2xs transition-all cursor-pointer focus-ring"
                  >
                    {/* Left: Key, Archetype & Title */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-xs font-mono text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] flex-shrink-0">
                        {task.taskKey}
                      </span>
                      <TaskArchetypeBadge archetype={task.itemType} size="sm" />
                      <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {task.title}
                      </span>
                    </div>

                    {/* Right: Metadata Badges + Quick Actions + Menu */}
                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                      {/* Priority Badge */}
                      {task.priority !== "NONE" && (
                        <Badge priority={task.priority} size="sm">
                          {formatPriority(task.priority)}
                        </Badge>
                      )}

                      {/* Status Badge */}
                      <Badge status="BACKLOG" size="sm">
                        Backlog
                      </Badge>

                      {/* Quick Action: Promote to To Do */}
                      {(() => {
                        const canPromote =
                          !task.archivedAt &&
                          Boolean(task.effectivePermissions?.canUpdateStatus);
                        return (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(e) => handlePromoteToTodo(e, task)}
                            disabled={!canPromote || isPromoting}
                            aria-disabled={!canPromote || isPromoting}
                            data-testid={`backlog-promote-${task.taskKey}`}
                            aria-label={`Move ${task.taskKey} to To Do`}
                            title={
                              !canPromote
                                ? "You do not have permission to update task status"
                                : "Move task to To Do"
                            }
                            className="gap-1 text-[11px] h-7 px-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isPromoting ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <ArrowRight className="h-3 w-3" />
                            )}
                            <span>{isPromoting ? "Moving..." : "To Do"}</span>
                          </Button>
                        );
                      })()}

                      {/* Task Actions Menu */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <TaskActionsMenu
                          task={task}
                          workspaceId={workspaceId}
                          communityId={communityId}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {totalCount > tasks.length && (
                <div className="pt-1 text-center text-[11px] text-[var(--text-muted)]">
                  Showing {tasks.length} of {totalCount} backlog tasks.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
