import React from "react";
import { useAuth } from "@/modules/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Sparkles, Shield, Users, Layers, CheckCircle } from "lucide-react";

export function DashboardView(): React.JSX.Element {
  const { user, communities } = useAuth();
  const activeCommunity = communities[0];

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Overview Hero Card */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-xs">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs uppercase tracking-wider text-[var(--brand-accent-text)]">
                Platform Overview
              </span>
              <Badge status="DONE" size="sm">
                VS-02B Shell Active
              </Badge>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
              Community Work Management
            </h1>
            <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
              Sonder application shell and contract type generation harness initialized.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] font-mono border border-[var(--border-subtle)]">
              OpenAPI 0.3.20-draft
            </span>
          </div>
        </div>

        {/* User Context Details (Preserving existing assertions) */}
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
                <CheckCircle className="h-3.5 w-3.5" />
                Membership Status
              </span>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {activeCommunity?.membershipStatus ?? "UNKNOWN"}
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

      {/* Structural Capabilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-[var(--brand-accent-text)]" />
              <CardTitle className="text-base">Responsive Navigation Structure</CardTitle>
            </div>
            <CardDescription>
              Desktop 240px collapsible left rail (`Ctrl+B` / `⌘B`) paired with mobile slide-over drawer and 44×44px touch targets.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-[var(--text-secondary)] space-y-1.5">
            <p>• Persistent application hierarchy: Header, Sidebar rail, Main canvas, and landmarks.</p>
            <p>• High-contrast focus rings and keyboard-first accessibility.</p>
            <p>• Clean extension points for Workspace Switcher and Omnibar.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base">Design System & Theme Engine</CardTitle>
            </div>
            <CardDescription>
              Safe activation of light/dark theme foundation with system preference synchronization.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-[var(--text-secondary)] space-y-1.5">
            <p>• WCAG 2.2 AA contrast verified across `:root` and `.dark` tokens.</p>
            <p>• Unstyled Base UI component primitives with zero Radix dependencies.</p>
            <p>• Instant theme switching via Header control or User Profile menu.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
