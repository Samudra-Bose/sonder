import React from "react";
import { History, Eye, EyeOff, MessageSquare } from "lucide-react";
import { Separator } from "@/components/ui/Separator.js";
import { cn } from "@/lib/utils.js";
import { useAuth } from "@/modules/auth/index.js";
import { TaskWatchButton } from "./TaskWatchButton.js";
import { CommentComposer } from "./CommentComposer.js";
import { CommentList } from "./CommentList.js";
import {
  useTaskActivity,
  useCreateComment,
} from "./useTaskComments.js";
import { useTaskCollaborationRealtime } from "./useTaskCollaborationRealtime.js";
import type { TaskDto } from "../types.js";

export interface TaskActivityTabProps {
  task: TaskDto;
  communityId: string;
  workspaceId: string;
  isArchived?: boolean;
  onNavigateToTask?: (taskKey: string) => void;
  className?: string;
}

/**
 * Task Collaboration & Activity Tab interface:
 * - Watch/Unwatch status bar & action
 * - Threaded Comment composer with @mentions & safe Markdown
 * - Comment stream (chronological, edit, delete, threading)
 * - Task activity audit timeline
 * - Realtime event integration & deduplication
 */
export function TaskActivityTab({
  task,
  communityId,
  workspaceId,
  isArchived = false,
  onNavigateToTask,
  className,
}: TaskActivityTabProps): React.JSX.Element {
  const { user } = useAuth();
  const currentUserId = user?.id ?? "";

  // Query activity & comments
  const {
    data: activityData,
    isLoading,
    error,
    refetch,
  } = useTaskActivity(communityId, workspaceId, task.id);

  const createCommentMutation = useCreateComment();

  // Setup realtime event listeners & deduplication
  useTaskCollaborationRealtime({
    communityId,
    workspaceId,
    taskId: task.id,
  });

  const comments = activityData?.comments ?? [];
  const activityHistory = activityData?.activity ?? [];

  const effectivePermissions = task.effectivePermissions;
  const canComment = Boolean(effectivePermissions?.canComment && !isArchived);
  const canArchive = Boolean(effectivePermissions?.canArchive);
  const canWatch = Boolean(effectivePermissions?.canWatch && !isArchived);

  // Check if current user is watching this task
  const isWatching =
    (task as { isWatched?: boolean }).isWatched === true ||
    (task as { watcherIds?: string[] }).watcherIds?.includes(currentUserId);

  const handleCreateComment = async (
    body: string,
    parentCommentId?: string | null
  ) => {
    await createCommentMutation.mutateAsync({
      communityId,
      workspaceId,
      taskId: task.id,
      data: {
        body,
        parentCommentId,
      },
    });
  };

  return (
    <div
      data-testid="task-activity-tab"
      className={cn("space-y-5 p-4 sm:p-5 flex-1 overflow-y-auto", className)}
    >
      {/* 1. Watcher Status Bar */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/30">
        <div className="flex items-center space-x-2 text-xs">
          {isWatching ? (
            <Eye className="h-4 w-4 text-[var(--brand-accent-text)] shrink-0" />
          ) : (
            <EyeOff className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
          )}
          <span className="text-[var(--text-secondary)]">
            {isWatching
              ? "You are watching this task for comments and updates."
              : "You are not watching this task."}
          </span>
        </div>

        <TaskWatchButton
          communityId={communityId}
          workspaceId={workspaceId}
          taskId={task.id}
          isWatching={isWatching}
          canWatch={canWatch}
          size="sm"
        />
      </div>

      {/* 2. Comment Composer */}
      <div className="space-y-2">
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-[var(--text-primary)]">
          <MessageSquare className="h-3.5 w-3.5 text-[var(--brand-accent-text)]" />
          <span>New Comment</span>
        </div>
        <CommentComposer
          communityId={communityId}
          workspaceId={workspaceId}
          taskId={task.id}
          canComment={canComment}
          onSubmit={handleCreateComment}
        />
      </div>

      <Separator />

      {/* 3. Comment Stream */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <h3 className="font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Discussion ({comments.filter((c) => !c.isDeleted).length})
          </h3>
        </div>

        <CommentList
          comments={comments}
          isLoading={isLoading}
          error={error}
          onRetry={() => refetch()}
          communityId={communityId}
          workspaceId={workspaceId}
          taskId={task.id}
          currentUserId={currentUserId}
          canComment={canComment}
          canArchive={canArchive}
          onTaskKeyClick={onNavigateToTask}
        />
      </div>

      {/* 4. Activity History Timeline (if entries exist) */}
      {activityHistory.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3 pt-1">
            <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <History className="h-3.5 w-3.5" />
              <span>Activity History</span>
            </div>

            <div className="space-y-2 text-xs">
              {activityHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between text-[11px] py-1 border-b border-[var(--border-subtle)]/50 text-[var(--text-muted)]"
                >
                  <span className="truncate max-w-[280px]">
                    <strong className="text-[var(--text-secondary)] font-medium">
                      {entry.actor?.displayName ?? "System"}
                    </strong>{" "}
                    {entry.summary ?? entry.eventType}
                  </span>
                  <span className="shrink-0 select-none">
                    {new Date(entry.occurredAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
