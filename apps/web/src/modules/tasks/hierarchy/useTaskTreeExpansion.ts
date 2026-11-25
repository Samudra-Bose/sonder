import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { TaskTreeNode, TaskTreeResult } from "./types.js";
import { getVisibleTreeNodes, getFilterAncestorExpandedIds } from "./treeExpansion.js";

export interface UseTaskTreeExpansionOptions {
  /** The current active workspace ID. When this changes, manual expansion resets to collapsed default. */
  workspaceId: string;
  /** Reconstructed tree result from `buildTaskTree()`. */
  treeResult: TaskTreeResult | null;
  /** Active search query from toolbar/URL params. */
  searchQuery?: string;
}

export interface UseTaskTreeExpansionResult {
  /** Currently visible tree nodes based on effective expansion. */
  visibleNodes: TaskTreeNode[];
  /** Combined set of expanded task IDs (manual + filter auto-expanded). */
  effectiveExpandedIds: Set<string>;
  /** User's manual expansion preferences, preserved across search sessions. */
  manualExpandedIds: Set<string>;
  /** Temporary ancestor task IDs auto-expanded because a descendant matched search or filter. */
  searchAutoExpandedIds: Set<string>;
  /** Check if a specific task ID is currently expanded. */
  isExpanded: (taskId: string) => boolean;
  /** Toggle expansion state for a specific task. */
  toggleExpanded: (taskId: string) => void;
  /** Expand all parent nodes in the tree manually. */
  expandAll: () => void;
  /** Collapse all parent nodes in the tree manually. */
  collapseAll: () => void;
}

/**
 * Manages client-side tree expansion state with workspace isolation,
 * search- and filter-driven auto-expansion, and stable manual preference restoration.
 *
 * Rules:
 * - All parents start collapsed by default.
 * - Manual state exists purely in memory (no localStorage/sessionStorage).
 * - Manual state survives sorting, filtering, and density changes.
 * - Manual state resets when `workspaceId` changes.
 * - When searching or filtering, ancestor paths for matching descendants temporarily auto-expand.
 * - When search or filters are cleared, previous manual expansion state is restored intact.
 */
export function useTaskTreeExpansion({
  workspaceId,
  treeResult,
  searchQuery = "",
}: UseTaskTreeExpansionOptions): UseTaskTreeExpansionResult {
  // Manual expansion state, empty by default (all parents start collapsed)
  const [manualExpandedIds, setManualExpandedIds] = useState<Set<string>>(() => new Set());
  // Explicit manual collapses (e.g. user collapsed an auto-expanded node)
  const [manualCollapsedIds, setManualCollapsedIds] = useState<Set<string>>(() => new Set());

  // Track workspace changes to reset manual expansion to collapsed default
  const prevWorkspaceIdRef = useRef<string>(workspaceId);
  useEffect(() => {
    if (prevWorkspaceIdRef.current !== workspaceId) {
      prevWorkspaceIdRef.current = workspaceId;
      setManualExpandedIds(new Set());
      setManualCollapsedIds(new Set());
    }
  }, [workspaceId]);

  // Compute temporary filter- and search-driven ancestor expansions
  const filterAutoExpandedIds = useMemo(() => {
    return getFilterAncestorExpandedIds(treeResult, searchQuery);
  }, [treeResult, searchQuery]);

  // Merge manual preferences and filter auto-expansions
  const effectiveExpandedIds = useMemo(() => {
    const combined = new Set(manualExpandedIds);
    for (const id of filterAutoExpandedIds) {
      if (!manualCollapsedIds.has(id)) {
        combined.add(id);
      }
    }
    return combined;
  }, [manualExpandedIds, filterAutoExpandedIds, manualCollapsedIds]);

  // Compute flattened list of only visible tree nodes
  const visibleNodes = useMemo(() => {
    return getVisibleTreeNodes(treeResult, effectiveExpandedIds);
  }, [treeResult, effectiveExpandedIds]);

  const isExpanded = useCallback(
    (taskId: string) => {
      return effectiveExpandedIds.has(taskId);
    },
    [effectiveExpandedIds]
  );

  const toggleExpanded = useCallback(
    (taskId: string) => {
      if (effectiveExpandedIds.has(taskId)) {
        // Collapse
        setManualExpandedIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
        setManualCollapsedIds((prev) => {
          const next = new Set(prev);
          next.add(taskId);
          return next;
        });
      } else {
        // Expand
        setManualCollapsedIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
        setManualExpandedIds((prev) => {
          const next = new Set(prev);
          next.add(taskId);
          return next;
        });
      }
    },
    [effectiveExpandedIds]
  );

  const expandAll = useCallback(() => {
    if (!treeResult) return;
    const allParentIds = new Set<string>();
    for (const node of treeResult.flatNodes) {
      if (node.hasChildren) {
        allParentIds.add(node.task.id);
      }
    }
    setManualCollapsedIds(new Set());
    setManualExpandedIds(allParentIds);
  }, [treeResult]);

  const collapseAll = useCallback(() => {
    setManualExpandedIds(new Set());
    if (treeResult) {
      setManualCollapsedIds(new Set(treeResult.flatNodes.map((n) => n.task.id)));
    }
  }, [treeResult]);

  return {
    visibleNodes,
    effectiveExpandedIds,
    manualExpandedIds,
    searchAutoExpandedIds: filterAutoExpandedIds,
    isExpanded,
    toggleExpanded,
    expandAll,
    collapseAll,
  };
}
