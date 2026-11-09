import { describe, it, expect } from "vitest";
import {
  detectBlockerConflict,
  detectLinkConflict,
  findTaskConflicts,
} from "./dependency-conflict-utils.js";
import type { TaskDto } from "@/modules/tasks/types.js";

describe("dependency-conflict-utils", () => {
  describe("detectBlockerConflict", () => {
    it("detects conflict when blocker finishes after dependent starts", () => {
      const blocker = {
        id: "task-1",
        taskKey: "ENG-101",
        startDate: "2026-11-01",
        dueDate: "2026-11-15",
      };
      const dependent = {
        id: "task-2",
        taskKey: "ENG-102",
        startDate: "2026-11-10",
        dueDate: "2026-11-20",
      };

      const result = detectBlockerConflict(blocker, dependent);
      expect(result.hasConflict).toBe(true);
      expect(result.blockerId).toBe("task-1");
      expect(result.dependentId).toBe("task-2");
      expect(result.reason).toContain("ENG-101");
      expect(result.reason).toContain("2026-11-15");
      expect(result.reason).toContain("ENG-102");
      expect(result.reason).toContain("2026-11-10");
    });

    it("does NOT generate fabricated conflicts when blocker has startDate but no dueDate", () => {
      const blocker = {
        id: "task-1",
        taskKey: "ENG-101",
        startDate: "2026-11-12",
        dueDate: null,
      };
      const dependent = {
        id: "task-2",
        taskKey: "ENG-102",
        startDate: "2026-11-10",
        dueDate: "2026-11-20",
      };

      const result = detectBlockerConflict(blocker, dependent);
      expect(result.hasConflict).toBe(false);
    });

    it("returns no conflict when blocker finishes before dependent starts", () => {
      const blocker = {
        id: "task-1",
        taskKey: "ENG-101",
        startDate: "2026-11-01",
        dueDate: "2026-11-08",
      };
      const dependent = {
        id: "task-2",
        taskKey: "ENG-102",
        startDate: "2026-11-10",
        dueDate: "2026-11-20",
      };

      const result = detectBlockerConflict(blocker, dependent);
      expect(result.hasConflict).toBe(false);
    });

    it("returns no conflict when blocker finishes on the exact day dependent starts", () => {
      const blocker = {
        id: "task-1",
        taskKey: "ENG-101",
        startDate: "2026-11-01",
        dueDate: "2026-11-10",
      };
      const dependent = {
        id: "task-2",
        taskKey: "ENG-102",
        startDate: "2026-11-10",
        dueDate: "2026-11-20",
      };

      const result = detectBlockerConflict(blocker, dependent);
      expect(result.hasConflict).toBe(false);
    });

    it("does NOT generate fabricated conflicts when blocker has no dates", () => {
      const blocker = {
        id: "task-1",
        taskKey: "ENG-101",
        startDate: null,
        dueDate: null,
      };
      const dependent = {
        id: "task-2",
        taskKey: "ENG-102",
        startDate: "2026-11-10",
        dueDate: "2026-11-20",
      };

      const result = detectBlockerConflict(blocker, dependent);
      expect(result.hasConflict).toBe(false);
    });

    it("does NOT generate fabricated conflicts when dependent has no startDate", () => {
      const blocker = {
        id: "task-1",
        taskKey: "ENG-101",
        startDate: "2026-11-01",
        dueDate: "2026-11-15",
      };
      const dependent = {
        id: "task-2",
        taskKey: "ENG-102",
        startDate: null,
        dueDate: "2026-11-20",
      };

      const result = detectBlockerConflict(blocker, dependent);
      expect(result.hasConflict).toBe(false);
    });

    it("handles null or undefined inputs safely", () => {
      expect(detectBlockerConflict(null, null).hasConflict).toBe(false);
      expect(detectBlockerConflict(undefined, null).hasConflict).toBe(false);
    });
  });

  describe("detectLinkConflict", () => {
    it("evaluates BLOCKS correctly where source is blocker", () => {
      const source = {
        id: "src",
        taskKey: "ENG-1",
        dueDate: "2026-11-15",
      };
      const target = {
        id: "tgt",
        taskKey: "ENG-2",
        startDate: "2026-11-10",
      };

      const res = detectLinkConflict(source, target, "BLOCKS");
      expect(res.hasConflict).toBe(true);
      expect(res.blockerId).toBe("src");
      expect(res.dependentId).toBe("tgt");
    });

    it("evaluates IS_BLOCKED_BY correctly where target is blocker", () => {
      const source = {
        id: "src",
        taskKey: "ENG-1",
        startDate: "2026-11-10",
      };
      const target = {
        id: "tgt",
        taskKey: "ENG-2",
        dueDate: "2026-11-15",
      };

      const res = detectLinkConflict(source, target, "IS_BLOCKED_BY");
      expect(res.hasConflict).toBe(true);
      expect(res.blockerId).toBe("tgt");
      expect(res.dependentId).toBe("src");
    });

    it("returns no conflict for RELATES_TO or DUPLICATES even if dates overlap", () => {
      const source = { id: "1", dueDate: "2026-11-20" };
      const target = { id: "2", startDate: "2026-11-10" };

      expect(detectLinkConflict(source, target, "RELATES_TO").hasConflict).toBe(false);
      expect(detectLinkConflict(source, target, "DUPLICATES").hasConflict).toBe(false);
    });
  });

  describe("findTaskConflicts", () => {
    it("finds all conflicts for a given task across multiple links", () => {
      const taskA = {
        id: "task-a",
        taskKey: "ENG-A",
        startDate: "2026-11-10",
        dueDate: "2026-11-15",
      } as unknown as TaskDto;

      const taskB = {
        id: "task-b",
        taskKey: "ENG-B",
        startDate: "2026-11-01",
        dueDate: "2026-11-12", // finishes after taskA starts!
      } as unknown as TaskDto;

      const taskC = {
        id: "task-c",
        taskKey: "ENG-C",
        startDate: "2026-11-14", // starts before taskA finishes!
        dueDate: "2026-11-25",
      } as unknown as TaskDto;

      const allTasksMap = new Map<string, TaskDto>([
        ["task-a", taskA],
        ["task-b", taskB],
        ["task-c", taskC],
      ]);

      const links = [
        // B blocks A (B finishes 11-12, A starts 11-10 -> conflict)
        { sourceTaskId: "task-b", targetTaskId: "task-a", type: "BLOCKS" as const },
        // A blocks C (A finishes 11-15, C starts 11-14 -> conflict)
        { sourceTaskId: "task-a", targetTaskId: "task-c", type: "BLOCKS" as const },
      ];

      const conflicts = findTaskConflicts(taskA, allTasksMap, links);
      expect(conflicts.length).toBe(2);
      expect(conflicts[0]!.blockerId).toBe("task-b");
      expect(conflicts[1]!.blockerId).toBe("task-a");
    });
  });
});
