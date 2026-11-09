import { describe, it, expect } from "vitest";
import {
  diffInCalendarDays,
  getMondayOfWeek,
  formatReadableDate,
  getTimelineRange,
  calculateTaskTimelinePosition,
  calculateMilestoneTimelinePosition,
  navigateTimelineDate,
} from "./timeline-date-utils.js";

describe("timeline-date-utils", () => {
  describe("diffInCalendarDays", () => {
    it("calculates accurate day difference between dates", () => {
      expect(diffInCalendarDays("2026-11-10", "2026-11-05")).toBe(5);
      expect(diffInCalendarDays("2026-11-01", "2026-10-31")).toBe(1);
      expect(diffInCalendarDays("2026-11-05", "2026-11-05")).toBe(0);
      expect(diffInCalendarDays("2026-10-25", "2026-11-05")).toBe(-11);
    });

    it("handles leap year boundaries correctly", () => {
      expect(diffInCalendarDays("2028-03-01", "2028-02-28")).toBe(2);
      expect(diffInCalendarDays("2027-03-01", "2027-02-28")).toBe(1);
    });
  });

  describe("getMondayOfWeek", () => {
    it("returns Monday for dates across the week", () => {
      // 2026-11-09 is Monday
      expect(getMondayOfWeek("2026-11-09")).toBe("2026-11-09");
      // 2026-11-11 is Wednesday -> Monday is 2026-11-09
      expect(getMondayOfWeek("2026-11-11")).toBe("2026-11-09");
      // 2026-11-15 is Sunday -> Monday is 2026-11-09
      expect(getMondayOfWeek("2026-11-15")).toBe("2026-11-09");
      // 2026-11-08 is Sunday -> Monday is 2026-11-02
      expect(getMondayOfWeek("2026-11-08")).toBe("2026-11-02");
    });
  });

  describe("formatReadableDate", () => {
    it("formats dates cleanly", () => {
      expect(formatReadableDate("2026-11-09")).toBe("Nov 9, 2026");
      expect(formatReadableDate("2026-11-09", false)).toBe("Nov 9");
      expect(formatReadableDate("invalid")).toBe("invalid");
    });
  });

  describe("getTimelineRange", () => {
    it("constructs 21-day timeline range in day mode", () => {
      const range = getTimelineRange("2026-11-09", "day", "2026-11-09");
      expect(range.mode).toBe("day");
      expect(range.totalDays).toBe(21);
      expect(range.columns).toHaveLength(21);
      expect(range.startDate).toBe("2026-11-02");
      expect(range.endDate).toBe("2026-11-22");

      const todayCol = range.columns.find((c) => c.isToday);
      expect(todayCol).toBeDefined();
      expect(todayCol?.dateStr).toBe("2026-11-09");
      expect(range.groupHeaders.length).toBeGreaterThan(0);
    });

    it("constructs 10-week timeline range in week mode", () => {
      const range = getTimelineRange("2026-11-09", "week", "2026-11-09");
      expect(range.mode).toBe("week");
      expect(range.columns).toHaveLength(10);
      expect(range.totalDays).toBe(70);

      const currentWeekCol = range.columns.find((c) => c.isToday);
      expect(currentWeekCol).toBeDefined();
    });

    it("constructs 6-month timeline range in month mode", () => {
      const range = getTimelineRange("2026-11-09", "month", "2026-11-09");
      expect(range.mode).toBe("month");
      expect(range.columns).toHaveLength(6);
      expect(range.startDate).toBe("2026-10-01");

      const novCol = range.columns.find((c) => c.label === "Nov");
      expect(novCol).toBeDefined();
      expect(novCol?.isToday).toBe(true);
    });
  });

  describe("calculateTaskTimelinePosition", () => {
    const rangeStart = "2026-11-01";
    const rangeEnd = "2026-11-21";
    const totalDays = 21;

    it("handles two-date duration range task", () => {
      const task = {
        startDate: "2026-11-03",
        dueDate: "2026-11-07",
      };

      const pos = calculateTaskTimelinePosition(task, rangeStart, rangeEnd, totalDays);
      expect(pos.spanType).toBe("RANGE");
      expect(pos.isVisible).toBe(true);
      expect(pos.isStartClipped).toBe(false);
      expect(pos.isEndClipped).toBe(false);
      // offset is 2 days out of 21 => (2/21)*100 ~ 9.52%
      expect(pos.leftPercent).toBeCloseTo((2 / 21) * 100, 1);
      // span is 5 days (Nov 3 through Nov 7 inclusive) => (5/21)*100 ~ 23.8%
      expect(pos.widthPercent).toBeCloseTo((5 / 21) * 100, 1);
    });

    it("handles start-only task", () => {
      const task = {
        startDate: "2026-11-05",
        dueDate: null,
      };

      const pos = calculateTaskTimelinePosition(task, rangeStart, rangeEnd, totalDays);
      expect(pos.spanType).toBe("START_ONLY");
      expect(pos.isVisible).toBe(true);
      expect(pos.leftPercent).toBeCloseTo((4 / 21) * 100, 1);
      expect(pos.widthPercent).toBeGreaterThanOrEqual(1.8);
    });

    it("handles due-only task", () => {
      const task = {
        startDate: null,
        dueDate: "2026-11-10",
      };

      const pos = calculateTaskTimelinePosition(task, rangeStart, rangeEnd, totalDays);
      expect(pos.spanType).toBe("DUE_ONLY");
      expect(pos.isVisible).toBe(true);
      expect(pos.leftPercent).toBeCloseTo((9 / 21) * 100, 1);
    });

    it("handles unscheduled (undated) task", () => {
      const task = {
        startDate: null,
        dueDate: null,
      };

      const pos = calculateTaskTimelinePosition(task, rangeStart, rangeEnd, totalDays);
      expect(pos.spanType).toBe("UNDATED");
      expect(pos.isVisible).toBe(false);
      expect(pos.leftPercent).toBe(0);
      expect(pos.widthPercent).toBe(0);
    });

    it("clamps and detects clipping when task spans outside timeline window", () => {
      const task = {
        startDate: "2026-10-25", // before rangeStart
        dueDate: "2026-11-05", // inside
      };

      const pos = calculateTaskTimelinePosition(task, rangeStart, rangeEnd, totalDays);
      expect(pos.spanType).toBe("RANGE");
      expect(pos.isVisible).toBe(true);
      expect(pos.isStartClipped).toBe(true);
      expect(pos.isEndClipped).toBe(false);
      expect(pos.leftPercent).toBe(0);
    });
  });

  describe("calculateMilestoneTimelinePosition", () => {
    const rangeStart = "2026-11-01";
    const totalDays = 21;

    it("positions milestone within range correctly", () => {
      const pos = calculateMilestoneTimelinePosition("2026-11-11", rangeStart, totalDays);
      expect(pos.isVisible).toBe(true);
      // offset is 10 days + 0.5 center = 10.5 / 21 = 50%
      expect(pos.leftPercent).toBeCloseTo(50, 1);
      expect(pos.targetDateFormatted).toBe("Nov 11, 2026");
    });

    it("handles milestone out of range", () => {
      const pos = calculateMilestoneTimelinePosition("2026-12-01", rangeStart, totalDays);
      expect(pos.isVisible).toBe(false);
    });

    it("handles milestone with null date", () => {
      const pos = calculateMilestoneTimelinePosition(null, rangeStart, totalDays);
      expect(pos.isVisible).toBe(false);
      expect(pos.leftPercent).toBe(0);
    });
  });

  describe("navigateTimelineDate", () => {
    it("navigates in day mode by 7 days", () => {
      expect(navigateTimelineDate("2026-11-09", "day", "next")).toBe("2026-11-16");
      expect(navigateTimelineDate("2026-11-09", "day", "prev")).toBe("2026-11-02");
    });

    it("navigates in week mode by 28 days", () => {
      expect(navigateTimelineDate("2026-11-09", "week", "next")).toBe("2026-12-07");
      expect(navigateTimelineDate("2026-11-09", "week", "prev")).toBe("2026-10-12");
    });

    it("navigates in month mode by 3 months", () => {
      expect(navigateTimelineDate("2026-11-09", "month", "next")).toBe("2027-02-09");
      expect(navigateTimelineDate("2026-11-09", "month", "prev")).toBe("2026-08-09");
    });
  });
});
