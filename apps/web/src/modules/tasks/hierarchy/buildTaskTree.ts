import type { TaskDto } from "../types.js";
import type { TaskTreeNode, BuildTaskTreeOptions, TaskTreeResult } from "./types.js";

/**
 * Pure, deterministic utility to construct a hierarchical task tree from a flat TaskDto array.
 *
 * Adheres strictly to Sonder M3.3 Domain & Data Rules:
 * - Dynamic maxSubtaskDepth enforcement (0 = Root, 1 = Subtask, 2 = Grandchild).
 * - Canonical sibling ordering and existing sorting semantics preserved.
 * - Defensive cycle detection (self-parenting and multi-node cycles) broken without discarding.
 * - Incomplete ancestor handling: orphaned subtasks render at root with "Subtask of [ID]" fallback.
 * - Deduplication of task IDs.
 * - Zero fabricated metadata (no invented task keys, names, or statuses).
 */
export function buildTaskTree(
  tasks: TaskDto[],
  options?: BuildTaskTreeOptions
): TaskTreeResult {
  const maxSubtaskDepth = Math.max(1, options?.maxSubtaskDepth ?? 1);
  const getParentTaskKey = options?.getParentTaskKey;
  const getAncestorTask = options?.getAncestorTask;
  const matchingTaskIds = options?.matchingTaskIds;

  // 1. Deduplicate by task ID, preserving first-seen order
  const seenIds = new Set<string>();
  const deduplicatedTasks: TaskDto[] = [];
  let duplicateCount = 0;

  for (const task of tasks) {
    if (!task || !task.id) continue;
    if (seenIds.has(task.id)) {
      duplicateCount++;
      continue;
    }
    seenIds.add(task.id);
    deduplicatedTasks.push(task);
  }

  // 1b. Resolve missing ancestors from authorized cache for matching tasks
  if (getAncestorTask) {
    const queue = [...deduplicatedTasks];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const parentId = current.parentTaskId;
      if (!parentId || parentId.trim() === "" || parentId === current.id) continue;
      if (!seenIds.has(parentId)) {
        const ancestor = getAncestorTask(parentId);
        if (ancestor && ancestor.id) {
          seenIds.add(ancestor.id);
          deduplicatedTasks.push(ancestor);
          queue.push(ancestor);
        }
      }
    }
  }

  // Map of ID -> TaskDto for O(1) ancestor lookups
  const taskMap = new Map<string, TaskDto>();
  for (const task of deduplicatedTasks) {
    taskMap.set(task.id, task);
  }

  // 2. Identify parent-child relationships, cycles, and orphans
  // Map of parentId -> array of child TaskDto (preserving sibling order)
  const childrenMap = new Map<string, TaskDto[]>();
  const rootTasks: TaskDto[] = [];
  const orphanTasks: { task: TaskDto; rawParentId: string }[] = [];
  const cycleTaskIds = new Set<string>();

  for (const task of deduplicatedTasks) {
    const parentId = task.parentTaskId;

    // Case A: Root task (no parent reference or empty string)
    if (!parentId || parentId.trim() === "") {
      rootTasks.push(task);
      continue;
    }

    // Case B: Self-parenting (A -> A)
    if (parentId === task.id) {
      cycleTaskIds.add(task.id);
      rootTasks.push(task);
      continue;
    }

    // Case C: Missing parent in loaded dataset (Orphan)
    if (!taskMap.has(parentId)) {
      orphanTasks.push({ task, rawParentId: parentId });
      continue;
    }

    // Case D: Parent is present in dataset — check for multi-node cycle (A -> B -> A)
    const visited = new Set<string>([task.id]);
    let hasCycle = false;
    let curr: TaskDto | undefined = taskMap.get(parentId);

    while (curr) {
      if (visited.has(curr.id)) {
        hasCycle = true;
        break;
      }
      visited.add(curr.id);
      if (!curr.parentTaskId || !taskMap.has(curr.parentTaskId)) break;
      curr = taskMap.get(curr.parentTaskId);
    }

    if (hasCycle) {
      cycleTaskIds.add(task.id);
      // Break cycle defensively: treat as root task so it is not discarded
      rootTasks.push(task);
      continue;
    }

    // Valid child: register under parent preserving incoming array order
    const siblings = childrenMap.get(parentId) ?? [];
    siblings.push(task);
    childrenMap.set(parentId, siblings);
  }

  // 3. Compute depth limit constraints & build tree nodes recursively
  let maxDepthEncountered = 0;

  function buildNode(
    task: TaskDto,
    depth: number,
    parentId: string | null,
    isOrphan: boolean,
    rawParentId?: string | null
  ): TaskTreeNode {
    if (depth > maxDepthEncountered) {
      maxDepthEncountered = depth;
    }

    // Fetch potential children if depth permits further nesting
    const rawChildren = childrenMap.get(task.id) ?? [];
    const childrenNodes: TaskTreeNode[] = [];

    let completedSubtasks = 0;

    // Check if children can be nested under this node without exceeding maxSubtaskDepth
    const canNestChildren = depth < maxSubtaskDepth;

    for (const childTask of rawChildren) {
      if (
        childTask.statusCategory === "DONE" ||
        childTask.statusCategory === "CANCELED"
      ) {
        completedSubtasks++;
      }

      if (canNestChildren) {
        childrenNodes.push(
          buildNode(childTask, depth + 1, task.id, false, null)
        );
      } else {
        // Child would exceed maxSubtaskDepth: promote to root level as an orphan
        // to prevent silent data discarding while honoring depth limits
        orphanTasks.push({ task: childTask, rawParentId: task.id });
      }
    }

    let orphanParentLabel: string | undefined;
    if (isOrphan && rawParentId) {
      const cachedKey = getParentTaskKey?.(rawParentId);
      if (cachedKey) {
        orphanParentLabel = `Subtask of ${cachedKey}`;
      } else {
        const idSlice =
          rawParentId.length > 8 ? rawParentId.slice(0, 8) : rawParentId;
        orphanParentLabel = `Subtask of ${idSlice}`;
      }
    }

    const isContextOnly = matchingTaskIds ? !matchingTaskIds.has(task.id) : false;

    return {
      task,
      depth,
      parentId,
      children: childrenNodes,
      subtaskCount: rawChildren.length,
      completedSubtaskCount: completedSubtasks,
      hasChildren: childrenNodes.length > 0,
      isOrphaned: isOrphan,
      orphanParentId: isOrphan ? rawParentId : null,
      orphanParentLabel,
      hasCycle: cycleTaskIds.has(task.id),
      isContextOnly,
    };
  }

  // 4. Assemble root nodes
  const rootNodes: TaskTreeNode[] = [];

  // 4a. Standard root tasks (and cycle-broken tasks)
  for (const rootTask of rootTasks) {
    rootNodes.push(buildNode(rootTask, 0, null, false, null));
  }

  // 4b. Orphaned subtasks (rendered at root per DEC-M3.3-02 / requirement)
  for (const orphan of orphanTasks) {
    rootNodes.push(buildNode(orphan.task, 0, null, true, orphan.rawParentId));
  }

  // 5. Flatten tree into depth-first pre-order array for linear row rendering
  const flatNodes: TaskTreeNode[] = [];
  function flatten(node: TaskTreeNode) {
    flatNodes.push(node);
    for (const child of node.children) {
      flatten(child);
    }
  }

  for (const root of rootNodes) {
    flatten(root);
  }

  let contextOnlyCount = 0;
  for (const node of flatNodes) {
    if (node.isContextOnly) contextOnlyCount++;
  }
  const matchingCount = flatNodes.length - contextOnlyCount;

  return {
    rootNodes,
    flatNodes,
    totalLoaded: deduplicatedTasks.length,
    orphanedCount: orphanTasks.length,
    cycleCount: cycleTaskIds.size,
    duplicateCount,
    maxDepthEncountered,
    contextOnlyCount,
    matchingCount,
  };
}
