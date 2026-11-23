import React from "react";
import { SubtaskList } from "../SubtaskList.js";
import { ReparentTaskModal } from "../ReparentTaskModal.js";
import type { TaskDto } from "../types.js";

export interface TaskDrawerSubtasksSectionProps {
  task: TaskDto;
  currentCommunityId: string | null;
  allWorkspaceTasks: TaskDto[];
  maxSubtaskDepth?: number;
  isArchived?: boolean;
  isReparentOpen?: boolean;
  onCloseReparentModal?: () => void;
}

export function TaskDrawerSubtasksSection({
  task,
  currentCommunityId,
  allWorkspaceTasks,
  maxSubtaskDepth = 1,
  isArchived = false,
  isReparentOpen = false,
  onCloseReparentModal,
}: TaskDrawerSubtasksSectionProps): React.JSX.Element {
  return (
    <section
      id="subtasks"
      data-drawer-section="subtasks"
      tabIndex={-1}
      aria-label="Subtasks"
      className="scroll-mt-14 pt-6 border-t border-[var(--border-subtle)] space-y-4 outline-none"
    >
      <h2 className="sr-only">Subtasks</h2>
      {/* Subtasks Section */}
      <SubtaskList
        task={task}
        communityId={currentCommunityId}
        workspaceId={task.workspaceId}
        isArchived={isArchived}
      />

      {/* Reparent Task Modal for Current Task */}
      {isReparentOpen && onCloseReparentModal && (
        <ReparentTaskModal
          task={task}
          allTasks={allWorkspaceTasks}
          maxSubtaskDepth={maxSubtaskDepth}
          communityId={currentCommunityId}
          workspaceId={task.workspaceId}
          isOpen={isReparentOpen}
          onClose={onCloseReparentModal}
        />
      )}
    </section>
  );
}
