import React from "react";
import { useAuth } from "@/modules/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Shield, Users, Layers, CheckCircle2 } from "lucide-react";

export function DashboardView(): React.JSX.Element {
  const { user, communities } = useAuth();
  const activeCommunity = communities[0];

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Overview Hero Card */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-xs">
        <div className="space-y-2">
          <span className="font-bold text-xs uppercase tracking-wider text-[var(--brand-accent-text)]">
            Workspace Overview
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
            Community Work Management
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
            Welcome to Sonder. Coordinate work, organize initiatives, and collaborate seamlessly across your community.
          </p>
        </div>

        {/* Authenticated Community Context Details */}
        {user && (
          <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-[var(--surface-muted)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Active Community
              </span>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {activeCommunity?.name ?? "Sonder Community"}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[var(--surface-muted)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Membership Status
              </span>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {activeCommunity?.membershipStatus ?? "ACTIVE"}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[var(--surface-muted)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Admin Privileges
              </span>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {activeCommunity?.isCommunityAdmin ? "Yes" : "No"}
              </p>
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
              Personal triage and assigned tasks across your communities.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-[var(--text-secondary)] space-y-1.5">
            <p>• Fast access to tasks requiring your immediate attention.</p>
            <p>• Temporal due-date grouping: overdue, due today, and upcoming.</p>
            <p>• Streamlined status transitions and priority filtering.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-[var(--brand-accent-text)]" />
              <CardTitle className="text-base">Workspaces</CardTitle>
            </div>
            <CardDescription>
              Collaborative workspaces for teams, projects, and initiatives.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-[var(--text-secondary)] space-y-1.5">
            <p>• Isolated project spaces with customized task prefixes.</p>
            <p>• Multi-owner governance and collaborative member permissions.</p>
            <p>• Shared milestones and cross-functional visibility.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
