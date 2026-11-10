import React from "react";
import { MessageSquare, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton.js";
import { Button } from "@/components/ui/Button.js";
import { Feedback } from "@/components/ui/Feedback.js";
import { CommentItem } from "./CommentItem.js";
import type { CommentDto } from "./types.js";

export interface CommentListProps {
  comments: CommentDto[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  communityId: string;
  workspaceId: string;
  taskId: string;
  currentUserId: string;
  canComment?: boolean;
  canArchive?: boolean;
  onTaskKeyClick?: (taskKey: string) => void;
  className?: string;
}

/**
 * Renders the list of task comments:
 * - Geometry-matched loading skeleton
 * - Empty state with friendly CTA
 * - Error state with retry action
 * - Chronological thread stream
 */
export function CommentList({
  comments,
  isLoading = false,
  error = null,
  onRetry,
  communityId,
  workspaceId,
  taskId,
  currentUserId,
  canComment = true,
  canArchive = false,
  onTaskKeyClick,
  className,
}: CommentListProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading comments"
        data-testid="comments-loading-skeleton"
        className="space-y-4 py-2"
      >
        <span className="sr-only">Loading comments...</span>
        {[1, 2].map((i) => (
          <div key={i} className="flex space-x-3 items-start">
            <Skeleton className="h-7 w-7 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="flex gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Feedback variant="danger" className="my-2">
        <div className="space-y-2">
          <p className="font-semibold text-xs sm:text-sm">Failed to load comments</p>
          <p className="text-xs text-[var(--text-muted)]">{error.message}</p>
          {onRetry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-1 h-7 text-xs gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry</span>
            </Button>
          )}
        </div>
      </Feedback>
    );
  }

  // Filter root comments (comments without parent)
  const rootComments = comments.filter((c) => !c.parentCommentId);

  if (rootComments.length === 0) {
    return (
      <div
        data-testid="comments-empty-state"
        className="py-8 px-4 text-center flex flex-col items-center justify-center space-y-2.5 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-muted)]/20 select-none"
      >
        <div className="h-10 w-10 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] flex items-center justify-center border border-[var(--border-subtle)]">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
            No comments yet
          </h4>
          <p className="text-[11px] sm:text-xs text-[var(--text-muted)] max-w-xs">
            Start the discussion using Markdown formatting, @member mentions, and #KEY links.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="feed"
      aria-label="Task comments"
      data-testid="comment-list"
      className={className}
    >
      <div className="divide-y divide-[var(--border-subtle)]">
        {rootComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            allComments={comments}
            communityId={communityId}
            workspaceId={workspaceId}
            taskId={taskId}
            currentUserId={currentUserId}
            canComment={canComment}
            canArchive={canArchive}
            depth={1}
            onTaskKeyClick={onTaskKeyClick}
          />
        ))}
      </div>
    </div>
  );
}
