import React from "react";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Layers,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/modules/auth";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Feedback } from "@/components/ui/Feedback";
import { useMyWork } from "./useMyWork";
import { RelationshipFilterControl } from "./RelationshipFilterControl";
import { TemporalGroupSection } from "./TemporalGroupSection";

export interface MyWorkViewProps {
  referenceDate?: string;
  className?: string;
}

export function MyWorkView({
  referenceDate: propReferenceDate,
  className,
}: MyWorkViewProps = {}): React.JSX.Element {
  const { user } = useAuth();
  const {
    temporalGroups,
    filteredTasks,
    relationshipFilter,
    setRelationshipFilter,
    summary,
    referenceDate,
    isLoading,
    error,
    refetch,
  } = useMyWork({ referenceDate: propReferenceDate });

  const displayName = user?.displayName || "Alex Morgan";

  return (
    <div
      data-testid="my-work-view"
      className={cn("space-y-6 max-w-5xl mx-auto py-2", className)}
    >
      {/* Header section with Greeting, Reference Date, and Subtitle */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-lg bg-[var(--brand-accent-subtle)] text-[var(--brand-accent-text)] flex items-center justify-center border border-[var(--brand-accent-border)] flex-shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
                My Work
              </h1>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Cross-workspace triage dashboard for tasks assigned, created, or watched by you.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] self-start sm:self-auto bg-[var(--surface-muted)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] font-mono">
            <Calendar className="h-3.5 w-3.5 text-[var(--brand-accent-text)]" />
            <span>Today: {referenceDate}</span>
          </div>
        </div>

        {/* User personalized greeting sub-banner */}
        <div className="flex items-center gap-2 pt-2 text-xs text-[var(--text-secondary)] border-t border-[var(--border-subtle)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--brand-accent-text)] flex-shrink-0" />
          <span>
            Personal triage for <strong className="text-[var(--text-primary)] font-semibold">{displayName}</strong> across all active shared and personal workspaces.
          </span>
        </div>
      </div>

      {/* Summary Metrics Cards Grid */}
      <div
        data-testid="my-work-summary-metrics"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
      >
        {/* Total Unique Tasks */}
        <div className="p-3.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider block">
            Total Work
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-[var(--text-primary)]">
              {isLoading ? "—" : summary.totalUnique}
            </span>
            <Layers className="h-4 w-4 text-[var(--text-muted)]" />
          </div>
        </div>

        {/* Overdue */}
        <div className="p-3.5 rounded-xl bg-[var(--surface-card)] border border-red-500/20 shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wider block">
            Overdue
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">
              {isLoading ? "—" : summary.overdueCount}
            </span>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
        </div>

        {/* Due Today */}
        <div className="p-3.5 rounded-xl bg-[var(--surface-card)] border border-amber-500/20 shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
            Due Today
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {isLoading ? "—" : summary.dueTodayCount}
            </span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
        </div>

        {/* Upcoming */}
        <div className="p-3.5 rounded-xl bg-[var(--surface-card)] border border-emerald-500/20 shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            Upcoming
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {isLoading ? "—" : summary.upcomingCount}
            </span>
            <Calendar className="h-4 w-4 text-emerald-500" />
          </div>
        </div>

        {/* Unscheduled */}
        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider block">
            Unscheduled
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-[var(--text-secondary)]">
              {isLoading ? "—" : summary.unscheduledCount}
            </span>
            <Layers className="h-4 w-4 text-[var(--text-muted)]" />
          </div>
        </div>
      </div>

      {/* Relationship Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <RelationshipFilterControl
          activeFilter={relationshipFilter}
          onChange={setRelationshipFilter}
          summary={summary}
        />
        <div className="text-xs text-[var(--text-muted)] hidden sm:block">
          Showing <span className="font-semibold text-[var(--text-primary)]">{filteredTasks.length}</span> active tasks
        </div>
      </div>

      {/* Main Content Area: Loading, Error, Empty, or Temporal Sections */}
      {isLoading ? (
        <div data-testid="my-work-loading-skeleton" className="space-y-6">
          {[1, 2, 3].map((sectionIndex) => (
            <div key={sectionIndex} className="space-y-3">
              <div className="flex items-center space-x-2 pb-1 border-b border-[var(--border-subtle)]">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-4 w-6 rounded-full" />
              </div>
              <div className="space-y-2">
                {[1, 2].map((rowIndex) => (
                  <Skeleton
                    key={rowIndex}
                    className="h-12 w-full rounded-lg"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <Feedback
          variant="danger"
          title="Unable to load tasks"
          className="my-4"
        >
          <div className="space-y-3">
            <p className="text-sm">
              {error instanceof Error ? error.message : "Failed to load My Work triage items."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </Button>
          </div>
        </Feedback>
      ) : filteredTasks.length === 0 ? (
        <div
          data-testid="my-work-empty-state"
          className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-8 shadow-xs"
        >
          <EmptyState
            icon={<CheckCircle2 className="h-10 w-10 text-[var(--brand-accent-text)]" />}
            title={
              relationshipFilter === "ALL"
                ? "All caught up!"
                : `No tasks found for "${relationshipFilter.toLowerCase().replace("_", " ")}"`
            }
            description={
              relationshipFilter === "ALL"
                ? "You have no pending tasks requiring your triage across any workspace."
                : "Try selecting 'All Work' to view tasks with different relationship associations."
            }
            action={
              relationshipFilter !== "ALL" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRelationshipFilter("ALL")}
                  className="min-h-[44px] sm:min-h-0"
                >
                  View All Work
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div data-testid="my-work-temporal-groups" className="space-y-8">
          {/* Strictly 4 canonical temporal groups: overdue, dueToday, upcoming, unscheduled */}
          <TemporalGroupSection
            groupKey="overdue"
            tasks={temporalGroups.overdue}
            referenceDate={referenceDate}
          />
          <TemporalGroupSection
            groupKey="dueToday"
            tasks={temporalGroups.dueToday}
            referenceDate={referenceDate}
          />
          <TemporalGroupSection
            groupKey="upcoming"
            tasks={temporalGroups.upcoming}
            referenceDate={referenceDate}
          />
          <TemporalGroupSection
            groupKey="unscheduled"
            tasks={temporalGroups.unscheduled}
            referenceDate={referenceDate}
          />
        </div>
      )}
    </div>
  );
}
