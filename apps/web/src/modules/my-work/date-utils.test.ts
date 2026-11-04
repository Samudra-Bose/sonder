import { describe, it, expect } from "vitest";
import {
  addCalendarDays,
  differenceInCalendarDays,
  classifyTemporalGroup,
  formatDueDisplay,
  isValidDateString,
  getDefaultReferenceDate,
} from "./date-utils";

describe("My Work Date Utilities (VS-02E)", () => {
  describe("isValidDateString", () => {
    it("validates standard YYYY-MM-DD dates", () => {
      expect(isValidDateString("2026-11-03")).toBe(true);
      expect(isValidDateString("2024-02-29")).toBe(true);
      expect(isValidDateString("2026-1-3")).toBe(false);
      expect(isValidDateString("invalid")).toBe(false);
      expect(isValidDateString(null)).toBe(false);
      expect(isValidDateString(undefined)).toBe(false);
    });
  });

  describe("addCalendarDays", () => {
    it("adds days within the same month correctly", () => {
      expect(addCalendarDays("2026-11-03", 4)).toBe("2026-11-07");
      expect(addCalendarDays("2026-11-03", 6)).toBe("2026-11-09");
    });

    it("handles month rollover correctly", () => {
      expect(addCalendarDays("2026-01-31", 1)).toBe("2026-02-01");
      expect(addCalendarDays("2026-11-28", 5)).toBe("2026-12-03");
    });

    it("handles leap year boundaries correctly", () => {
      // 2024 is a leap year (Feb has 29 days)
      expect(addCalendarDays("2024-02-28", 1)).toBe("2024-02-29");
      expect(addCalendarDays("2024-02-28", 2)).toBe("2024-03-01");

      // 2025 is not a leap year (Feb has 28 days)
      expect(addCalendarDays("2025-02-28", 1)).toBe("2025-03-01");
    });

    it("handles year rollover correctly", () => {
      expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
      expect(addCalendarDays("2026-12-30", 3)).toBe("2027-01-02");
    });

    it("supports negative day subtraction", () => {
      expect(addCalendarDays("2026-11-03", -1)).toBe("2026-11-02");
      expect(addCalendarDays("2026-01-01", -1)).toBe("2025-12-31");
    });
  });

  describe("differenceInCalendarDays", () => {
    it("computes exact day offsets", () => {
      expect(differenceInCalendarDays("2026-11-03", "2026-11-03")).toBe(0);
      expect(differenceInCalendarDays("2026-11-05", "2026-11-03")).toBe(2);
      expect(differenceInCalendarDays("2026-11-01", "2026-11-03")).toBe(-2);
      expect(differenceInCalendarDays("2027-01-01", "2026-12-31")).toBe(1);
    });
  });

  describe("classifyTemporalGroup", () => {
    const referenceDate = "2026-11-03";

    it("classifies tasks with dueDate < referenceDate as overdue", () => {
      expect(classifyTemporalGroup("2026-11-02", "IN_PROGRESS", referenceDate)).toBe("overdue");
      expect(classifyTemporalGroup("2026-10-15", "TODO", referenceDate)).toBe("overdue");
      expect(classifyTemporalGroup("2025-12-31", "BACKLOG", referenceDate)).toBe("overdue");
    });

    it("classifies tasks with dueDate === referenceDate as dueToday", () => {
      expect(classifyTemporalGroup("2026-11-03", "TODO", referenceDate)).toBe("dueToday");
      expect(classifyTemporalGroup("2026-11-03", "IN_PROGRESS", referenceDate)).toBe("dueToday");
    });

    it("classifies tasks within the next 6 calendar days as upcoming", () => {
      // referenceDate + 1 to referenceDate + 6: 2026-11-04 to 2026-11-09
      expect(classifyTemporalGroup("2026-11-04", "TODO", referenceDate)).toBe("upcoming");
      expect(classifyTemporalGroup("2026-11-07", "IN_PROGRESS", referenceDate)).toBe("upcoming");
      expect(classifyTemporalGroup("2026-11-09", "TODO", referenceDate)).toBe("upcoming"); // 6 days later, inclusive
    });

    it("excludes tasks beyond the 7-day upcoming horizon (no Later group)", () => {
      // 2026-11-10 is referenceDate + 7 days
      expect(classifyTemporalGroup("2026-11-10", "TODO", referenceDate)).toBeNull();
      expect(classifyTemporalGroup("2026-12-01", "TODO", referenceDate)).toBeNull();
    });

    it("classifies active tasks without a due date as unscheduled", () => {
      expect(classifyTemporalGroup(null, "TODO", referenceDate)).toBe("unscheduled");
      expect(classifyTemporalGroup(undefined, "BACKLOG", referenceDate)).toBe("unscheduled");
      expect(classifyTemporalGroup("", "IN_PROGRESS", referenceDate)).toBe("unscheduled");
      expect(classifyTemporalGroup("   ", "TODO", referenceDate)).toBe("unscheduled");
    });

    it("excludes terminal tasks (DONE and CANCELED) even if overdue or due today", () => {
      expect(classifyTemporalGroup("2026-11-01", "DONE", referenceDate)).toBeNull();
      expect(classifyTemporalGroup("2026-11-03", "DONE", referenceDate)).toBeNull();
      expect(classifyTemporalGroup("2026-11-05", "CANCELED", referenceDate)).toBeNull();
      expect(classifyTemporalGroup(null, "CANCELED", referenceDate)).toBeNull();
      expect(classifyTemporalGroup(null, "DONE", referenceDate)).toBeNull();
    });
  });

  describe("getDefaultReferenceDate", () => {
    it("formats today's calendar date as YYYY-MM-DD", () => {
      const dateStr = getDefaultReferenceDate();
      expect(isValidDateString(dateStr)).toBe(true);
    });

    it("respects IANA timezones across UTC midnight boundaries", () => {
      // 2026-11-04 at 02:00:00 UTC
      const utcMidnightCross = new Date("2026-11-04T02:00:00Z");

      // In America/Los_Angeles (UTC-8), it is still 2026-11-03 at 18:00
      const laDate = getDefaultReferenceDate(utcMidnightCross, "America/Los_Angeles");
      expect(laDate).toBe("2026-11-03");

      // In Asia/Tokyo (UTC+9), it is already 2026-11-04 at 11:00
      const tokyoDate = getDefaultReferenceDate(utcMidnightCross, "Asia/Tokyo");
      expect(tokyoDate).toBe("2026-11-04");

      // In UTC, it is 2026-11-04
      const utcDate = getDefaultReferenceDate(utcMidnightCross, "UTC");
      expect(utcDate).toBe("2026-11-04");
    });
  });

  describe("formatDueDisplay", () => {
    const referenceDate = "2026-11-03";

    it("formats relative and absolute due dates correctly", () => {
      expect(formatDueDisplay(null, referenceDate)).toBe("No due date");
      expect(formatDueDisplay("2026-11-03", referenceDate)).toBe("Due Today");
      expect(formatDueDisplay("2026-11-04", referenceDate)).toBe("Due Tomorrow");
      expect(formatDueDisplay("2026-11-02", referenceDate)).toBe("Overdue by 1 day");
      expect(formatDueDisplay("2026-10-30", referenceDate)).toBe("Overdue by 4 days");
      expect(formatDueDisplay("2026-11-08", referenceDate)).toBe("Nov 8");
      expect(formatDueDisplay("2027-02-15", referenceDate)).toBe("Feb 15, 2027");
    });
  });
});
