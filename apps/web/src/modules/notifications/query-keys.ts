import type { ListNotificationsParams } from "./types.js";

/**
 * Canonical query key factories for Sonder Notification queries.
 * Enforces community scoping and isolation across cache operations.
 */
export const notificationKeys = {
  all: (communityId: string) => ["communities", communityId, "notifications"] as const,
  lists: (communityId: string) => [...notificationKeys.all(communityId), "list"] as const,
  list: (communityId: string, params: Omit<ListNotificationsParams, "cursor">) =>
    [...notificationKeys.lists(communityId), params] as const,
  unreadCount: (communityId: string) =>
    [...notificationKeys.all(communityId), "unread-count"] as const,
};
