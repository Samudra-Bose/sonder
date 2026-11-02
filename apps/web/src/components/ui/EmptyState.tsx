import React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center select-none",
        className
      )}
      {...props}
    >
      {icon && (
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-[var(--text-muted)] leading-relaxed">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

EmptyState.displayName = "EmptyState";
