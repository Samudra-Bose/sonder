import type { TaskDto } from "@/modules/my-work/types";

export const MOCK_USER_ID = "018f98a2-3f12-7890-a123-456789abcdef"; // Alex Morgan
export const OTHER_USER_ID = "018f98a2-3f12-7890-c999-456789abcdef"; // Jordan Lee

export const MOCK_COMMUNITY_1_ID = "018f98a2-3f12-7890-b123-456789abcdef"; // Sonder Community
export const MOCK_COMMUNITY_2_ID = "018f98a2-3f12-7890-b999-456789abcdef"; // Regional Arts Guild

export const WS_PERSONAL_ALEX_ID = "018f98a2-3f12-7890-w001-456789abcdef";
export const WS_SHARED_ENG_ID = "018f98a2-3f12-7890-w002-456789abcdef";
export const WS_SHARED_GALA_ID = "018f98a2-3f12-7890-w003-456789abcdef";
export const WS_SHARED_OUT_ID = "018f98a2-3f12-7890-w004-456789abcdef";

/**
 * Standard reference date used for deterministic mock fixtures: 2026-11-03
 * - Overdue: dueDate < 2026-11-03
 * - Due Today: dueDate === 2026-11-03
 * - Upcoming: 2026-11-04 to 2026-11-09 (<= 2026-11-03 + 6 days)
 * - Unscheduled: dueDate is null
 */
export const MOCK_REFERENCE_DATE = "2026-11-03";

export interface MockTaskDto extends TaskDto {
  isWatched?: boolean;
  watcherIds?: string[];
}

function makePermissions(canEdit = true): TaskDto["effectivePermissions"] {
  return {
    canEditTitleDescription: canEdit,
    canEditDatesPriority: canEdit,
    canEditCustomFieldsLinks: canEdit,
    canEditEstimate: canEdit,
    canUpdateStatus: canEdit,
    canRequestSignoff: false,
    canApproveSignoff: false,
    canAssign: canEdit,
    canManageSubtasks: canEdit,
    canCreateSubtask: canEdit,
    canMove: canEdit,
    canComment: true,
    canWatch: true,
    canArchive: canEdit,
    canRestore: canEdit,
    canDeletePermanent: false,
    restrictedActions: [],
    canManageAssigneeFieldGrants: false,
  };
}

function makeAssignments(
  userIds: string[],
  assignedBy = OTHER_USER_ID,
  assignedAt = "2026-10-20T09:00:00Z"
): TaskDto["assigneeAssignments"] {
  return userIds.map((uid) => ({
    user: {
      id: uid,
      displayName: uid === MOCK_USER_ID ? "Alex Morgan" : "Jordan Lee",
      avatarUrl: null,
    },
    userId: uid,
    assignedByUserId: assignedBy,
    assignedAt,
  }));
}

