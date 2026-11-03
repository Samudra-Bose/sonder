/**
 * Pure, deterministic calendar date helpers for My Work temporal grouping.
 * Strict rules:
 * - Operates strictly on YYYY-MM-DD date-only strings.
 * - Does not convert date-only strings to timestamps for comparisons.
 * - Uses pure calendar day math via UTC to handle month/year boundaries, leap days,
 *   and eliminate daylight saving time (DST) jitter.
 */

export type TemporalGroupKey = "overdue" | "dueToday" | "upcoming" | "unscheduled";

/**
 * Validates whether a string matches strict YYYY-MM-DD format.
 */
export function isValidDateString(dateStr: string | null | undefined): dateStr is string {
  if (!dateStr || typeof dateStr !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim());
}

/**
 * Adds (or subtracts) a fixed number of calendar days to a YYYY-MM-DD string.
 * Uses UTC Date construction to guarantee clean calendar day arithmetic across
 * month boundaries, leap years, and year rollovers without timezone shifts.
 */
export function addCalendarDays(dateStr: string, days: number): string {
  const parts = dateStr.trim().split("-");
  if (parts.length !== 3) {
    throw new Error(`Invalid date string for addCalendarDays: "${dateStr}"`);
  }
  const year = parseInt(parts[0]!, 10);
  const month = parseInt(parts[1]!, 10); // 1-indexed (1 = Jan)
  const day = parseInt(parts[2]!, 10);

  // UTC Date: month is 0-indexed in JS Date
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const resYear = date.getUTCFullYear();
  const resMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const resDay = String(date.getUTCDate()).padStart(2, "0");

  return `${resYear}-${resMonth}-${resDay}`;
}

/**
 * Calculates calendar day difference between two YYYY-MM-DD strings: (targetDate - baseDate).
 * Positive if targetDate is after baseDate; negative if before baseDate.
 */
export function differenceInCalendarDays(targetDate: string, baseDate: string): number {
  const [y1, m1, d1] = targetDate.trim().split("-").map((s) => parseInt(s, 10));
  const [y2, m2, d2] = baseDate.trim().split("-").map((s) => parseInt(s, 10));

  const utc1 = Date.UTC(y1!, m1! - 1, d1!);
  const utc2 = Date.UTC(y2!, m2! - 1, d2!);

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((utc1 - utc2) / msPerDay);
}

/**
 * Returns today's calendar date in YYYY-MM-DD format.
 * Defaults to the client's detected IANA time zone (or explicit parameter).
 * In server or fallback environments, defaults to UTC.
 */
export function getDefaultReferenceDate(now: Date = new Date(), timeZone?: string): string {
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
    }).format(now);
  } catch {
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

/**
 * Classifies an active task into exactly one of the four canonical temporal groups.
 *
 * Rules:
 * 1. Terminal tasks (statusCategory is "DONE" or "CANCELED") are excluded (return null).
 * 2. Unscheduled: Active tasks with no due date (null, undefined, or empty).
 * 3. Overdue: Active tasks with dueDate < referenceDate.
 * 4. Due Today: Active tasks with dueDate === referenceDate.
 * 5. Upcoming: Active tasks with referenceDate < dueDate <= (referenceDate + 6 calendar days).
 * 6. Future tasks beyond the 7-day upcoming window are excluded (return null) because
 *    the canonical baseline excludes the proposed 'Later' group.
 */
export function classifyTemporalGroup(
  dueDate: string | null | undefined,
  statusCategory: string,
  referenceDate: string
): TemporalGroupKey | null {
  // Exclude terminal / completed tasks (canonical contract specifies CANCELED)
  if (statusCategory === "DONE" || statusCategory === "CANCELED") {
    return null;
  }

  // Backlog tasks without a due date belong in Unscheduled
  if (!dueDate || !dueDate.trim()) {
    return "unscheduled";
  }

  const cleanDueDate = dueDate.trim();
  const cleanRefDate = referenceDate.trim();

  // Overdue: earlier than reference date
  if (cleanDueDate < cleanRefDate) {
    return "overdue";
  }

  // Due Today: calendar due date equals reference date
  if (cleanDueDate === cleanRefDate) {
    return "dueToday";
  }

  // Upcoming: next 6 calendar days after reference date (total 7 calendar day window)
  const upcomingHorizon = addCalendarDays(cleanRefDate, 6);
  if (cleanDueDate > cleanRefDate && cleanDueDate <= upcomingHorizon) {
    return "upcoming";
  }

  // Beyond the 7-day upcoming horizon: excluded from approved 4-group baseline
  return null;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Formats a YYYY-MM-DD due date into a human-readable display string with relative hint.
 */
export function formatDueDisplay(
  dueDate: string | null | undefined,
  referenceDate: string
): string {
  if (!dueDate || !dueDate.trim()) {
    return "No due date";
  }

  const cleanDue = dueDate.trim();
  const cleanRef = referenceDate.trim();

  const diff = differenceInCalendarDays(cleanDue, cleanRef);

  if (diff === 0) return "Due Today";
  if (diff === 1) return "Due Tomorrow";
  if (diff === -1) return "Overdue by 1 day";
  if (diff < -1) return `Overdue by ${Math.abs(diff)} days`;

  // Parse YYYY-MM-DD for formatted text
  const parts = cleanDue.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0]!, 10);
    const month = parseInt(parts[1]!, 10);
    const day = parseInt(parts[2]!, 10);
    const monthStr = MONTH_NAMES[month - 1] || "";

    const refYear = parseInt(cleanRef.split("-")[0]!, 10);
    if (year === refYear) {
      return `${monthStr} ${day}`;
    }
    return `${monthStr} ${day}, ${year}`;
  }

  return cleanDue;
}
