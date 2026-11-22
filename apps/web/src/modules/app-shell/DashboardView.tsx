import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/modules/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Feedback } from "@/components/ui/Feedback";
import {
  Users,
  Layers,
  CheckCircle2,
  Plus,
  ArrowRight,
  Check,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
  Lock,
  RotateCcw,
  Building2,
  ChevronRight,
  Flame,
} from "lucide-react";
import {
  useWorkspace,
  WorkspaceBadge,
  CreateCommunityDialog,
  CreateWorkspaceDialog,
} from "@/modules/workspace";
import { useMyWork, getDailyFocusTasks, formatDueDisplay } from "@/modules/my-work";
import { useTaskPeekDrawer } from "@/modules/tasks";
import { cn } from "@/lib/utils";

export interface DashboardViewProps {
  referenceDate?: string;
}

export function DashboardView({
  referenceDate: propReferenceDate,
}: DashboardViewProps = {}): React.JSX.Element {
  const { user, communities } = useAuth();
  const {
    currentCommunityId,
    currentCommunity,
    selectCommunity,
    activeWorkspace,
    workspaces,
    isSwitchingCommunity,
  } = useWorkspace();

  const { openTask } = useTaskPeekDrawer();

  const [isCreateCommunityOpen, setIsCreateCommunityOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);

  // Query live tasks across all workspaces in current community context
  const {
    allProcessedTasks,
    summary,
    temporalGroups,
    referenceDate,
    isLoading,
    error,
    refetch,
  } = useMyWork({ referenceDate: propReferenceDate });

  const displayName = user?.displayName || "Alex Morgan";

  // High priority incomplete count (URGENT or HIGH)
  const highPriorityCount = useMemo(() => {
    return allProcessedTasks.filter(
      (t) =>
        t.statusCategory !== "DONE" &&
        t.statusCategory !== "CANCELED" &&
        (t.priority === "URGENT" || t.priority === "HIGH")
    ).length;
  }, [allProcessedTasks]);

  // Deterministic top 5 actionable daily focus tasks
  const dailyFocusTasks = useMemo(() => {
    return getDailyFocusTasks(allProcessedTasks, referenceDate, 5);
  }, [allProcessedTasks, referenceDate]);

  // Upcoming obligations (up to 4 items)
  const upcomingTasks = useMemo(() => {
    return temporalGroups.upcoming.slice(0, 4);
  }, [temporalGroups.upcoming]);

  const handleOpenTask = (taskKey: string, workspaceId: string) => {
    openTask(taskKey, { workspaceId });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* SECTION A: Cockpit Overview & Context Hero */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-[var(--brand-accent-text)]">
                Daily Focus Cockpit
              </span>
              <span className="text-[var(--text-muted)]">•</span>
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-mono">
                <Calendar className="h-3.5 w-3.5 text-[var(--brand-accent-text)]" />
                <span>Today: {referenceDate}</span>
              </div>
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
              Community Work Management
            </h1>

            <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
              Welcome to your daily cockpit. Coordinate work, prioritize obligations, and collaborate seamlessly across your community.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateCommunityOpen(true)}
              data-testid="dashboard-create-community-btn"
              className="gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New Community</span>
            </Button>
          </div>
        </div>

        {/* Community Scope Indicator & Quick Details */}
        <div
          data-testid="home-community-scope-banner"
          className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]"
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-[var(--brand-accent-text)] flex-shrink-0" />
            <span>
              Active Scope:{" "}
              <strong className="text-[var(--text-primary)] font-semibold">
                {currentCommunity?.name ?? "No community selected"}
              </strong>
            </span>
          </div>

          <Link
            to="/my-work"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--brand-accent-text)] hover:underline focus-ring rounded"
          >
            <span>Open full My Work queue ({summary.totalUnique})</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* SECTION B: Attention Required (3 Actionable Metric Cards) */}
      <div
        data-testid="home-attention-metrics"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3.5"
      >
        {/* Overdue */}
        <div
          className={cn(
            "p-4 rounded-xl bg-[var(--surface-card)] border shadow-xs transition-colors space-y-2",
            summary.overdueCount > 0
              ? "border-red-500/30 bg-red-50/10 dark:bg-red-950/10"
              : "border-[var(--border-subtle)]"
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-xs font-semibold uppercase tracking-wider",
                summary.overdueCount > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-[var(--text-muted)]"
              )}
            >
              Overdue Tasks
            </span>
            <AlertCircle
              className={cn(
                "h-4 w-4",
                summary.overdueCount > 0
                  ? "text-red-500"
                  : "text-[var(--text-muted)]"
              )}
            />
          </div>

          <div className="flex items-baseline justify-between">
            <span
              className={cn(
                "text-3xl font-bold font-mono",
                summary.overdueCount > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-[var(--text-primary)]"
              )}
            >
              {isLoading ? "—" : summary.overdueCount}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {summary.overdueCount === 0
                ? "All clear"
                : "Needs urgent action"}
            </span>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)]/60">
            <Link
              to="/my-work"
              className="text-xs font-medium text-[var(--brand-accent-text)] hover:underline inline-flex items-center gap-1"
            >
              <span>Triage in My Work</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Due Today */}
        <div
          className={cn(
            "p-4 rounded-xl bg-[var(--surface-card)] border shadow-xs transition-colors space-y-2",
            summary.dueTodayCount > 0
              ? "border-amber-500/30 bg-amber-50/10 dark:bg-amber-950/10"
              : "border-[var(--border-subtle)]"
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-xs font-semibold uppercase tracking-wider",
                summary.dueTodayCount > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-[var(--text-muted)]"
              )}
            >
              Due Today
            </span>
            <Clock
              className={cn(
                "h-4 w-4",
                summary.dueTodayCount > 0
                  ? "text-amber-500"
                  : "text-[var(--text-muted)]"
              )}
            />
          </div>

          <div className="flex items-baseline justify-between">
            <span
              className={cn(
                "text-3xl font-bold font-mono",
                summary.dueTodayCount > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-[var(--text-primary)]"
              )}
            >
              {isLoading ? "—" : summary.dueTodayCount}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {summary.dueTodayCount === 0
                ? "No tasks due today"
                : "Target today"}
            </span>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)]/60">
            <Link
              to="/my-work"
              className="text-xs font-medium text-[var(--brand-accent-text)] hover:underline inline-flex items-center gap-1"
            >
              <span>View today&apos;s tasks</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* High Priority Focus */}
        <div className="p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-xs transition-colors space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-accent-text)]">
              High Priority Incomplete
            </span>
            <Flame className="h-4 w-4 text-[var(--brand-accent-text)]" />
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-[var(--text-primary)]">
              {isLoading ? "—" : highPriorityCount}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {highPriorityCount === 0
                ? "No critical blockers"
                : "Urgent & High"}
            </span>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)]/60">
            <Link
              to="/my-work"
              className="text-xs font-medium text-[var(--brand-accent-text)] hover:underline inline-flex items-center gap-1"
            >
              <span>Filter in My Work</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION C: Daily Focus (Prioritized Top 5 Actionable Tasks) */}
      <div
        data-testid="home-daily-focus"
        className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 md:p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-[var(--brand-accent-text)]" />
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Daily Focus
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] font-mono border border-[var(--border-subtle)]">
                Top {dailyFocusTasks.length} Actionable
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Prioritized by overdue state, today&apos;s deadlines, and high-impact priority.
            </p>
          </div>

          <Link
            to="/my-work"
            className="text-xs font-medium text-[var(--brand-accent-text)] hover:underline flex items-center gap-1 focus-ring rounded"
          >
            <span>View all in My Work</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Content list: Loading skeleton, Error, Empty, or Focus items */}
        {isLoading ? (
          <div className="space-y-2 py-1">
            {[1, 2, 3].map((idx) => (
              <Skeleton key={idx} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <Feedback variant="danger" title="Unable to load daily focus items">
            <div className="space-y-2">
              <p className="text-xs">
                {error instanceof Error ? error.message : "Failed to load tasks for Home."}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </Button>
            </div>
          </Feedback>
        ) : dailyFocusTasks.length === 0 ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              All caught up for today!
            </p>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              You have no overdue or high-priority tasks requiring your attention in this community.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {dailyFocusTasks.map((task) => {
              const isOverdue = task.temporalGroup === "overdue";
              const isDueToday = task.temporalGroup === "dueToday";
              const isUpcoming = task.temporalGroup === "upcoming";
              const dueLabel = formatDueDisplay(task.dueDate, referenceDate);

              return (
                <article
                  key={task.id}
                  data-testid={`daily-focus-task-${task.taskKey}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open task ${task.taskKey}: ${task.title}`}
                  onClick={() => handleOpenTask(task.taskKey, task.workspaceId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleOpenTask(task.taskKey, task.workspaceId);
                    }
                  }}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border",
                    "bg-[var(--surface-muted)]/50 border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]",
                    "transition-colors shadow-2xs gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                  )}
                >
                  {/* Left: Workspace badge, key, title */}
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <WorkspaceBadge
                        prefix={task.workspaceKeyPrefix}
                        size="sm"
                        className={cn(
                          task.workspaceKind === "PERSONAL" && "border-dashed"
                        )}
                      />
                      {task.workspaceKind === "PERSONAL" && (
                        <Lock
                          className="h-3 w-3 text-[var(--text-muted)] flex-shrink-0"
                          aria-label="Personal Workspace"
                        />
                      )}
                    </div>

                    <span className="font-mono text-xs font-bold text-[var(--brand-accent-text)] flex-shrink-0">
                      {task.taskKey}
                    </span>

                    <span className="text-sm font-medium text-[var(--text-primary)] truncate text-left">
                      {task.title}
                    </span>
                  </div>

                  {/* Right: Priority, Status, Due date */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 justify-between sm:justify-end">
                    <Badge
                      priority={task.priority}
                      size="sm"
                      className="text-[10px] uppercase font-semibold"
                    >
                      {task.priority}
                    </Badge>

                    <Badge status={task.statusCategory} size="sm" className="text-[10px]">
                      {task.statusCategory.replace("_", " ")}
                    </Badge>

                    <div
                      className={cn(
                        "flex items-center gap-1 text-xs select-none min-w-[85px] justify-end",
                        isOverdue && "text-red-600 dark:text-red-400 font-semibold",
                        isDueToday && "text-amber-600 dark:text-amber-400 font-semibold",
                        isUpcoming && "text-emerald-600 dark:text-emerald-400 font-medium",
                        !isOverdue && !isDueToday && !isUpcoming && "text-[var(--text-muted)]"
                      )}
                    >
                      {isOverdue && <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />}
                      {isDueToday && <Clock className="h-3.5 w-3.5 flex-shrink-0" />}
                      {isUpcoming && <Calendar className="h-3.5 w-3.5 flex-shrink-0" />}
                      <span className="truncate">{dueLabel}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION D & E: Upcoming Obligations & Workspace Continuity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SECTION D: Upcoming Obligations */}
        <Card data-testid="home-upcoming-section">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-[var(--brand-accent-text)]" />
                <CardTitle className="text-base">Upcoming Obligations</CardTitle>
              </div>
              <Link
                to="/my-work"
                className="text-xs font-medium text-[var(--brand-accent-text)] hover:underline flex items-center gap-1 focus-ring rounded"
              >
                <span>View all</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <CardDescription>
              Tasks scheduled over the next 7 calendar days.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            ) : upcomingTasks.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                No upcoming obligations in the next 7 calendar days.
              </p>
            ) : (
              <div className="space-y-1.5">
                {upcomingTasks.map((t) => (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenTask(t.taskKey, t.workspaceId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleOpenTask(t.taskKey, t.workspaceId);
                      }
                    }}
                    className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-muted)]/50 hover:bg-[var(--surface-muted)] border border-[var(--border-subtle)] cursor-pointer text-xs transition-colors"
                  >
                    <div className="flex items-center space-x-2 truncate min-w-0 mr-2">
                      <span className="font-mono font-bold text-[var(--brand-accent-text)] flex-shrink-0">
                        {t.taskKey}
                      </span>
                      <span className="truncate text-[var(--text-primary)]">
                        {t.title}
                      </span>
                    </div>
                    <span className="text-[var(--text-muted)] flex-shrink-0 font-mono text-[11px]">
                      {formatDueDisplay(t.dueDate, referenceDate)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION E: Workspace Continuity */}
        <Card data-testid="home-workspaces-section">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="h-4 w-4 text-[var(--brand-accent-text)]" />
                <CardTitle className="text-base">Your Workspaces</CardTitle>
              </div>
              {currentCommunity && (
                <button
                  type="button"
                  onClick={() => setIsCreateWorkspaceOpen(true)}
                  className="text-xs font-medium text-[var(--brand-accent-text)] hover:underline flex items-center gap-1 cursor-pointer focus-ring rounded"
                >
                  <Plus className="h-3 w-3" />
                  <span>New Workspace</span>
                </button>
              )}
            </div>
            <CardDescription>
              Quickly navigate to workspaces in {currentCommunity?.name ?? "active community"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {workspaces.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                No workspaces available in this community.
              </p>
            ) : (
              <div className="space-y-2">
                {workspaces.slice(0, 4).map((ws) => {
                  const isActive = activeWorkspace?.id === ws.id;
                  return (
                    <div
                      key={ws.id}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors",
                        isActive
                          ? "bg-[var(--surface-muted)] border-[var(--brand-primary)]/40"
                          : "bg-[var(--surface-muted)]/50 border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                      )}
                    >
                      <div className="flex items-center space-x-2 min-w-0 mr-2">
                        <WorkspaceBadge
                          prefix={ws.keyPrefix}
                          size="sm"
                          className={cn(ws.kind === "PERSONAL" && "border-dashed")}
                        />
                        <span className="font-medium text-[var(--text-primary)] truncate">
                          {ws.name}
                        </span>
                        {ws.kind === "PERSONAL" && (
                          <Lock className="h-3 w-3 text-[var(--text-muted)] flex-shrink-0" />
                        )}
                        {isActive && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--surface-card)] text-[var(--brand-accent-text)] font-semibold border border-[var(--brand-primary)] flex-shrink-0">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <Link
                          to={`/c/${currentCommunityId}/w/${ws.id}/list`}
                          className="text-xs font-medium text-[var(--brand-accent-text)] hover:underline flex items-center gap-0.5"
                        >
                          <span>List</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                        <span className="text-[var(--text-muted)]">|</span>
                        <Link
                          to={`/c/${currentCommunityId}/w/${ws.id}/board`}
                          className="text-xs font-medium text-[var(--brand-accent-text)] hover:underline flex items-center gap-0.5"
                        >
                          <span>Board</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Community Memberships Collection */}
      {user && communities.length > 0 && (
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 md:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <Users className="h-3.5 w-3.5" />
              <span>Community Memberships</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {communities.map((comm) => {
              const isActive = comm.communityId === currentCommunityId;
              return (
                <div
                  key={comm.communityId}
                  className={`p-3 rounded-lg border space-y-2 text-left transition-colors ${
                    isActive
                      ? "bg-[var(--surface-muted)] border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]"
                      : "bg-[var(--surface-muted)]/50 border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {comm.name}
                    </p>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-card)] border border-[var(--brand-primary)] text-[var(--brand-accent-text)] font-semibold flex-shrink-0">
                        <Check className="h-3 w-3" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span>Status: {comm.membershipStatus}</span>
                    {comm.isCommunityAdmin && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-card)] border border-[var(--border-subtle)] font-medium text-[var(--brand-accent-text)]">
                        Admin
                      </span>
                    )}
                  </div>

                  {!isActive && (
                    <button
                      type="button"
                      disabled={isSwitchingCommunity}
                      onClick={() => selectCommunity(comm.communityId)}
                      className="text-xs font-medium text-[var(--brand-accent-text)] hover:underline flex items-center gap-1 pt-1 cursor-pointer focus-ring rounded"
                    >
                      <span>Select this community</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state when user has 0 communities */}
      {user && communities.length === 0 && (
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-8 text-center space-y-3">
          <EmptyState
            icon={<Users className="h-8 w-8 text-[var(--text-muted)]" />}
            title="No Community Memberships"
            description="You do not belong to any communities yet. Create a community or request an invitation to start organizing workspaces."
            action={
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsCreateCommunityOpen(true)}
                className="gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create Your First Community</span>
              </Button>
            }
          />
        </div>
      )}

      {/* Dialogs */}
      <CreateCommunityDialog
        isOpen={isCreateCommunityOpen}
        onOpenChange={setIsCreateCommunityOpen}
      />

      <CreateWorkspaceDialog
        isOpen={isCreateWorkspaceOpen}
        onOpenChange={setIsCreateWorkspaceOpen}
        communityId={currentCommunityId}
      />
    </div>
  );
}