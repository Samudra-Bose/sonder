/**
 * Pure, deterministic calendar date helpers for Sonder Calendar View (VS-05A).
 *
 * Invariants:
 * - Operates strictly on YYYY-MM-DD date-only strings without timestamp or local time zone shifts.
 * - Uses UTC-based arithmetic to eliminate daylight saving time (DST) shifts.
 * - Accurately accounts for leap years, 30/31-day months, and year boundary rollovers.
 */

export interface CalendarDayInfo {
  dateStr: string; // YYYY-MM-DD
  year: number;
  month: number; // 1-indexed (1..12)
  day: number; // 1..31
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  isCurrentMonth: boolean;
  isToday: boolean;
}

export interface WeekDayInfo {
  dateStr: string; // YYYY-MM-DD
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  dayName: string; // e.g. "Mon"
  isToday: boolean;
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

const SHORT_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Checks whether a year is a leap year.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns number of calendar days in a given year and month (1-indexed).
 */
export function getDaysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if (month === 4 || month === 6 || month === 9 || month === 11) {
    return 30;
  }
  return 31;
}

/**
 * Formats year, month (1-indexed), and day into strict YYYY-MM-DD.
 */
export function formatDateString(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parses YYYY-MM-DD into numeric year, month (1-indexed), and day.
 */
export function parseDateParts(dateStr: string): { year: number; month: number; day: number } {
  const parts = dateStr.trim().split("-");
  if (parts.length !== 3) {
    throw new Error(`Invalid date string: "${dateStr}". Expected YYYY-MM-DD.`);
  }
  const year = parseInt(parts[0]!, 10);
  const month = parseInt(parts[1]!, 10);
  const day = parseInt(parts[2]!, 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error(`Invalid numeric date parts in: "${dateStr}".`);
  }
  return { year, month, day };
}

/**
 * Returns the day of week (0 = Sunday, ..., 6 = Saturday) for year, month, day.
 * Uses UTC Date construction to avoid any browser timezone interference.
 */
export function getDayOfWeek(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * Adds (or subtracts) calendar days to a YYYY-MM-DD string using UTC math.
 */
export function addCalendarDays(dateStr: string, days: number): string {
  const { year, month, day } = parseDateParts(dateStr);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return formatDateString(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/**
 * Advances or rewinds a (year, month) tuple by delta months.
 */
export function addMonths(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  let totalMonths = year * 12 + (month - 1) + delta;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;
  return { year: newYear, month: newMonth };
}

/**
 * Returns today's date in YYYY-MM-DD format using the workspace/system IANA timezone.
 */
export function getTodayString(timeZone?: string): string {
  try {
    const tz =
      timeZone ||
      (typeof window !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "UTC");
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    const now = new Date();
    return formatDateString(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());
  }
}

/**
 * Generates the full 35 or 42 grid cells for Month View.
 * Starts from Sunday (startOfWeek = 0) or Monday (startOfWeek = 1).
 * Leading cells from the previous month and trailing cells from the next month are included.
 */
export function getMonthCalendarGrid(
  year: number,
  month: number,
  todayStr: string,
  startOfWeek: 0 | 1 = 0
): CalendarDayInfo[] {
  const daysInCurrent = getDaysInMonth(year, month);
  const firstDayOfWeek = getDayOfWeek(year, month, 1);

  // Calculate leading days from previous month
  const leadingCount = (firstDayOfWeek - startOfWeek + 7) % 7;
  const { year: prevYear, month: prevMonth } = addMonths(year, month, -1);
  const daysInPrev = getDaysInMonth(prevYear, prevMonth);

  const grid: CalendarDayInfo[] = [];

  // Add leading days
  for (let i = leadingCount - 1; i >= 0; i--) {
    const day = daysInPrev - i;
    const dateStr = formatDateString(prevYear, prevMonth, day);
    grid.push({
      dateStr,
      year: prevYear,
      month: prevMonth,
      day,
      dayOfWeek: getDayOfWeek(prevYear, prevMonth, day),
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Add current month days
  for (let day = 1; day <= daysInCurrent; day++) {
    const dateStr = formatDateString(year, month, day);
    grid.push({
      dateStr,
      year,
      month,
      day,
      dayOfWeek: getDayOfWeek(year, month, day),
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  // Add trailing days to complete full 7-day rows (target 35 or 42 cells)
  const remainder = grid.length % 7;
  const trailingCount = remainder === 0 ? 0 : 7 - remainder;
  const { year: nextYear, month: nextMonth } = addMonths(year, month, 1);

  for (let day = 1; day <= trailingCount; day++) {
    const dateStr = formatDateString(nextYear, nextMonth, day);
    grid.push({
      dateStr,
      year: nextYear,
      month: nextMonth,
      day,
      dayOfWeek: getDayOfWeek(nextYear, nextMonth, day),
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  return grid;
}

/**
 * Returns 7 days representing a calendar week around a given date string.
 */
export function getWeekDays(
  centerDateStr: string,
  todayStr: string,
  startOfWeek: 0 | 1 = 0
): WeekDayInfo[] {
  const { year, month, day } = parseDateParts(centerDateStr);
  const currentDow = getDayOfWeek(year, month, day);
  const diffToStart = (currentDow - startOfWeek + 7) % 7;
  const startDateStr = addCalendarDays(centerDateStr, -diffToStart);

  const week: WeekDayInfo[] = [];
  for (let i = 0; i < 7; i++) {
    const dStr = addCalendarDays(startDateStr, i);
    const parts = parseDateParts(dStr);
    const dow = getDayOfWeek(parts.year, parts.month, parts.day);
    week.push({
      dateStr: dStr,
      year: parts.year,
      month: parts.month,
      day: parts.day,
      dayOfWeek: dow,
      dayName: SHORT_DAY_NAMES[dow] ?? "",
      isToday: dStr === todayStr,
    });
  }
  return week;
}

/**
 * Formats a month and year header (e.g. "November 2026").
 */
export function formatMonthHeader(year: number, month: number): string {
  const name = MONTH_NAMES[month - 1] ?? "";
  return `${name} ${year}`;
}

/**
 * Formats a week range header (e.g. "Nov 8 – Nov 14, 2026" or "Dec 27, 2026 – Jan 2, 2027").
 */
export function formatWeekHeader(week: WeekDayInfo[]): string {
  if (week.length === 0) return "";
  const first = week[0]!;
  const last = week[week.length - 1]!;

  const firstMonth = MONTH_NAMES[first.month - 1]?.slice(0, 3) ?? "";
  const lastMonth = MONTH_NAMES[last.month - 1]?.slice(0, 3) ?? "";

  if (first.year === last.year) {
    if (first.month === last.month) {
      return `${firstMonth} ${first.day} – ${last.day}, ${first.year}`;
    }
    return `${firstMonth} ${first.day} – ${lastMonth} ${last.day}, ${first.year}`;
  }

  return `${firstMonth} ${first.day}, ${first.year} – ${lastMonth} ${last.day}, ${last.year}`;
}
