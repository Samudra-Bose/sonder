import React from "react";
import {
  Circle,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronUp,
  Minus,
  ChevronDown,
  CircleDashed,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELED";
export type TaskPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
export type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "accent"
  | `status-${TaskStatus}`
  | `priority-${TaskPriority}`;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  status?: TaskStatus;
  priority?: TaskPriority;
  size?: "sm" | "md";
  /** Optional icon override; if not provided, status & priority badges automatically render their required dual-indicator icon */
  icon?: React.ReactNode;
}

const statusConfig: Record<
  TaskStatus,
  { styles: string; icon: React.ReactElement }
> = {
  BACKLOG: {
    styles:
      "bg-[var(--surface-muted)] border-[var(--border-subtle)] text-[var(--text-secondary)]",
    icon: <CircleDashed className="h-3 w-3 shrink-0" aria-hidden="true" data-testid="status-icon-BACKLOG" />,
  },
  TODO: {
    // #F1F5F9 / #CBD5E1 / #334155 (Light) | #1E293B / #334155 / #E2E8F0 (Dark)
    styles:
      "bg-[var(--status-todo-bg)] border-[var(--status-todo-border)] text-[var(--status-todo-text)]",
    icon: <Circle className="h-3 w-3 shrink-0" aria-hidden="true" data-testid="status-icon-TODO" />,
  },
  IN_PROGRESS: {
    // #EFF6FF / #BFDBFE / #1D4ED8 (Light) | #172554 / #1E40AF / #93C5FD (Dark)
    styles:
      "bg-[var(--status-progress-bg)] border-[var(--status-progress-border)] text-[var(--status-progress-text)]",
    icon: <Clock className="h-3 w-3 shrink-0" aria-hidden="true" data-testid="status-icon-IN_PROGRESS" />,
  },
  IN_REVIEW: {
    // #FAF5FF / #E9D5FF / #6B21A8 (Light) | #3B0764 / #581C87 / #E9D5FF (Dark)
    styles:
      "bg-[var(--status-review-bg)] border-[var(--status-review-border)] text-[var(--status-review-text)]",
    icon: <Eye className="h-3 w-3 shrink-0" aria-hidden="true" data-testid="status-icon-IN_REVIEW" />,
  },
  DONE: {
    // #F0FDF4 / #BBF7D0 / #15803D (Light) | #052E16 / #166534 / #86EFAC (Dark)
    styles:
      "bg-[var(--status-done-bg)] border-[var(--status-done-border)] text-[var(--status-done-text)]",
    icon: <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" data-testid="status-icon-DONE" />,
  },
  CANCELED: {
    // #FEF2F2 / #FECACA / #B91C1C (Light) | #450A0A / #991B1B / #FCA5A5 (Dark)
    styles:
      "bg-[var(--status-cancelled-bg)] border-[var(--status-cancelled-border)] text-[var(--status-cancelled-text)]",
    icon: <XCircle className="h-3 w-3 shrink-0" aria-hidden="true" data-testid="status-icon-CANCELED" />,
  },
};

const priorityConfig: Record<
  TaskPriority,
  { styles: string; icon: React.ReactElement }
> = {
  URGENT: {
    styles:
      "bg-[var(--surface-muted)] border-[var(--border-subtle)] text-[var(--priority-urgent)]",
    icon: <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" data-testid="priority-icon-URGENT" />,
  },
  HIGH: {
    styles:
      "bg-[var(--surface-muted)] border-[var(--border-subtle)] text-[var(--priority-high)]",
    icon: <ChevronUp className="h-3 w-3 shrink-0" aria-hidden="true" data-testid="priority-icon-HIGH" />,
  },
  MEDIUM: {
    styles:
      "bg-[var(--surface-muted)] border-[var(--border-subtle)] text-[var(--priority-medium)]",
    icon: <Minus className="h-3 w-3 shrink-0" aria-hidden="true" data-testid="priority-icon-MEDIUM" />,
  },
  LOW: {
    styles:
      "bg-[var(--surface-muted)] border-[var(--border-subtle)] text-[var(--priority-low)]",
    icon: <ChevronDown className="h-3 w-3 shrink-0" aria-hidden="true" data-testid="priority-icon-LOW" />,
  },
  NONE: {
    styles:
      "bg-transparent border-[var(--border-control)] text-[var(--priority-none)]",
    icon: <CircleDashed className="h-3 w-3 shrink-0" aria-hidden="true" data-testid="priority-icon-NONE" />,
  },
};

const genericStyles: Record<string, string> = {
  default: "bg-[var(--brand-primary)] text-[var(--text-inverted)] border-transparent",
  secondary: "bg-[var(--surface-muted)] text-[var(--text-secondary)] border-transparent",
  outline: "border-[var(--border-strong)] text-[var(--text-secondary)] bg-transparent",
  accent: "bg-[var(--brand-accent-text)]/10 text-[var(--brand-accent-text)] border-[var(--brand-accent-text)]/20",
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant,
  status,
  priority,
  size = "md",
  icon,
  ...props
}) => {
  let styleClasses = genericStyles.default;
  let resolvedIcon: React.ReactNode = icon;

  // Resolve status config (with legacy "CANCELLED" normalization at display boundary)
  let rawStatus = status as string | undefined;
  if (!rawStatus && variant?.startsWith("status-")) {
    rawStatus = variant.replace("status-", "");
  }
  let activeStatus: TaskStatus | undefined;
  if (rawStatus === "CANCELLED" || rawStatus === "CANCELED") {
    activeStatus = "CANCELED";
  } else if (rawStatus && rawStatus in statusConfig) {
    activeStatus = rawStatus as TaskStatus;
  }

  // Resolve priority config
  let activePriority: TaskPriority | undefined = priority;
  if (!activePriority && variant?.startsWith("priority-")) {
    activePriority = variant.replace("priority-", "") as TaskPriority;
  }

  if (activeStatus && statusConfig[activeStatus]) {
    styleClasses = statusConfig[activeStatus].styles;
    // Dual indicator requirement: status must always include an icon
    if (!resolvedIcon) {
      resolvedIcon = statusConfig[activeStatus].icon;
    }
  } else if (activePriority && priorityConfig[activePriority]) {
    styleClasses = priorityConfig[activePriority].styles;
    // Dual indicator requirement: priority must always include an icon
    if (!resolvedIcon) {
      resolvedIcon = priorityConfig[activePriority].icon;
    }
  } else if (variant) {
    styleClasses = genericStyles[variant] || genericStyles.default;
  }

  const sizeClass = size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-md border select-none",
        sizeClass,
        styleClasses,
        className
      )}
      {...props}
    >
      {resolvedIcon && (
        <span className="shrink-0 flex items-center" aria-hidden="true">
          {resolvedIcon}
        </span>
      )}
      <span>{children}</span>
    </span>
  );
};

Badge.displayName = "Badge";
