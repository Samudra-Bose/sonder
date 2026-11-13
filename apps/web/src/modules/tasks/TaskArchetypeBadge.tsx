import React from "react";
import { Badge, type TaskItemType } from "@/components/ui/Badge.js";
import { Tooltip } from "@/components/ui/Tooltip.js";
import { cn } from "@/lib/utils.js";
import type { TaskType } from "./types.js";

export interface TaskArchetypeBadgeProps {
  archetype: TaskType;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export const ARCHETYPE_LABELS: Record<TaskType, string> = {
  TASK: "Task",
  DELIVERABLE: "Deliverable",
  BUG: "Bug",
  DECISION: "Decision",
};

export const ARCHETYPE_DESCRIPTIONS: Record<TaskType, string> = {
  TASK: "Standard actionable work item",
  DELIVERABLE: "Tangible deliverable or milestone output",
  BUG: "Defect, impediment, or operational issue",
  DECISION: "Architectural, technical, or governance decision",
};

export function formatArchetype(archetype: TaskType): string {
  return ARCHETYPE_LABELS[archetype] ?? archetype;
}

export function TaskArchetypeBadge({
  archetype,
  size = "md",
  showLabel = true,
  className,
}: TaskArchetypeBadgeProps): React.JSX.Element {
  const label = formatArchetype(archetype);
  const description = ARCHETYPE_DESCRIPTIONS[archetype] ?? label;

  if (!showLabel) {
    return (
      <Tooltip content={`${label}: ${description}`} side="top">
        <span>
          <Badge
            archetype={archetype as TaskItemType}
            size={size}
            aria-label={`Archetype: ${label}`}
            data-testid={`archetype-badge-${archetype}`}
            className={cn("px-1 cursor-default shrink-0", className)}
          >
            <span className="sr-only">{label}</span>
          </Badge>
        </span>
      </Tooltip>
    );
  }

  return (
    <Badge
      archetype={archetype as TaskItemType}
      size={size}
      aria-label={`Archetype: ${label}`}
      data-testid={`archetype-badge-${archetype}`}
      className={cn("shrink-0", className)}
    >
      <span>{label}</span>
    </Badge>
  );
}
