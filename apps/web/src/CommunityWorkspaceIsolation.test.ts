import { describe, it, expect, beforeEach } from "vitest";
import {
  findMockWorkspace,
  mockWorkspacesByCommunityId,
  mockWorkspacesCommunity1,
  mockWorkspacesCommunity2,
  resetWorkspacesDataState,
} from "./mocks/data/workspaces.js";
import { resetWorkspaceMockState } from "./mocks/handlers/workspaces.js";
import { resetTaskMockState } from "./mocks/handlers/tasks.js";
import { resetCustomFieldsMockState } from "./mocks/handlers/custom-fields.js";
import { resetMockAuditState } from "./mocks/handlers/audit.js";

describe("Sonder — Community Workspace Isolation & Handler Verification (Cases A-G)", () => {
  const COMMUNITY_1 = "018f98a2-3f12-7890-b123-456789abcdef"; // Sonder Community
  const COMMUNITY_2 = "018f98a2-3f12-7890-b999-456789abcdef"; // Regional Arts Guild
  const UNKNOWN_COMMUNITY = "018f98a2-3f12-7890-b000-000000000000";

  const WS_COMMUNITY_1 = "018f98a2-3f12-7890-w001-456789abcdef"; // Engineering Platform (in Comm 1)
  const WS_COMMUNITY_2 = "018f98a2-3f12-7890-w005-456789abcdef"; // Alex Morgan's Studio (in Comm 2)
  const UNKNOWN_WS = "018f98a2-3f12-7890-w999-999999999999";

  beforeEach(() => {
    resetWorkspaceMockState();
    resetTaskMockState();
    resetCustomFieldsMockState();
    resetMockAuditState();
  });

  describe("Resolver Strictness Invariants (findMockWorkspace)", () => {
    // Case A: Request workspace in its own community -> 200 / workspace returned
    it("Case A: returns workspace when queried with its own parent communityId", () => {
      const ws1 = findMockWorkspace(WS_COMMUNITY_1, COMMUNITY_1);
      expect(ws1).toBeDefined();
      expect(ws1?.id).toBe(WS_COMMUNITY_1);
      expect(ws1?.communityId).toBe(COMMUNITY_1);

      const ws2 = findMockWorkspace(WS_COMMUNITY_2, COMMUNITY_2);
      expect(ws2).toBeDefined();
      expect(ws2?.id).toBe(WS_COMMUNITY_2);
      expect(ws2?.communityId).toBe(COMMUNITY_2);
    });

    // Case B: Request workspace in a different community -> undefined / 404
    it("Case B: returns undefined when workspace is queried under a mismatched communityId (no fallback)", () => {
      // WS 1 belongs to Community 1, requested under Community 2
      const crossWs1 = findMockWorkspace(WS_COMMUNITY_1, COMMUNITY_2);
      expect(crossWs1).toBeUndefined();

      // WS 2 belongs to Community 2, requested under Community 1
      const crossWs2 = findMockWorkspace(WS_COMMUNITY_2, COMMUNITY_1);
      expect(crossWs2).toBeUndefined();
    });

    // Case C: Dynamic workspace in newly created community -> 200 in own, undefined in others
    it("Case C: dynamic workspace in newly created community is isolated to that community", () => {
      const DYNAMIC_COMMUNITY = "018f98a2-3f12-7890-bnew-111111111111";
      const DYNAMIC_WS = "018f98a2-3f12-7890-wnew-222222222222";

      // Register dynamic workspace in dynamic community
      mockWorkspacesByCommunityId[DYNAMIC_COMMUNITY] = [
        {
          id: DYNAMIC_WS,
          communityId: DYNAMIC_COMMUNITY,
          name: "Dynamic QA Workspace",
          kind: "SHARED",
          keyPrefix: "DQA",
          ownerIds: ["018f98a2-3f12-7890-a123-456789abcdef"],
          myRole: "OWNER",
          effectiveCapabilities: [],
          taskEditPolicy: "CREATOR_COORDINATOR_STRICT",
          personalWorkspaceAdminPolicy: "AUDITED_BREAK_GLASS",
          coordinatorCanInviteMembers: true,
          maxSubtaskDepth: 1,
          assigneeEditableFieldGroupsAllowed: [],
          assigneeEditableFieldGroupsDefault: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
        },
      ];

      // Found in own community
      expect(findMockWorkspace(DYNAMIC_WS, DYNAMIC_COMMUNITY)).toBeDefined();

      // Rejected in Community 1
      expect(findMockWorkspace(DYNAMIC_WS, COMMUNITY_1)).toBeUndefined();

      // Rejected in Community 2
      expect(findMockWorkspace(DYNAMIC_WS, COMMUNITY_2)).toBeUndefined();
    });

    // Case D: Seeded workspaces accessible via their own community
    it("Case D: all seeded workspaces are accessible via their respective community IDs", () => {
      for (const seeded of mockWorkspacesCommunity1) {
        const found = findMockWorkspace(seeded.id, COMMUNITY_1);
        expect(found).toBeDefined();
        expect(found?.id).toBe(seeded.id);
      }

      for (const seeded of mockWorkspacesCommunity2) {
        const found = findMockWorkspace(seeded.id, COMMUNITY_2);
        expect(found).toBeDefined();
        expect(found?.id).toBe(seeded.id);
      }
    });

    // Case F: Unknown community ID -> undefined
    it("Case F: returns undefined when an unknown community ID is passed", () => {
      expect(findMockWorkspace(WS_COMMUNITY_1, UNKNOWN_COMMUNITY)).toBeUndefined();
      expect(findMockWorkspace(WS_COMMUNITY_2, UNKNOWN_COMMUNITY)).toBeUndefined();
      expect(findMockWorkspace(UNKNOWN_WS, UNKNOWN_COMMUNITY)).toBeUndefined();
    });

    // Case G: Resetting state cleans dynamically added workspaces without leaking
    it("Case G: resetWorkspacesDataState() evicts dynamic workspaces and restores initial fixtures", () => {
      const LEAK_COMMUNITY = "018f98a2-3f12-7890-leak-000000000000";
      const LEAK_WS = "018f98a2-3f12-7890-leak-111111111111";

      mockWorkspacesByCommunityId[LEAK_COMMUNITY] = [
        {
          id: LEAK_WS,
          communityId: LEAK_COMMUNITY,
          name: "Leaky Workspace",
          kind: "SHARED",
          keyPrefix: "LEAK",
          ownerIds: [],
          myRole: "OWNER",
          effectiveCapabilities: [],
          taskEditPolicy: "CREATOR_COORDINATOR_STRICT",
          personalWorkspaceAdminPolicy: "AUDITED_BREAK_GLASS",
          coordinatorCanInviteMembers: false,
          maxSubtaskDepth: 1,
          assigneeEditableFieldGroupsAllowed: [],
          assigneeEditableFieldGroupsDefault: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
        },
      ];

      expect(findMockWorkspace(LEAK_WS, LEAK_COMMUNITY)).toBeDefined();

      // Execute reset
      resetWorkspacesDataState();

      // Dynamic community should no longer exist
      expect(mockWorkspacesByCommunityId[LEAK_COMMUNITY]).toBeUndefined();
      expect(findMockWorkspace(LEAK_WS, LEAK_COMMUNITY)).toBeUndefined();
    });

    it("allows unscoped lookup across communities only when communityId is omitted", () => {
      // Unscoped lookup searches all communities
      const ws1 = findMockWorkspace(WS_COMMUNITY_1);
      expect(ws1).toBeDefined();
      expect(ws1?.id).toBe(WS_COMMUNITY_1);

      const ws2 = findMockWorkspace(WS_COMMUNITY_2);
      expect(ws2).toBeDefined();
      expect(ws2?.id).toBe(WS_COMMUNITY_2);

      expect(findMockWorkspace(UNKNOWN_WS)).toBeUndefined();
    });
  });

  describe("API Handler Cross-Community Negative Tests (Case E)", () => {
    // Case E: Audit, custom fields, tasks reject mismatched community-workspace pairs with 404
    it("Case E1: Workspace members endpoint returns 404 Problem Details when community/workspace are mismatched", async () => {
      // WS_COMMUNITY_1 belongs to COMMUNITY_1, but we request under COMMUNITY_2
      const res = await fetch(
        `/api/v1/communities/${COMMUNITY_2}/workspaces/${WS_COMMUNITY_1}/members`
      );
      expect(res.status).toBe(404);
      const problem = await res.json();
      expect(problem.status).toBe(404);
      expect(problem.code).toBe("WORKSPACE_NOT_FOUND");
    });

    it("Case E2: Workspace roles endpoint returns 404 Problem Details when community/workspace are mismatched", async () => {
      const res = await fetch(
        `/api/v1/communities/${COMMUNITY_2}/workspaces/${WS_COMMUNITY_1}/roles`
      );
      expect(res.status).toBe(404);
      const problem = await res.json();
      expect(problem.status).toBe(404);
      expect(problem.code).toBe("WORKSPACE_NOT_FOUND");
    });

    it("Case E3: Audit events endpoint returns 404 Problem Details when community/workspace are mismatched", async () => {
      const res = await fetch(
        `/api/v1/communities/${COMMUNITY_2}/workspaces/${WS_COMMUNITY_1}/audit-events`
      );
      expect(res.status).toBe(404);
      const problem = await res.json();
      expect(problem.status).toBe(404);
      expect(problem.code).toBe("RESOURCE_NOT_FOUND");
    });

    it("Case E4: Custom fields endpoint returns 404 Problem Details when community/workspace are mismatched", async () => {
      const res = await fetch(
        `/api/v1/communities/${COMMUNITY_2}/workspaces/${WS_COMMUNITY_1}/custom-fields`
      );
      expect(res.status).toBe(404);
      const problem = await res.json();
      expect(problem.status).toBe(404);
      expect(problem.code).toBe("RESOURCE_NOT_FOUND");
    });

    it("Case E5: Tasks query endpoint returns 404 Problem Details when community/workspace are mismatched", async () => {
      const res = await fetch(
        `/api/v1/communities/${COMMUNITY_2}/workspaces/${WS_COMMUNITY_1}/tasks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": "mock-session-csrf-token",
            "X-Mutation-Id": "018f98a2-3f12-7890-a123-456789abcdef",
          },
          body: JSON.stringify({ title: "Cross-community injection attempt" }),
        }
      );
      expect(res.status).toBe(404);
      const problem = await res.json();
      expect(problem.status).toBe(404);
      expect(problem.code).toBe("WORKSPACE_NOT_FOUND");
    });

    it("Case E6: Tasks by-key endpoint returns 404 Problem Details when community/workspace are mismatched", async () => {
      const res = await fetch(
        `/api/v1/communities/${COMMUNITY_2}/workspaces/${WS_COMMUNITY_1}/tasks/by-key/ENG-1`
      );
      expect(res.status).toBe(404);
      const problem = await res.json();
      expect(problem.status).toBe(404);
      expect(problem.code).toBe("WORKSPACE_NOT_FOUND");
    });

    it("Case E7: Unknown community returns 404 Problem Details on GET /workspaces", async () => {
      const res = await fetch(
        `/api/v1/communities/${UNKNOWN_COMMUNITY}/workspaces`
      );
      expect(res.status).toBe(404);
      const problem = await res.json();
      expect(problem.status).toBe(404);
      expect(problem.code).toBe("COMMUNITY_NOT_FOUND");
    });
  });

  describe("Task Assignment, Unassignment & Permission Invariants", () => {
    const TASK_ALEX_1 = "018f98a2-task-004-today-personal";
    const WS_PERSONAL = "018f98a2-3f12-7890-w002-456789abcdef";
    const TASK_READ_ONLY = "018f98a2-task-009-completed-done"; // has canAssign: false

    it("successfully unassigns a task by sending assigneeIds: []", async () => {
      // Alex-1 is initially assigned to Alex Morgan
      const res = await fetch(
        `/api/v1/communities/${COMMUNITY_1}/workspaces/${WS_PERSONAL}/tasks/${TASK_ALEX_1}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": "mock-session-csrf-token",
            "X-Mutation-Id": "018f98a2-3f12-7890-a123-456789unassign",
          },
          body: JSON.stringify({
            assigneeIds: [],
            baseFieldRevisions: { assigneeIds: 1 },
          }),
        }
      );

      expect(res.status).toBe(200);
      const updated = await res.json();
      expect(updated.assigneeIds).toEqual([]);
      expect(updated.assigneeAssignments).toEqual([]);
    });

    it("fails closed with 403 Permission Denied when task has canAssign: false", async () => {
      const res = await fetch(
        `/api/v1/communities/${COMMUNITY_1}/workspaces/${WS_COMMUNITY_1}/tasks/${TASK_READ_ONLY}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": "mock-session-csrf-token",
            "X-Mutation-Id": "018f98a2-3f12-7890-a123-456789failclosed",
          },
          body: JSON.stringify({
            assigneeIds: ["018f98a2-3f12-7890-a123-456789bbcdef"],
            baseFieldRevisions: { assigneeIds: 1 },
          }),
        }
      );

      expect(res.status).toBe(403);
      const problem = await res.json();
      expect(problem.status).toBe(403);
      expect(problem.code).toBe("PERMISSION_DENIED");
      expect(problem.detail).toMatch(/permission to modify task assignees/i);
    });

    it("rejects task updates with 409 Conflict when baseFieldRevisions mismatch", async () => {
      const res = await fetch(
        `/api/v1/communities/${COMMUNITY_1}/workspaces/${WS_PERSONAL}/tasks/${TASK_ALEX_1}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": "mock-session-csrf-token",
            "X-Mutation-Id": "018f98a2-3f12-7890-a123-456789conflict1",
          },
          body: JSON.stringify({
            title: "Stale revision update",
            baseFieldRevisions: { title: 999 }, // Stale revision
          }),
        }
      );

      expect(res.status).toBe(409);
      const problem = await res.json();
      expect(problem.status).toBe(409);
      expect(problem.code).toBe("REVISION_CONFLICT");
    });
  });
});
