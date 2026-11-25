import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTaskTreeExpansion } from "./useTaskTreeExpansion.js";
import { buildTaskTree } from "./buildTaskTree.js";
import type { TaskDto } from "../types.js";

function makeTask(overrides: Partial<TaskDto>): TaskDto {
  return {
    id: overrides.id ?? "task-id",
    workspaceId: "ws-1",
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

describe("useTaskTreeExpansion Hook", () => {
  const sampleTasks: TaskDto[] = [
    makeTask({ id: "p1", taskKey: "ENG-P1", title: "Parent Item One" }),
    makeTask({ id: "c1", parentTaskId: "p1", taskKey: "ENG-C1", title: "Child Authentication Fix" }),
    makeTask({ id: "p2", taskKey: "ENG-P2", title: "Parent Item Two" }),
    makeTask({ id: "c2", parentTaskId: "p2", taskKey: "ENG-C2", title: "Child Styling" }),
  ];

  it("starts collapsed by default: visibleNodes contains only root nodes", () => {
    const tree = buildTaskTree(sampleTasks);
    const { result } = renderHook(() =>
      useTaskTreeExpansion({
        workspaceId: "ws-1",
        treeResult: tree,
      })
    );

    expect(result.current.effectiveExpandedIds.size).toBe(0);
    expect(result.current.visibleNodes.map((n) => n.task.id)).toEqual(["p1", "p2"]);
    expect(result.current.isExpanded("p1")).toBe(false);
    expect(result.current.isExpanded("p2")).toBe(false);
  });

  it("expands an individual parent when toggled, revealing only its children", () => {
    const tree = buildTaskTree(sampleTasks);
    const { result } = renderHook(() =>
      useTaskTreeExpansion({
        workspaceId: "ws-1",
        treeResult: tree,
      })
    );

    act(() => {
      result.current.toggleExpanded("p1");
    });

    expect(result.current.isExpanded("p1")).toBe(true);
    expect(result.current.isExpanded("p2")).toBe(false);
    expect(result.current.visibleNodes.map((n) => n.task.id)).toEqual(["p1", "c1", "p2"]);

    // Collapsing p1 hides c1
    act(() => {
      result.current.toggleExpanded("p1");
    });

    expect(result.current.isExpanded("p1")).toBe(false);
    expect(result.current.visibleNodes.map((n) => n.task.id)).toEqual(["p1", "p2"]);
  });

  it("resets manual expansion state when workspaceId changes", () => {
    const tree = buildTaskTree(sampleTasks);
    let currentWs = "ws-1";

    const { result, rerender } = renderHook(
      ({ wsId }) =>
        useTaskTreeExpansion({
          workspaceId: wsId,
          treeResult: tree,
        }),
      { initialProps: { wsId: currentWs } }
    );

    act(() => {
      result.current.toggleExpanded("p1");
    });
    expect(result.current.isExpanded("p1")).toBe(true);

    // Switch workspace
    rerender({ wsId: "ws-2" });

    // Expansion should reset to collapsed default
    expect(result.current.isExpanded("p1")).toBe(false);
    expect(result.current.effectiveExpandedIds.size).toBe(0);
    expect(result.current.visibleNodes.map((n) => n.task.id)).toEqual(["p1", "p2"]);
  });

  it("auto-expands ancestors when search query matches a descendant, restoring manual state when cleared", () => {
    const tree = buildTaskTree(sampleTasks);
    let query = "";

    const { result, rerender } = renderHook(
      ({ q }) =>
        useTaskTreeExpansion({
          workspaceId: "ws-1",
          treeResult: tree,
          searchQuery: q,
        }),
      { initialProps: { q: query } }
    );

    // User initially has no manual expansions
    expect(result.current.effectiveExpandedIds.size).toBe(0);

    // Search for "authentication", which is in child "c1"
    rerender({ q: "authentication" });

    expect(result.current.searchAutoExpandedIds).toEqual(new Set(["p1"]));
    expect(result.current.effectiveExpandedIds).toEqual(new Set(["p1"]));
    expect(result.current.isExpanded("p1")).toBe(true);
    expect(result.current.visibleNodes.map((n) => n.task.id)).toEqual(["p1", "c1", "p2"]);

    // User manually expands p2 while search is active
    act(() => {
      result.current.toggleExpanded("p2");
    });
    expect(result.current.manualExpandedIds).toEqual(new Set(["p2"]));

    // Clear search
    rerender({ q: "" });

    // searchAutoExpandedIds clears; p1 collapses back, p2 remains manually expanded
    expect(result.current.searchAutoExpandedIds.size).toBe(0);
    expect(result.current.effectiveExpandedIds).toEqual(new Set(["p2"]));
    expect(result.current.isExpanded("p1")).toBe(false);
    expect(result.current.isExpanded("p2")).toBe(true);
    expect(result.current.visibleNodes.map((n) => n.task.id)).toEqual(["p1", "p2", "c2"]);
  });

  it("supports expandAll and collapseAll actions", () => {
    const tree = buildTaskTree(sampleTasks);
    const { result } = renderHook(() =>
      useTaskTreeExpansion({
        workspaceId: "ws-1",
        treeResult: tree,
      })
    );

    act(() => {
      result.current.expandAll();
    });

    expect(result.current.isExpanded("p1")).toBe(true);
    expect(result.current.isExpanded("p2")).toBe(true);
    expect(result.current.visibleNodes.length).toBe(4);

    act(() => {
      result.current.collapseAll();
    });

    expect(result.current.isExpanded("p1")).toBe(false);
    expect(result.current.isExpanded("p2")).toBe(false);
    expect(result.current.visibleNodes.length).toBe(2);
  });
});
