import { useMemo, useEffect } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type {
  NotificationDto,
  NotificationListDto,
  NotificationCategory,
} from "./types.js";
import { listNotificationsApi } from "./notifications-api.js";
import { notificationKeys } from "./query-keys.js";

export interface UseNotificationsOptions {
  communityId: string | null | undefined;
  category?: NotificationCategory;
  unreadOnly?: boolean;
  limit?: number;
  enabled?: boolean;
}

export function useNotifications({
  communityId,
  category,
  unreadOnly = false,
  limit = 20,
  enabled = true,
}: UseNotificationsOptions) {
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () =>
      communityId
        ? notificationKeys.list(communityId, { category, unreadOnly, limit })
        : (["notifications", "disabled"] as const),
    [communityId, category, unreadOnly, limit]
  );

  const query = useInfiniteQuery<NotificationListDto, Error>({
    queryKey,
    queryFn: async ({ pageParam }) => {
      if (!communityId) {
        throw new Error("Community ID is required to fetch notifications.");
      }
      return listNotificationsApi(communityId, {
        cursor: pageParam as string | null | undefined,
        limit,
        category,
        unreadOnly,
      });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(communityId) && enabled,
  });

  // Keep unread count query cache synchronized from canonical API responses
  const firstPage = query.data?.pages[0];
  const canonicalUnreadCount = firstPage?.unreadCount;

  useEffect(() => {
    if (communityId && canonicalUnreadCount !== undefined) {
      queryClient.setQueryData<number>(
        notificationKeys.unreadCount(communityId),
        canonicalUnreadCount
      );
    }
  }, [communityId, canonicalUnreadCount, queryClient]);

  // Robust page deduplication
  const items = useMemo(() => {
    if (!query.data?.pages) return [];
    const seen = new Set<string>();
    const deduplicated: NotificationDto[] = [];
    for (const page of query.data.pages) {
      for (const item of page.items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          deduplicated.push(item);
        }
      }
    }
    return deduplicated;
  }, [query.data]);

  return {
    items,
    unreadCount: canonicalUnreadCount ?? 0,
    hasNextPage: Boolean(query.hasNextPage),
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
