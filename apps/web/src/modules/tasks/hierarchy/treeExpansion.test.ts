import { describe, it, expect } from "vitest";
import { buildTaskTree } from "./buildTaskTree.js";
import { getVisibleTreeNodes, getSearchAncestorExpandedIds, getFilterAncestorExpandedIds } from "./treeExpansion.js";
import type { TaskDto } from "../types.js";

function makeTask(overrides: Partial<TaskDto>): TaskDto {
  return {
    id: overrides.id ?? "task-id",
    workspaceId: "ws-test",
    parentTaskId: overrides.parentTaskId ?? null,
    taskKey: overrides.taskKey ?? `ENG-${overrides.id ?? "1"}`,
    title: overrides.title ?? `Task ${overrides.id ?? "1"}`,
    description: overrides.description ?? null,
    itemType: "TASK",
    statusCategory: overrides.statusCategory ?? "TODO",
    priority: overrides.priority ?? "MEDIUM",
    assigneeIds: [],
    creatorId: "user-test",
    startDate: null,
    dueDate: null,
    estimatePoints: null,
    labelIds: [],
    milestoneId: null,
    rankKey: `0|${overrides.id ?? "1"}:`,
    version: 1,
    fieldRevisions: {},
    effectivePermissions: {
      canEditTitleDescription: true,
      canEditDatesPriority: true,
      canEditCustomFieldsLinks: true,
      canEditEstimate: true,
      canUpdateStatus: true,
      canRequestSignoff: false,
      canApproveSignoff: false,
      canAssign: true,
      canManageSubtasks: true,
      canCreateSubtask: true,
      canMove: true,
      canComment: true,
      canWatch: true,
      canArchive: true,
      canRestore: true,
      canDeletePermanent: false,
      restrictedActions: [],
      canManageAssigneeFieldGrants: false,
    },
    createdAt: "2026-11-20T10:00:00Z",
    updatedAt: "2026-11-20T10:00:00Z",
    archivedAt: null,
    assigneeAssignments: [],
    assigneeEditableFieldGroups: [],
    ...overrides,
  };
}

