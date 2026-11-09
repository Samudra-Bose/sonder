import React from "react";
import { cn } from "@/lib/utils";
import type { TimelineRange } from "./timeline-date-utils.js";

export interface TimelineTimeAxisProps {
  range: TimelineRange;
  todayPercent?: number | null;
  className?: string;
}

export function TimelineTimeAxis({
  range,
  todayPercent: _todayPercent,
  className,
}: TimelineTimeAxisProps): React.JSX.Element {
  return (
    <div
      data-testid="timeline-time-axis"
      className={cn("select-none bg-[var(--surface-muted)] border-b border-[var(--border-subtle)]", className)}
    >
      {/* Top Group Headers Row (Months / Years) */}
      <div className="flex border-b border-[var(--border-subtle)] h-6 text-[11px] font-semibold text-[var(--text-secondary)]">
        {range.groupHeaders.map((grp, idx) => (
          <div
            key={`grp-${idx}-${grp.label}`}
            style={{ width: `${grp.widthPercent}%` }}
            className="flex items-center px-2 border-r border-[var(--border-subtle)] overflow-hidden text-ellipsis whitespace-nowrap bg-[var(--surface-card)]"
          >
            {grp.label}
          </div>
        ))}
      </div>

      {/* Bottom Columns Row (Days / Weeks / Months) */}
      <div className="flex h-8 text-[10px] text-[var(--text-muted)]">
        {range.columns.map((col) => (
          <div
            key={col.id}
            style={{ width: `${col.widthPercent}%` }}
            data-testid={`axis-col-${col.dateStr}`}
            className={cn(
              "flex flex-col items-center justify-center border-r border-[var(--border-subtle)] transition-colors overflow-hidden",
              col.isWeekend && "bg-black/[0.02] dark:bg-white/[0.02]",
              col.isToday && "bg-[var(--brand-accent-subtle)] text-[var(--brand-accent-text)] font-semibold"
            )}
          >
            <span className={cn("leading-none", col.isToday && "font-bold text-[var(--brand-accent-text)]")}>
              {col.label}
            </span>
            {col.subLabel && (
              <span className="text-[9px] opacity-75 leading-none mt-0.5">
                {col.subLabel}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Background vertical grid lines component that matches the column widths.
 */
export function TimelineGridLines({
  range,
  todayPercent,
}: {
  range: TimelineRange;
  todayPercent: number | null;
}): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none flex"
    >
      {range.columns.map((col) => (
        <div
          key={`grid-${col.id}`}
          style={{ width: `${col.widthPercent}%` }}
          className={cn(
            "h-full border-r border-[var(--border-subtle)]/40",
            col.isWeekend && "bg-black/[0.015] dark:bg-white/[0.015]",
            col.isToday && "bg-[var(--brand-accent-subtle)]/30"
          )}
        />
      ))}

      {/* Today Indicator Vertical Marker */}
      {todayPercent !== null && todayPercent >= 0 && todayPercent <= 100 && (
        <div
          data-testid="timeline-today-indicator"
          style={{ left: `${todayPercent}%` }}
          className="absolute top-0 bottom-0 z-10 w-0.5 bg-[var(--brand-accent-btn-bg)] -translate-x-1/2"
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-1 py-0.5 rounded text-[9px] font-bold bg-[var(--brand-accent-btn-bg)] text-white shadow-xs uppercase tracking-wider">
            Today
          </div>
        </div>
      )}
    </div>
  );
}
