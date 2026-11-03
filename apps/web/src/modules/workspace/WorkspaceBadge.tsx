import React from "react";
import { cn } from "@/lib/utils";

export interface WorkspaceBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  prefix: string;
  size?: "sm" | "md";
}

export function WorkspaceBadge({
  prefix,
  size = "md",
  className,
  ...props
}: WorkspaceBadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-mono font-bold tracking-wider uppercase rounded select-none border border-[var(--border-subtle)] transition-colors",
        size === "sm"
          ? "text-[10px] px-1 py-0.5 min-w-[28px] h-4.5 bg-[var(--surface-muted)] text-[var(--text-secondary)]"
          : "text-xs px-1.5 py-0.5 min-w-[34px] h-6 bg-[var(--surface-muted)] text-[var(--text-primary)]",
        className
      )}
      {...props}
    >
      {prefix}
    </span>
  );
}