export const mockTasksCommunity1: MockTaskDto[] = [
  // --- 1. OVERDUE TASKS (dueDate < 2026-11-03) ---
  {
    id: "018f98a2-task-001-overdue-assigned",
    workspaceId: WS_SHARED_ENG_ID,
    taskKey: "ENG-101",
    title: "Fix critical auth token refresh race condition",
    description: "Session token renewal intermittent failure on parallel requests",
    itemType: "TASK",
    statusCategory: "IN_PROGRESS",
    priority: "URGENT",
    assigneeIds: [MOCK_USER_ID],
    creatorId: OTHER_USER_ID,
    dueDate: "2026-10-28", // Overdue by 6 days
    version: 3,
    fieldRevisions: {},
    effectivePermissions: makePermissions(true),
    createdAt: "2026-10-20T09:00:00Z",
    updatedAt: "2026-10-28T14:30:00Z",
    assigneeAssignments: makeAssignments([MOCK_USER_ID], OTHER_USER_ID),
    assigneeEditableFieldGroups: [],
  },
  {
    id: "018f98a2-task-002-overdue-created",
    workspaceId: WS_SHARED_GALA_ID,
    taskKey: "GALA-201",
    title: "Approve final catering vendor contract",
    description: "Review contract terms for spring gala banquet services",
    itemType: "TASK",
    statusCategory: "TODO",
    priority: "HIGH",
    assigneeIds: [OTHER_USER_ID],
    creatorId: MOCK_USER_ID, // Created by Alex
    dueDate: "2026-11-01", // Overdue by 2 days
    version: 1,
    fieldRevisions: {},
    effectivePermissions: makePermissions(true),
    createdAt: "2026-10-22T11:00:00Z",
    updatedAt: "2026-10-22T11:00:00Z",
    assigneeAssignments: makeAssignments([OTHER_USER_ID], MOCK_USER_ID),
    assigneeEditableFieldGroups: [],
  },

  // --- 2. DUE TODAY TASKS (dueDate === 2026-11-03) ---
  {
    id: "018f98a2-task-003-today-assigned-created",
    workspaceId: WS_SHARED_ENG_ID,
    taskKey: "ENG-102",
    title: "Ship VS-02E My Work cross-workspace dashboard",
    description: "Personal triage experience covering overdue, today, upcoming, and unscheduled",
    itemType: "TASK",
    statusCategory: "IN_PROGRESS",
    priority: "HIGH",
    assigneeIds: [MOCK_USER_ID], // Assigned to Alex
    creatorId: MOCK_USER_ID, // Created by Alex
    dueDate: "2026-11-03", // Due Today!
    version: 2,
    fieldRevisions: {},
    effectivePermissions: makePermissions(true),
    createdAt: "2026-11-01T10:00:00Z",
    updatedAt: "2026-11-03T08:00:00Z",
    assigneeAssignments: makeAssignments([MOCK_USER_ID], MOCK_USER_ID),
    assigneeEditableFieldGroups: [],
  },
  {
    id: "018f98a2-task-004-today-personal",
    workspaceId: WS_PERSONAL_ALEX_ID, // In Alex's personal workspace
    taskKey: "ALEX-1",
    title: "Review quarter 4 personal development goals",
    description: "Personal note and self-reflection metrics",
    itemType: "TASK",
    statusCategory: "TODO",
    priority: "MEDIUM",
    assigneeIds: [MOCK_USER_ID],
    creatorId: MOCK_USER_ID,
    dueDate: "2026-11-03", // Due Today!
    version: 1,
    fieldRevisions: {},
    effectivePermissions: makePermissions(true),
    createdAt: "2026-10-30T16:00:00Z",
    updatedAt: "2026-10-30T16:00:00Z",
    assigneeAssignments: makeAssignments([MOCK_USER_ID], MOCK_USER_ID),
    assigneeEditableFieldGroups: [],
  },

  // --- 3. UPCOMING TASKS (2026-11-04 <= dueDate <= 2026-11-09) ---
  {
    id: "018f98a2-task-005-upcoming-watched",
    workspaceId: WS_SHARED_ENG_ID,
    taskKey: "ENG-103",
    title: "Database schema migration rehearsal drill",
    description: "Dry-run execution of partition tables and RLS policy verification",
    itemType: "TASK",
    statusCategory: "TODO",
    priority: "HIGH",
    assigneeIds: [OTHER_USER_ID],
    creatorId: OTHER_USER_ID,
    isWatched: true, // Watched by Alex!
    watcherIds: [MOCK_USER_ID],
    dueDate: "2026-11-05", // 2 days in future
    version: 1,
    fieldRevisions: {},
    effectivePermissions: makePermissions(false),
    createdAt: "2026-10-29T13:00:00Z",
    updatedAt: "2026-10-29T13:00:00Z",
    assigneeAssignments: makeAssignments([OTHER_USER_ID], OTHER_USER_ID),
    assigneeEditableFieldGroups: [],
  },
  {
    id: "018f98a2-task-006-upcoming-outreach",
    workspaceId: WS_SHARED_OUT_ID,
    taskKey: "OUT-301",
    title: "Onboard 5 new volunteer coordinators",
    description: "Send invitation emails and conduct initial orientation briefing",
    itemType: "TASK",
    statusCategory: "IN_PROGRESS",
    priority: "MEDIUM",
    assigneeIds: [MOCK_USER_ID],
    creatorId: OTHER_USER_ID,
    dueDate: "2026-11-08", // 5 days in future (within 6 days upper bound)
    version: 2,
    fieldRevisions: {},
    effectivePermissions: makePermissions(true),
    createdAt: "2026-10-25T14:00:00Z",
    updatedAt: "2026-10-25T14:00:00Z",
    assigneeAssignments: makeAssignments([MOCK_USER_ID], OTHER_USER_ID),
    assigneeEditableFieldGroups: [],
  },

  // --- 4. UNSCHEDULED TASKS (dueDate is null or empty) ---
  {
    id: "018f98a2-task-007-unscheduled-urgent",
    workspaceId: WS_SHARED_ENG_ID,
    taskKey: "ENG-104",
    title: "Audit WebAuthn passkey registration fallback flow",
    description: "Ensure hardware token failure falls back to magic link seamlessly",
    itemType: "TASK",
    statusCategory: "BACKLOG",
    priority: "URGENT",
    assigneeIds: [MOCK_USER_ID],
    creatorId: OTHER_USER_ID,
    dueDate: null, // Unscheduled!
    version: 1,
    fieldRevisions: {},
    effectivePermissions: makePermissions(true),
    createdAt: "2026-11-02T18:00:00Z",
    updatedAt: "2026-11-02T18:00:00Z",
    assigneeAssignments: makeAssignments([MOCK_USER_ID], OTHER_USER_ID),
    assigneeEditableFieldGroups: [],
  },
  {
    id: "018f98a2-task-008-unscheduled-personal-high",
    workspaceId: WS_PERSONAL_ALEX_ID,
    taskKey: "ALEX-2",
    title: "Prepare talking points for executive committee sync",
    description: "Cross-workspace triage dashboard progress report",
    itemType: "TASK",
    statusCategory: "TODO",
    priority: "HIGH",
    assigneeIds: [MOCK_USER_ID],
    creatorId: MOCK_USER_ID,
    dueDate: null, // Unscheduled!
    version: 1,
    fieldRevisions: {},
    effectivePermissions: makePermissions(true),
    createdAt: "2026-11-01T09:00:00Z",
    updatedAt: "2026-11-01T09:00:00Z",
    assigneeAssignments: makeAssignments([MOCK_USER_ID], MOCK_USER_ID),
    assigneeEditableFieldGroups: [],
  },

  // --- 5. TERMINAL TASKS (DONE / CANCELED - MUST BE STRICTLY EXCLUDED) ---
  {
    id: "018f98a2-task-009-completed-done",
    workspaceId: WS_SHARED_ENG_ID,
    taskKey: "ENG-099",
    title: "Implement VS-02D Omnibar palette",
    description: "Completed slice merged into develop",
    itemType: "TASK",
    statusCategory: "DONE", // Terminal -> must NOT appear in active triage
    priority: "HIGH",
    assigneeIds: [MOCK_USER_ID],
    creatorId: MOCK_USER_ID,
    dueDate: "2026-11-02",
    version: 5,
    fieldRevisions: {},
    effectivePermissions: makePermissions(false),
    createdAt: "2026-10-15T09:00:00Z",
    updatedAt: "2026-11-03T12:00:00Z",
    assigneeAssignments: makeAssignments([MOCK_USER_ID], MOCK_USER_ID),
    assigneeEditableFieldGroups: [],
  },
  {
    id: "018f98a2-task-010-completed-cancelled",
    workspaceId: WS_SHARED_GALA_ID,
    taskKey: "GALA-190",
    title: "Deprecated legacy spreadsheet export script",
    description: "Replaced by direct community API export",
    itemType: "TASK",
    statusCategory: "CANCELED", // Terminal -> must NOT appear in active triage
    priority: "LOW",
    assigneeIds: [MOCK_USER_ID],
    creatorId: OTHER_USER_ID,
    dueDate: "2026-10-25",
    version: 2,
    fieldRevisions: {},
    effectivePermissions: makePermissions(false),
    createdAt: "2026-10-10T11:00:00Z",
    updatedAt: "2026-10-26T15:00:00Z",
    assigneeAssignments: makeAssignments([MOCK_USER_ID], OTHER_USER_ID),
    assigneeEditableFieldGroups: [],
  },
];
