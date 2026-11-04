import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  X,
  Copy,
  Check,
  AlertCircle,
  FileQuestion,
  Sparkles,
  Hash,
  Lock,
} from "lucide-react";
import {
  Dialog,
  DialogBackdrop,
  DialogContent as BaseDialogContent,
} from "@/components/ui/Dialog.js";
import { IconButton } from "@/components/ui/IconButton.js";
import { Button } from "@/components/ui/Button.js";
import { Badge } from "@/components/ui/Badge.js";
import { Skeleton } from "@/components/ui/Skeleton.js";
import { Tooltip } from "@/components/ui/Tooltip.js";
import { Separator } from "@/components/ui/Separator.js";
import { Feedback } from "@/components/ui/Feedback.js";
import { WorkspaceBadge } from "@/modules/workspace/WorkspaceBadge.js";
import { useWorkspace } from "@/modules/workspace/index.js";
import { useKeyboardShortcut } from "@/lib/keyboard.js";
import { cn } from "@/lib/utils.js";
import { getDefaultReferenceDate } from "@/modules/my-work/date-utils.js";
import { ApiProblemError } from "@/lib/api-client.js";
import { useTaskPeekDrawer } from "./useTaskPeekDrawer.js";
import { useResolveTaskKey } from "./useResolveTaskKey.js";
import { useTask } from "./useTask.js";
import type { TaskDto } from "./types.js";
import {
  InlineTitleEditor,
  InlineDescriptionEditor,
  InlineStatusEditor,
  InlinePriorityEditor,
  InlineDateEditor,
  InlineEstimateEditor,
  InlineAssigneeEditor,
  InlineLabelsEditor,
} from "./InlineFieldEditors.js";

export interface TaskPeekDrawerProps {
  /** Optional override to force desktop or mobile presentation in tests */
  forceMode?: "desktop" | "mobile";
  className?: string;
}

/**
 * Responsive media query hook detecting viewport >= 768px.
 * Defaults to true in non-DOM / test environments unless overridden.
 */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return true;
    return window.matchMedia("(min-width: 768px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(min-width: 768px)");
    const listener = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  return isDesktop;
}

/**
 * Task Peek Drawer Component.
 * Responsive, deep-linked, accessible read-only task detail presentation.
 * - Desktop: Non-modal right-docked detail panel beside main content canvas.
 * - Mobile: Modal bottom sheet / full-height drawer with focus trapping.
 * Synchronizes with URL query parameter '?task=KEY-123'.
 */
