import type {
  TaskDto,
  WorkspaceDto,
  MyWorkTaskItem,
  TaskRelationship,
  RelationshipFilter,
  TaskPriority,
} from "./types";
import { classifyTemporalGroup, type TemporalGroupKey } from "./date-utils";

/**
 * Priority rank mapping for canonical task priority ordering.
 * Lower number = higher priority.
 */
const PRIORITY_RANK: Record<TaskPriority, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  NONE: 4,
};

/**
 * Derives the active user's relationships to a task.
 * Preserves all applicable relationships while enforcing canonical priority:
 * ASSIGNED > CREATED > WATCHING
 */
export function deriveTaskRelationships(
  task: TaskDto,
  currentUserId: string
): { relationships: TaskRelationship[]; primaryRelationship: TaskRelationship } {
  const relSet = new Set<TaskRelationship>();

  // Check assignment
  const isAssigned =
    task.assigneeIds?.includes(currentUserId) ||
    task.assigneeAssignments?.some((a) => a.userId === currentUserId);
  if (isAssigned) {
    relSet.add("ASSIGNED");
  }

  // Check creator
  const isCreated = task.creatorId === currentUserId;
  if (isCreated) {
    relSet.add("CREATED");
  }

  // Check watcher
  const isWatched =
    (task as { isWatched?: boolean }).isWatched === true ||
    (task as { watcherIds?: string[] }).watcherIds?.includes(currentUserId);
  if (isWatched) {
    relSet.add("WATCHING");
  }

  // If task has no explicit relation but was returned in My Work, default to ASSIGNED
  if (relSet.size === 0) {
    relSet.add("ASSIGNED");
  }

  // Canonical priority: ASSIGNED > CREATED > WATCHING
  let primary: TaskRelationship = "WATCHING";
  if (relSet.has("ASSIGNED")) {
    primary = "ASSIGNED";
  } else if (relSet.has("CREATED")) {
    primary = "CREATED";
  }

  // Ordered list of relationships respecting priority
  const orderedList: TaskRelationship[] = [];
  if (relSet.has("ASSIGNED")) orderedList.push("ASSIGNED");
  if (relSet.has("CREATED")) orderedList.push("CREATED");
  if (relSet.has("WATCHING")) orderedList.push("WATCHING");

  return {
    relationships: orderedList,
    primaryRelationship: primary,
  };
}

/**
 * De-duplicates tasks by canonical task ID, enriches with parent workspace metadata,
 * and determines temporal group classification.
 */
export function processRawTasks(
  rawTasks: TaskDto[],
  workspaces: WorkspaceDto[],
  currentUserId: string,
  referenceDate: string
): MyWorkTaskItem[] {
  const seenIds = new Set<string>();
  const workspaceMap = new Map<string, WorkspaceDto>();
  workspaces.forEach((w) => workspaceMap.set(w.id, w));

  const items: MyWorkTaskItem[] = [];

  for (const raw of rawTasks) {
    // Strict de-duplication by canonical UUID
    if (!raw.id || seenIds.has(raw.id)) {
      continue;
    }
    seenIds.add(raw.id);

    // Classify into temporal group
    const group = classifyTemporalGroup(raw.dueDate, raw.statusCategory, referenceDate);
    // If null (terminal task like DONE/CANCELED or beyond 7-day upcoming horizon), exclude from active triage
    if (!group) {
      continue;
    }

    const { relationships, primaryRelationship } = deriveTaskRelationships(raw, currentUserId);
    const parentWorkspace = workspaceMap.get(raw.workspaceId);

    items.push({
      ...raw,
      relationships,
      primaryRelationship,
      workspaceName: parentWorkspace?.name || "Workspace",
      workspaceKeyPrefix: parentWorkspace?.keyPrefix || raw.taskKey.split("-")[0] || "TASK",
      workspaceKind: parentWorkspace?.kind || "SHARED",
      temporalGroup: group,
      isWatched: (raw as { isWatched?: boolean }).isWatched,
      watcherIds: (raw as { watcherIds?: string[] }).watcherIds,
    });
  }

  return items;
}

/**
 * Filters a de-duplicated task list by the selected relationship filter.
 */
export function filterTasksByRelationship(
  tasks: MyWorkTaskItem[],
  filter: RelationshipFilter
): MyWorkTaskItem[] {
  if (filter === "ALL") {
    return tasks;
  }
  return tasks.filter((t) => t.relationships.includes(filter as TaskRelationship));
}

/**
 * Groups tasks into the four canonical temporal buckets with proper sorting per group.
 */
export function groupTasksTemporally(
  tasks: MyWorkTaskItem[]
): Record<TemporalGroupKey, MyWorkTaskItem[]> {
  const groups: Record<TemporalGroupKey, MyWorkTaskItem[]> = {
    overdue: [],
    dueToday: [],
    upcoming: [],
    unscheduled: [],
  };

  for (const task of tasks) {
    groups[task.temporalGroup].push(task);
  }

  // 1. Overdue: sort by dueDate ASC (most overdue first), then priority
  groups.overdue.sort((a, b) => {
    const dA = a.dueDate || "";
    const dB = b.dueDate || "";
    if (dA !== dB) return dA.localeCompare(dB);
    return (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4);
  });

  // 2. Due Today: sort by canonical priority
  groups.dueToday.sort((a, b) => {
    const pA = PRIORITY_RANK[a.priority] ?? 4;
    const pB = PRIORITY_RANK[b.priority] ?? 4;
    return pA - pB;
  });

  // 3. Upcoming: sort by dueDate ASC (soonest first), then priority
  groups.upcoming.sort((a, b) => {
    const dA = a.dueDate || "";
    const dB = b.dueDate || "";
    if (dA !== dB) return dA.localeCompare(dB);
    return (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4);
  });

  // 4. Unscheduled: sort by canonical priority, then creation timestamp DESC
  groups.unscheduled.sort((a, b) => {
    const pA = PRIORITY_RANK[a.priority] ?? 4;
    const pB = PRIORITY_RANK[b.priority] ?? 4;
    if (pA !== pB) return pA - pB;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return groups;
}