describe("treeExpansion — Pure Visible Row & Search Ancestor Logic", () => {
  describe("getVisibleTreeNodes", () => {
    it("returns empty array when treeResult is null or has no root nodes", () => {
      expect(getVisibleTreeNodes(null, new Set())).toEqual([]);
      const emptyTree = buildTaskTree([], { maxSubtaskDepth: 2 });
      expect(getVisibleTreeNodes(emptyTree, new Set())).toEqual([]);
    });

    it("returns only root nodes by default when expansion set is empty (all collapsed)", () => {
      const tasks = [
        makeTask({ id: "p1", title: "Parent 1" }),
        makeTask({ id: "c1", parentTaskId: "p1", title: "Child 1" }),
        makeTask({ id: "c2", parentTaskId: "p1", title: "Child 2" }),
        makeTask({ id: "p2", title: "Parent 2" }),
        makeTask({ id: "c3", parentTaskId: "p2", title: "Child 3" }),
      ];

      const tree = buildTaskTree(tasks, { maxSubtaskDepth: 2 });
      const visible = getVisibleTreeNodes(tree, new Set());

      expect(visible.map((n) => n.task.id)).toEqual(["p1", "p2"]);
      expect(visible.every((n) => n.depth === 0)).toBe(true);
    });

    it("reveals immediate children when a parent is expanded without expanding unrelated parents", () => {
      const tasks = [
        makeTask({ id: "p1", title: "Parent 1" }),
        makeTask({ id: "c1", parentTaskId: "p1", title: "Child 1" }),
        makeTask({ id: "c2", parentTaskId: "p1", title: "Child 2" }),
        makeTask({ id: "p2", title: "Parent 2" }),
        makeTask({ id: "c3", parentTaskId: "p2", title: "Child 3" }),
      ];

      const tree = buildTaskTree(tasks, { maxSubtaskDepth: 2 });
      const visible = getVisibleTreeNodes(tree, new Set(["p1"]));

      // p1 children are visible; p2 children remain collapsed
      expect(visible.map((n) => n.task.id)).toEqual(["p1", "c1", "c2", "p2"]);
    });

    it("supports nested multi-level expansion", () => {
      const tasks = [
        makeTask({ id: "root", title: "Root Item" }),
        makeTask({ id: "child", parentTaskId: "root", title: "Child Item" }),
        makeTask({ id: "grandchild", parentTaskId: "child", title: "Grandchild Item" }),
      ];

      const tree = buildTaskTree(tasks, { maxSubtaskDepth: 2 });

      // Only root expanded -> child visible, grandchild hidden
      const visibleLevel1 = getVisibleTreeNodes(tree, new Set(["root"]));
      expect(visibleLevel1.map((n) => n.task.id)).toEqual(["root", "child"]);

      // Both expanded -> all visible
      const visibleLevel2 = getVisibleTreeNodes(tree, new Set(["root", "child"]));
      expect(visibleLevel2.map((n) => n.task.id)).toEqual(["root", "child", "grandchild"]);
      expect(visibleLevel2.map((n) => n.depth)).toEqual([0, 1, 2]);
    });

    it("collapsing a parent hides its entire visible descendant branch", () => {
      const tasks = [
        makeTask({ id: "root", title: "Root Item" }),
        makeTask({ id: "child", parentTaskId: "root", title: "Child Item" }),
        makeTask({ id: "grandchild", parentTaskId: "child", title: "Grandchild Item" }),
      ];

      const tree = buildTaskTree(tasks, { maxSubtaskDepth: 2 });

      // When root is collapsed, even if child was marked expanded, descendants are hidden
      const visible = getVisibleTreeNodes(tree, new Set(["child"]));
      expect(visible.map((n) => n.task.id)).toEqual(["root"]);
    });

    it("reopening a parent restores its previously selected nested expansion state", () => {
      const tasks = [
        makeTask({ id: "root", title: "Root Item" }),
        makeTask({ id: "child", parentTaskId: "root", title: "Child Item" }),
        makeTask({ id: "grandchild", parentTaskId: "child", title: "Grandchild Item" }),
      ];

      const tree = buildTaskTree(tasks, { maxSubtaskDepth: 2 });

      // Suppose user expanded both root and child, then collapsed root (child remains in manual set)
      const expandedSet = new Set(["child"]);
      expect(getVisibleTreeNodes(tree, expandedSet).map((n) => n.task.id)).toEqual(["root"]);

      // User re-expands root -> child is revealed AND grandchild is restored as visible
      expandedSet.add("root");
      expect(getVisibleTreeNodes(tree, expandedSet).map((n) => n.task.id)).toEqual([
        "root",
        "child",
        "grandchild",
      ]);
    });
  });

  describe("getSearchAncestorExpandedIds", () => {
    it("returns empty set when searchQuery is empty, blank, or treeResult is null", () => {
      expect(getSearchAncestorExpandedIds(null, "test")).toEqual(new Set());

      const tree = buildTaskTree([makeTask({ id: "t1" })]);
      expect(getSearchAncestorExpandedIds(tree, "")).toEqual(new Set());
      expect(getSearchAncestorExpandedIds(tree, "   ")).toEqual(new Set());
    });

    it("returns empty set when matched task is already a root task", () => {
      const tasks = [
        makeTask({ id: "root", title: "Search Match Root" }),
        makeTask({ id: "c1", parentTaskId: "root", title: "Child" }),
      ];
      const tree = buildTaskTree(tasks);
      const expanded = getSearchAncestorExpandedIds(tree, "Search Match");
      expect(expanded.size).toBe(0);
    });

    it("auto-expands parent when search query matches a child task", () => {
      const tasks = [
        makeTask({ id: "p1", taskKey: "ENG-101", title: "Parent One" }),
        makeTask({ id: "c1", parentTaskId: "p1", taskKey: "ENG-102", title: "Child Security Fix" }),
        makeTask({ id: "p2", taskKey: "ENG-201", title: "Parent Two" }),
      ];
      const tree = buildTaskTree(tasks);
      const expanded = getSearchAncestorExpandedIds(tree, "security");

      expect(expanded).toEqual(new Set(["p1"]));
    });

    it("auto-expands full ancestor path when search query matches a deep descendant", () => {
      const tasks = [
        makeTask({ id: "root", taskKey: "ENG-ROOT", title: "Root Architecture" }),
        makeTask({ id: "sub", parentTaskId: "root", taskKey: "ENG-SUB", title: "Subsystem Core" }),
        makeTask({ id: "leaf", parentTaskId: "sub", taskKey: "ENG-LEAF", title: "Token Refresh Bug" }),
      ];
      const tree = buildTaskTree(tasks, { maxSubtaskDepth: 2 });
      const expanded = getSearchAncestorExpandedIds(tree, "token refresh");

      expect(expanded).toEqual(new Set(["root", "sub"]));
    });

    it("never fabricates missing parents for orphaned tasks", () => {
      const tasks = [
        makeTask({ id: "orph", parentTaskId: "unloaded-parent-uuid", title: "Orphaned Task" }),
      ];
      const tree = buildTaskTree(tasks);
      const expanded = getSearchAncestorExpandedIds(tree, "orphaned");

      // No loaded parent exists in the tree, so no fake ancestors are fabricated
      expect(expanded).toEqual(new Set());
    });
  });

  describe("getFilterAncestorExpandedIds (Batch 4)", () => {
    it("auto-expands context-only ancestors that hold matching descendants", () => {
      const child = makeTask({ id: "child-1", parentTaskId: "parent-1", title: "Matching Child" });
      const parent = makeTask({ id: "parent-1", parentTaskId: null, title: "Context Parent" });

      const tree = buildTaskTree([child], {
        getAncestorTask: (id) => (id === "parent-1" ? parent : undefined),
        matchingTaskIds: new Set(["child-1"]),
      });

      expect(tree.rootNodes[0]!.isContextOnly).toBe(true);
      const autoExpanded = getFilterAncestorExpandedIds(tree);
      expect(autoExpanded).toEqual(new Set(["parent-1"]));
    });

    it("combines context-only ancestor auto-expansion with search query auto-expansion", () => {
      const childMatch = makeTask({ id: "c-match", parentTaskId: "p-context", title: "Target" });
      const parentContext = makeTask({ id: "p-context", parentTaskId: null, title: "Context" });
      const normalParent = makeTask({ id: "p-normal", parentTaskId: null, title: "Normal Parent" });
      const searchChild = makeTask({ id: "c-search", parentTaskId: "p-normal", title: "Keyword Match" });

      const tree = buildTaskTree([childMatch, normalParent, searchChild], {
        getAncestorTask: (id) => (id === "p-context" ? parentContext : undefined),
        matchingTaskIds: new Set(["c-match", "p-normal", "c-search"]),
      });

      const autoExpanded = getFilterAncestorExpandedIds(tree, "Keyword");
      // Expect both p-context (holding c-match) AND p-normal (holding c-search)
      expect(autoExpanded).toContain("p-context");
      expect(autoExpanded).toContain("p-normal");
    });
  });

  describe("Performance Benchmarks (200 tasks & 1,000 tasks)", () => {
    it("measures visible-row flattening performance at 200 tasks and 1,000 tasks", () => {
      // 1. Generate 200 tasks: 50 root parents with 3 children each
      const tasks200: TaskDto[] = [];
      for (let p = 0; p < 50; p++) {
        const pId = `parent-200-${p}`;
        tasks200.push(makeTask({ id: pId, title: `Parent ${p}` }));
        for (let c = 0; c < 3; c++) {
          tasks200.push(makeTask({ id: `child-200-${p}-${c}`, parentTaskId: pId, title: `Child ${p}-${c}` }));
        }
      }
      expect(tasks200.length).toBe(200);

      const tree200 = buildTaskTree(tasks200, { maxSubtaskDepth: 1 });

      // Measure collapsed (50 roots visible)
      const t0 = performance.now();
      const visible200Collapsed = getVisibleTreeNodes(tree200, new Set());
      const dur200Collapsed = performance.now() - t0;
      expect(visible200Collapsed.length).toBe(50);
      expect(dur200Collapsed).toBeLessThan(5); // Sub-millisecond expected

      // Measure all expanded (200 visible)
      const all200ParentIds = new Set(Array.from({ length: 50 }, (_, i) => `parent-200-${i}`));
      const t1 = performance.now();
      const visible200Expanded = getVisibleTreeNodes(tree200, all200ParentIds);
      const dur200Expanded = performance.now() - t1;
      expect(visible200Expanded.length).toBe(200);
      expect(dur200Expanded).toBeLessThan(5);

      // 2. Generate 1,000 tasks: 200 root parents with 4 children each
      const tasks1000: TaskDto[] = [];
      for (let p = 0; p < 200; p++) {
        const pId = `parent-1000-${p}`;
        tasks1000.push(makeTask({ id: pId, title: `Parent ${p}` }));
        for (let c = 0; c < 4; c++) {
          tasks1000.push(makeTask({ id: `child-1000-${p}-${c}`, parentTaskId: pId, title: `Child ${p}-${c}` }));
        }
      }
      expect(tasks1000.length).toBe(1000);

      const tree1000 = buildTaskTree(tasks1000, { maxSubtaskDepth: 1 });

      // Measure collapsed (200 roots visible)
      const t2 = performance.now();
      const visible1000Collapsed = getVisibleTreeNodes(tree1000, new Set());
      const dur1000Collapsed = performance.now() - t2;
      expect(visible1000Collapsed.length).toBe(200);
      expect(dur1000Collapsed).toBeLessThan(10);

      // Measure all expanded (1,000 visible)
      const all1000ParentIds = new Set(Array.from({ length: 200 }, (_, i) => `parent-1000-${i}`));
      const t3 = performance.now();
      const visible1000Expanded = getVisibleTreeNodes(tree1000, all1000ParentIds);
      const dur1000Expanded = performance.now() - t3;
      expect(visible1000Expanded.length).toBe(1000);
      expect(dur1000Expanded).toBeLessThan(10);

      // Measure search-driven ancestor expansion at 1,000 tasks
      const t4 = performance.now();
      const searchAncestors = getSearchAncestorExpandedIds(tree1000, "Child 42-2");
      const durSearch = performance.now() - t4;
      expect(searchAncestors).toEqual(new Set(["parent-1000-42"]));
      expect(durSearch).toBeLessThan(10);

      console.log(
        `[Benchmark Visible Flattening] 200 tasks: collapsed=${dur200Collapsed.toFixed(2)}ms, expanded=${dur200Expanded.toFixed(2)}ms | 1000 tasks: collapsed=${dur1000Collapsed.toFixed(2)}ms, expanded=${dur1000Expanded.toFixed(2)}ms | search=${durSearch.toFixed(2)}ms`
      );
    });
  });
});
