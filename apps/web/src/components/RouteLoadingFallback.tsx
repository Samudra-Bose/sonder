import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

export function RouteLoadingFallback(): React.JSX.Element {
  return (
    <div
      role="status"
      aria-label="Loading page content"
      aria-live="polite"
      className="space-y-4 max-w-6xl mx-auto py-2 animate-in fade-in duration-150"
    >
      <span className="sr-only">Loading page content...</span>
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
