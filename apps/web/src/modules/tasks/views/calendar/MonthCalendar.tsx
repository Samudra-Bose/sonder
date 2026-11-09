import React from "react";
import { cn } from "@/lib/utils";
import { CalendarDayCell } from "./CalendarDayCell";
import type { CalendarDayInfo } from "./calendar-date-utils";
import type { TaskDto } from "../../types";

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface MonthCalendarProps {
  grid: CalendarDayInfo[];
  tasksByDate: Record<string, TaskDto[]>;
  todayStr: string;
  onTaskClick: (task: TaskDto) => void;
  className?: string;
}

export function MonthCalendar({
  grid,
  tasksByDate,
  todayStr,
  onTaskClick,
  className,
}: MonthCalendarProps): React.JSX.Element {
  return (
    <div
      role="grid"
      aria-label="Month calendar view"
      data-testid="month-calendar-grid"
      className={cn(
        "flex flex-col bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-2xs select-none",
        className
      )}
    >
      {/* Weekday Header Row */}
      <div
        role="row"
        className="grid grid-cols-7 border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-secondary)] text-[11px] font-bold uppercase tracking-wider py-2 text-center"
      >
        {DAY_HEADERS.map((name) => (
          <div key={name} role="columnheader" aria-label={name}>
            {name}
          </div>
        ))}
      </div>

      {/* Calendar Day Cells Grid */}
      <div className="grid grid-cols-7 border-l border-t border-[var(--border-subtle)]">
        {grid.map((dayInfo) => (
          <CalendarDayCell
            key={dayInfo.dateStr}
            dayInfo={dayInfo}
            tasks={tasksByDate[dayInfo.dateStr] ?? []}
            todayStr={todayStr}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </div>
  );
}
