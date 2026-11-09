import React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface CalendarHeaderProps {
  title: string;
  mode: "month" | "week";
  onModeChange: (mode: "month" | "week") => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  className?: string;
}

export function CalendarHeader({
  title,
  mode,
  onModeChange,
  onPrev,
  onNext,
  onToday,
  className,
}: CalendarHeaderProps): React.JSX.Element {
  return (
    <div
      data-testid="calendar-header"
      className={cn(
        "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-3 shadow-2xs select-none",
        className
      )}
    >
      {/* Navigation Controls & Title */}
      <div className="flex items-center gap-2">
        {/* Today shortcut */}
        <Button
          variant="outline"
          size="sm"
          data-testid="calendar-today-btn"
          onClick={onToday}
          className="gap-1.5 h-8 px-2.5 text-xs font-semibold"
        >
          <CalendarIcon className="h-3.5 w-3.5 text-[var(--brand-accent-text)]" />
          <span>Today</span>
        </Button>

        {/* Prev / Next buttons */}
        <div className="flex items-center border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-muted)] p-0.5">
          <button
            type="button"
            data-testid="calendar-prev-btn"
            aria-label={`Previous ${mode === "month" ? "month" : "week"}`}
            onClick={onPrev}
            className="p-1.5 rounded-md hover:bg-[var(--surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all focus-ring cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="calendar-next-btn"
            aria-label={`Next ${mode === "month" ? "month" : "week"}`}
            onClick={onNext}
            className="p-1.5 rounded-md hover:bg-[var(--surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all focus-ring cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Dynamic Title (e.g. November 2026 or Nov 8 – 14, 2026) */}
        <h2
          data-testid="calendar-title"
          className="text-sm sm:text-base font-bold text-[var(--text-primary)] ml-1 tracking-tight"
        >
          {title}
        </h2>
      </div>

      {/* Mode Switcher Segmented Control (Month / Week) */}
      <div
        role="tablist"
        aria-label="Calendar view resolution"
        className="inline-flex h-8 items-center rounded-lg bg-[var(--surface-muted)] border border-[var(--border-subtle)] p-0.5 gap-0.5 self-start sm:self-auto"
      >
        <button
          type="button"
          role="tab"
          id="calendar-mode-month"
          data-testid="calendar-mode-month"
          aria-selected={mode === "month"}
          onClick={() => onModeChange("month")}
          className={cn(
            "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer focus-ring",
            mode === "month"
              ? "bg-[var(--surface-card)] text-[var(--brand-accent-text)] shadow-xs font-bold"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          )}
        >
          Month
        </button>
        <button
          type="button"
          role="tab"
          id="calendar-mode-week"
          data-testid="calendar-mode-week"
          aria-selected={mode === "week"}
          onClick={() => onModeChange("week")}
          className={cn(
            "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer focus-ring",
            mode === "week"
              ? "bg-[var(--surface-card)] text-[var(--brand-accent-text)] shadow-xs font-bold"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          )}
        >
          Week
        </button>
      </div>
    </div>
  );
}
