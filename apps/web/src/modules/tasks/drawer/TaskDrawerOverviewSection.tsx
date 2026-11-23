import React from "react";
import { Sparkles, AlertCircle, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/Button.js";
import { Separator } from "@/components/ui/Separator.js";
import {
  InlineTitleEditor,
  InlineDescriptionEditor,
  InlineStatusEditor,
  InlinePriorityEditor,
  InlineArchetypeEditor,
  InlineDateEditor,
  InlineEstimateEditor,
  InlineAssigneeEditor,
  InlineLabelsEditor,
} from "../InlineFieldEditors.js";
import { TaskExternalLinksSection } from "../TaskExternalLinksSection.js";
import type { TaskDto } from "../types.js";
import type { WorkspaceDto } from "@/modules/workspace/types.js";

export interface TaskDrawerOverviewSectionProps {
  task: TaskDto;
  currentCommunityId: string | null;
  targetWorkspace?: WorkspaceDto | null;
  isArchived?: boolean;
  wasRedirected?: boolean;
  requestedKey?: string;
  referenceDate: string;
  titleRef?: React.RefObject<HTMLHeadingElement | null>;
  onOpenReparentModal?: () => void;
}

export function TaskDrawerOverviewSection({
  task,
  currentCommunityId,
  isArchived = false,
  wasRedirected = false,
  requestedKey,
  referenceDate,
  titleRef,
  onOpenReparentModal,
}: TaskDrawerOverviewSectionProps): React.JSX.Element {
  return (
    <section
      id="overview"
      data-drawer-section="overview"
      tabIndex={-1}
      aria-label="Overview"
      className="scroll-mt-14 space-y-6 outline-none"
    >
      <h2 className="sr-only">Overview</h2>
      {/* Informative Banners */}
      {wasRedirected && (
        <div
          role="status"
          className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>
            Redirected from historical key <strong className="font-mono font-semibold">{requestedKey}</strong>
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

          <InlineArchetypeEditor
            task={task}
            communityId={currentCommunityId}
            workspaceId={task.workspaceId}
            isArchived={isArchived}
          />
        </div>
      </div>

      <Separator />

      {/* Task Attributes Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Task Attributes
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/40 text-xs">
          <InlineAssigneeEditor
            task={task}
            communityId={currentCommunityId}
            workspaceId={task.workspaceId}
            isArchived={isArchived}
          />

          <InlineDateEditor
            task={task}
            field="dueDate"
            label="Due Date"
            communityId={currentCommunityId}
            workspaceId={task.workspaceId}
            isArchived={isArchived}
            referenceDate={referenceDate}
          />

          <InlineDateEditor
            task={task}
            field="startDate"
            label="Start Date"
            communityId={currentCommunityId}
            workspaceId={task.workspaceId}
            isArchived={isArchived}
            referenceDate={referenceDate}
          />

          <InlineEstimateEditor
            task={task}
            communityId={currentCommunityId}
            workspaceId={task.workspaceId}
            isArchived={isArchived}
          />

          {/* Hierarchy information */}
          <div className="flex items-center justify-between col-span-1 sm:col-span-2 pt-1 border-t border-[var(--border-subtle)]/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)] font-medium">Hierarchy</span>
              {Boolean(task.effectivePermissions?.canMove && !isArchived) && onOpenReparentModal && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onOpenReparentModal}
                  data-testid="reparent-current-task-btn"
                  className="h-5 px-1.5 text-[10px] gap-1 text-[var(--brand-accent-text)] hover:underline cursor-pointer"
                >
                  <ArrowRightLeft className="h-2.5 w-2.5" />
                  <span>Reparent</span>
                </Button>
              )}
            </div>
            <span className="font-medium text-[var(--text-primary)]">
              {task.parentTaskId ? "Subtask" : "Root Task"}
            </span>
          </div>
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

      {/* External Links Section */}
      <TaskExternalLinksSection
        task={task}
        communityId={currentCommunityId}
        workspaceId={task.workspaceId}
        isArchived={isArchived}
      />
    </section>
  );
}
