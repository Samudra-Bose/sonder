import { describe, it, expect } from "vitest";
import { buildTaskTree } from "./buildTaskTree.js";
import type { TaskDto } from "../types.js";

function makeTask(overrides: Partial<TaskDto>): TaskDto {
  return {
    id: overrides.id ?? "task-id",
    workspaceId: "ws-1",
    parentTaskId: overrides.parentTaskId ?? null,
    taskKey: overrides.taskKey ?? "ENG-1",
    title: overrides.title ?? "Sample task",
    description: "Sample description",
    itemType: "TASK",
    statusCategory: overrides.statusCategory ?? "TODO",
    priority: overrides.priority ?? "MEDIUM",
    assigneeIds: [],
    creatorId: "user-1",
    startDate: null,
    dueDate: null,
    estimatePoints: null,
    labelIds: [],
    milestoneId: null,
    rankKey: "0|hzzzzz:",
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
    createdAt: "2026-11-01T10:00:00Z",
    updatedAt: "2026-11-01T10:00:00Z",
    archivedAt: null,
    assigneeAssignments: [],
    assigneeEditableFieldGroups: [],
    ...overrides,
  };
}

describe("buildTaskTree — Pure Hierarchical Task Tree Reconstruction", () => {
  it("handles empty dataset", () => {
    const result = buildTaskTree([]);
    expect(result.rootNodes).toEqual([]);
    expect(result.flatNodes).toEqual([]);
    expect(result.totalLoaded).toBe(0);
    expect(result.orphanedCount).toBe(0);
    expect(result.cycleCount).toBe(0);
    expect(result.duplicateCount).toBe(0);
    expect(result.maxDepthEncountered).toBe(0);
  });

  it("constructs root tasks when all tasks have parentTaskId === null", () => {
    const tasks = [
      makeTask({ id: "t1", taskKey: "ENG-1", title: "Task 1" }),
      makeTask({ id: "t2", taskKey: "ENG-2", title: "Task 2" }),
    ];
    const result = buildTaskTree(tasks);

    expect(result.rootNodes).toHaveLength(2);
    expect(result.flatNodes).toHaveLength(2);
    expect(result.totalLoaded).toBe(2);
    expect(result.rootNodes[0]!.depth).toBe(0);
    expect(result.rootNodes[0]!.children).toHaveLength(0);
    expect(result.rootNodes[0]!.hasChildren).toBe(false);
    expect(result.rootNodes[1]!.depth).toBe(0);
  });

  it("reconstructs 1-level parent-child relationships and preserves sibling order", () => {
    const tasks = [
      makeTask({ id: "parent", taskKey: "ENG-10", title: "Parent Task" }),
      makeTask({ id: "child-1", parentTaskId: "parent", taskKey: "ENG-11", title: "Child 1", statusCategory: "DONE" }),
      makeTask({ id: "child-2", parentTaskId: "parent", taskKey: "ENG-12", title: "Child 2", statusCategory: "IN_PROGRESS" }),
      makeTask({ id: "child-3", parentTaskId: "parent", taskKey: "ENG-13", title: "Child 3", statusCategory: "CANCELED" }),
    ];
    const result = buildTaskTree(tasks, { maxSubtaskDepth: 1 });

    expect(result.rootNodes).toHaveLength(1);
    const parentNode = result.rootNodes[0]!;
    expect(parentNode.task.id).toBe("parent");
    expect(parentNode.depth).toBe(0);
    expect(parentNode.hasChildren).toBe(true);
    expect(parentNode.subtaskCount).toBe(3);
    expect(parentNode.completedSubtaskCount).toBe(2); // DONE + CANCELED

    // Sibling order preserved
    expect(parentNode.children).toHaveLength(3);
    expect(parentNode.children[0]!.task.id).toBe("child-1");
    expect(parentNode.children[0]!.depth).toBe(1);
    expect(parentNode.children[1]!.task.id).toBe("child-2");
    expect(parentNode.children[1]!.depth).toBe(1);
    expect(parentNode.children[2]!.task.id).toBe("child-3");
    expect(parentNode.children[2]!.depth).toBe(1);

    // flatNodes order: parent, child-1, child-2, child-3
    expect(result.flatNodes.map((n) => n.task.id)).toEqual(["parent", "child-1", "child-2", "child-3"]);
    expect(result.maxDepthEncountered).toBe(1);
  });

  it("supports dynamic workspace maxSubtaskDepth = 2 (Root -> Subtask -> Grandchild)", () => {
    const tasks = [
      makeTask({ id: "root", taskKey: "ENG-1", title: "Root" }),
      makeTask({ id: "child", parentTaskId: "root", taskKey: "ENG-2", title: "Child" }),
      makeTask({ id: "grandchild", parentTaskId: "child", taskKey: "ENG-3", title: "Grandchild" }),
    ];
    const result = buildTaskTree(tasks, { maxSubtaskDepth: 2 });

    expect(result.rootNodes).toHaveLength(1);
    expect(result.rootNodes[0]!.depth).toBe(0);
    expect(result.rootNodes[0]!.children[0]!.depth).toBe(1);
    expect(result.rootNodes[0]!.children[0]!.children[0]!.depth).toBe(2);
    expect(result.maxDepthEncountered).toBe(2);
    expect(result.flatNodes.map((n) => n.task.id)).toEqual(["root", "child", "grandchild"]);
  });

  it("defensively promotes tasks that would exceed maxSubtaskDepth without discarding them", () => {
    // In a workspace with maxSubtaskDepth = 1:
    // Root (depth 0) -> Child (depth 1) -> Grandchild (would be depth 2, exceeding maxSubtaskDepth 1)
    const tasks = [
      makeTask({ id: "root", taskKey: "ENG-1" }),
      makeTask({ id: "child", parentTaskId: "root", taskKey: "ENG-2" }),
      makeTask({ id: "grandchild", parentTaskId: "child", taskKey: "ENG-3" }),
    ];
    const result = buildTaskTree(tasks, { maxSubtaskDepth: 1 });

    // Root has child at depth 1
    expect(result.rootNodes[0]!.task.id).toBe("root");
    expect(result.rootNodes[0]!.children).toHaveLength(1);
    expect(result.rootNodes[0]!.children[0]!.task.id).toBe("child");
    expect(result.rootNodes[0]!.children[0]!.children).toHaveLength(0);

    // Grandchild is promoted to root level as an orphan rather than silently discarded
    expect(result.rootNodes).toHaveLength(2);
    const promotedNode = result.rootNodes[1]!;
    expect(promotedNode.task.id).toBe("grandchild");
    expect(promotedNode.depth).toBe(0);
    expect(promotedNode.isOrphaned).toBe(true);
    expect(promotedNode.orphanParentId).toBe("child");
    expect(promotedNode.orphanParentLabel).toBe("Subtask of child");

    // All 3 tasks preserved in flatNodes
    expect(result.flatNodes).toHaveLength(3);
    expect(result.totalLoaded).toBe(3);
  });

  it("handles missing parents (orphans) and uses human-readable parent key if cached", () => {
    const tasks = [
      makeTask({ id: "t1", parentTaskId: "parent-not-in-list", taskKey: "ENG-50", title: "Orphaned Task" }),
    ];

    // Case A: No cache lookup provided -> uses sliced ID fallback
    const resultWithoutCache = buildTaskTree(tasks);
    expect(resultWithoutCache.rootNodes).toHaveLength(1);
    expect(resultWithoutCache.rootNodes[0]!.isOrphaned).toBe(true);
    expect(resultWithoutCache.rootNodes[0]!.orphanParentId).toBe("parent-not-in-list");
    expect(resultWithoutCache.rootNodes[0]!.orphanParentLabel).toBe("Subtask of parent-n");
    expect(resultWithoutCache.orphanedCount).toBe(1);

    // Case B: Authorized cache lookup returns parent key
    const resultWithCache = buildTaskTree(tasks, {
      getParentTaskKey: (id) => (id === "parent-not-in-list" ? "ENG-100" : undefined),
    });
    expect(resultWithCache.rootNodes[0]!.orphanParentLabel).toBe("Subtask of ENG-100");
  });

  it("defensively handles self-parenting (A -> A) without crashing or infinite loop", () => {
    const tasks = [
      makeTask({ id: "t1", parentTaskId: "t1", taskKey: "ENG-1", title: "Self Parent" }),
      makeTask({ id: "t2", parentTaskId: null, taskKey: "ENG-2", title: "Normal Task" }),
    ];
    const result = buildTaskTree(tasks);

    expect(result.rootNodes).toHaveLength(2);
    expect(result.cycleCount).toBe(1);
    const selfParentNode = result.rootNodes.find((n) => n.task.id === "t1");
    expect(selfParentNode).toBeDefined();
    expect(selfParentNode?.depth).toBe(0);
    expect(selfParentNode?.hasCycle).toBe(true);
    expect(selfParentNode?.children).toHaveLength(0);
  });

  it("defensively detects and breaks multi-node cycles (A -> B -> A)", () => {
    const tasks = [
      makeTask({ id: "node-a", parentTaskId: "node-b", taskKey: "ENG-A", title: "Node A" }),
      makeTask({ id: "node-b", parentTaskId: "node-a", taskKey: "ENG-B", title: "Node B" }),
    ];
    const result = buildTaskTree(tasks);

    // Both tasks rendered at root; neither discarded, no stack overflow
    expect(result.totalLoaded).toBe(2);
    expect(result.cycleCount).toBeGreaterThanOrEqual(1);
    expect(result.rootNodes).toHaveLength(2);
    expect(result.flatNodes).toHaveLength(2);
  });

  it("deduplicates identical task IDs deterministically", () => {
    const tasks = [
      makeTask({ id: "dup-1", taskKey: "ENG-1", title: "Original" }),
      makeTask({ id: "dup-1", taskKey: "ENG-1", title: "Duplicate Should Be Skipped" }),
      makeTask({ id: "t2", taskKey: "ENG-2", title: "Other Task" }),
    ];
    const result = buildTaskTree(tasks);

    expect(result.totalLoaded).toBe(2);
    expect(result.duplicateCount).toBe(1);
    expect(result.rootNodes).toHaveLength(2);
    expect(result.rootNodes[0]!.task.title).toBe("Original");
  });

  it("preserves incoming task sorting across sibling groups", () => {
    // Sibling tasks sorted by priority DESC in the incoming array
    const tasks = [
      makeTask({ id: "parent", taskKey: "ENG-1" }),
      makeTask({ id: "child-high", parentTaskId: "parent", priority: "URGENT", taskKey: "ENG-2" }),
      makeTask({ id: "child-med", parentTaskId: "parent", priority: "MEDIUM", taskKey: "ENG-3" }),
      makeTask({ id: "child-low", parentTaskId: "parent", priority: "LOW", taskKey: "ENG-4" }),
    ];
    const result = buildTaskTree(tasks);

    expect(result.rootNodes[0]!.children.map((c) => c.task.priority)).toEqual(["URGENT", "MEDIUM", "LOW"]);
  });

  it("performance benchmark: measures 200 tasks and 1,000 tasks", () => {
    // Generate synthetic dataset of 200 tasks (50 parents with 3 subtasks each + 50 standalone)
    const tasks200: TaskDto[] = [];
    for (let i = 0; i < 50; i++) {
      const parentId = `p-${i}`;
      tasks200.push(makeTask({ id: parentId, taskKey: `ENG-${i}`, title: `Parent ${i}` }));
      for (let j = 0; j < 3; j++) {
        tasks200.push(
          makeTask({
            id: `c-${i}-${j}`,
            parentTaskId: parentId,
            taskKey: `ENG-${i}-${j}`,
            title: `Child ${i}-${j}`,
          })
        );
      }
    }
    expect(tasks200).toHaveLength(200);

    // Benchmark 200 tasks (20 iterations)
    const times200: number[] = [];
    for (let iter = 0; iter < 20; iter++) {
      const start = performance.now();
      const res = buildTaskTree(tasks200, { maxSubtaskDepth: 2 });
      const elapsed = performance.now() - start;
      times200.push(elapsed);
      expect(res.totalLoaded).toBe(200);
    }
    times200.sort((a, b) => a - b);
    const median200 = times200[Math.floor(times200.length / 2)] ?? 0;
    const worst200 = times200[times200.length - 1] ?? 0;

    // Generate synthetic dataset of 1,000 tasks (250 parents with 3 subtasks each)
    const tasks1000: TaskDto[] = [];
    for (let i = 0; i < 250; i++) {
      const parentId = `p1k-${i}`;
      tasks1000.push(makeTask({ id: parentId, taskKey: `TASK-${i}`, title: `Parent 1K ${i}` }));
      for (let j = 0; j < 3; j++) {
        tasks1000.push(
          makeTask({
            id: `c1k-${i}-${j}`,
            parentTaskId: parentId,
            taskKey: `TASK-${i}-${j}`,
            title: `Child 1K ${i}-${j}`,
          })
        );
      }
    }
    expect(tasks1000).toHaveLength(1000);

    // Benchmark 1,000 tasks (20 iterations)
    const times1000: number[] = [];
    for (let iter = 0; iter < 20; iter++) {
      const start = performance.now();
      const res = buildTaskTree(tasks1000, { maxSubtaskDepth: 2 });
      const elapsed = performance.now() - start;
      times1000.push(elapsed);
      expect(res.totalLoaded).toBe(1000);
    }
    times1000.sort((a, b) => a - b);
    const median1000 = times1000[Math.floor(times1000.length / 2)] ?? 0;
    const worst1000 = times1000[times1000.length - 1] ?? 0;

    console.log(
      `[Benchmark Environment: Node/JSDOM via Vitest] 200 tasks: median=${median200.toFixed(2)}ms, worst=${worst200.toFixed(2)}ms | 1000 tasks: median=${median1000.toFixed(2)}ms, worst=${worst1000.toFixed(2)}ms`
    );

    // Both should comfortably pass within milliseconds
    expect(median200).toBeLessThan(10);
    expect(median1000).toBeLessThan(25);
  });

  describe("Batch 4: Filtered Hierarchy & Context-Only Ancestors", () => {
    it("renders matching root tasks normally with isContextOnly = false", () => {
      const tasks = [
        makeTask({ id: "root-1", taskKey: "ENG-1", title: "Matching Root" }),
      ];
      const result = buildTaskTree(tasks, {
        matchingTaskIds: new Set(["root-1"]),
      });

      expect(result.rootNodes).toHaveLength(1);
      expect(result.rootNodes[0]!.isContextOnly).toBe(false);
      expect(result.matchingCount).toBe(1);
      expect(result.contextOnlyCount).toBe(0);
    });

    it("resolves nonmatching parent as context-only ancestor when matching child is present", () => {
      // Child matches filter, parent does not
      const matchingChild = makeTask({
        id: "child-1",
        parentTaskId: "parent-1",
        taskKey: "ENG-105",
        title: "Matching Child",
      });
      const cachedParent = makeTask({
        id: "parent-1",
        parentTaskId: null,
        taskKey: "ENG-101",
        title: "Cached Parent",
      });

      const getAncestorTask = (id: string) => {
        if (id === "parent-1") return cachedParent;
        return undefined;
      };

      const result = buildTaskTree([matchingChild], {
        getAncestorTask,
        matchingTaskIds: new Set(["child-1"]),
        maxSubtaskDepth: 2,
      });

      expect(result.rootNodes).toHaveLength(1);
      const parentNode = result.rootNodes[0]!;
      expect(parentNode.task.id).toBe("parent-1");
      expect(parentNode.task.taskKey).toBe("ENG-101");
      expect(parentNode.isContextOnly).toBe(true);
      expect(parentNode.hasChildren).toBe(true);
      expect(parentNode.children).toHaveLength(1);

      const childNode = parentNode.children[0]!;
      expect(childNode.task.id).toBe("child-1");
      expect(childNode.isContextOnly).toBe(false);

      expect(result.matchingCount).toBe(1);
      expect(result.contextOnlyCount).toBe(1);
      expect(result.totalLoaded).toBe(2);
    });

    it("renders a single context ancestor row when multiple matching descendants share that parent", () => {
      const childA = makeTask({
        id: "child-a",
        parentTaskId: "shared-parent",
        taskKey: "ENG-10",
        title: "Child A",
      });
      const childB = makeTask({
        id: "child-b",
        parentTaskId: "shared-parent",
        taskKey: "ENG-11",
        title: "Child B",
      });
      const sharedParent = makeTask({
        id: "shared-parent",
        parentTaskId: null,
        taskKey: "ENG-1",
        title: "Shared Parent",
      });

      const getAncestorTask = (id: string) => {
        if (id === "shared-parent") return sharedParent;
        return undefined;
      };

      const result = buildTaskTree([childA, childB], {
        getAncestorTask,
        matchingTaskIds: new Set(["child-a", "child-b"]),
        maxSubtaskDepth: 2,
      });

      // Exactly ONE root node for the shared parent (no duplicate rows)
      expect(result.rootNodes).toHaveLength(1);
      const parentNode = result.rootNodes[0]!;
      expect(parentNode.task.id).toBe("shared-parent");
      expect(parentNode.isContextOnly).toBe(true);
      expect(parentNode.children).toHaveLength(2);
      expect(parentNode.children.map((c) => c.task.id)).toEqual(["child-a", "child-b"]);

      expect(result.flatNodes).toHaveLength(3);
      expect(result.contextOnlyCount).toBe(1);
      expect(result.matchingCount).toBe(2);
      expect(result.duplicateCount).toBe(0);
    });

    it("preserves honest orphan fallback when ancestor is not in cache", () => {
      const child = makeTask({
        id: "orphan-child",
        parentTaskId: "missing-parent",
        taskKey: "ENG-999",
        title: "Orphan Child",
      });

      const getAncestorTask = () => undefined;

      const result = buildTaskTree([child], {
        getAncestorTask,
        matchingTaskIds: new Set(["orphan-child"]),
      });

      expect(result.rootNodes).toHaveLength(1);
      const orphanNode = result.rootNodes[0]!;
      expect(orphanNode.task.id).toBe("orphan-child");
      expect(orphanNode.isOrphaned).toBe(true);
      expect(orphanNode.isContextOnly).toBe(false);
      expect(orphanNode.orphanParentId).toBe("missing-parent");
      expect(result.orphanedCount).toBe(1);
      expect(result.contextOnlyCount).toBe(0);
      expect(result.matchingCount).toBe(1);
    });

    it("measures filtered hierarchy benchmark at 200 tasks and 1,000 tasks with context resolution", () => {
      // 50 parents in cache, 150 matching children in tasks
      const cacheMap = new Map<string, TaskDto>();
      const matchingTasks200: TaskDto[] = [];
      const matchingIds200 = new Set<string>();

      for (let i = 0; i < 50; i++) {
        const parentId = `cache-p-${i}`;
        cacheMap.set(parentId, makeTask({ id: parentId, taskKey: `ENG-P-${i}` }));
        for (let j = 0; j < 3; j++) {
          const childId = `c-match-${i}-${j}`;
          matchingTasks200.push(
            makeTask({ id: childId, parentTaskId: parentId, taskKey: `ENG-C-${i}-${j}` })
          );
          matchingIds200.add(childId);
        }
      }

      const getAncestorTask200 = (id: string) => cacheMap.get(id);

      const start200 = performance.now();
      const res200 = buildTaskTree(matchingTasks200, {
        getAncestorTask: getAncestorTask200,
        matchingTaskIds: matchingIds200,
        maxSubtaskDepth: 2,
      });
      const elapsed200 = performance.now() - start200;

      expect(res200.totalLoaded).toBe(200);
      expect(res200.contextOnlyCount).toBe(50);
      expect(res200.matchingCount).toBe(150);
      expect(elapsed200).toBeLessThan(15);
    });
  });
});
