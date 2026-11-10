import type { ApiSchema } from "@sonder/contracts";

export type NotificationDto = ApiSchema<"NotificationDto">;
export type NotificationListDto = ApiSchema<"NotificationListDto">;
export type NotificationCategory = ApiSchema<"NotificationCategory">;
export type NotificationReason = ApiSchema<"NotificationReason">;

export const NOTIF_1_ID = "018f98a2-notif-001-mention-alex";
export const NOTIF_2_ID = "018f98a2-notif-002-assign-alex";
export const NOTIF_3_ID = "018f98a2-notif-003-comment-alex";
export const NOTIF_4_ID = "018f98a2-notif-004-reminder-alex";
export const NOTIF_5_ID = "018f98a2-notif-005-overdue-alex";
export const NOTIF_6_ID = "018f98a2-notif-006-gov-alex";
export const NOTIF_7_ID = "018f98a2-notif-007-read-item";
export const NOTIF_8_ID = "018f98a2-notif-008-page2-item";

export const initialMockNotifications: NotificationDto[] = [
  {
    id: NOTIF_1_ID,
    eventType: "task.comment.mention",
    title: "Jordan Lee mentioned you in ENG-101",
    body: "@alex please review the latest WebSocket event scoping fix before merging.",
    resourceType: "task",
    resourceId: "018f98a2-task-001-overdue-assigned",
    createdAt: "2026-11-10T14:30:00Z",
    isRead: false,
    category: "ACTION_REQUIRED",
    reason: "MENTION",
  },
  {
    id: NOTIF_2_ID,
    eventType: "task.assigned",
    title: "You were assigned to ENG-103",
    body: "Jordan Lee assigned 'Ship VS-02E My Work cross-workspace dashboard' to you.",
    resourceType: "task",
    resourceId: "018f98a2-task-003-today-assigned",
    createdAt: "2026-11-10T13:00:00Z",
    isRead: false,
    category: "ACTION_REQUIRED",
    reason: "TASK_ASSIGNED",
  },
  {
    id: NOTIF_3_ID,
    eventType: "task.comment.created",
    title: "New comment on watched task ENG-105",
    body: "Morgan Rivera replied to the discussion thread on Sprint 4 kickoff.",
    resourceType: "task",
    resourceId: "018f98a2-task-005-upcoming-watched",
    createdAt: "2026-11-10T11:15:00Z",
    isRead: false,
    category: "UPDATES",
    reason: "COMMENT_UPDATE",
  },
  {
    id: NOTIF_4_ID,
    eventType: "task.due_reminder",
    title: "Task due tomorrow: ENG-106",
    body: "Onboard 5 new volunteer coordinators is scheduled for tomorrow.",
    resourceType: "task",
    resourceId: "018f98a2-task-006-upcoming-assigned",
    createdAt: "2026-11-10T09:00:00Z",
    isRead: false,
    category: "ACTION_REQUIRED",
    reason: "TASK_DUE_REMINDER",
  },
  {
    id: NOTIF_5_ID,
    eventType: "task.overdue",
    title: "Task is overdue: ENG-101",
    body: "Fix critical auth token refresh race condition was due on 2026-10-28.",
    resourceType: "task",
    resourceId: "018f98a2-task-001-overdue-assigned",
    createdAt: "2026-11-09T18:00:00Z",
    isRead: false,
    category: "ACTION_REQUIRED",
    reason: "TASK_OVERDUE",
  },
  {
    id: NOTIF_6_ID,
    eventType: "governance.alert",
    title: "Community policy update published",
    body: "Review the updated data retention policy for personal workspace items.",
    resourceType: null,
    resourceId: null,
    createdAt: "2026-11-08T10:00:00Z",
    isRead: false,
    category: "UPDATES",
    reason: "GOVERNANCE_ALERT",
  },
  {
    id: NOTIF_7_ID,
    eventType: "break_glass.alert",
    title: "Break-glass administrative access logged",
    body: "Emergency access session 018f98a2-bg-001 was initiated and completed.",
    resourceType: null,
    resourceId: null,
    createdAt: "2026-11-07T12:00:00Z",
    isRead: true, // Already read
    category: "UPDATES",
    reason: "BREAK_GLASS_ALERT",
  },
  {
    id: NOTIF_8_ID,
    eventType: "task.comment.created",
    title: "Older update on ENG-102",
    body: "Initial requirements document attached.",
    resourceType: "task",
    resourceId: "018f98a2-task-002-overdue-created",
    createdAt: "2026-11-06T08:00:00Z",
    isRead: true, // Already read
    category: "UPDATES",
    reason: "COMMENT_UPDATE",
  },
];

let mockNotificationsStore: NotificationDto[] = [
  ...initialMockNotifications.map((n) => ({ ...n })),
];

export function getMockNotifications(): NotificationDto[] {
  return mockNotificationsStore;
}

export function resetMockNotifications(): void {
  mockNotificationsStore = initialMockNotifications.map((n) => ({ ...n }));
}

export function markMockNotificationRead(notificationId: string): boolean {
  const item = mockNotificationsStore.find((n) => n.id === notificationId);
  if (item) {
    item.isRead = true;
    return true;
  }
  return false;
}

export function markAllMockNotificationsRead(): number {
  let count = 0;
  for (const item of mockNotificationsStore) {
    if (!item.isRead) {
      item.isRead = true;
      count++;
    }
  }
  return count;
}
