import React from "react";
import { TaskDependencies } from "../TaskDependencies.js";
import { TaskCustomFieldsSection } from "../TaskCustomFieldsSection.js";
import type { TaskDto } from "../types.js";

export interface TaskDrawerFieldsSectionProps {
  task: TaskDto;
  currentCommunityId: string | null;
  allWorkspaceTasks: TaskDto[];
  isArchived?: boolean;
  onNavigateToTask: (key: string) => void;
}

export function TaskDrawerFieldsSection({
  task,
  currentCommunityId,
  allWorkspaceTasks,
  isArchived = false,
  onNavigateToTask,
}: TaskDrawerFieldsSectionProps): React.JSX.Element {
  return (
    <section
      id="fields"
      data-drawer-section="fields"
      tabIndex={-1}
      aria-label="Fields & Relationships"
      className="scroll-mt-14 pt-6 border-t border-[var(--border-subtle)] space-y-6 outline-none"
    >
      <h2 className="sr-only">Fields & Relationships</h2>
      {/* Dependencies & Relationships Section */}
      <TaskDependencies
        task={task}
        allTasks={allWorkspaceTasks}
        communityId={currentCommunityId}
        workspaceId={task.workspaceId}
        isArchived={isArchived}
        onNavigateToTask={onNavigateToTask}
      />

      {/* Custom Fields Section (FEAT-D04a) */}
      <TaskCustomFieldsSection
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
    </section>
  );
}
