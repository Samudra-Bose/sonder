import type { TaskLinkType } from "@/modules/tasks/dependencies/types.js";
import {
  WS_SHARED_ENG_ID,
} from "./my-work.js";

export interface StoredTaskLink {
  id: string;
  workspaceId: string;
  sourceTaskId: string;
  targetTaskId: string;
  type: TaskLinkType;
  createdAt: string;
  // If target is restricted
  isTargetRestricted?: boolean;
}

export const LINK_1_CONFLICT_ID = "018f98a2-link-001-eng101-blocks-eng105";
export const LINK_2_VALID_ID = "018f98a2-link-002-eng102-blocks-eng050";
export const LINK_3_RELATES_ID = "018f98a2-link-003-eng101-relates-eng102";
export const LINK_4_RESTRICTED_ID = "018f98a2-link-004-eng102-restricted";

const INITIAL_TASK_LINKS: StoredTaskLink[] = [
  // 1. ENG-101 BLOCKS ENG-105 (Scheduling conflict: ENG-101 due 2026-10-28 > ENG-105 start 2026-10-25)
  {
    id: LINK_1_CONFLICT_ID,
    workspaceId: WS_SHARED_ENG_ID,
    sourceTaskId: "018f98a2-task-001-overdue-assigned", // ENG-101
    targetTaskId: "018f98a2-task-001-subtask-1", // ENG-105
    type: "BLOCKS",
    createdAt: "2026-10-22T10:00:00Z",
  },
  // 2. ENG-102 BLOCKS ENG-050 (Valid non-conflicting dependency: ENG-102 due 2026-11-03 < ENG-050 start 2026-11-05)
  {
    id: LINK_2_VALID_ID,
    workspaceId: WS_SHARED_ENG_ID,
    sourceTaskId: "018f98a2-task-003-today-assigned-created", // ENG-102
    targetTaskId: "018f98a2-task-011-viewer-readonly", // ENG-050
    type: "BLOCKS",
    createdAt: "2026-11-01T14:30:00Z",
  },
  // 3. ENG-101 RELATES_TO ENG-102
  {
    id: LINK_3_RELATES_ID,
    workspaceId: WS_SHARED_ENG_ID,
    sourceTaskId: "018f98a2-task-001-overdue-assigned", // ENG-101
    targetTaskId: "018f98a2-task-003-today-assigned-created", // ENG-102
    type: "RELATES_TO",
    createdAt: "2026-10-25T11:00:00Z",
  },
  // 4. ENG-102 IS_BLOCKED_BY Restricted Task (cross-workspace or inaccessible)
  {
    id: LINK_4_RESTRICTED_ID,
    workspaceId: WS_SHARED_ENG_ID,
    sourceTaskId: "018f98a2-task-003-today-assigned-created", // ENG-102
    targetTaskId: "018f98a2-task-restricted-cross-ws",
    type: "IS_BLOCKED_BY",
    createdAt: "2026-10-29T16:00:00Z",
    isTargetRestricted: true,
  },
];

let currentTaskLinks: StoredTaskLink[] = [...INITIAL_TASK_LINKS];

export function getMockTaskLinks(): StoredTaskLink[] {
  return currentTaskLinks;
}

export function setMockTaskLinks(links: StoredTaskLink[]): void {
  currentTaskLinks = links;
}

export function resetMockTaskLinks(): void {
  currentTaskLinks = [...INITIAL_TASK_LINKS];
}
