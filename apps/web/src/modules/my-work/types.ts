import type { ApiSchema } from "@sonder/contracts";
import type { TemporalGroupKey } from "./date-utils";

export type TaskDto = ApiSchema<"TaskDto">;
export type MyWorkQuerySpec = ApiSchema<"MyWorkQuerySpec">;
export type MyWorkQueryResult = ApiSchema<"MyWorkQueryResult">;
export type TaskStatusCategory = ApiSchema<"TaskStatusCategory">;
export type TaskPriority = ApiSchema<"TaskPriority">;
export type TaskType = ApiSchema<"TaskType">;
export type WorkspaceDto = ApiSchema<"WorkspaceDto">;

export type TaskRelationship = "ASSIGNED" | "CREATED" | "WATCHING";

export type RelationshipFilter = "ALL" | "ASSIGNED" | "CREATED" | "WATCHING";

export interface MyWorkTaskItem extends TaskDto {
  /** All relationships this task satisfies for the authenticated user */
  relationships: TaskRelationship[];
  /** Primary relationship according to priority: ASSIGNED > CREATED > WATCHING */
  primaryRelationship: TaskRelationship;
  /** Name of the task's parent workspace */
  workspaceName: string;
  /** Key prefix of the task's parent workspace (e.g., 'ENG', 'ALEX') */
  workspaceKeyPrefix: string;
  /** Whether the workspace is PERSONAL or SHARED */
  workspaceKind: "PERSONAL" | "SHARED";
  /** The assigned temporal group bucket (overdue, dueToday, upcoming, unscheduled) */
  temporalGroup: TemporalGroupKey;
  /** Explicit watcher flag or IDs for mock/backend integration */
  isWatched?: boolean;
  watcherIds?: string[];
}

export interface MyWorkSummary {
  /** Total count of distinct de-duplicated active tasks matching current filter */
  totalUnique: number;
  overdueCount: number;
  dueTodayCount: number;
  upcomingCount: number;
  unscheduledCount: number;
  /** Relationship breakdown counts across all accessible active tasks */
  assignedCount: number;
  createdCount: number;
  watchedCount: number;
}
