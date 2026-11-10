import React, { useState, useCallback } from "react";
import { Inbox, CheckCheck, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/Button.js";
import { Badge } from "@/components/ui/Badge.js";
import { EmptyState } from "@/components/ui/EmptyState.js";
import { Skeleton } from "@/components/ui/Skeleton.js";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs.js";
import { useWorkspace } from "@/modules/workspace/index.js";
import { useNotifications } from "./useNotifications.js";
import { useUnreadNotificationCount } from "./useUnreadNotificationCount.js";
import { useMarkNotificationRead } from "./useMarkNotificationRead.js";
import { useMarkAllNotificationsRead } from "./useMarkAllNotificationsRead.js";
import { NotificationItem } from "./NotificationItem.js";
import type { NotificationCategory } from "./types.js";

type CategoryTabValue = "ALL" | NotificationCategory;

export function InboxView(): React.JSX.Element {
  const { currentCommunityId } = useWorkspace();
  const [selectedTab, setSelectedTab] = useState<CategoryTabValue>("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const activeCategory: NotificationCategory | undefined =
    selectedTab === "ALL" ? undefined : selectedTab;

  // Canonical global unread count
  const { unreadCount, refetch: refetchUnreadCount } = useUnreadNotificationCount(currentCommunityId);

  // Paginated notifications for current category and unreadOnly filter
  const {
    items,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useNotifications({
    communityId: currentCommunityId,
    category: activeCategory,
    unreadOnly,
    limit: 20,
    enabled: Boolean(currentCommunityId),
  });

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const handleMarkRead = useCallback(
    (notificationId: string) => {
      if (!currentCommunityId) return;
      markReadMutation.mutate({
        communityId: currentCommunityId,
        notificationId,
      });
    },
    [currentCommunityId, markReadMutation]
  );

  const handleMarkAllRead = useCallback(() => {
    if (!currentCommunityId) return;
    markAllReadMutation.mutate({
      communityId: currentCommunityId,
    });
  }, [currentCommunityId, markAllReadMutation]);

  const handleRetry = useCallback(() => {
    refetch();
    refetchUnreadCount();
  }, [refetch, refetchUnreadCount]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4 px-3 sm:px-6">
      {/* Inbox Header Card */}
      <header className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 md:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--surface-muted)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--brand-accent-text)]">
                <Inbox className="h-5 w-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
                Notification Inbox
              </h1>
              {unreadCount > 0 && (
                <Badge variant="accent" size="md">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            <p className="text-xs md:text-sm text-[var(--text-secondary)] mt-1.5">
              Direct mentions, task assignments, and workspace collaboration signals.
            </p>
          </div>

          {/* Header Action: Mark all read */}
          {unreadCount > 0 && (
            <div className="flex items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markAllReadMutation.isPending}
                aria-label="Mark all notifications as read"
                className="text-xs font-medium w-full sm:w-auto"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1.5 text-[var(--feedback-success-text)]" />
                {markAllReadMutation.isPending ? "Marking read..." : "Mark all as read"}
              </Button>
            </div>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Category Tabs */}
          <Tabs
            value={selectedTab}
            onValueChange={(val) => setSelectedTab(val as CategoryTabValue)}
            className="w-full sm:w-auto"
          >
            <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
              <TabsTrigger value="ALL" className="text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="ACTION_REQUIRED" className="text-xs">
                Action Required
              </TabsTrigger>
              <TabsTrigger value="UPDATES" className="text-xs">
                Updates
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Unread Only Toggle */}
          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <label
              htmlFor="unread-only-toggle"
              className="inline-flex items-center space-x-2 text-xs font-medium text-[var(--text-secondary)] cursor-pointer select-none"
            >
              <input
                id="unread-only-toggle"
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--border-strong)] text-[var(--brand-primary)] focus:ring-[var(--border-focus)] cursor-pointer"
              />
              <span className="flex items-center space-x-1">
                <Filter className="h-3 w-3 text-[var(--text-muted)]" />
                <span>Unread only</span>
              </span>
            </label>
          </div>
        </div>
      </header>

      {/* Main Notification Stream Card */}
      <main
        role="region"
        aria-label="Notifications list"
        className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-xs overflow-hidden"
      >
        {/* Loading Skeleton State */}
        {isLoading && (
          <div className="p-6 space-y-4" data-testid="notifications-loading">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        )}

        {/* Error State with Retry Button */}
        {!isLoading && isError && (
          <div className="p-8 text-center space-y-3" role="alert">
            <div className="w-10 h-10 rounded-full bg-[var(--feedback-danger-bg)] text-[var(--feedback-danger-text)] flex items-center justify-center mx-auto">
              <Inbox className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Failed to load notifications
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
              {error?.message || "A network or server error occurred. Please try again."}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="text-xs mt-2"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && items.length === 0 && (
          <div className="py-12 px-4" data-testid="notifications-empty">
            <EmptyState
              icon={<Inbox className="h-10 w-10 text-[var(--text-muted)]" />}
              title={
                unreadOnly
                  ? "No unread notifications"
                  : selectedTab === "ACTION_REQUIRED"
                  ? "No action items"
                  : selectedTab === "UPDATES"
                  ? "No activity updates"
                  : "All caught up"
              }
              description={
                unreadOnly
                  ? "You have triaged all unread items in this view. Toggle 'Unread only' off to see previously read notifications."
                  : "When team members mention you, assign tasks, or post updates, they will appear here."
              }
            />
          </div>
        )}

        {/* Notifications Item List */}
        {!isLoading && !isError && items.length > 0 && (
          <div className="divide-y divide-[var(--border-subtle)]" data-testid="notifications-list">
            {items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
                isMarkingRead={markReadMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* Load More Pagination Button */}
        {!isLoading && !isError && hasNextPage && (
          <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)]/30 text-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="text-xs px-4"
            >
              {isFetchingNextPage ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Loading more notifications...
                </>
              ) : (
                "Load more notifications"
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
