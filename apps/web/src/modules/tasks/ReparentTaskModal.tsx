import React, { useState, useMemo } from "react";
import { ArrowRightLeft } from "lucide-react";
import {
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog.js";
import { Button } from "@/components/ui/Button.js";
import { Feedback } from "@/components/ui/Feedback.js";
import { useMoveTask } from "./useMoveTask.js";
import type { TaskDto } from "./types.js";

export function computeTaskDepth(task: TaskDto, allTasks: TaskDto[]): number {
  if (!task.parentTaskId) return 0;
  const parent = allTasks.find((t) => t.id === task.parentTaskId);
  if (!parent) return 1;
  if (!parent.parentTaskId) return 1;
  return 2;
}

export function computeSubtreeHeight(taskId: string, allTasks: TaskDto[]): number {
  const children = allTasks.filter((t) => t.parentTaskId === taskId);
  if (children.length === 0) return 0;
  let maxHeight = 0;
  for (const child of children) {
    maxHeight = Math.max(maxHeight, 1 + computeSubtreeHeight(child.id, allTasks));
  }
  return maxHeight;
}

export function getDescendantTaskIds(taskId: string, allTasks: TaskDto[]): Set<string> {
  const descendantIds = new Set<string>();
  function traverse(currentId: string) {
    for (const t of allTasks) {
      if (t.parentTaskId === currentId) {
        descendantIds.add(t.id);
        traverse(t.id);
      }
    }
  }
  traverse(taskId);
  return descendantIds;
}

export interface ReparentTaskModalProps {
  task: TaskDto;
  allTasks: TaskDto[];
  maxSubtaskDepth: number;
  communityId: string | null;
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReparentTaskModal({
  task,
  allTasks,
  maxSubtaskDepth,
  communityId,
  workspaceId,
  isOpen,
  onClose,
}: ReparentTaskModalProps): React.JSX.Element | null {
  const moveMutation = useMoveTask();
  const [selectedParentId, setSelectedParentId] = useState<string>(
    task.parentTaskId ?? "TOP_LEVEL"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Descendants of the current task to prevent cycle formation
  const descendantIds = useMemo(
    () => getDescendantTaskIds(task.id, allTasks),
    [task.id, allTasks]
  );

  // Height of this task's subtree
  const subtreeHeight = useMemo(
    () => computeSubtreeHeight(task.id, allTasks),
    [task.id, allTasks]
  );

  // Eligible candidate parent tasks in this workspace
  const eligibleCandidates = useMemo(() => {
    return allTasks
      .filter((candidate) => {
        // 1. Same workspace only
        if (candidate.workspaceId !== workspaceId) return false;
        // 2. Cannot be the task itself
        if (candidate.id === task.id) return false;
        // 3. Cannot be a descendant of the task (cycle protection)
        if (descendantIds.has(candidate.id)) return false;
        return true;
      })
      .map((candidate) => {
        const candidateDepth = computeTaskDepth(candidate, allTasks);
        const wouldExceedDepth = candidateDepth + 1 + subtreeHeight > maxSubtaskDepth;
        return {
          candidate,
          candidateDepth,
          wouldExceedDepth,
        };
      });
  }, [allTasks, workspaceId, task.id, descendantIds, subtreeHeight, maxSubtaskDepth]);

  const handleClose = () => {
    setErrorMessage(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const targetParentTaskId =
      selectedParentId === "TOP_LEVEL" ? null : selectedParentId;

    // Check if unchanged
    if (targetParentTaskId === (task.parentTaskId ?? null)) {
      handleClose();
      return;
    }

    // Client-side preflight validation
    if (targetParentTaskId) {
      if (targetParentTaskId === task.id) {
        setErrorMessage("A task cannot be its own parent.");
        return;
      }
      if (descendantIds.has(targetParentTaskId)) {
        setErrorMessage("Cycle detected: cannot reparent a task under one of its own descendants.");
        return;
      }
      const parentCandidate = allTasks.find((t) => t.id === targetParentTaskId);
      if (parentCandidate) {
        const parentDepth = computeTaskDepth(parentCandidate, allTasks);
        if (parentDepth + 1 + subtreeHeight > maxSubtaskDepth) {
          setErrorMessage(
            `Move would exceed maximum subtask depth (${maxSubtaskDepth}) for this workspace.`
          );
          return;
        }
      }
    }

    try {
      await moveMutation.mutateAsync({
        communityId: communityId ?? "",
        workspaceId,
        taskId: task.id,
        data: {
          targetWorkspaceId: workspaceId,
          targetParentTaskId,
          confirmedPersonalToSharedTransfer: false,
        },
      });
      handleClose();
    } catch (err: unknown) {
      const errObj = err as { detail?: string; message?: string };
      setErrorMessage(
        errObj.detail ?? errObj.message ?? "Failed to reparent task. Please try again."
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogBackdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-150" />
      <DialogContent
        role="dialog"
        aria-modal="true"
        aria-labelledby="reparent-dialog-title"
        data-testid="reparent-task-modal"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] max-w-md rounded-xl border border-[var(--border-strong)] bg-[var(--surface-modal)] text-[var(--text-primary)] shadow-2xl p-6 flex flex-col gap-4"
      >
        <DialogHeader>
          <DialogTitle
            id="reparent-dialog-title"
            className="text-base font-semibold flex items-center gap-2"
          >
            <ArrowRightLeft className="h-4 w-4 text-[var(--brand-primary)]" />
            Reparent Task: {task.taskKey}
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--text-secondary)]">
            Change the parent task for {task.taskKey} ({task.title}). Target destinations are restricted to the current workspace.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Feedback
            variant="danger"
            title="Reparenting Error"
            data-testid="reparent-error"
          >
            {errorMessage}
          </Feedback>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="reparent-destination-select"
              className="text-xs font-medium text-[var(--text-secondary)]"
            >
              Select Destination Parent
            </label>
            <select
              id="reparent-destination-select"
              data-testid="reparent-destination-select"
              value={selectedParentId}
              onChange={(e) => {
                setSelectedParentId(e.target.value);
                setErrorMessage(null);
              }}
              disabled={moveMutation.isPending}
              className="w-full h-9 px-3 text-xs rounded-md border border-[var(--border-strong)] bg-[var(--surface-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)] disabled:opacity-50"
            >
              <option value="TOP_LEVEL">Top Level (No parent / Root task)</option>
              {eligibleCandidates.map(({ candidate, candidateDepth, wouldExceedDepth }) => (
                <option
                  key={candidate.id}
                  value={candidate.id}
                  disabled={wouldExceedDepth}
                >
                  {candidate.taskKey}: {candidate.title} (Depth {candidateDepth})
                  {wouldExceedDepth ? " — Exceeds max depth" : ""}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={moveMutation.isPending}
              data-testid="reparent-cancel-btn"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={moveMutation.isPending}
              data-testid="reparent-submit-btn"
            >
              {moveMutation.isPending ? "Moving..." : "Reparent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
