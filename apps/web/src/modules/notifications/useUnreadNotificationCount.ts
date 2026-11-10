import { useQuery } from "@tanstack/react-query";
import { listNotificationsApi } from "./notifications-api.js";
import { notificationKeys } from "./query-keys.js";

/**
 * Hook to retrieve the global canonical unread notification count for the active community.
 * The unreadCount is derived strictly from the canonical API response across the community inbox,
 * independent of category or unreadOnly filters.
 */
export function useUnreadNotificationCount(communityId: string | null | undefined): {
  unreadCount: number;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
} {
  const query = useQuery<number, Error>({
    queryKey: notificationKeys.unreadCount(communityId ?? ""),
    queryFn: async () => {
      if (!communityId) return 0;
      const res = await listNotificationsApi(communityId, { limit: 1 });
      return res.unreadCount;
    },
    enabled: Boolean(communityId),
    staleTime: 1000 * 30, // 30s
  });

  return {
    unreadCount: query.data ?? 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
