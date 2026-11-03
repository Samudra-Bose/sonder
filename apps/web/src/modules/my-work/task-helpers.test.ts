import { describe, it, expect } from "vitest";
import type { TaskDto, WorkspaceDto } from "./types";
import {
  deriveTaskRelationships,
  processRawTasks,
  filterTasksByRelationship,
  groupTasksTemporally,
} from "./task-helpers";

const mockCurrentUserId = "user-alex-123";

const sampleWorkspaces: WorkspaceDto[] = [
  {
    id: "ws-1",
    communityId: "comm-1",
    name: "Engineering Platform",
    kind: "SHARED",
    keyPrefix: "ENG",
    ownerIds: [mockCurrentUserId],
    myRole: "OWNER",
    taskEditPolicy: "COLLABORATIVE_MEMBER",
    personalWorkspaceAdminPolicy: "AUDITED_BREAK_GLASS",
    coordinatorCanInviteMembers: true,
    maxSubtaskDepth: 2,
    assigneeEditableFieldGroupsAllowed: [],
    assigneeEditableFieldGroupsDefault: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    archivedAt: null,
  },
  {
    id: "ws-2",
    communityId: "comm-1",
    name: "Alex's Personal",
    kind: "PERSONAL",
    keyPrefix: "ALEX",
    ownerIds: [mockCurrentUserId],
    myRole: "OWNER",
    taskEditPolicy: "CREATOR_COORDINATOR_STRICT",
    personalWorkspaceAdminPolicy: "AUDITED_BREAK_GLASS",
    coordinatorCanInviteMembers: true,
    maxSubtaskDepth: 1,
    assigneeEditableFieldGroupsAllowed: [],
    assigneeEditableFieldGroupsDefault: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    archivedAt: null,
  },
];

function createMockTask(overrides: Partial<TaskDto> & { isWatched?: boolean }): TaskDto {
  return {
    id: "task-default-id",
    workspaceId: "ws-1",
    taskKey: "ENG-101",
    title: "Default Title",
    itemType: "TASK",
    statusCategory: "TODO",
    priority: "MEDIUM",
    assigneeIds: [],
    creatorId: "user-other-456",
    dueDate: "2026-11-03",
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
    createdAt: "2026-10-01T12:00:00Z",
    updatedAt: "2026-10-01T12:00:00Z",
    assigneeAssignments: [],
    assigneeEditableFieldGroups: [],
    ...overrides,
  };
}

