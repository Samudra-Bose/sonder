import { describe, it, expect } from "vitest";
import { getMockActivityForTask, setMockActivityForTask, resetMockActivity } from "../data/comments.js";

describe("Mock Activity Scoping Integrity (M3.2 Correction C)", () => {
  const ENG_101_ID = "018f98a2-task-001-overdue-assigned";
  const ENG_105_ID = "018f98a2-3f12-7890-a123-456789bbcdef";
  const UNKNOWN_TASK_ID = "018f98a2-ffff-ffff-ffff-ffffffffffff";

  it("returns intended activity records for ENG-101", () => {
    resetMockActivity();
    const activity = getMockActivityForTask(ENG_101_ID);
    expect(activity.length).toBeGreaterThanOrEqual(1);
    expect(activity.some((entry) => entry.summary?.includes("created task ENG-101"))).toBe(true);
  });

  it("returns empty array for tasks with no activity configured (ENG-105)", () => {
    resetMockActivity();
    const activity = getMockActivityForTask(ENG_105_ID);
    expect(activity).toEqual([]);
  });

  it("returns empty array for unknown task IDs", () => {
    resetMockActivity();
    const activity = getMockActivityForTask(UNKNOWN_TASK_ID);
    expect(activity).toEqual([]);
  });

  it("ensures no task receives another task's activity records", () => {
    resetMockActivity();
    const eng101Activity = getMockActivityForTask(ENG_101_ID);
    const eng105Activity = getMockActivityForTask(ENG_105_ID);

    expect(eng105Activity).not.toEqual(eng101Activity);
    expect(eng105Activity).toHaveLength(0);

    // Custom task activity isolation
    setMockActivityForTask(ENG_105_ID, [
      {
        id: "custom-activity-105",
        eventType: "task.created",
        occurredAt: "2026-11-20T10:00:00Z",
        summary: "created task ENG-105",
      },
    ]);

    const updated105 = getMockActivityForTask(ENG_105_ID);
    expect(updated105).toHaveLength(1);
    expect(updated105[0]?.summary).toBe("created task ENG-105");

    // ENG-101 remains untouched
    expect(getMockActivityForTask(ENG_101_ID)).toEqual(eng101Activity);

    // Reset clean state
    resetMockActivity();
    expect(getMockActivityForTask(ENG_105_ID)).toEqual([]);
  });
});
