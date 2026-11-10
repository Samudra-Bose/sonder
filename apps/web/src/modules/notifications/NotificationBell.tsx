import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover.js";
import { Badge } from "@/components/ui/Badge.js";
import { Button } from "@/components/ui/Button.js";
import { Skeleton } from "@/components/ui/Skeleton.js";
import { useWorkspace } from "@/modules/workspace/index.js";
import { useNotifications } from "./useNotifications.js";
import { useUnreadNotificationCount } from "./useUnreadNotificationCount.js";
import { useMarkNotificationRead } from "./useMarkNotificationRead.js";
import { useMarkAllNotificationsRead } from "./useMarkAllNotificationsRead.js";
import { NotificationItem } from "./NotificationItem.js";

export function NotificationBell(): React.JSX.Element {
  const { currentCommunityId } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);

  // Canonical global unread count
  const { unreadCount } = useUnreadNotificationCount(currentCommunityId);

  // Recent 5 notifications for popover preview
  const { items, isLoading } = useNotifications({
    communityId: currentCommunityId,
    limit: 5,
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

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        data-testid="notification-bell-trigger"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications, all caught up"
        }
        className="relative p-2 rounded-md hover:bg-[var(--surface-muted)] focus-ring text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer select-none"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-[var(--brand-primary)] rounded-full ring-2 ring-[var(--surface-card)]"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 max-h-[32rem] flex flex-col shadow-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] rounded-xl overflow-hidden z-50"
      >
        {/* Popover Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-muted)]/50">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-sm text-[var(--text-primary)]">
              Notifications
            </span>
            {unreadCount > 0 && (
              <Badge variant="accent" size="sm">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
              aria-label="Mark all notifications as read"
              className="text-xs h-7 px-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1 text-[var(--feedback-success-text)]" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Popover Recent Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)] max-h-80">
          {isLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--text-muted)] space-y-1">
              <Inbox className="h-8 w-8 mx-auto text-[var(--text-muted)] opacity-50 mb-2" />
              <p className="font-medium text-[var(--text-secondary)]">All caught up</p>
              <p>No notifications in this community</p>
            </div>
          ) : (
            items.slice(0, 5).map((item) => (
              <NotificationItem
                key={item.id}
                notification={item}
                onMarkRead={handleMarkRead}
                isMarkingRead={markReadMutation.isPending}
                compact
              />
            ))
          )}
        </div>

        {/* Popover Footer */}
        <div className="p-2 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)]/30 text-center">
          <Link
            to="/inbox"
            onClick={() => setIsOpen(false)}
            className="inline-flex items-center justify-center w-full py-1.5 text-xs font-medium text-[var(--brand-accent-text)] hover:underline rounded focus-ring"
          >
            View all notifications in Inbox &rarr;
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
