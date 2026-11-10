import type { ApiSchema } from "@sonder/contracts";
import { parseMarkdownToAst } from "../../modules/tasks/comments/markdown-ast.js";
import { MOCK_USER_ID, OTHER_USER_ID } from "./my-work.js";

export type CommentDto = ApiSchema<"CommentDto">;
export type TaskActivityDto = ApiSchema<"TaskActivityDto">;
export type ActivityEntryDto = ApiSchema<"ActivityEntryDto">;
export type MentionCandidateDto = ApiSchema<"MentionCandidateDto">;

export const MOCK_USER_SAM_ID = "018f98a2-3f12-7890-d111-456789abcdef";
export const MOCK_USER_FORMER_ID = "018f98a2-3f12-7890-d999-456789abcdef";

export const initialMockMentionCandidates: MentionCandidateDto[] = [
  {
    userId: MOCK_USER_ID,
    displayName: "Alex Morgan",
    avatarUrl: null,
  },
  {
    userId: OTHER_USER_ID,
    displayName: "Jordan Lee",
    avatarUrl: null,
  },
  {
    userId: MOCK_USER_SAM_ID,
    displayName: "Sam Chen",
    avatarUrl: null,
  },
];

export const COMMENT_1_ID = "018f98a2-comm-001-jordan-analysis";
export const COMMENT_2_ID = "018f98a2-comm-002-alex-reply";

const comment1Body = "Identified root cause in token-renewal.ts: parallel requests trigger duplicate refresh calls. CC @[Alex Morgan](user:018f98a2-3f12-7890-a123-456789abcdef)";
const comment2Body = "Agreed. Will also check #ENG-102 to make sure regression tests cover this flow.";

export const initialMockComments: CommentDto[] = [
  {
    id: COMMENT_1_ID,
    taskId: "018f98a2-task-001-overdue-assigned",
    authorId: OTHER_USER_ID,
    author: {
      id: OTHER_USER_ID,
      displayName: "Jordan Lee",
      avatarUrl: null,
      isFormerMember: false,
    },
    parentCommentId: null,
    body: comment1Body,
    bodyAst: parseMarkdownToAst(comment1Body),
    mentions: [
      {
        userId: MOCK_USER_ID,
        displayName: "Alex Morgan",
        isFormerMember: false,
      },
    ],
    createdAt: "2026-10-28T15:00:00Z",
    editedAt: null,
    deletedAt: null,
    isDeleted: false,
    version: 1,
  },
  {
    id: COMMENT_2_ID,
    taskId: "018f98a2-task-001-overdue-assigned",
    authorId: MOCK_USER_ID,
    author: {
      id: MOCK_USER_ID,
      displayName: "Alex Morgan",
      avatarUrl: null,
      isFormerMember: false,
    },
    parentCommentId: COMMENT_1_ID,
    body: comment2Body,
    bodyAst: parseMarkdownToAst(comment2Body),
    mentions: [],
    createdAt: "2026-10-28T15:30:00Z",
    editedAt: null,
    deletedAt: null,
    isDeleted: false,
    version: 1,
  },
];

export const initialMockActivity: ActivityEntryDto[] = [
  {
    id: "018f98a2-act-001-created",
    eventType: "task.created",
    actor: {
      id: OTHER_USER_ID,
      displayName: "Jordan Lee",
      avatarUrl: null,
    },
    occurredAt: "2026-10-20T09:00:00Z",
    summary: "created task ENG-101",
  },
  {
    id: "018f98a2-act-002-status",
    eventType: "task.updated",
    actor: {
      id: MOCK_USER_ID,
      displayName: "Alex Morgan",
      avatarUrl: null,
    },
    occurredAt: "2026-10-28T14:30:00Z",
    summary: "changed status to IN PROGRESS",
    fieldChanges: [
      {
        field: "statusCategory",
        before: "TODO",
        after: "IN_PROGRESS",
      },
    ],
  },
];

// Mutable in-memory stores for tests
let currentMockComments: CommentDto[] = JSON.parse(JSON.stringify(initialMockComments));
let currentMockActivity: ActivityEntryDto[] = JSON.parse(JSON.stringify(initialMockActivity));
let currentMockTaskWatchers: Record<string, Set<string>> = {
  "018f98a2-task-001-overdue-assigned": new Set([MOCK_USER_ID, OTHER_USER_ID]),
};

export function getMockComments(): CommentDto[] {
  return currentMockComments;
}

export function getMockActivity(): ActivityEntryDto[] {
  return currentMockActivity;
}

export function isUserWatchingTask(taskId: string, userId: string): boolean {
  return currentMockTaskWatchers[taskId]?.has(userId) ?? false;
}

export function setMockTaskWatching(taskId: string, userId: string, watching: boolean): void {
  if (!currentMockTaskWatchers[taskId]) {
    currentMockTaskWatchers[taskId] = new Set();
  }
  if (watching) {
    currentMockTaskWatchers[taskId].add(userId);
  } else {
    currentMockTaskWatchers[taskId].delete(userId);
  }
}

export function resetMockCommentsState(): void {
  currentMockComments = JSON.parse(JSON.stringify(initialMockComments));
  currentMockActivity = JSON.parse(JSON.stringify(initialMockActivity));
  currentMockTaskWatchers = {
    "018f98a2-task-001-overdue-assigned": new Set([MOCK_USER_ID, OTHER_USER_ID]),
  };
}
