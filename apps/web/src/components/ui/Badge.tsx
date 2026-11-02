import React from "react";
import { cn } from "@/lib/utils";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";
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
  icon?: React.ReactNode;
}

const statusStyles: Record<TaskStatus, string> = {
  // Evaluated WCAG 2.2 AA Contrast Pairs (Section 7.6):
  TODO: "bg-[#F1F5F9] text-[#334155] dark:bg-[#1E293B] dark:text-[#E2E8F0] border-transparent",
  IN_PROGRESS: "bg-[#EFF6FF] text-[#1D4ED8] dark:bg-[#172554] dark:text-[#93C5FD] border-transparent",
  IN_REVIEW: "bg-[#FAF5FF] text-[#6B21A8] dark:bg-[#3B0764] dark:text-[#E9D5FF] border-transparent",
  DONE: "bg-[#F0FDF4] text-[#15803D] dark:bg-[#052E16] dark:text-[#86EFAC] border-transparent",
  CANCELLED: "bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#450A0A] dark:text-[#FCA5A5] border-transparent",
};

const priorityStyles: Record<TaskPriority, string> = {
  // Evaluated WCAG 2.2 AA Contrast Pairs (Section 7.6):
  URGENT: "bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#450A0A] dark:text-[#F87171] border-transparent",
  HIGH: "bg-[#FFFBEB] text-[#B45309] dark:bg-[#451A03] dark:text-[#FBBF24] border-transparent",
  MEDIUM: "bg-[#EFF6FF] text-[#1D4ED8] dark:bg-[#172554] dark:text-[#60A5FA] border-transparent",
  LOW: "bg-[#F1F5F9] text-[#475569] dark:bg-[#1E293B] dark:text-[#94A3B8] border-transparent",
  NONE: "bg-[#F8FAFC] text-[#64748B] dark:bg-[#0F172A] dark:text-[#64748B] border border-slate-200 dark:border-slate-800",
};

const genericStyles: Record<string, string> = {
  default: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent",
  secondary: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-transparent",
  outline: "border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300 bg-transparent",
  accent: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-transparent",
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

  if (status) {
    styleClasses = statusStyles[status];
  } else if (priority) {
    styleClasses = priorityStyles[priority];
  } else if (variant) {
    if (variant.startsWith("status-")) {
      const st = variant.replace("status-", "") as TaskStatus;
      styleClasses = statusStyles[st] || genericStyles.default;
    } else if (variant.startsWith("priority-")) {
      const pr = variant.replace("priority-", "") as TaskPriority;
      styleClasses = priorityStyles[pr] || genericStyles.default;
    } else {
      styleClasses = genericStyles[variant] || genericStyles.default;
    }
  }

  const sizeClass = size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium rounded-md select-none",
        sizeClass,
        styleClasses,
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0 flex items-center" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

Badge.displayName = "Badge";
