import React from "react";
import { CheckCircle2, Clock, Calendar, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

export function MyWorkPlaceholderView(): React.JSX.Element {
  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-xs">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-[var(--brand-accent-text)]" />
              <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
                My Work
              </h1>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Personal triage and cross-workspace assigned tasks dashboard (scheduled for VS-02E).
            </p>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Canonical Temporal Triage Buckets
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-[var(--surface-muted)] border border-[var(--border-subtle)] space-y-1">
              <div className="flex items-center gap-1.5 text-red-600 font-semibold text-xs">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Overdue</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">Past calendar due date</p>
            </div>

            <div className="p-3 rounded-lg bg-[var(--surface-muted)] border border-[var(--border-subtle)] space-y-1">
              <div className="flex items-center gap-1.5 text-amber-600 font-semibold text-xs">
                <Clock className="h-3.5 w-3.5" />
                <span>Due Today</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">Matching workspace date</p>
            </div>

            <div className="p-3 rounded-lg bg-[var(--surface-muted)] border border-[var(--border-subtle)] space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-xs">
                <Calendar className="h-3.5 w-3.5" />
                <span>Upcoming</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">Next 6 calendar days</p>
            </div>

            <div className="p-3 rounded-lg bg-[var(--surface-muted)] border border-[var(--border-subtle)] space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Unscheduled</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">Backlog without due date</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stage Extension Boundary</CardTitle>
          <CardDescription>
            Live cross-workspace aggregation query (`/communities/:id/my-work/query`) will be activated in stage VS-02E. Navigation routing, layout boundaries, and responsive landmarks are fully operational.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
