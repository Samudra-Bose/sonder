import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/index.js";
import { markNotificationReadApi } from "./notifications-api.js";
import { notificationKeys } from "./query-keys.js";
import type { NotificationListDto, MarkNotificationReadParams } from "./types.js";

interface MarkReadMutationContext {
  previousQueries: Array<[readonly unknown[], InfiniteData<NotificationListDto> | undefined]>;
  previousUnreadCount: number | undefined;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation<void, Error, MarkNotificationReadParams, MarkReadMutationContext>({
    mutationFn: async ({ communityId, notificationId }) => {
      if (!csrfToken) {
        throw new Error("CSRF token is required to mark notification as read.");
      }
      return markNotificationReadApi(communityId, notificationId, csrfToken);
    },
    onMutate: async ({ communityId, notificationId }) => {
      // 1. Cancel any active refetches for this community's notifications
      await queryClient.cancelQueries({ queryKey: notificationKeys.all(communityId) });

      // 2. Snapshot existing query data
      const previousQueries = queryClient.getQueriesData<InfiniteData<NotificationListDto>>({
        queryKey: notificationKeys.lists(communityId),
      });
      const previousUnreadCount = queryClient.getQueryData<number>(
        notificationKeys.unreadCount(communityId)
      );

      // 3. Optimistically update all cached list pages
      queryClient.setQueriesData<InfiniteData<NotificationListDto>>(
        { queryKey: notificationKeys.lists(communityId) },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.id === notificationId ? { ...item, isRead: true } : item
              ),
              unreadCount: Math.max(0, (page.unreadCount ?? 1) - 1),
            })),
          };
        }
      );

      // 4. Optimistically update global unread count
      if (previousUnreadCount !== undefined) {
        queryClient.setQueryData<number>(
          notificationKeys.unreadCount(communityId),
          Math.max(0, previousUnreadCount - 1)
        );
      }

      return { previousQueries, previousUnreadCount };
    },
    onError: (_err, { communityId }, context) => {
      // Rollback to prior snapshots on error
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousUnreadCount !== undefined) {
        queryClient.setQueryData(
          notificationKeys.unreadCount(communityId),
          context.previousUnreadCount
        );
      }
    },
    onSettled: (_data, _error, { communityId }) => {
      // Invalidate to reconcile with canonical server state
      queryClient.invalidateQueries({ queryKey: notificationKeys.all(communityId) });
    },
  });
}
