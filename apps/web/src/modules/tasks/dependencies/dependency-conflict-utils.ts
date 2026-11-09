import type { TaskDto } from "@/modules/tasks/types.js";
import type { TaskLinkType, DependencyConflictResult } from "./types.js";

export type { DependencyConflictResult };

export interface TaskDateSubset {
  id?: string;
  taskKey?: string;
  title?: string;
  startDate?: string | null;
  dueDate?: string | null;
}

/**
 * Pure utility to detect scheduling conflicts between an upstream blocker and a dependent task.
 * Canonical rule only (Master Spec §4.3 & line 21189):
 * Scheduling conflict exists when an upstream blocker is due after its dependent task is scheduled to begin:
 * blocker.dueDate > dependent.startDate
 *
 * Missing dates do NOT generate fabricated conflicts.
 * Equal dates (blocker.dueDate === dependent.startDate) are NOT a conflict.
 */
export function detectBlockerConflict(
  blocker: TaskDateSubset | null | undefined,
  dependent: TaskDateSubset | null | undefined
): DependencyConflictResult {
  if (!blocker || !dependent) {
    return { hasConflict: false };
  }

  // Canonical rule requires both blocker.dueDate and dependent.startDate
  // If either date is missing, do not fabricate conflicts
  const blockerDue = blocker.dueDate;
  const depStart = dependent.startDate;
  if (!blockerDue || !depStart) {
    return { hasConflict: false };
  }

  // Compare date strings strictly (ISO YYYY-MM-DD)
  const blockerDueDateStr = blockerDue.slice(0, 10);
  const depStartDateStr = depStart.slice(0, 10);

  // Strictly greater: equal dates are valid, only due AFTER start is a conflict
  if (blockerDueDateStr > depStartDateStr) {
    const blockerName = blocker.taskKey ?? "Blocker task";
    const depName = dependent.taskKey ?? "dependent task";
    return {
      hasConflict: true,
      blockerId: blocker.id,
      dependentId: dependent.id,
      blockerDueDate: blocker.dueDate,
      dependentStartDate: dependent.startDate,
      reason: `Scheduling conflict: Upstream blocker ${blockerName} is scheduled to finish on ${blockerDueDateStr}, after ${depName} is scheduled to begin on ${depStartDateStr}.`,
    };
  }

  return { hasConflict: false };
}

/**
 * Determine blocker and dependent roles based on link type, then evaluate conflict.
 */
export function detectLinkConflict(
  source: TaskDateSubset | null | undefined,
  target: TaskDateSubset | null | undefined,
  type: TaskLinkType
): DependencyConflictResult {
  if (!source || !target) {
    return { hasConflict: false };
  }

  if (type === "BLOCKS") {
    // source blocks target => source is blocker, target is dependent
    return detectBlockerConflict(source, target);
  }

  if (type === "IS_BLOCKED_BY") {
    // source is blocked by target => target is blocker, source is dependent
    return detectBlockerConflict(target, source);
  }

  // RELATES_TO and DUPLICATES are non-blocking relations, so never a scheduling conflict
  return { hasConflict: false };
}

/**
 * Evaluate if a task has any incoming blocking conflict from a list of tasks.
 */
export function findTaskConflicts(
  task: TaskDto,
  allTasksMap: Map<string, TaskDto>,
  links: Array<{ sourceTaskId: string; targetTaskId: string; type: TaskLinkType }>
): DependencyConflictResult[] {
  const conflicts: DependencyConflictResult[] = [];

  for (const link of links) {
    if (link.sourceTaskId === task.id) {
      // Outgoing link from current task
      const target = allTasksMap.get(link.targetTaskId);
      const res = detectLinkConflict(task, target, link.type);
      if (res.hasConflict) {
        conflicts.push(res);
      }
    } else if (link.targetTaskId === task.id) {
      // Incoming link to current task
      const source = allTasksMap.get(link.sourceTaskId);
      const res = detectLinkConflict(source, task, link.type);
      if (res.hasConflict) {
        conflicts.push(res);
      }
    }
  }

  return conflicts;
}
