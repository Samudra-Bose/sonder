import React, { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Feedback } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { CalendarHeader } from "./CalendarHeader";
import { MonthCalendar } from "./MonthCalendar";
import { WeekCalendar } from "./WeekCalendar";
import { UnscheduledTaskTray } from "./UnscheduledTaskTray";
import {
  parseDateParts,
  formatDateString,
  addMonths,
  addCalendarDays,
  getMonthCalendarGrid,
  getWeekDays,
  formatMonthHeader,
  formatWeekHeader,
  getTodayString,
} from "./calendar-date-utils";
import type { TaskDto } from "../../types";

export interface CalendarViewProps {
  tasks: TaskDto[];
  unscheduledTasks: TaskDto[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  calendarMode: "month" | "week";
  onCalendarModeChange: (mode: "month" | "week") => void;
  currentDate: string; // YYYY-MM-DD
  onCurrentDateChange: (newDate: string) => void;
  onTaskClick: (task: TaskDto) => void;
  onCreateTask?: (dateStr: string, invoker?: HTMLElement | null) => void;
  className?: string;
}

export function CalendarView({
  tasks,
  unscheduledTasks,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  calendarMode,
  onCalendarModeChange,
  currentDate,
  onCurrentDateChange,
  onTaskClick,
  onCreateTask,
  className,
}: CalendarViewProps): React.JSX.Element {
  const [isTrayOpen, setIsTrayOpen] = useState(true);

  // Parse current date parts safely
  const { year, month } = useMemo(() => {
    try {
      const parts = parseDateParts(currentDate);
      return { year: parts.year, month: parts.month };
    } catch {
      const today = getTodayString();
      const parts = parseDateParts(today);
      return { year: parts.year, month: parts.month };
    }
  }, [currentDate]);

  const todayStr = useMemo(() => getTodayString(), []);

  // Compute month grid and week days
  const monthGrid = useMemo(
    () => getMonthCalendarGrid(year, month, todayStr),
    [year, month, todayStr]
  );

  const weekDays = useMemo(
    () => getWeekDays(currentDate, todayStr),
    [currentDate, todayStr]
  );

  // Group tasks by dueDate
  const tasksByDate = useMemo(() => {
    const map: Record<string, TaskDto[]> = {};
    for (const task of tasks) {
      if (task.dueDate && task.dueDate.trim()) {
        const dateKey = task.dueDate.trim();
        if (!map[dateKey]) {
          map[dateKey] = [];
        }
        map[dateKey]!.push(task);
      }
    }
    return map;
  }, [tasks]);

  // Navigation handlers
  const handlePrev = () => {
    if (calendarMode === "month") {
      const { year: prevYear, month: prevMonth } = addMonths(year, month, -1);
      onCurrentDateChange(formatDateString(prevYear, prevMonth, 1));
    } else {
      onCurrentDateChange(addCalendarDays(currentDate, -7));
    }
  };

  const handleNext = () => {
    if (calendarMode === "month") {
      const { year: nextYear, month: nextMonth } = addMonths(year, month, 1);
      onCurrentDateChange(formatDateString(nextYear, nextMonth, 1));
    } else {
      onCurrentDateChange(addCalendarDays(currentDate, 7));
    }
  };

  const handleToday = () => {
    onCurrentDateChange(todayStr);
  };

  const headerTitle = useMemo(() => {
    if (calendarMode === "month") {
      return formatMonthHeader(year, month);
    }
    return formatWeekHeader(weekDays);
  }, [calendarMode, year, month, weekDays]);

  // Loading skeleton state
  if (isLoading) {
    return (
      <div
        data-testid="calendar-loading-skeleton"
        className={cn("flex flex-col gap-4", className)}
      >
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  // Error feedback state
  if (isError) {
    return (
      <div data-testid="calendar-error-state" className="p-4">
        <Feedback
          variant="danger"
          title="Failed to load calendar tasks"
        >
          <div className="space-y-3">
            <p className="text-xs">
              {errorMessage || "An unexpected error occurred while querying workspace tasks."}
            </p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="mt-2 text-xs"
              >
                Retry
              </Button>
            )}
          </div>
        </Feedback>
      </div>
    );
  }

  return (
    <div
      data-testid="calendar-view-container"
      className={cn("flex flex-col gap-4", className)}
    >
      {/* Calendar Navigation Header */}
      <CalendarHeader
        title={headerTitle}
        mode={calendarMode}
        onModeChange={onCalendarModeChange}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
      />

      {/* Main Calendar Resolution (Month vs Week) */}
      {calendarMode === "month" ? (
        <MonthCalendar
          grid={monthGrid}
          tasksByDate={tasksByDate}
          todayStr={todayStr}
          onTaskClick={onTaskClick}
          onCreateTask={onCreateTask}
        />
      ) : (
        <WeekCalendar
          weekDays={weekDays}
          tasksByDate={tasksByDate}
          todayStr={todayStr}
          onTaskClick={onTaskClick}
          onCreateTask={onCreateTask}
        />
      )}

      {/* Unscheduled Task Tray */}
      <UnscheduledTaskTray
        tasks={unscheduledTasks}
        isOpen={isTrayOpen}
        onToggle={() => setIsTrayOpen(!isTrayOpen)}
        onTaskClick={onTaskClick}
      />
    </div>
  );
}
