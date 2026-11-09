import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { TimelineMode } from "./timeline-date-utils.js";

export interface TimelineHeaderProps {
  mode: TimelineMode;
  onModeChange: (mode: TimelineMode) => void;
  rangeTitle: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNewMilestone: () => void;
  unscheduledCount: number;
  isUnscheduledOpen: boolean;
  onToggleUnscheduled: () => void;
  className?: string;
}

export function TimelineHeader({
  mode,
  onModeChange,
  rangeTitle,
  onPrev,
  onNext,
  onToday,
  onNewMilestone,
  unscheduledCount,
  isUnscheduledOpen,
  onToggleUnscheduled,
  className,
}: TimelineHeaderProps): React.JSX.Element {
  return (
    <div
      data-testid="timeline-header"
      className={cn(
        "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-3 md:p-4 shadow-2xs",
        className
      )}
    >
      {/* Left: Resolution Mode Toggle & Navigation */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Mode resolution segmented control */}
        <div
          role="radiogroup"
          aria-label="Timeline zoom resolution"
          className="inline-flex h-8 items-center rounded-lg bg-[var(--surface-muted)] border border-[var(--border-subtle)] p-0.5 gap-0.5 select-none"
        >
          {(["day", "week", "month"] as const).map((m) => {
            const isSelected = mode === m;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onModeChange(m)}
                data-testid={`timeline-mode-${m}`}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-all cursor-pointer focus-ring",
                  isSelected
                    ? "bg-[var(--surface-card)] text-[var(--text-primary)] shadow-xs font-semibold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {m}
              </button>
            );
          })}
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPrev}
            aria-label="Previous timeline range"
            data-testid="timeline-nav-prev"
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToday}
            data-testid="timeline-nav-today"
            className="h-8 text-xs font-medium px-2.5"
          >
            Today
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNext}
            aria-label="Next timeline range"
            data-testid="timeline-nav-next"
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Range title */}
        <div
          data-testid="timeline-range-title"
          className="text-sm font-semibold text-[var(--text-primary)] px-1"
        >
          {rangeTitle}
        </div>
      </div>

      {/* Right: Milestone Action + Unscheduled Tray Toggle */}
      <div className="flex items-center gap-2 self-end sm:self-auto">
        {unscheduledCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleUnscheduled}
            data-testid="timeline-toggle-unscheduled"
            className={cn(
              "h-8 text-xs gap-1.5",
              isUnscheduledOpen && "bg-[var(--surface-muted)] text-[var(--brand-accent-text)] border-[var(--brand-accent-border)]"
            )}
          >
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Unscheduled</span>
            <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-[var(--surface-muted)] text-[10px] font-mono font-medium">
              {unscheduledCount}
            </span>
          </Button>
        )}

        <Button
          type="button"
          size="sm"
          onClick={onNewMilestone}
          data-testid="timeline-add-milestone-btn"
          className="h-8 text-xs gap-1.5 bg-[var(--brand-accent-btn-bg)] hover:bg-[var(--brand-accent-btn-hover)] text-[var(--brand-accent-btn-text)]"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>New Milestone</span>
        </Button>
      </div>
    </div>
  );
}
