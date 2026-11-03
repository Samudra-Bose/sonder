import React from "react";
import { useAuth } from "@/modules/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Users, Layers, CheckCircle2 } from "lucide-react";

export function DashboardView(): React.JSX.Element {
  const { user, communities } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Overview Hero Card */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-xs">
        <div className="space-y-2">
          <span className="font-bold text-xs uppercase tracking-wider text-[var(--brand-accent-text)]">
            Overview
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
            Community Work Management
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
            Welcome to Sonder. Coordinate work, organize initiatives, and collaborate seamlessly across your community.
          </p>
        </div>

        {/* Community Memberships Collection */}
        {user && communities.length > 0 && (
          <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <Users className="h-3.5 w-3.5" />
              <span>Community Memberships</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {communities.map((comm) => (
                <div
                  key={comm.communityId}
                  className="p-3 rounded-lg bg-[var(--surface-muted)] border border-[var(--border-subtle)] space-y-1 text-left"
                >
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {comm.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span>Status: {comm.membershipStatus}</span>
                    {comm.isCommunityAdmin && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-card)] border border-[var(--border-subtle)] font-medium text-[var(--brand-accent-text)]">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Product Feature Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-[var(--brand-accent-text)]" />
              <CardTitle className="text-base">My Work</CardTitle>
            </div>
            <CardDescription>
              Personal cross-workspace triage for tasks assigned to, created by, or watched by you.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-[var(--text-secondary)] space-y-1.5">
            <p>• Fast access to tasks requiring your attention across workspaces.</p>
            <p>• Canonical temporal due-date groups: Overdue, Due Today, Upcoming, and Unscheduled.</p>
            <p>• Live task aggregation query planned for stage VS-02E.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-[var(--brand-accent-text)]" />
              <CardTitle className="text-base">Workspaces</CardTitle>
            </div>
            <CardDescription>
              Workspace containers for organizing tasks and community collaboration.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-[var(--text-secondary)] space-y-1.5">
            <p>• Community-unique task identifier prefixes for clear task keys.</p>
            <p>• Role-based workspace permissions: Owner, Coordinator, Member, and Viewer.</p>
            <p>• Interactive workspace switcher planned for stage VS-02C.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
