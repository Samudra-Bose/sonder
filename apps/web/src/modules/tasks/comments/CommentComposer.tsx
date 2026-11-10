import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bold,
  Italic,
  Code,
  List,
  AtSign,
  Hash,
  Loader2,
  AlertCircle,
  X,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/Button.js";
import { IconButton } from "@/components/ui/IconButton.js";
import { Tooltip } from "@/components/ui/Tooltip.js";
import { cn } from "@/lib/utils.js";
import { useMentionCandidates } from "./useTaskComments.js";
import type { MentionCandidateDto } from "./types.js";

export interface CommentComposerProps {
  communityId: string;
  workspaceId: string;
  taskId: string;
  canComment?: boolean;
  parentCommentId?: string | null;
  initialValue?: string;
  onCancel?: () => void;
  onSubmit: (body: string, parentCommentId?: string | null) => Promise<void>;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Accessible Markdown comment composer with:
 * - @mention member autocomplete popover
 * - Keyboard navigation (ArrowUp, ArrowDown, Enter, Esc)
 * - Safe formatting shortcuts
 * - Cmd+Enter / Ctrl+Enter submission
 * - Character counter up to 20,000 characters
 * - Permission-locked state
 */
export function CommentComposer({
  communityId,
  workspaceId,
  taskId,
  canComment = true,
  parentCommentId = null,
  initialValue = "",
  onCancel,
  onSubmit,
  placeholder = "Write a comment... (use @name to mention, #KEY to link, Markdown supported)",
  submitLabel = "Comment",
  autoFocus = false,
  className,
}: CommentComposerProps): React.JSX.Element {
  const [value, setValue] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionCursorIndex, setMentionCursorIndex] = useState<number>(-1);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number>(0);
  const [isMentionOpen, setIsMentionOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mentionListRef = useRef<HTMLUListElement | null>(null);

  // Query mention candidates
  const candidatesQuery = useMentionCandidates(
    communityId,
    workspaceId,
    taskId,
    mentionQuery,
    isMentionOpen
  );
  const candidates: MentionCandidateDto[] = candidatesQuery.data?.items ?? [];

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Reset selected index when candidate list changes
  useEffect(() => {
    setSelectedCandidateIndex(0);
  }, [candidates.length]);

  /**
   * Detects if the cursor is currently in an active @mention sequence.
   */
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setValue(text);
    setErrorMessage(null);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\s]{0,30})$/);

    if (lastAtMatch) {
      const query = lastAtMatch[1];
      setMentionQuery(query ?? null);
      setMentionCursorIndex(lastAtMatch.index ?? -1);
      setIsMentionOpen(true);
    } else {
      setIsMentionOpen(false);
      setMentionQuery(null);
    }
  };

  /**
   * Inserts the selected candidate token into the textarea: @[DisplayName](user:uuid)
   */
  const handleSelectCandidate = useCallback(
    (candidate: MentionCandidateDto) => {
      if (!textareaRef.current || mentionCursorIndex === -1) return;

      const before = value.slice(0, mentionCursorIndex);
      const after = value.slice(textareaRef.current.selectionStart);
      const token = `@[${candidate.displayName}](user:${candidate.userId}) `;
      const newValue = `${before}${token}${after}`;

      setValue(newValue);
      setIsMentionOpen(false);
      setMentionQuery(null);

      // Restore focus and position cursor right after the inserted mention
      const nextPos = before.length + token.length;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(nextPos, nextPos);
        }
      }, 0);
    },
    [value, mentionCursorIndex]
  );

  /**
   * Helper to insert markdown formatting around selected text
   */
  const insertFormatting = (prefix: string, suffix = prefix, placeholderText = "text") => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const replacement = selected ? `${prefix}${selected}${suffix}` : `${prefix}${placeholderText}${suffix}`;
    const nextValue = value.slice(0, start) + replacement + value.slice(end);

    setValue(nextValue);
    setTimeout(() => {
      textarea.focus();
      const cursorTarget = selected
        ? start + replacement.length
        : start + prefix.length;
      textarea.setSelectionRange(cursorTarget, cursorTarget + (selected ? 0 : placeholderText.length));
    }, 0);
  };

  const handleSubmit = async () => {
    if (!value.trim() || isSubmitting || !canComment) return;

    if (value.length > 20000) {
      setErrorMessage("Comment exceeds the maximum length of 20,000 characters.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit(value, parentCommentId);
      setValue("");
      setIsMentionOpen(false);
      if (onCancel) onCancel();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to post comment. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Keyboard shortcuts in textarea:
   * - Cmd+Enter or Ctrl+Enter submits
   * - ArrowDown / ArrowUp / Enter / Esc navigate mention autocomplete
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isMentionOpen && candidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedCandidateIndex((prev) => (prev + 1) % candidates.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedCandidateIndex((prev) =>
          prev === 0 ? candidates.length - 1 : prev - 1
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const candidate = candidates[selectedCandidateIndex];
        if (candidate) {
          handleSelectCandidate(candidate);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setIsMentionOpen(false);
        return;
      }
    }

    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!canComment) {
    return (
      <div
        role="status"
        className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)]/30 text-xs text-[var(--text-muted)] flex items-center gap-2 select-none"
      >
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>You do not have permission to comment on this task.</span>
      </div>
    );
  }

  const charCount = value.length;
  const isOverLimit = charCount > 20000;

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] focus-within:border-[var(--brand-accent)] focus-within:ring-1 focus-within:ring-[var(--brand-accent)] transition-all flex flex-col relative",
        className
      )}
    >
      {/* Mention Autocomplete Popover */}
      {isMentionOpen && candidates.length > 0 && (
        <div
          role="listbox"
          aria-label="Mention candidates"
          data-testid="mention-autocomplete-popover"
          className="absolute bottom-full left-0 mb-1 w-64 max-h-48 overflow-y-auto rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)] shadow-xl z-50 p-1"
        >
          <div className="px-2 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Workspace Members
          </div>
          <ul ref={mentionListRef} className="space-y-0.5">
            {candidates.map((candidate, idx) => {
              const isSelected = idx === selectedCandidateIndex;
              return (
                <li
                  key={candidate.userId}
                  role="option"
                  data-testid={`mention-candidate-${candidate.userId}`}
                  aria-selected={isSelected}
                  onClick={() => handleSelectCandidate(candidate)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer select-none transition-colors",
                    isSelected
                      ? "bg-[var(--brand-accent-subtle)] text-[var(--brand-accent-text)] font-semibold"
                      : "text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
                  )}
                >
                  <div className="h-5 w-5 rounded-full bg-[var(--surface-muted)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                    <User className="h-3 w-3 text-[var(--text-muted)]" />
                  </div>
                  <span className="truncate">{candidate.displayName}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Formatting Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--surface-muted)]/20 select-none">
        <div className="flex items-center space-x-1">
          <Tooltip content="Bold (**text**)">
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Format bold"
              icon={<Bold className="h-3.5 w-3.5" />}
              onClick={() => insertFormatting("**")}
              className="h-6 w-6 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            />
          </Tooltip>

          <Tooltip content="Italic (*text*)">
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Format italic"
              icon={<Italic className="h-3.5 w-3.5" />}
              onClick={() => insertFormatting("*")}
              className="h-6 w-6 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            />
          </Tooltip>

          <Tooltip content="Inline Code (`code`)">
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Format code"
              icon={<Code className="h-3.5 w-3.5" />}
              onClick={() => insertFormatting("`")}
              className="h-6 w-6 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            />
          </Tooltip>

          <Tooltip content="Bulleted List (- item)">
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Format list"
              icon={<List className="h-3.5 w-3.5" />}
              onClick={() => insertFormatting("- ", "", "item")}
              className="h-6 w-6 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            />
          </Tooltip>

          <div className="h-3.5 w-[1px] bg-[var(--border-subtle)] mx-1" />

          <Tooltip content="Mention a teammate (@)">
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Insert mention"
              icon={<AtSign className="h-3.5 w-3.5" />}
              onClick={() => insertFormatting("@", "", "name")}
              className="h-6 w-6 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            />
          </Tooltip>

          <Tooltip content="Link a task (#KEY)">
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Insert task key"
              icon={<Hash className="h-3.5 w-3.5" />}
              onClick={() => insertFormatting("#", "", "KEY-1")}
              className="h-6 w-6 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            />
          </Tooltip>
        </div>

        {/* Character Counter */}
        <span
          className={cn(
            "text-[10px] font-mono",
            isOverLimit ? "text-rose-500 font-bold" : "text-[var(--text-muted)]"
          )}
        >
          {charCount > 0 && `${charCount.toLocaleString()}/20,000`}
        </span>
      </div>

      {/* Input Area */}
      <div className="p-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Comment message"
          data-testid="comment-composer-input"
          rows={3}
          className="w-full resize-y text-xs sm:text-sm bg-transparent border-0 focus:outline-none placeholder:text-[var(--text-muted)] text-[var(--text-primary)] leading-relaxed"
        />
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div
          role="alert"
          className="mx-3 mb-2 p-2 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between"
        >
          <span>{errorMessage}</span>
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Dismiss error"
            icon={<X className="h-3.5 w-3.5" />}
            onClick={() => setErrorMessage(null)}
            className="h-5 w-5 text-rose-500"
          />
        </div>
      )}

      {/* Composer Action Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--surface-muted)]/10 border-t border-[var(--border-subtle)] rounded-b-xl">
        <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline select-none">
          Markdown & mentions supported. Press <strong>Cmd+Enter</strong> to send.
        </span>

        <div className="flex items-center space-x-2 ml-auto">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
              className="text-xs h-7 px-2"
            >
              Cancel
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!value.trim() || isSubmitting || isOverLimit}
            onClick={handleSubmit}
            data-testid="comment-submit-button"
            className="text-xs h-7 gap-1 px-3"
          >
            {isSubmitting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            <span>{submitLabel}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