export function TaskPeekDrawer({
  forceMode,
  className,
}: TaskPeekDrawerProps): React.JSX.Element | null {
  const { isOpen, taskKey, resolvedWorkspaceId, closeTask } = useTaskPeekDrawer();
  const { currentCommunityId, workspaces } = useWorkspace();
  const systemIsDesktop = useIsDesktop();
  const isDesktop = forceMode ? forceMode === "desktop" : systemIsDesktop;

  const [hasCopied, setHasCopied] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Reference date for relative due date calculation
  const referenceDate = useMemo(() => getDefaultReferenceDate(), []);

  // Save the currently active element when opening to restore focus on dismissal
  useEffect(() => {
    if (isOpen) {
      if (!triggerRef.current && document.activeElement instanceof HTMLElement) {
        triggerRef.current = document.activeElement;
      }
    } else {
      if (triggerRef.current && typeof triggerRef.current.focus === "function") {
        triggerRef.current.focus();
        triggerRef.current = null;
      }
    }
  }, [isOpen]);

  // Focus title or close button when task details successfully open or change
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (titleRef.current) {
          titleRef.current.focus();
        } else if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, taskKey]);

  // Keyboard shortcut: Escape to close drawer
  useKeyboardShortcut(
    {
      key: "Escape",
      enabled: isOpen,
      preventDefault: true,
    },
    () => {
      closeTask();
    }
  );

  // 1. Resolve task key (direct key or historical alias)
  const resolveQuery = useResolveTaskKey({
    communityId: currentCommunityId,
    workspaceId: resolvedWorkspaceId,
    taskKey,
    enabled: isOpen && Boolean(currentCommunityId && resolvedWorkspaceId && taskKey),
  });

  // 2. Fetch full Task DTO once key is resolved
  const effectiveTaskId = resolveQuery.data?.taskId;
  const effectiveWorkspaceId = resolveQuery.data?.workspaceId ?? resolvedWorkspaceId;

  const taskQuery = useTask({
    communityId: currentCommunityId,
    workspaceId: effectiveWorkspaceId,
    taskId: effectiveTaskId,
    enabled: isOpen && Boolean(currentCommunityId && effectiveWorkspaceId && effectiveTaskId),
  });

  const task: TaskDto | undefined = taskQuery.data;
  const isLoading =
    resolveQuery.isLoading ||
    (resolveQuery.isSuccess && taskQuery.isLoading) ||
    (!resolveQuery.data && !resolveQuery.isError && isOpen);

  const error = resolveQuery.error || taskQuery.error;
  const isNotFound =
    (resolveQuery.error instanceof ApiProblemError && resolveQuery.error.status === 404) ||
    (taskQuery.error instanceof ApiProblemError && taskQuery.error.status === 404);

  // Locate associated workspace DTO for context display
  const targetWorkspace = useMemo(() => {
    const wsId = task?.workspaceId ?? effectiveWorkspaceId;
    return workspaces.find((w) => w.id === wsId);
  }, [workspaces, task?.workspaceId, effectiveWorkspaceId]);

  const handleCopyLink = async () => {
    if (!taskKey) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("task", taskKey);
      await navigator.clipboard.writeText(url.toString());
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch {
      // Best-effort clipboard copy fallback
    }
  };

  if (!isOpen) {
    return null;
  }

  // Common Header Content
  const renderHeader = () => (
    <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] bg-[var(--surface-card)] flex-shrink-0">
      <div className="flex items-center space-x-2 min-w-0">
        {!isNotFound && !error && targetWorkspace && (
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <WorkspaceBadge
              prefix={targetWorkspace.keyPrefix}
              size="sm"
              className={cn(targetWorkspace.kind === "PERSONAL" && "border-dashed")}
            />
            {targetWorkspace.kind === "PERSONAL" && (
              <Lock className="h-3 w-3 text-[var(--text-muted)]" aria-label="Personal Workspace" />
            )}
            <span className="text-xs font-medium text-[var(--text-muted)] truncate max-w-[140px]">
              {targetWorkspace.name}
            </span>
          </div>
        )}

        <span className="font-mono text-xs font-bold text-[var(--brand-accent-text)] px-1.5 py-0.5 rounded bg-[var(--brand-accent-subtle)] border border-[var(--brand-accent-border)] flex-shrink-0">
          {taskKey}
        </span>

        {/* Copy Link Action */}
        <Tooltip content={hasCopied ? "Link copied!" : "Copy task link"}>
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Copy task link"
            icon={
              hasCopied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )
            }
            onClick={handleCopyLink}
            className="h-7 w-7 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          />
        </Tooltip>
      </div>

      <IconButton
        ref={closeButtonRef}
        size="sm"
        variant="ghost"
        aria-label="Close task details"
        icon={<X className="h-4 w-4" />}
        onClick={() => closeTask()}
        className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      />
    </div>
  );

  // Common Body Content
  const renderBody = () => {
    if (isLoading) {
      return (
        <div
          role="status"
          aria-busy="true"
          aria-label="Loading task details"
          className="p-6 space-y-6 flex-1 overflow-y-auto"
        >
          <span className="sr-only">Loading task details...</span>
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/40">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      );
    }

    if (error || isNotFound) {
      if (isNotFound) {
        return (
          <div
            data-testid="task-not-found-state"
            role="alert"
            className="p-8 text-center flex flex-col items-center justify-center space-y-3 flex-1 overflow-y-auto select-none"
          >
            <div className="h-12 w-12 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] flex items-center justify-center border border-[var(--border-subtle)]">
              <FileQuestion className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Task Not Found</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm">
              The requested task <strong className="font-mono text-[var(--text-primary)]">{taskKey}</strong> could not be found or is not accessible.
            </p>
            <Button variant="outline" size="sm" onClick={() => closeTask()} className="mt-2 min-h-[44px] sm:min-h-[32px]">
              Close Details
            </Button>
          </div>
        );
      }

      return (
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          <Feedback variant="danger">
            <div className="space-y-2">
              <p className="font-semibold text-sm">Failed to load task details</p>
              <p className="text-xs">
                {error instanceof ApiProblemError ? error.detail || error.message : (error as Error).message}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resolveQuery.refetch();
                  taskQuery.refetch();
                }}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          </Feedback>
        </div>
      );
    }

    if (!task) {
      return null;
    }

    const isArchived = resolveQuery.data?.lifecycleState === "ARCHIVED" || Boolean(task.archivedAt);
    const wasRedirected = resolveQuery.data?.resolvedFromAlias === true;

    return (
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
        {/* Informative Banners */}
        {wasRedirected && (
          <div
            role="status"
            className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>
              Redirected from historical key <strong className="font-mono font-semibold">{resolveQuery.data?.requestedKey}</strong>
            </span>
          </div>
        )}

        {isArchived && (
          <div
            role="status"
            className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>This task is archived. Active triage and editing are disabled.</span>
          </div>
        )}

        {/* Task Title & Primary Identity */}
        <div className="space-y-2">
          <InlineTitleEditor
            task={task}
            communityId={currentCommunityId}
            workspaceId={task.workspaceId}
            isArchived={isArchived}
            titleRef={titleRef}
          />

          {/* Status & Priority Badge Strip */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <InlineStatusEditor
              task={task}
              communityId={currentCommunityId}
              workspaceId={task.workspaceId}
              isArchived={isArchived}
            />

            <InlinePriorityEditor
              task={task}
              communityId={currentCommunityId}
              workspaceId={task.workspaceId}
              isArchived={isArchived}
            />

            <Badge variant="outline" size="sm" className="text-[10px] font-mono uppercase">
              {task.itemType}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Structured Task Properties Grid */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/30 p-4 space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Task Attributes
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {/* Assignees */}
            <InlineAssigneeEditor
              task={task}
              communityId={currentCommunityId}
              workspaceId={task.workspaceId}
              isArchived={isArchived}
            />

            {/* Due Date */}
            <InlineDateEditor
              task={task}
              field="dueDate"
              label="Due Date"
              communityId={currentCommunityId}
              workspaceId={task.workspaceId}
              referenceDate={referenceDate}
              isArchived={isArchived}
            />

            {/* Start Date */}
            <InlineDateEditor
              task={task}
              field="startDate"
              label="Start Date"
              communityId={currentCommunityId}
              workspaceId={task.workspaceId}
              referenceDate={referenceDate}
              isArchived={isArchived}
            />

            {/* Estimate Points */}
            <InlineEstimateEditor
              task={task}
              communityId={currentCommunityId}
              workspaceId={task.workspaceId}
              isArchived={isArchived}
            />

            {/* Parent Task / Hierarchy Indicator */}
            {task.parentTaskId && (
              <div className="col-span-1 sm:col-span-2 space-y-1 pt-1 border-t border-[var(--border-subtle)]">
                <span className="text-[11px] font-medium text-[var(--text-muted)] flex items-center gap-1">
                  <Hash className="h-3 w-3" /> Hierarchy
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-secondary)]">Subtask</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--text-muted)]">
                    Parent: {task.parentTaskId}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Labels Section */}
        <InlineLabelsEditor
          task={task}
          communityId={currentCommunityId}
          workspaceId={task.workspaceId}
          isArchived={isArchived}
        />

        {/* Description Section */}
        <InlineDescriptionEditor
          task={task}
          communityId={currentCommunityId}
          workspaceId={task.workspaceId}
          isArchived={isArchived}
        />

        {/* Audit & Provenance Footer */}
        <div className="pt-4 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] flex flex-wrap justify-between gap-2">
          <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
          <span>Updated: {new Date(task.updatedAt).toLocaleDateString()}</span>
          <span className="font-mono">Version {task.version}</span>
        </div>
      </div>
    );
  };

  // --- 1. Desktop Mode (Non-modal right-docked panel beside canvas) ---
  if (isDesktop) {
    return (
      <aside
        role="region"
        aria-label={`Task details: ${taskKey}`}
        data-testid="task-peek-drawer-desktop"
        className={cn(
          "w-[480px] lg:w-[540px] flex-shrink-0 h-full flex flex-col",
          "bg-[var(--surface-card)] border-l border-[var(--border-subtle)] shadow-xl z-20",
          "motion-reduce:transition-none transition-all duration-200",
          className
        )}
      >
        {renderHeader()}
        {renderBody()}
      </aside>
    );
  }

  // --- 2. Mobile Mode (Modal bottom sheet / full-height drawer) ---
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeTask()}>
      <DialogBackdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-150" />
      <BaseDialogContent
        data-testid="task-peek-drawer-mobile"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-peek-drawer-title"
        className={cn(
          "fixed bottom-0 left-0 right-0 max-h-[90vh] h-[85vh] z-50",
          "rounded-t-2xl border-t border-[var(--border-strong)] bg-[var(--surface-modal)] text-[var(--text-primary)] shadow-2xl",
          "flex flex-col focus:outline-none transition-transform duration-200 motion-reduce:transition-none",
          className
        )}
      >
        {/* Swipe drag handle */}
        <div className="w-12 h-1.5 rounded-full bg-[var(--border-strong)] mx-auto my-2 shrink-0 select-none" />
        {renderHeader()}
        {renderBody()}
      </BaseDialogContent>
    </Dialog>
  );
}
