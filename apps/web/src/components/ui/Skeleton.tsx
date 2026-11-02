import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-md bg-[var(--surface-muted)] border border-[var(--border-subtle)]",
        className
      )}
      {...props}
    />
  );
}

Skeleton.displayName = "Skeleton";
