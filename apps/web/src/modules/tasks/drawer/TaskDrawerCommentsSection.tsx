import React from "react";
import { TaskActivityTab } from "../comments/TaskActivityTab.js";
import type { TaskDto } from "../types.js";

export interface TaskDrawerCommentsSectionProps {
  task: TaskDto;
  currentCommunityId?: string | null;
  isArchived?: boolean;
  onNavigateToTask: (key: string) => void;
}

export function TaskDrawerCommentsSection({
  task,
  currentCommunityId,
  isArchived = false,
  onNavigateToTask,
}: TaskDrawerCommentsSectionProps): React.JSX.Element {
  return (
    <section
      id="comments"
      data-drawer-section="comments"
      tabIndex={-1}
      aria-label="Activity & Comments"
      className="scroll-mt-16 pt-6 border-t border-[var(--border-subtle)] space-y-4 outline-none"
    >
      <h2 className="sr-only">Activity & Comments</h2>
      <TaskActivityTab
        task={task}
        communityId={currentCommunityId ?? ""}
        workspaceId={task.workspaceId}
        isArchived={isArchived}
        onNavigateToTask={onNavigateToTask}
        showWatchButton={false}
      />
    </section>
  );
}
