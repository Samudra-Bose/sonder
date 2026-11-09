/**
 * Pure, deterministic timeline date helpers for Sonder Timeline View (VS-05B).
 *
 * Invariants:
 * - Operates strictly on YYYY-MM-DD date-only strings without timestamp or timezone drift.
 * - Uses UTC-based arithmetic to eliminate daylight saving time (DST) shifts.
 * - Supports Day, Week, and Month zoom resolutions.
 * - Clamps timeline task bar positions and computes visible overlap ranges accurately.
 */

import {
  parseDateParts,
  formatDateString,
  addCalendarDays,
  addMonths,
  getDaysInMonth,
  getDayOfWeek,
} from "../calendar/calendar-date-utils.js";

export type TimelineMode = "day" | "week" | "month";

export interface TimelineColumn {
  id: string;
  label: string;
  subLabel?: string;
  dateStr: string; // start date of this column
  endDateStr: string; // end date of this column (same as dateStr for day mode)
  startDayOffset: number; // day offset relative to timeline rangeStart
  spanDays: number;
  widthPercent: number;
  isToday: boolean;
  isWeekend: boolean;
}

export interface TimelineGroupHeader {
  label: string;
  startDayOffset: number;
  spanDays: number;
  widthPercent: number;
}

export interface TimelineRange {
  mode: TimelineMode;
  anchorDate: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalDays: number;
  columns: TimelineColumn[];
  groupHeaders: TimelineGroupHeader[];
  rangeTitle: string;
}

export interface TaskTimelinePosition {
  leftPercent: number;
  widthPercent: number;
  spanType: "RANGE" | "START_ONLY" | "DUE_ONLY" | "UNDATED";
  isStartClipped: boolean;
  isEndClipped: boolean;
  isVisible: boolean;
  startDateFormatted: string | null;
  dueDateFormatted: string | null;
}

