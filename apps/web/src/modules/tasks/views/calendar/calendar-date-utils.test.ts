import { describe, it, expect } from "vitest";
import {
  isLeapYear,
  getDaysInMonth,
  formatDateString,
  parseDateParts,
  getDayOfWeek,
  addCalendarDays,
  addMonths,
  getMonthCalendarGrid,
  getWeekDays,
  formatMonthHeader,
  formatWeekHeader,
} from "./calendar-date-utils";

describe("calendar-date-utils", () => {
  describe("isLeapYear", () => {
    it("correctly identifies leap years and non-leap years", () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2020)).toBe(true);
      expect(isLeapYear(2000)).toBe(true);
      expect(isLeapYear(2023)).toBe(false);
      expect(isLeapYear(2025)).toBe(false);
      expect(isLeapYear(2100)).toBe(false); // Century not divisible by 400
    });
  });

  describe("getDaysInMonth", () => {
    it("returns 29 for February in a leap year and 28 in a non-leap year", () => {
      expect(getDaysInMonth(2024, 2)).toBe(29);
      expect(getDaysInMonth(2025, 2)).toBe(28);
      expect(getDaysInMonth(2000, 2)).toBe(29);
      expect(getDaysInMonth(2100, 2)).toBe(28);
    });

    it("returns correct days for all other months", () => {
      expect(getDaysInMonth(2026, 1)).toBe(31);
      expect(getDaysInMonth(2026, 3)).toBe(31);
      expect(getDaysInMonth(2026, 4)).toBe(30);
      expect(getDaysInMonth(2026, 5)).toBe(31);
      expect(getDaysInMonth(2026, 6)).toBe(30);
      expect(getDaysInMonth(2026, 7)).toBe(31);
      expect(getDaysInMonth(2026, 8)).toBe(31);
      expect(getDaysInMonth(2026, 9)).toBe(30);
      expect(getDaysInMonth(2026, 10)).toBe(31);
      expect(getDaysInMonth(2026, 11)).toBe(30);
      expect(getDaysInMonth(2026, 12)).toBe(31);
    });
  });

  describe("parseDateParts & formatDateString", () => {
    it("round-trips date strings correctly", () => {
      const parsed = parseDateParts("2026-11-09");
      expect(parsed).toEqual({ year: 2026, month: 11, day: 9 });
      expect(formatDateString(parsed.year, parsed.month, parsed.day)).toBe("2026-11-09");
    });

    it("throws an error for malformed strings", () => {
      expect(() => parseDateParts("invalid")).toThrow();
      expect(() => parseDateParts("2026/11/09")).toThrow();
    });
  });

  describe("getDayOfWeek", () => {
    it("returns correct Sunday=0 ... Saturday=6", () => {
      // 2026-11-08 is Sunday (0)
      expect(getDayOfWeek(2026, 11, 8)).toBe(0);
      // 2026-11-09 is Monday (1)
      expect(getDayOfWeek(2026, 11, 9)).toBe(1);
      // 2026-11-14 is Saturday (6)
      expect(getDayOfWeek(2026, 11, 14)).toBe(6);
    });
  });

  describe("addCalendarDays", () => {
    it("handles month rollover and leap year rollover cleanly", () => {
      expect(addCalendarDays("2024-02-28", 1)).toBe("2024-02-29");
      expect(addCalendarDays("2024-02-28", 2)).toBe("2024-03-01");
      expect(addCalendarDays("2025-02-28", 1)).toBe("2025-03-01");
      expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
      expect(addCalendarDays("2027-01-01", -1)).toBe("2026-12-31");
    });
  });

  describe("addMonths", () => {
    it("advances and rewinds across year boundaries", () => {
      expect(addMonths(2026, 11, 1)).toEqual({ year: 2026, month: 12 });
      expect(addMonths(2026, 11, 2)).toEqual({ year: 2027, month: 1 });
      expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    });
  });

  describe("getMonthCalendarGrid", () => {
    it("generates 35 or 42 grid cells starting on Sunday", () => {
      // November 2026 starts on Sunday (Nov 1 = Sunday).
      // So leading days = 0. Days = 30. Remainder = 5 trailing days to complete 35 cells.
      const grid = getMonthCalendarGrid(2026, 11, "2026-11-09", 0);
      expect(grid.length).toBe(35);
      expect(grid[0]?.dateStr).toBe("2026-11-01");
      expect(grid[29]?.dateStr).toBe("2026-11-30");
      expect(grid[34]?.dateStr).toBe("2026-12-05");

      // Verify today indicator
      const todayCell = grid.find((c) => c.dateStr === "2026-11-09");
      expect(todayCell?.isToday).toBe(true);
      expect(todayCell?.isCurrentMonth).toBe(true);
    });

    it("generates grid with leading days for months not starting on Sunday", () => {
      // October 2026 starts on Thursday (Oct 1 = Thursday).
      // Leading days from Sep = 4 (Sun Sep 27, Mon Sep 28, Tue Sep 29, Wed Sep 30).
      const grid = getMonthCalendarGrid(2026, 10, "2026-10-15", 0);
      expect(grid.length).toBe(35);
      expect(grid[0]?.dateStr).toBe("2026-09-27");
      expect(grid[0]?.isCurrentMonth).toBe(false);
      expect(grid[4]?.dateStr).toBe("2026-10-01");
      expect(grid[4]?.isCurrentMonth).toBe(true);
    });
  });

  describe("getWeekDays", () => {
    it("returns 7 days for the week containing centerDate", () => {
      const week = getWeekDays("2026-11-09", "2026-11-09", 0);
      expect(week.length).toBe(7);
      expect(week[0]?.dateStr).toBe("2026-11-08"); // Sunday
      expect(week[0]?.dayName).toBe("Sun");
      expect(week[1]?.dateStr).toBe("2026-11-09"); // Monday
      expect(week[1]?.isToday).toBe(true);
      expect(week[6]?.dateStr).toBe("2026-11-14"); // Saturday
    });

    it("handles week spanning two months", () => {
      const week = getWeekDays("2026-12-01", "2026-12-01", 0);
      expect(week.length).toBe(7);
      expect(week[0]?.dateStr).toBe("2026-11-29");
      expect(week[6]?.dateStr).toBe("2026-12-05");
    });
  });

  describe("formatMonthHeader & formatWeekHeader", () => {
    it("formats month header properly", () => {
      expect(formatMonthHeader(2026, 11)).toBe("November 2026");
      expect(formatMonthHeader(2027, 1)).toBe("January 2027");
    });

    it("formats week header across same month and different months", () => {
      const week1 = getWeekDays("2026-11-09", "2026-11-09", 0);
      expect(formatWeekHeader(week1)).toBe("Nov 8 – 14, 2026");

      const week2 = getWeekDays("2026-12-01", "2026-12-01", 0);
      expect(formatWeekHeader(week2)).toBe("Nov 29 – Dec 5, 2026");

      const week3 = getWeekDays("2027-01-01", "2027-01-01", 0);
      expect(formatWeekHeader(week3)).toBe("Dec 27, 2026 – Jan 2, 2027");
    });
  });
});
