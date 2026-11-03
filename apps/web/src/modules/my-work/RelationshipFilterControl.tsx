import React from "react";
import { cn } from "@/lib/utils";
import type { RelationshipFilter, MyWorkSummary } from "./types";

export interface RelationshipFilterControlProps {
  activeFilter: RelationshipFilter;
  onChange: (filter: RelationshipFilter) => void;
  summary: MyWorkSummary;
  className?: string;
}

interface FilterOption {
  id: RelationshipFilter;
  label: string;
  getCount: (summary: MyWorkSummary) => number;
}

const FILTER_OPTIONS: FilterOption[] = [
  { id: "ALL", label: "All Work", getCount: (s) => s.totalUnique },
  { id: "ASSIGNED", label: "Assigned to Me", getCount: (s) => s.assignedCount },
  { id: "CREATED", label: "Created by Me", getCount: (s) => s.createdCount },
  { id: "WATCHING", label: "Watching", getCount: (s) => s.watchedCount },
];

export function RelationshipFilterControl({
  activeFilter,
  onChange,
  summary,
  className,
}: RelationshipFilterControlProps): React.JSX.Element {
  return (
    <nav
      aria-label="Filter tasks by relationship"
      className={cn(
        "flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-muted)]/70 border border-[var(--border-subtle)]",
        className
      )}
    >
      {FILTER_OPTIONS.map((opt) => {
        const isSelected = activeFilter === opt.id;
        const count = opt.getCount(summary);

        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none cursor-pointer",
              // Mobile minimum 44px touch target height
              "min-h-[44px]",
              isSelected
                ? "bg-[var(--surface-card)] text-[var(--text-primary)] shadow-xs font-semibold border border-[var(--border-strong)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-card)]/50 border border-transparent"
            )}
          >
            <span>{opt.label}</span>
            <span
              className={cn(
                "inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-mono",
                isSelected
                  ? "bg-[var(--surface-muted)] text-[var(--text-primary)] font-bold"
                  : "bg-[var(--surface-card)] text-[var(--text-muted)]"
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