export interface MilestoneTimelinePosition {
  leftPercent: number;
  isVisible: boolean;
  targetDateFormatted: string | null;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SHORT_MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const SHORT_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Difference in calendar days between dateA and dateB (dateA - dateB).
 * Strictly UTC-based.
 */
export function diffInCalendarDays(dateA: string, dateB: string): number {
  const pA = parseDateParts(dateA);
  const pB = parseDateParts(dateB);
  const utcA = Date.UTC(pA.year, pA.month - 1, pA.day);
  const utcB = Date.UTC(pB.year, pB.month - 1, pB.day);
  return Math.round((utcA - utcB) / (1000 * 60 * 60 * 24));
}

/**
 * Returns the Monday date string for the week containing dateStr.
 */
export function getMondayOfWeek(dateStr: string): string {
  const { year, month, day } = parseDateParts(dateStr);
  const dow = getDayOfWeek(year, month, day);
  // Sunday = 0 -> -6, Monday = 1 -> 0, Tuesday = 2 -> -1, etc.
  const daysFromMonday = dow === 0 ? -6 : 1 - dow;
  return addCalendarDays(dateStr, daysFromMonday);
}

/**
 * Formats a date string into readable short format: "Nov 3, 2026" or "Nov 3".
 */
export function formatReadableDate(dateStr: string, includeYear = true): string {
  try {
    const { year, month, day } = parseDateParts(dateStr);
    const m = SHORT_MONTH_NAMES[month - 1] ?? "";
    return includeYear ? `${m} ${day}, ${year}` : `${m} ${day}`;
  } catch {
    return dateStr;
  }
}

/**
 * Generates the timeline range and column structure for Day, Week, or Month mode.
 */
export function getTimelineRange(
  anchorDate: string,
  mode: TimelineMode,
  todayStr: string
): TimelineRange {
  if (mode === "day") {
    // 21 days: 7 days before anchor date, anchor date, 13 days after
    const startDate = addCalendarDays(anchorDate, -7);
    const totalDays = 21;
    const endDate = addCalendarDays(startDate, totalDays - 1);

    const columns: TimelineColumn[] = [];
    let currentGroupMonth: { year: number; month: number; startOffset: number; spanDays: number } | null = null;
    const groupHeaders: TimelineGroupHeader[] = [];

    for (let i = 0; i < totalDays; i++) {
      const dStr = addCalendarDays(startDate, i);
      const parts = parseDateParts(dStr);
      const dow = getDayOfWeek(parts.year, parts.month, parts.day);

      // Track month group headers
      if (!currentGroupMonth || currentGroupMonth.month !== parts.month || currentGroupMonth.year !== parts.year) {
        if (currentGroupMonth) {
          groupHeaders.push({
            label: `${MONTH_NAMES[currentGroupMonth.month - 1]} ${currentGroupMonth.year}`,
            startDayOffset: currentGroupMonth.startOffset,
            spanDays: currentGroupMonth.spanDays,
            widthPercent: (currentGroupMonth.spanDays / totalDays) * 100,
          });
        }
        currentGroupMonth = {
          year: parts.year,
          month: parts.month,
          startOffset: i,
          spanDays: 1,
        };
      } else {
        currentGroupMonth.spanDays += 1;
      }

      columns.push({
        id: `day-${dStr}`,
        label: String(parts.day),
        subLabel: SHORT_DAY_NAMES[dow],
        dateStr: dStr,
        endDateStr: dStr,
        startDayOffset: i,
        spanDays: 1,
        widthPercent: (1 / totalDays) * 100,
        isToday: dStr === todayStr,
        isWeekend: dow === 0 || dow === 6,
      });
    }

    if (currentGroupMonth) {
      groupHeaders.push({
        label: `${MONTH_NAMES[currentGroupMonth.month - 1]} ${currentGroupMonth.year}`,
        startDayOffset: currentGroupMonth.startOffset,
        spanDays: currentGroupMonth.spanDays,
        widthPercent: (currentGroupMonth.spanDays / totalDays) * 100,
      });
    }

    const startParts = parseDateParts(startDate);
    const endParts = parseDateParts(endDate);
    const rangeTitle =
      startParts.month === endParts.month && startParts.year === endParts.year
        ? `${MONTH_NAMES[startParts.month - 1]} ${startParts.year}`
        : `${SHORT_MONTH_NAMES[startParts.month - 1]} ${startParts.year} – ${SHORT_MONTH_NAMES[endParts.month - 1]} ${endParts.year}`;

    return {
      mode,
      anchorDate,
      startDate,
      endDate,
      totalDays,
      columns,
      groupHeaders,
      rangeTitle,
    };
  }

  if (mode === "week") {
    // 10 weeks: 2 weeks before anchor week, 8 weeks after (70 days)
    const anchorMonday = getMondayOfWeek(anchorDate);
    const startDate = addCalendarDays(anchorMonday, -14); // 2 weeks back
    const totalWeeks = 10;
    const totalDays = totalWeeks * 7;
    const endDate = addCalendarDays(startDate, totalDays - 1);

    const columns: TimelineColumn[] = [];
    const groupHeaders: TimelineGroupHeader[] = [];
    let currentMonthGroup: { year: number; month: number; startOffset: number; spanDays: number } | null = null;

    for (let w = 0; w < totalWeeks; w++) {
      const colStart = addCalendarDays(startDate, w * 7);
      const colEnd = addCalendarDays(colStart, 6);
      const startParts = parseDateParts(colStart);
      const endParts = parseDateParts(colEnd);

      // Track month group
      if (!currentMonthGroup || currentMonthGroup.month !== startParts.month || currentMonthGroup.year !== startParts.year) {
        if (currentMonthGroup) {
          groupHeaders.push({
            label: `${MONTH_NAMES[currentMonthGroup.month - 1]} ${currentMonthGroup.year}`,
            startDayOffset: currentMonthGroup.startOffset,
            spanDays: currentMonthGroup.spanDays,
            widthPercent: (currentMonthGroup.spanDays / totalDays) * 100,
          });
        }
        currentMonthGroup = {
          year: startParts.year,
          month: startParts.month,
          startOffset: w * 7,
          spanDays: 7,
        };
      } else {
        currentMonthGroup.spanDays += 7;
      }

      const isCurrentWeek = diffInCalendarDays(todayStr, colStart) >= 0 && diffInCalendarDays(todayStr, colEnd) <= 0;

      columns.push({
        id: `week-${colStart}`,
        label: `${startParts.day} ${SHORT_MONTH_NAMES[startParts.month - 1]}`,
        subLabel: `${endParts.day} ${SHORT_MONTH_NAMES[endParts.month - 1]}`,
        dateStr: colStart,
        endDateStr: colEnd,
        startDayOffset: w * 7,
        spanDays: 7,
        widthPercent: (7 / totalDays) * 100,
        isToday: isCurrentWeek,
        isWeekend: false,
      });
    }

    if (currentMonthGroup) {
      groupHeaders.push({
        label: `${MONTH_NAMES[currentMonthGroup.month - 1]} ${currentMonthGroup.year}`,
        startDayOffset: currentMonthGroup.startOffset,
        spanDays: currentMonthGroup.spanDays,
        widthPercent: (currentMonthGroup.spanDays / totalDays) * 100,
      });
    }

    const startParts = parseDateParts(startDate);
    const endParts = parseDateParts(endDate);
    const rangeTitle = `${SHORT_MONTH_NAMES[startParts.month - 1]} ${startParts.year} – ${SHORT_MONTH_NAMES[endParts.month - 1]} ${endParts.year}`;

    return {
      mode,
      anchorDate,
      startDate,
      endDate,
      totalDays,
      columns,
      groupHeaders,
      rangeTitle,
    };
  }

  // mode === "month"
  // 6 months: 1 month before anchor, anchor, 4 months after
  const { year: aYear, month: aMonth } = parseDateParts(anchorDate);
  const startTuple = addMonths(aYear, aMonth, -1);
  const startDate = formatDateString(startTuple.year, startTuple.month, 1);

  const totalMonths = 6;
  const endTuple = addMonths(startTuple.year, startTuple.month, totalMonths - 1);
  const daysInEndMonth = getDaysInMonth(endTuple.year, endTuple.month);
  const endDate = formatDateString(endTuple.year, endTuple.month, daysInEndMonth);

  const totalDays = diffInCalendarDays(endDate, startDate) + 1;

  const columns: TimelineColumn[] = [];
  const groupHeaders: TimelineGroupHeader[] = [];
  let dayAccumulator = 0;
  let currentYearGroup: { year: number; startOffset: number; spanDays: number } | null = null;

  for (let m = 0; m < totalMonths; m++) {
    const curTuple = addMonths(startTuple.year, startTuple.month, m);
    const daysInCur = getDaysInMonth(curTuple.year, curTuple.month);
    const colStart = formatDateString(curTuple.year, curTuple.month, 1);
    const colEnd = formatDateString(curTuple.year, curTuple.month, daysInCur);

    // Track year group header
    if (!currentYearGroup || currentYearGroup.year !== curTuple.year) {
      if (currentYearGroup) {
        groupHeaders.push({
          label: String(currentYearGroup.year),
          startDayOffset: currentYearGroup.startOffset,
          spanDays: currentYearGroup.spanDays,
          widthPercent: (currentYearGroup.spanDays / totalDays) * 100,
        });
      }
      currentYearGroup = {
        year: curTuple.year,
        startOffset: dayAccumulator,
        spanDays: daysInCur,
      };
    } else {
      currentYearGroup.spanDays += daysInCur;
    }

    const isCurrentMonth = diffInCalendarDays(todayStr, colStart) >= 0 && diffInCalendarDays(todayStr, colEnd) <= 0;

    columns.push({
      id: `month-${curTuple.year}-${curTuple.month}`,
      label: SHORT_MONTH_NAMES[curTuple.month - 1] ?? "",
      subLabel: String(curTuple.year),
      dateStr: colStart,
      endDateStr: colEnd,
      startDayOffset: dayAccumulator,
      spanDays: daysInCur,
      widthPercent: (daysInCur / totalDays) * 100,
      isToday: isCurrentMonth,
      isWeekend: false,
    });

    dayAccumulator += daysInCur;
  }

  if (currentYearGroup) {
    groupHeaders.push({
      label: String(currentYearGroup.year),
      startDayOffset: currentYearGroup.startOffset,
      spanDays: currentYearGroup.spanDays,
      widthPercent: (currentYearGroup.spanDays / totalDays) * 100,
    });
  }

  const rangeTitle = `${MONTH_NAMES[startTuple.month - 1]} ${startTuple.year} – ${MONTH_NAMES[endTuple.month - 1]} ${endTuple.year}`;

  return {
    mode,
    anchorDate,
    startDate,
    endDate,
    totalDays,
    columns,
    groupHeaders,
    rangeTitle,
  };
}

/**
 * Calculates horizontal left and width percentage for a task bar in the timeline.
 * Supports:
 * - Both dates present (full duration span)
 * - Start-only date (point with forward indication)
 * - Due-only date (point with lead-up indication)
 * - Undated
 */
export function calculateTaskTimelinePosition(
  task: { startDate?: string | null; dueDate?: string | null },
  rangeStart: string,
  _rangeEnd: string,
  totalDays: number
): TaskTimelinePosition {
  const hasStart = Boolean(task.startDate && task.startDate.trim());
  const hasDue = Boolean(task.dueDate && task.dueDate.trim());

  if (!hasStart && !hasDue) {
    return {
      leftPercent: 0,
      widthPercent: 0,
      spanType: "UNDATED",
      isStartClipped: false,
      isEndClipped: false,
      isVisible: false,
      startDateFormatted: null,
      dueDateFormatted: null,
    };
  }

  const effectiveStart = hasStart ? task.startDate! : task.dueDate!;
  const effectiveDue = hasDue ? task.dueDate! : task.startDate!;

  const startOffsetDays = diffInCalendarDays(effectiveStart, rangeStart);
  // inclusive end day (+1) so a task ending on 2026-11-05 covers that day
  const endOffsetDays = diffInCalendarDays(effectiveDue, rangeStart) + 1;

  // Check visibility overlap with range
  // Range is [0, totalDays]
  const isVisible = endOffsetDays > 0 && startOffsetDays < totalDays;

  // Minimum visible bar width (e.g. 1.8% or at least 1 day fraction)
  const oneDayPercent = (1 / totalDays) * 100;
  const minWidthPercent = Math.max(1.8, oneDayPercent);

  let leftPercent: number;
  let widthPercent: number;
  const isStartClipped = startOffsetDays < 0;
  const isEndClipped = endOffsetDays > totalDays;

  if (hasStart && hasDue) {
    const rawLeft = (startOffsetDays / totalDays) * 100;
    const rawWidth = ((endOffsetDays - startOffsetDays) / totalDays) * 100;

    leftPercent = Math.max(0, Math.min(100, rawLeft));
    // If clipped at start, adjust width
    const visibleWidth = isStartClipped
      ? ((endOffsetDays / totalDays) * 100)
      : rawWidth;
    widthPercent = Math.max(minWidthPercent, Math.min(100 - leftPercent, visibleWidth));

    return {
      leftPercent,
      widthPercent,
      spanType: "RANGE",
      isStartClipped,
      isEndClipped,
      isVisible,
      startDateFormatted: formatReadableDate(task.startDate!),
      dueDateFormatted: formatReadableDate(task.dueDate!),
    };
  }

  if (hasStart) {
    // Start-only: anchored at start, represents milestone/point
    const rawLeft = (startOffsetDays / totalDays) * 100;
    leftPercent = Math.max(0, Math.min(100 - minWidthPercent, rawLeft));
    widthPercent = minWidthPercent;

    return {
      leftPercent,
      widthPercent,
      spanType: "START_ONLY",
      isStartClipped,
      isEndClipped,
      isVisible,
      startDateFormatted: formatReadableDate(task.startDate!),
      dueDateFormatted: null,
    };
  }

  // Due-only
  const rawLeft = ((endOffsetDays - 1) / totalDays) * 100;
  leftPercent = Math.max(0, Math.min(100 - minWidthPercent, rawLeft));
  widthPercent = minWidthPercent;

  return {
    leftPercent,
    widthPercent,
    spanType: "DUE_ONLY",
    isStartClipped,
    isEndClipped,
    isVisible,
    startDateFormatted: null,
    dueDateFormatted: formatReadableDate(task.dueDate!),
  };
}

/**
 * Calculates position for a workspace milestone marker.
 */
export function calculateMilestoneTimelinePosition(
  targetDate: string | null,
  rangeStart: string,
  totalDays: number
): MilestoneTimelinePosition {
  if (!targetDate || !targetDate.trim()) {
    return {
      leftPercent: 0,
      isVisible: false,
      targetDateFormatted: null,
    };
  }

  const offsetDays = diffInCalendarDays(targetDate, rangeStart);
  // Center of target date column (+0.5 days)
  const leftPercent = ((offsetDays + 0.5) / totalDays) * 100;
  const isVisible = offsetDays >= 0 && offsetDays < totalDays;

  return {
    leftPercent: Math.max(0, Math.min(100, leftPercent)),
    isVisible,
    targetDateFormatted: formatReadableDate(targetDate),
  };
}

/**
 * Navigates date forward or backward based on zoom mode.
 */
export function navigateTimelineDate(
  anchorDate: string,
  mode: TimelineMode,
  direction: "prev" | "next"
): string {
  const mult = direction === "next" ? 1 : -1;
  if (mode === "day") {
    // Jump 7 days
    return addCalendarDays(anchorDate, 7 * mult);
  }
  if (mode === "week") {
    // Jump 4 weeks (28 days)
    return addCalendarDays(anchorDate, 28 * mult);
  }
  // month: Jump 3 months
  const parts = parseDateParts(anchorDate);
  const nextTuple = addMonths(parts.year, parts.month, 3 * mult);
  const maxDay = getDaysInMonth(nextTuple.year, nextTuple.month);
  return formatDateString(nextTuple.year, nextTuple.month, Math.min(parts.day, maxDay));
}
