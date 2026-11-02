import React from "react";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

export function InboxPlaceholderView(): React.JSX.Element {
  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-xs">
        <div className="flex items-center space-x-2">
          <Inbox className="h-5 w-5 text-[var(--brand-accent-text)]" />
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
            Notification Inbox
          </h1>
          <Badge status="TODO" size="sm">
            Upcoming Slice
          </Badge>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Direct mentions, task assignments, and workspace activity stream.
        </p>

        <div className="mt-8 py-4">
          <EmptyState
            icon={<Inbox className="h-10 w-10 text-[var(--text-muted)]" />}
            title="All caught up"
            description="You have no unread notifications or pending triage items. When team members mention you or assign tasks, they will appear here."
          />
        </div>
      </div>
    </div>
  );
}
