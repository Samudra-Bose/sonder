import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/index.js";
import { markAllNotificationsReadApi } from "./notifications-api.js";
import { notificationKeys } from "./query-keys.js";
import type { NotificationListDto, MarkAllNotificationsReadParams } from "./types.js";

interface MarkAllReadMutationContext {
  previousQueries: Array<[readonly unknown[], InfiniteData<NotificationListDto> | undefined]>;
  previousUnreadCount: number | undefined;
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation<void, Error, MarkAllNotificationsReadParams, MarkAllReadMutationContext>({
    mutationFn: async ({ communityId }) => {
      if (!csrfToken) {
        throw new Error("CSRF token is required to mark all notifications as read.");
      }
      return markAllNotificationsReadApi(communityId, csrfToken);
    },
    onMutate: async ({ communityId }) => {
      // 1. Cancel active queries
      await queryClient.cancelQueries({ queryKey: notificationKeys.all(communityId) });

      // 2. Snapshot existing state
      const previousQueries = queryClient.getQueriesData<InfiniteData<NotificationListDto>>({
        queryKey: notificationKeys.lists(communityId),
      });
      const previousUnreadCount = queryClient.getQueryData<number>(
        notificationKeys.unreadCount(communityId)
      );

      // 3. Optimistically mark all items as read across all lists
      queryClient.setQueriesData<InfiniteData<NotificationListDto>>(
        { queryKey: notificationKeys.lists(communityId) },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => ({ ...item, isRead: true })),
              unreadCount: 0,
            })),
          };
        }
      );

      // 4. Optimistically reset global unread badge count to 0
      queryClient.setQueryData<number>(notificationKeys.unreadCount(communityId), 0);

      return { previousQueries, previousUnreadCount };
    },
    onError: (_err, { communityId }, context) => {
      // Rollback on failure
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
      queryClient.invalidateQueries({ queryKey: notificationKeys.all(communityId) });
    },
  });
}
