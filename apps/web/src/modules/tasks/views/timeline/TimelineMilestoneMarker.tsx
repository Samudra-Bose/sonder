import React from "react";
import { Milestone, Edit2, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/Popover.js";
import { Button } from "@/components/ui/Button.js";
import { cn } from "@/lib/utils";
import type { MilestoneDto } from "@/modules/milestones/types.js";
import { formatReadableDate } from "./timeline-date-utils.js";

export interface TimelineMilestoneMarkerProps {
  milestone: MilestoneDto;
  leftPercent: number;
  linkedTasksCount: number;
  onEdit: (milestone: MilestoneDto) => void;
  onDelete: (milestoneId: string) => void;
  isDeleting?: boolean;
}

export function TimelineMilestoneMarker({
  milestone,
  leftPercent,
  linkedTasksCount,
  onEdit,
  onDelete,
  isDeleting = false,
}: TimelineMilestoneMarkerProps): React.JSX.Element {
  return (
    <div
      data-testid={`milestone-marker-${milestone.id}`}
      style={{ left: `${leftPercent}%` }}
      className="absolute top-0 bottom-0 pointer-events-none z-20 -translate-x-1/2 flex flex-col items-center"
    >
      {/* Milestone Header Badge with Popover Trigger */}
      <div className="pointer-events-auto">
        <Popover>
          <PopoverTrigger
            type="button"
            data-testid={`milestone-trigger-${milestone.id}`}
            aria-label={`Milestone: ${milestone.name} on ${milestone.targetDate}`}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--surface-card)] border-2 border-amber-500 text-amber-600 dark:text-amber-400 text-[10px] font-semibold shadow-xs hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all cursor-pointer focus-ring"
          >
            <Milestone className="h-3 w-3 fill-amber-500/20" aria-hidden="true" />
            <span className="max-w-[100px] truncate">{milestone.name}</span>
          </PopoverTrigger>

          <PopoverContent
            side="bottom"
            align="center"
            data-testid={`milestone-popover-${milestone.id}`}
            className="w-64 p-3 text-xs space-y-2.5 z-30"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="font-semibold text-sm text-[var(--text-primary)]">
                  {milestone.name}
                </div>
                {milestone.targetDate && (
                  <div className="text-[11px] text-[var(--text-muted)] font-mono">
                    Target: {formatReadableDate(milestone.targetDate)}
                  </div>
                )}
              </div>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Milestone
              </span>
            </div>

            {milestone.description && (
              <p className="text-[11px] text-[var(--text-secondary)] line-clamp-3">
                {milestone.description}
              </p>
            )}

            <div className="text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
              {linkedTasksCount} linked {linkedTasksCount === 1 ? "task" : "tasks"}
            </div>

            <div className="flex items-center justify-end gap-1.5 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onEdit(milestone)}
                data-testid={`milestone-edit-btn-${milestone.id}`}
                className="h-7 text-xs px-2 gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <Edit2 className="h-3 w-3" />
                <span>Edit</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onDelete(milestone.id)}
                disabled={isDeleting}
                data-testid={`milestone-delete-btn-${milestone.id}`}
                className="h-7 text-xs px-2 gap-1 text-red-600 hover:text-red-700 hover:bg-red-500/10"
              >
                <Trash2 className="h-3 w-3" />
                <span>{isDeleting ? "Deleting..." : "Delete"}</span>
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Vertical line through timeline canvas */}
      <div
        className={cn(
          "w-0.5 flex-1 border-l-2 border-dashed border-amber-500/70"
        )}
      />
    </div>
  );
}
