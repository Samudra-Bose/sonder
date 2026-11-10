import React from "react";
import { Check, Bell, AlertTriangle, MessageSquare, UserCheck, ShieldAlert, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge.js";
import { Button } from "@/components/ui/Button.js";
import { cn } from "@/lib/utils.js";
import type { NotificationDto, NotificationReason } from "./types.js";
import { NOTIFICATION_REASON_METADATA } from "./types.js";

export interface NotificationItemProps {
  notification: NotificationDto;
  onMarkRead?: (id: string) => void;
  isMarkingRead?: boolean;
  compact?: boolean;
}

function getReasonIcon(reason: NotificationReason) {
  switch (reason) {
    case "MENTION":
      return <MessageSquare className="h-3.5 w-3.5" />;
    case "TASK_ASSIGNED":
      return <UserCheck className="h-3.5 w-3.5" />;
    case "TASK_DUE_REMINDER":
      return <Clock className="h-3.5 w-3.5" />;
    case "TASK_OVERDUE":
      return <AlertTriangle className="h-3.5 w-3.5 text-[var(--feedback-danger-text)]" />;
    case "COMMENT_UPDATE":
      return <MessageSquare className="h-3.5 w-3.5" />;
    case "GOVERNANCE_ALERT":
      return <Bell className="h-3.5 w-3.5" />;
    case "BREAK_GLASS_ALERT":
      return <ShieldAlert className="h-3.5 w-3.5 text-[var(--feedback-danger-text)]" />;
    default:
      return <Bell className="h-3.5 w-3.5" />;
  }
}

export function formatNotificationDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export function NotificationItem({
  notification,
  onMarkRead,
  isMarkingRead = false,
  compact = false,
}: NotificationItemProps): React.JSX.Element {
  const reasonMeta = NOTIFICATION_REASON_METADATA[notification.reason] ?? {
    label: notification.reason,
    description: "",
    badgeVariant: "default",
  };

  return (
    <article
      data-testid={`notification-item-${notification.id}`}
      data-is-read={notification.isRead}
      className={cn(
        "group relative flex items-start space-x-3 transition-colors duration-150 border-b border-[var(--border-subtle)] last:border-b-0",
        compact ? "p-3 text-xs" : "p-4 text-sm",
        notification.isRead
          ? "bg-[var(--surface-canvas)] opacity-75 hover:opacity-100"
          : "bg-[var(--surface-card)] hover:bg-[var(--surface-muted)]"
      )}
    >
      {/* Unread indicator dot */}
      <div className="pt-1 flex-shrink-0 flex items-center justify-center">
        {!notification.isRead ? (
          <span
            aria-label="Unread"
            className="w-2 h-2 rounded-full bg-[var(--brand-accent-text)] ring-2 ring-[var(--surface-card)]"
          />
        ) : (
          <span className="w-2 h-2 rounded-full bg-transparent" />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Header line: badges and category */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant={reasonMeta.badgeVariant === "brand" ? "accent" : "outline"}
            size="sm"
            icon={getReasonIcon(notification.reason)}
            className="text-[10px] font-medium tracking-tight"
          >
            {reasonMeta.label}
          </Badge>

          <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
            {notification.category === "ACTION_REQUIRED" ? "Action Required" : "Update"}
          </span>

          <span className="text-[10px] text-[var(--text-muted)] ml-auto" title={notification.createdAt}>
            {formatNotificationDate(notification.createdAt)}
          </span>
        </div>

        {/* Title */}
        <h4
          className={cn(
            "font-medium leading-snug break-words",
            notification.isRead
              ? "text-[var(--text-secondary)] font-normal"
              : "text-[var(--text-primary)] font-semibold"
          )}
        >
          {notification.title}
        </h4>

        {/* Body summary (if present) */}
        {notification.body && (
          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
            {notification.body}
          </p>
        )}

        {/* Action Bar (One-way mark as read only per canonical contract) */}
        {!notification.isRead && onMarkRead && (
          <div className="pt-1.5 flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onMarkRead(notification.id)}
              disabled={isMarkingRead}
              aria-label={`Mark as read: ${notification.title}`}
              className="text-xs h-6 px-2 py-0.5 font-normal text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
            >
              <Check className="h-3 w-3 mr-1 text-[var(--feedback-success-text)]" />
              Mark as read
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}
