import React, { useState } from "react";
import {
  Edit2,
  Trash2,
  User,
  CornerDownRight,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { IconButton } from "@/components/ui/IconButton.js";
import { Button } from "@/components/ui/Button.js";
import { Tooltip } from "@/components/ui/Tooltip.js";
import { cn } from "@/lib/utils.js";
import { CommentAstRenderer } from "./markdown-ast.js";
import { CommentComposer } from "./CommentComposer.js";
import { useUpdateComment, useDeleteComment, useCreateComment } from "./useTaskComments.js";
import type { CommentDto } from "./types.js";

export interface CommentItemProps {
  comment: CommentDto;
  allComments: CommentDto[];
  communityId: string;
  workspaceId: string;
  taskId: string;
  currentUserId: string;
  canComment?: boolean;
  canArchive?: boolean;
  depth?: number;
  onTaskKeyClick?: (taskKey: string) => void;
  className?: string;
}

/**
 * Single comment item in the activity stream:
 * - Author avatar and display name (or generic "Former member" tag)
 * - Safe Markdown AST content
 * - Edited and deleted states
 * - Inline edit mode with optimistic concurrency version check
 * - Soft deletion with confirmation
 * - Threaded replies (capped to depth 5)
 */
export function CommentItem({
  comment,
  allComments,
  communityId,
  workspaceId,
  taskId,
  currentUserId,
  canComment = true,
  canArchive = false,
  depth = 1,
  onTaskKeyClick,
  className,
}: CommentItemProps): React.JSX.Element {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const updateMutation = useUpdateComment();
  const deleteMutation = useDeleteComment();
  const createMutation = useCreateComment();

  const isAuthor = comment.authorId === currentUserId;
  const canEdit = isAuthor && canComment && !comment.isDeleted;
  const canDelete = (isAuthor || canArchive) && !comment.isDeleted;

  // Locate direct child replies
  const childReplies = allComments.filter(
    (c) => c.parentCommentId === comment.id
  );

  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return isoString;
    }
  };

  const handleEditSubmit = async (body: string) => {
    await updateMutation.mutateAsync({
      communityId,
      workspaceId,
      taskId,
      commentId: comment.id,
      data: {
        body,
        version: comment.version,
      },
    });
    setIsEditing(false);
  };

  const handleReplySubmit = async (body: string) => {
    await createMutation.mutateAsync({
      communityId,
      workspaceId,
      taskId,
      data: {
        body,
        parentCommentId: comment.id,
      },
    });
    setIsReplying(false);
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({
        communityId,
        workspaceId,
        taskId,
        commentId: comment.id,
      });
      setIsConfirmingDelete(false);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div
      data-testid={`comment-item-${comment.id}`}
      className={cn(
        "group relative flex flex-col space-y-2 py-2.5 transition-colors",
        depth > 1 && "pl-4 sm:pl-6 border-l-2 border-[var(--border-subtle)] ml-2 sm:ml-3 mt-2",
        className
      )}
    >
      {/* Header: Author Info & Timestamp */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 min-w-0">
          {/* Avatar */}
          <div className="h-6 w-6 rounded-full bg-[var(--surface-muted)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
            {comment.author.avatarUrl ? (
              <img
                src={comment.author.avatarUrl}
                alt={comment.author.displayName}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <User className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            )}
          </div>

          {/* Author Name */}
          <span
            className={cn(
              "font-medium truncate",
              comment.author.isFormerMember
                ? "text-[var(--text-muted)] italic"
                : "text-[var(--text-primary)]"
            )}
          >
            {comment.author.displayName}
          </span>

          {comment.author.isFormerMember && (
            <span className="text-[10px] px-1 py-0.2 rounded bg-[var(--surface-muted)] text-[var(--text-muted)] select-none">
              Former member
            </span>
          )}

          {/* Timestamp */}
          <span
            title={new Date(comment.createdAt).toLocaleString()}
            className="text-[11px] text-[var(--text-muted)] select-none"
          >
            {formatDate(comment.createdAt)}
          </span>

          {/* Edited indicator */}
          {comment.editedAt && !comment.isDeleted && (
            <Tooltip content={`Edited on ${new Date(comment.editedAt).toLocaleString()}`}>
              <span className="text-[10px] text-[var(--text-muted)] italic select-none">
                (edited)
              </span>
            </Tooltip>
          )}
        </div>

        {/* Comment Action Buttons (shown on hover/focus) */}
        {!comment.isDeleted && !isEditing && (
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            {canComment && depth < 5 && (
              <Tooltip content="Reply">
                <IconButton
                  size="sm"
                  variant="ghost"
                  aria-label="Reply to comment"
                  icon={<CornerDownRight className="h-3 w-3" />}
                  onClick={() => setIsReplying((prev) => !prev)}
                  className="h-6 w-6 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                />
              </Tooltip>
            )}

            {canEdit && (
              <Tooltip content="Edit comment">
                <IconButton
                  size="sm"
                  variant="ghost"
                  aria-label="Edit comment"
                  icon={<Edit2 className="h-3 w-3" />}
                  onClick={() => setIsEditing(true)}
                  className="h-6 w-6 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                />
              </Tooltip>
            )}

            {canDelete && (
              <Tooltip content="Delete comment">
                <IconButton
                  size="sm"
                  variant="ghost"
                  aria-label="Delete comment"
                  icon={<Trash2 className="h-3 w-3 text-rose-500" />}
                  onClick={() => setIsConfirmingDelete(true)}
                  className="h-6 w-6 text-[var(--text-muted)] hover:text-rose-500"
                />
              </Tooltip>
            )}
          </div>
        )}
      </div>

      {/* Comment Body / Deletion State / Inline Edit */}
      {comment.isDeleted ? (
        <div
          role="status"
          className="text-xs italic text-[var(--text-muted)] p-2 rounded bg-[var(--surface-muted)]/40 border border-[var(--border-subtle)] select-none"
        >
          This comment was deleted.
        </div>
      ) : isEditing ? (
        <div className="pt-1">
          <CommentComposer
            communityId={communityId}
            workspaceId={workspaceId}
            taskId={taskId}
            initialValue={comment.body ?? ""}
            onCancel={() => setIsEditing(false)}
            onSubmit={handleEditSubmit}
            submitLabel="Save Changes"
            autoFocus
          />
        </div>
      ) : (
        <div className="text-xs sm:text-sm pl-8">
          <CommentAstRenderer
            ast={comment.bodyAst}
            onTaskKeyClick={onTaskKeyClick}
          />
        </div>
      )}

      {/* Delete Confirmation Alert */}
      {isConfirmingDelete && (
        <div
          role="alert"
          className="ml-8 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 space-y-2 text-xs"
        >
          <div className="flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4" />
            <span>Delete this comment?</span>
          </div>
          <p className="text-[var(--text-muted)]">
            The comment content and mentions will be redacted. A deletion activity entry will remain.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => setIsConfirmingDelete(false)}
              className="text-xs h-6 px-2"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
              data-testid="confirm-delete-comment-btn"
              className="text-xs h-6 px-2 gap-1"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              <span>Delete</span>
            </Button>
          </div>
        </div>
      )}

      {/* Inline Threaded Reply Composer */}
      {isReplying && (
        <div className="pl-6 pt-2">
          <CommentComposer
            communityId={communityId}
            workspaceId={workspaceId}
            taskId={taskId}
            parentCommentId={comment.id}
            onCancel={() => setIsReplying(false)}
            onSubmit={handleReplySubmit}
            placeholder={`Reply to ${comment.author.displayName}...`}
            submitLabel="Reply"
            autoFocus
          />
        </div>
      )}

      {/* Threaded Child Replies */}
      {childReplies.length > 0 && (
        <div className="space-y-1">
          {childReplies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              allComments={allComments}
              communityId={communityId}
              workspaceId={workspaceId}
              taskId={taskId}
              currentUserId={currentUserId}
              canComment={canComment}
              canArchive={canArchive}
              depth={depth + 1}
              onTaskKeyClick={onTaskKeyClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
