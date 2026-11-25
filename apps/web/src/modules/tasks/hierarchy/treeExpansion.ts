import type { TaskTreeNode, TaskTreeResult } from "./types.js";

/**
 * Filter and flatten the task tree to include only currently visible nodes
 * based on the active set of expanded task IDs.
 *
 * Requirements:
 * - Root nodes are always visible.
 * - Children of a node are visible only if that node is in `expandedIds`.
 * - Collapsed nodes' descendants are completely excluded from the result.
 * - Order is pre-order depth-first traversal preserving the tree's sibling order.
 */
export function getVisibleTreeNodes(
  treeResult: TaskTreeResult | null,
  expandedIds: Set<string>
): TaskTreeNode[] {
  if (!treeResult || treeResult.rootNodes.length === 0) {
    return [];
  }

  const visible: TaskTreeNode[] = [];

  function traverse(nodes: TaskTreeNode[]) {
    for (const node of nodes) {
      visible.push(node);
      if (node.hasChildren && expandedIds.has(node.task.id)) {
        traverse(node.children);
      }
    }
  }

  traverse(treeResult.rootNodes);
  return visible;
}

/**
 * Detect matching tasks against a search query and collect the IDs of all their
 * loaded ancestors in the tree.
 *
 * Requirements:
 * - When a search result is a descendant, its ancestor path in the tree must be expanded.
 * - Uses only ancestors present in the loaded tree structure.
 * - Never fabricates missing parent tasks (orphans have no loaded ancestors).
 * - Returns an empty set when the query is empty or blank.
 */
export function getSearchAncestorExpandedIds(
  treeResult: TaskTreeResult | null,
  searchQuery: string
): Set<string> {
  const ancestorIds = new Set<string>();

  if (!treeResult || !searchQuery || searchQuery.trim().length === 0) {
    return ancestorIds;
  }

  const query = searchQuery.trim().toLowerCase();

  // Build a lookup map of nodeId -> parentNodeId from the tree
  const parentMap = new Map<string, string | null>();
  for (const node of treeResult.flatNodes) {
    parentMap.set(node.task.id, node.parentId);
  }

  // Find all tasks in the tree matching the search query
  for (const node of treeResult.flatNodes) {
    const task = node.task;
    const matches =
      task.taskKey.toLowerCase().includes(query) ||
      task.title.toLowerCase().includes(query) ||
      (task.description ? task.description.toLowerCase().includes(query) : false);

    if (matches && node.parentId) {
      // Walk up the ancestor path in the loaded tree
      let currentParentId: string | null = node.parentId;
      const visited = new Set<string>();

      while (currentParentId && !visited.has(currentParentId)) {
        visited.add(currentParentId);
        ancestorIds.add(currentParentId);
        currentParentId = parentMap.get(currentParentId) ?? null;
      }
    }
  }

  return ancestorIds;
}

/**
 * Detect ancestor tasks that must be auto-expanded to reveal matching descendants.
 * This covers:
 * 1. Context-only ancestors in the tree (which exist solely to provide context for matching children).
 * 2. Search query matches where an ancestor path needs expansion.
 */
export function getFilterAncestorExpandedIds(
  treeResult: TaskTreeResult | null,
  searchQuery?: string
): Set<string> {
  const ancestorIds = new Set<string>();

  if (!treeResult || treeResult.flatNodes.length === 0) {
    return ancestorIds;
  }

  // 1. Any context-only node that has children must be auto-expanded
  // so that its matching descendant(s) are visible in the tree.
  for (const node of treeResult.flatNodes) {
    if (node.isContextOnly && node.hasChildren) {
      ancestorIds.add(node.task.id);
    }
  }

  // 2. Also incorporate search query ancestor expansions if search is active
  if (searchQuery && searchQuery.trim().length > 0) {
    const searchAncestorIds = getSearchAncestorExpandedIds(treeResult, searchQuery);
    for (const id of searchAncestorIds) {
      ancestorIds.add(id);
    }
  }

  return ancestorIds;
}
