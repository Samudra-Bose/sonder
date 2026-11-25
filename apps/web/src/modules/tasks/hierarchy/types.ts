import type { TaskDto } from "../types.js";

/**
 * Node representation in the reconstructed client-side task tree.
 */
export interface TaskTreeNode {
  /** The underlying TaskDto record. */
  task: TaskDto;
  /** Hierarchy depth: 0 = Root task, 1 = Subtask, 2 = Grandchild (capped by maxSubtaskDepth). */
  depth: number;
  /** Parent task ID, or null for root/promoted tasks. */
  parentId: string | null;
  /** Ordered direct child tree nodes. Sibling order preserves incoming task order. */
  children: TaskTreeNode[];
  /** Count of direct child tasks loaded in memory. */
  subtaskCount: number;
  /** Count of direct child tasks in DONE or CANCELED status category. */
  completedSubtaskCount: number;
  /** True if this node has at least one direct loaded child. */
  hasChildren: boolean;
  /** True if this task has a parentTaskId whose record is missing from the loaded dataset. */
  isOrphaned: boolean;
  /** The raw parentTaskId if orphaned, or null. */
  orphanParentId?: string | null;
  /** Display-ready label for orphaned tasks, e.g. "Subtask of ENG-101" or "Subtask of 1a2b3c4d". */
  orphanParentLabel?: string;
  /** True if a cycle or self-parenting reference was detected and broken. */
  hasCycle?: boolean;
  /**
   * True if this node is rendered solely to provide hierarchy context for a matching descendant,
   * but does not itself match the active filter criteria.
   */
  isContextOnly?: boolean;
}

/**
 * Options for pure tree construction.
 */
export interface BuildTaskTreeOptions {
  /**
   * Maximum subtask depth permitted for this workspace.
   * Defaults to 1 (allowing Root depth 0 and Subtask depth 1).
   */
  maxSubtaskDepth?: number;
  /**
   * Optional lookup callback for resolving parent task keys from an authorized
   * client cache (e.g. TanStack query cache for the same workspace).
   * Used to produce human-readable labels like "Subtask of ENG-101" when the parent
   * record is not loaded in the current page/query result.
   */
  getParentTaskKey?: (parentTaskId: string) => string | undefined;
  /**
   * Optional lookup callback to retrieve parent TaskDto records from an authorized
   * same-workspace cache when a parent record is not in the primary matching tasks collection.
   */
  getAncestorTask?: (parentTaskId: string) => TaskDto | undefined;
  /**
   * Set of task IDs that match the active filters.
   * When provided, tasks in the tree whose IDs are not in `matchingTaskIds` are marked `isContextOnly = true`.
   * When omitted, all tasks in the tree are treated as matching (`isContextOnly = false`).
   */
  matchingTaskIds?: Set<string>;
}

/**
 * Comprehensive result of tree reconstruction, keeping loaded and structural metrics explicit.
 */
export interface TaskTreeResult {
  /** Top-level nodes (roots, cycle-broken tasks, and orphaned tasks rendered at root). */
  rootNodes: TaskTreeNode[];
  /**
   * Depth-first pre-order flattened array of all tree nodes,
   * ready for linear table row mapping.
   */
  flatNodes: TaskTreeNode[];
  /** Total count of deduplicated tasks processed into the tree. */
  totalLoaded: number;
  /** Count of orphaned tasks whose parents are not in the loaded dataset. */
  orphanedCount: number;
  /** Count of tasks where a cycle or self-parenting reference was broken. */
  cycleCount: number;
  /** Count of duplicate task IDs skipped during processing. */
  duplicateCount: number;
  /** The deepest depth encountered in the reconstructed tree. */
  maxDepthEncountered: number;
  /** Count of ancestors included solely for context (not matching active filters). */
  contextOnlyCount?: number;
  /** Count of loaded tasks that match active filters. */
  matchingCount?: number;
}
