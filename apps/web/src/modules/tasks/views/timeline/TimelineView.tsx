import React, { useState, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button.js";
import { Skeleton } from "@/components/ui/Skeleton.js";
import { EmptyState } from "@/components/ui/EmptyState.js";
import { cn } from "@/lib/utils.js";
import type { TaskDto } from "@/modules/tasks/types.js";
import {
  useDeleteMilestone,
  type MilestoneDto,
} from "@/modules/milestones/index.js";
import { getTodayString } from "../calendar/index.js";
import {
  getTimelineRange,
  calculateTaskTimelinePosition,
  calculateMilestoneTimelinePosition,
  diffInCalendarDays,
  navigateTimelineDate,
  type TimelineMode,
} from "./timeline-date-utils.js";
import { TimelineHeader } from "./TimelineHeader.js";
import { TimelineTimeAxis, TimelineGridLines } from "./TimelineTimeAxis.js";
import { TimelineTaskRow } from "./TimelineTaskRow.js";
import { TimelineMilestoneMarker } from "./TimelineMilestoneMarker.js";
import { TimelineMilestoneModal } from "./TimelineMilestoneModal.js";
import { TimelineUnscheduledTray } from "./TimelineUnscheduledTray.js";

export interface TimelineViewProps {
  tasks: TaskDto[];
  unscheduledTasks?: TaskDto[];
  milestones?: MilestoneDto[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  timelineMode: TimelineMode;
  onTimelineModeChange: (mode: TimelineMode) => void;
  currentDate: string;
  onCurrentDateChange: (date: string) => void;
  onTaskClick: (task: TaskDto) => void;
  workspaceId: string;
  communityId: string;
  className?: string;
}

export function TimelineView({
  tasks,
  unscheduledTasks = [],
  milestones = [],
  isLoading = false,
  isError = false,
  errorMessage,
  onRetry,
  timelineMode,
  onTimelineModeChange,
  currentDate,
  onCurrentDateChange,
  onTaskClick,
  workspaceId,
  communityId,
  className,
}: TimelineViewProps): React.JSX.Element {
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [milestoneToEdit, setMilestoneToEdit] = useState<MilestoneDto | null>(null);
  const [isUnscheduledOpen, setIsUnscheduledOpen] = useState(false);

  const deleteMilestoneMutation = useDeleteMilestone();
  const todayStr = useMemo(() => getTodayString(), []);

  // Compute timeline range and scale
  const range = useMemo(() => {
    return getTimelineRange(currentDate, timelineMode, todayStr);
  }, [currentDate, timelineMode, todayStr]);

  // Compute Today marker position
  const todayPercent = useMemo(() => {
    const diff = diffInCalendarDays(todayStr, range.startDate);
    if (diff < 0 || diff >= range.totalDays) return null;
    return ((diff + 0.5) / range.totalDays) * 100;
  }, [todayStr, range.startDate, range.totalDays]);

  // Milestone lookup map by ID
  const milestonesById = useMemo(() => {
    const map = new Map<string, MilestoneDto>();
    for (const m of milestones) {
      map.set(m.id, m);
    }
    return map;
  }, [milestones]);

  // Compute milestone markers and their positions
  const milestonePositions = useMemo(() => {
    return milestones.map((m) => {
      const pos = calculateMilestoneTimelinePosition(m.targetDate, range.startDate, range.totalDays);
      const linkedCount = tasks.filter((t) => t.milestoneId === m.id).length;
      return {
        milestone: m,
        position: pos,
        linkedCount,
      };
    });
  }, [milestones, range.startDate, range.totalDays, tasks]);

  // Compute positions for all tasks
  const taskRowData = useMemo(() => {
    return tasks.map((task) => {
      const position = calculateTaskTimelinePosition(
        task,
        range.startDate,
        range.endDate,
        range.totalDays
      );
      const milestone = task.milestoneId ? milestonesById.get(task.milestoneId) : undefined;
      return { task, position, milestone };
    });
  }, [tasks, range.startDate, range.endDate, range.totalDays, milestonesById]);

  // Navigation handlers
  const handlePrev = () => {
    onCurrentDateChange(navigateTimelineDate(currentDate, timelineMode, "prev"));
  };

  const handleNext = () => {
    onCurrentDateChange(navigateTimelineDate(currentDate, timelineMode, "next"));
  };

  const handleToday = () => {
    onCurrentDateChange(todayStr);
  };

  const handleOpenNewMilestone = () => {
    setMilestoneToEdit(null);
    setIsMilestoneModalOpen(true);
  };

  const handleEditMilestone = (milestone: MilestoneDto) => {
    setMilestoneToEdit(milestone);
    setIsMilestoneModalOpen(true);
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (window.confirm("Are you sure you want to delete this milestone? Linked tasks will remain but will have their milestone association cleared.")) {
      try {
        await deleteMilestoneMutation.mutateAsync({
          communityId,
          workspaceId,
          milestoneId,
        });
      } catch (err) {
        console.error("Failed to delete milestone:", err);
      }
    }
  };

  // Loading skeleton state
  if (isLoading) {
    return (
      <div data-testid="timeline-view-loading" className={cn("space-y-4", className)}>
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-3">
          <Skeleton className="h-12 w-full rounded-lg" />
          <div className="space-y-2 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div
        data-testid="timeline-view-error"
        role="alert"
        className={cn(
          "bg-[var(--surface-card)] border border-red-500/20 rounded-xl p-8 text-center space-y-3 max-w-lg mx-auto my-8",
          className
        )}
      >
        <div className="inline-flex p-3 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          Failed to load timeline tasks
        </h3>
        <p className="text-xs text-[var(--text-secondary)]">
          {errorMessage || "An unexpected error occurred while fetching workspace tasks and milestones."}
        </p>
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            data-testid="timeline-error-retry"
            className="mt-2 text-xs"
          >
            Retry Request
          </Button>
        )}
      </div>
    );
  }

  const hasNoData = tasks.length === 0 && unscheduledTasks.length === 0 && milestones.length === 0;

  return (
    <div
      data-testid="timeline-view"
      className={cn("space-y-4", className)}
    >
      {/* Timeline Controls Header */}
      <TimelineHeader
        mode={timelineMode}
        onModeChange={onTimelineModeChange}
        rangeTitle={range.rangeTitle}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onNewMilestone={handleOpenNewMilestone}
        unscheduledCount={unscheduledTasks.length}
        isUnscheduledOpen={isUnscheduledOpen}
        onToggleUnscheduled={() => setIsUnscheduledOpen((prev) => !prev)}
      />

      {/* Unscheduled Tasks Tray */}
      <TimelineUnscheduledTray
        isOpen={isUnscheduledOpen}
        onClose={() => setIsUnscheduledOpen(false)}
        tasks={unscheduledTasks}
        onTaskClick={onTaskClick}
      />

      {/* Main Timeline Board / Gantt Chart */}
      {hasNoData ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-12 text-center">
          <EmptyState
            title="No tasks or milestones found"
            description="There are no tasks or milestones matching the selected criteria in this workspace."
          />
        </div>
      ) : (
        <div
          data-testid="timeline-canvas-container"
          className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-2xs overflow-hidden flex flex-col"
        >
          {/* Scrollable Timeline Grid Container */}
          <div className="overflow-x-auto relative">
            <div className="min-w-[800px] flex flex-col relative">
              {/* Top Axis: Column Headers */}
              <div className="flex border-b border-[var(--border-subtle)]">
                {/* Frozen Corner Header (Task list title) */}
                <div className="w-72 md:w-80 flex-shrink-0 px-3 py-2 bg-[var(--surface-muted)] border-r border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center justify-between z-10">
                  <span>Work Items</span>
                  <span className="text-[10px] font-mono opacity-70">
                    {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
                  </span>
                </div>

                {/* Horizontal Time Axis Scale */}
                <div className="flex-1">
                  <TimelineTimeAxis
                    range={range}
                    todayPercent={todayPercent}
                  />
                </div>
              </div>

              {/* Timeline Body Rows with Vertical Grid Lines and Milestone Markers */}
              <div className="relative min-h-[300px]">
                {/* Background Grid Lines (behind task rows) */}
                <div className="absolute top-0 bottom-0 left-72 md:left-80 right-0 pointer-events-none">
                  <TimelineGridLines
                    range={range}
                    todayPercent={todayPercent}
                  />

                  {/* Vertical Workspace Milestone Markers */}
                  {milestonePositions
                    .filter((m) => m.position.isVisible)
                    .map((m) => (
                      <TimelineMilestoneMarker
                        key={m.milestone.id}
                        milestone={m.milestone}
                        leftPercent={m.position.leftPercent}
                        linkedTasksCount={m.linkedCount}
                        onEdit={handleEditMilestone}
                        onDelete={handleDeleteMilestone}
                        isDeleting={deleteMilestoneMutation.isPending}
                      />
                    ))}
                </div>

                {/* Task Rows */}
                {taskRowData.length === 0 ? (
                  <div className="py-16 text-center text-xs text-[var(--text-muted)] italic">
                    No scheduled tasks within this date range.
                  </div>
                ) : (
                  <div>
                    {taskRowData.map(({ task, position, milestone }) => (
                      <TimelineTaskRow
                        key={task.id}
                        task={task}
                        position={position}
                        milestone={milestone}
                        onTaskClick={onTaskClick}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Milestone Create / Edit Modal */}
      <TimelineMilestoneModal
        isOpen={isMilestoneModalOpen}
        onClose={() => {
          setIsMilestoneModalOpen(false);
          setMilestoneToEdit(null);
        }}
        workspaceId={workspaceId}
        communityId={communityId}
        milestoneToEdit={milestoneToEdit}
      />
    </div>
  );
}
