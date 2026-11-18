import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/modules/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Users, Layers, CheckCircle2, Plus, ArrowRight, Check } from "lucide-react";
import { useWorkspace, CreateCommunityDialog, CreateWorkspaceDialog } from "@/modules/workspace";

export function DashboardView(): React.JSX.Element {
  const { user, communities } = useAuth();
  const {
    currentCommunityId,
    currentCommunity,
    selectCommunity,
    activeWorkspace,
    workspaces,
    isSwitchingCommunity,
  } = useWorkspace();
  const navigate = useNavigate();

  const [isCreateCommunityOpen, setIsCreateCommunityOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Overview Hero Card */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
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

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCreateCommunityOpen(true)}
            data-testid="dashboard-create-community-btn"
            className="self-start gap-1.5 flex-shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Community</span>
          </Button>
        </div>

        {/* Community Memberships Collection */}
        {user && communities.length > 0 && (
          <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] space-y-3">
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
          <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] text-center py-6 space-y-3">
            <Users className="h-8 w-8 text-[var(--text-muted)] mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                No Community Memberships
              </p>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                You do not belong to any communities yet. Create a community or request an invitation to start organizing workspaces.
              </p>
            </div>
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
          </div>
        )}
      </div>

      {/* Product Feature Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--brand-accent-text)]" />
                <CardTitle className="text-base">My Work</CardTitle>
              </div>
              <Link
                to="/my-work"
                className="text-xs font-medium text-[var(--brand-accent-text)] hover:underline flex items-center gap-1 focus-ring rounded"
              >
                <span>Open</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <CardDescription>
              Personal cross-workspace triage for tasks assigned to, created by, or watched by you.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-[var(--text-secondary)] space-y-1.5">
            <p>&bull; Fast access to tasks requiring your attention across workspaces.</p>
            <p>&bull; Canonical temporal due-date groups: Overdue, Due Today, Upcoming, and Unscheduled.</p>
            <p>&bull; Live task aggregation query planned for stage VS-02E.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="h-4 w-4 text-[var(--brand-accent-text)]" />
                <CardTitle className="text-base">Workspaces</CardTitle>
              </div>
              {currentCommunity && (
                <button
                  type="button"
                  onClick={() => setIsCreateWorkspaceOpen(true)}
                  className="text-xs font-medium text-[var(--brand-accent-text)] hover:underline flex items-center gap-1 cursor-pointer focus-ring rounded"
                >
                  <Plus className="h-3 w-3" />
                  <span>Create</span>
                </button>
              )}
            </div>
            <CardDescription>
              Workspace containers for organizing tasks and community collaboration.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-[var(--text-secondary)] space-y-1.5">
            <p>&bull; Community-unique task identifier prefixes for clear task keys.</p>
            <p>&bull; Role-based workspace permissions: Owner, Coordinator, Member, and Viewer.</p>
            <p>&bull; Interactive workspace switcher planned for stage VS-02C.</p>

            {activeWorkspace && currentCommunityId && (
              <div className="pt-2 border-t border-[var(--border-subtle)] mt-2">
                <Link
                  to={`/c/${currentCommunityId}/w/${activeWorkspace.id}/list`}
                  className="inline-flex items-center gap-1.5 font-semibold text-xs text-[var(--brand-accent-text)] hover:underline focus-ring rounded"
                >
                  <span>Enter active workspace: {activeWorkspace.name}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
