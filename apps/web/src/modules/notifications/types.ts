import type { ApiSchema } from "@sonder/contracts";

export type NotificationDto = ApiSchema<"NotificationDto">;
export type NotificationListDto = ApiSchema<"NotificationListDto">;
export type NotificationCategory = ApiSchema<"NotificationCategory">;
export type NotificationReason = ApiSchema<"NotificationReason">;

export interface ListNotificationsParams {
  cursor?: string | null;
  limit?: number;
  category?: NotificationCategory;
  unreadOnly?: boolean;
}

export interface MarkNotificationReadParams {
  communityId: string;
  notificationId: string;
}

export interface MarkAllNotificationsReadParams {
  communityId: string;
}

/**
 * Human-readable label and visual styling mapping for canonical notification reasons.
 * Strictly adheres to canonical NotificationReason enum from OpenAPI 0.3.20-draft.
 */
export const NOTIFICATION_REASON_METADATA: Record<
  NotificationReason,
  {
    label: string;
    description: string;
    badgeVariant: "default" | "brand" | "danger" | "warning" | "success";
  }
> = {
  MENTION: {
    label: "Mention",
    description: "You were mentioned in a comment or task description",
    badgeVariant: "brand",
  },
  TASK_ASSIGNED: {
    label: "Assigned",
    description: "You were assigned to a task",
    badgeVariant: "brand",
  },
  TASK_DUE_REMINDER: {
    label: "Due Reminder",
    description: "A task assigned to you is approaching its due date",
    badgeVariant: "warning",
  },
  TASK_OVERDUE: {
    label: "Overdue",
    description: "A task assigned to you has passed its due date",
    badgeVariant: "danger",
  },
  COMMENT_UPDATE: {
    label: "Comment",
    description: "New comment on a task you are watching",
    badgeVariant: "default",
  },
  GOVERNANCE_ALERT: {
    label: "Governance",
    description: "Community policy, membership or governance update",
    badgeVariant: "default",
  },
  BREAK_GLASS_ALERT: {
    label: "Break-Glass",
    description: "Audited emergency administrative access event",
    badgeVariant: "danger",
  },
};