describe("My Work Task Helpers (VS-02E)", () => {
  describe("deriveTaskRelationships", () => {
    it("identifies ASSIGNED relationship when user is in assigneeIds", () => {
      const task = createMockTask({ assigneeIds: [mockCurrentUserId] });
      const { relationships, primaryRelationship } = deriveTaskRelationships(task, mockCurrentUserId);

      expect(relationships).toContain("ASSIGNED");
      expect(primaryRelationship).toBe("ASSIGNED");
    });

    it("identifies CREATED relationship when creatorId matches user", () => {
      const task = createMockTask({ creatorId: mockCurrentUserId });
      const { relationships, primaryRelationship } = deriveTaskRelationships(task, mockCurrentUserId);

      expect(relationships).toContain("CREATED");
      expect(primaryRelationship).toBe("CREATED");
    });

    it("identifies WATCHING relationship when isWatched is true", () => {
      const task = createMockTask({ isWatched: true });
      const { relationships, primaryRelationship } = deriveTaskRelationships(task, mockCurrentUserId);

      expect(relationships).toContain("WATCHING");
      expect(primaryRelationship).toBe("WATCHING");
    });

    it("enforces canonical relationship priority: ASSIGNED > CREATED > WATCHING", () => {
      // Task with all three relationships
      const task = createMockTask({
        assigneeIds: [mockCurrentUserId],
        creatorId: mockCurrentUserId,
        isWatched: true,
      });
      const { relationships, primaryRelationship } = deriveTaskRelationships(task, mockCurrentUserId);

      expect(relationships).toEqual(["ASSIGNED", "CREATED", "WATCHING"]);
      expect(primaryRelationship).toBe("ASSIGNED");

      // Task with CREATED and WATCHING
      const task2 = createMockTask({
        creatorId: mockCurrentUserId,
        isWatched: true,
      });
      const res2 = deriveTaskRelationships(task2, mockCurrentUserId);
      expect(res2.relationships).toEqual(["CREATED", "WATCHING"]);
      expect(res2.primaryRelationship).toBe("CREATED");
    });
  });

  describe("processRawTasks & De-duplication", () => {
    const referenceDate = "2026-11-03";

    it("strictly de-duplicates tasks by canonical ID", () => {
      const taskA = createMockTask({
        id: "duplicate-id-1",
        title: "Task One",
        dueDate: "2026-11-03",
        assigneeIds: [mockCurrentUserId],
      });
      const taskB = createMockTask({
        id: "duplicate-id-1",
        title: "Task One Duplicate Entry",
        dueDate: "2026-11-03",
        creatorId: mockCurrentUserId,
      });
      const taskC = createMockTask({
        id: "unique-id-2",
        title: "Task Two",
        dueDate: "2026-11-05",
        assigneeIds: [mockCurrentUserId],
      });

      const processed = processRawTasks([taskA, taskB, taskC], sampleWorkspaces, mockCurrentUserId, referenceDate);

      expect(processed).toHaveLength(2);
      expect(processed[0]?.id).toBe("duplicate-id-1");
      expect(processed[1]?.id).toBe("unique-id-2");
    });

    it("enriches task with parent workspace metadata", () => {
      const task = createMockTask({
        id: "task-1",
        workspaceId: "ws-1",
        taskKey: "ENG-200",
        dueDate: "2026-11-03",
        assigneeIds: [mockCurrentUserId],
      });

      const processed = processRawTasks([task], sampleWorkspaces, mockCurrentUserId, referenceDate);

      expect(processed[0]?.workspaceName).toBe("Engineering Platform");
      expect(processed[0]?.workspaceKeyPrefix).toBe("ENG");
      expect(processed[0]?.workspaceKind).toBe("SHARED");
    });

    it("excludes terminal tasks (DONE and CANCELED) from processed results", () => {
      const activeTask = createMockTask({ id: "active-1", statusCategory: "IN_PROGRESS", dueDate: "2026-11-03" });
      const doneTask = createMockTask({ id: "done-1", statusCategory: "DONE", dueDate: "2026-11-03" });
      const cancelledTask = createMockTask({ id: "cancel-1", statusCategory: "CANCELED", dueDate: null });

      const processed = processRawTasks([activeTask, doneTask, cancelledTask], sampleWorkspaces, mockCurrentUserId, referenceDate);

      expect(processed).toHaveLength(1);
      expect(processed[0]?.id).toBe("active-1");
    });
  });

  describe("filterTasksByRelationship", () => {
    const referenceDate = "2026-11-03";
    const taskAssigned = createMockTask({
      id: "t-assigned",
      assigneeIds: [mockCurrentUserId],
      dueDate: "2026-11-03",
    });
    const taskCreated = createMockTask({
      id: "t-created",
      creatorId: mockCurrentUserId,
      dueDate: "2026-11-03",
    });
    const taskWatched = createMockTask({
      id: "t-watched",
      isWatched: true,
      dueDate: "2026-11-03",
    });
    const taskBoth = createMockTask({
      id: "t-both",
      assigneeIds: [mockCurrentUserId],
      creatorId: mockCurrentUserId,
      dueDate: "2026-11-03",
    });

    const items = processRawTasks(
      [taskAssigned, taskCreated, taskWatched, taskBoth],
      sampleWorkspaces,
      mockCurrentUserId,
      referenceDate
    );

    it("returns all unique tasks for ALL filter", () => {
      const filtered = filterTasksByRelationship(items, "ALL");
      expect(filtered).toHaveLength(4);
    });

    it("returns only assigned tasks for ASSIGNED filter", () => {
      const filtered = filterTasksByRelationship(items, "ASSIGNED");
      const ids = filtered.map((t) => t.id);
      expect(ids).toEqual(["t-assigned", "t-both"]);
    });

    it("returns only created tasks for CREATED filter", () => {
      const filtered = filterTasksByRelationship(items, "CREATED");
      const ids = filtered.map((t) => t.id);
      expect(ids).toEqual(["t-created", "t-both"]);
    });

    it("returns only watched tasks for WATCHING filter", () => {
      const filtered = filterTasksByRelationship(items, "WATCHING");
      const ids = filtered.map((t) => t.id);
      expect(ids).toEqual(["t-watched"]);
    });
  });

  describe("groupTasksTemporally & Sorting", () => {
    const referenceDate = "2026-11-03";

    it("partitions tasks into exactly the four approved groups", () => {
      const overdueTask = createMockTask({ id: "t-overdue", dueDate: "2026-11-01" });
      const dueTodayTask = createMockTask({ id: "t-today", dueDate: "2026-11-03" });
      const upcomingTask = createMockTask({ id: "t-upcoming", dueDate: "2026-11-06" });
      const unscheduledTask = createMockTask({ id: "t-unscheduled", dueDate: null });

      const items = processRawTasks(
        [overdueTask, dueTodayTask, upcomingTask, unscheduledTask],
        sampleWorkspaces,
        mockCurrentUserId,
        referenceDate
      );

      const groups = groupTasksTemporally(items);

      expect(groups.overdue).toHaveLength(1);
      expect(groups.dueToday).toHaveLength(1);
      expect(groups.upcoming).toHaveLength(1);
      expect(groups.unscheduled).toHaveLength(1);

      expect(groups.overdue[0]?.id).toBe("t-overdue");
      expect(groups.dueToday[0]?.id).toBe("t-today");
      expect(groups.upcoming[0]?.id).toBe("t-upcoming");
      expect(groups.unscheduled[0]?.id).toBe("t-unscheduled");
    });

    it("sorts unscheduled tasks by canonical priority and creation timestamp", () => {
      const lowTask = createMockTask({
        id: "t-low",
        priority: "LOW",
        dueDate: null,
        createdAt: "2026-10-01T10:00:00Z",
      });
      const urgentTask = createMockTask({
        id: "t-urgent",
        priority: "URGENT",
        dueDate: null,
        createdAt: "2026-10-01T08:00:00Z",
      });
      const highOlder = createMockTask({
        id: "t-high-old",
        priority: "HIGH",
        dueDate: null,
        createdAt: "2026-10-01T05:00:00Z",
      });
      const highNewer = createMockTask({
        id: "t-high-new",
        priority: "HIGH",
        dueDate: null,
        createdAt: "2026-10-01T15:00:00Z",
      });

      const items = processRawTasks(
        [lowTask, urgentTask, highOlder, highNewer],
        sampleWorkspaces,
        mockCurrentUserId,
        referenceDate
      );

      const groups = groupTasksTemporally(items);
      const unscheduledIds = groups.unscheduled.map((t) => t.id);

      // Expected order: URGENT > HIGH (newer before older) > LOW
      expect(unscheduledIds).toEqual(["t-urgent", "t-high-new", "t-high-old", "t-low"]);
    });
  });
});
