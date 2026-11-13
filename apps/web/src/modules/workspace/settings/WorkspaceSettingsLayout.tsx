import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Sliders, Database, GitFork, Users, Shield } from "lucide-react";
import { useWorkspace } from "@/modules/workspace/index.js";
import { useWorkspaceSettings } from "./useWorkspaceSettings.js";
import { GeneralSettingsView } from "./GeneralSettingsView.js";
import { CustomFieldsSettingsView } from "./CustomFieldsSettingsView.js";
import { WorkflowSettingsView } from "./WorkflowSettingsView.js";
import { MembersSettingsView } from "./MembersSettingsView.js";
import { PermissionsSettingsView } from "./PermissionsSettingsView.js";
import type { SettingsCategory } from "./types.js";

interface TabItem {
  id: SettingsCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  testid: string;
}

const TABS: TabItem[] = [
  { id: "general", label: "General", icon: Sliders, testid: "settings-tab-general" },
  { id: "custom-fields", label: "Custom Fields", icon: Database, testid: "settings-tab-custom-fields" },
  { id: "workflow", label: "Workflow Spine", icon: GitFork, testid: "settings-tab-workflow" },
  { id: "members", label: "Members", icon: Users, testid: "settings-tab-members" },
  { id: "permissions", label: "Permissions", icon: Shield, testid: "settings-tab-permissions" },
];

export const WorkspaceSettingsLayout: React.FC = () => {
  const params = useParams<{ communityId?: string; workspaceId?: string; category?: string }>();
  const navigate = useNavigate();
  const { currentCommunityId, activeWorkspace } = useWorkspace();

  const communityId = params.communityId ?? currentCommunityId ?? "default-community";
  const workspaceId = params.workspaceId ?? activeWorkspace?.id ?? "default-workspace";

  const { data: workspaceData, isLoading, isError, error } = useWorkspaceSettings(communityId, workspaceId);

  const effectiveWorkspace = workspaceData ?? activeWorkspace;
  const isOwner = Boolean(
    activeWorkspace?.myRole === "OWNER" ||
    workspaceData?.myRole === "OWNER"
  );

  const activeCategory: SettingsCategory = (params.category as SettingsCategory) || "general";

  // Canonical base URL: prefers /c/:communityId/w/:workspaceId/settings if communityId param is present
  const getTabUrl = (cat: SettingsCategory) => {
    if (params.communityId) {
      return `/c/${encodeURIComponent(communityId)}/w/${encodeURIComponent(workspaceId)}/settings/${cat}`;
    }
    return `/workspaces/${encodeURIComponent(workspaceId)}/settings/${cat}`;
  };

  const backUrl = params.communityId
    ? `/c/${encodeURIComponent(communityId)}/w/${encodeURIComponent(workspaceId)}/list`
    : `/workspaces/${encodeURIComponent(workspaceId)}`;

  return (
    <div
      className="flex-1 overflow-y-auto bg-background text-foreground min-h-screen"
      data-testid="workspace-settings-shell"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-2">
            <Link
              to={backUrl}
              data-testid="back-to-workspace-btn"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Tasks
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {effectiveWorkspace?.name ?? "Workspace Settings"}
              </h1>
              {effectiveWorkspace?.keyPrefix && (
                <span
                  data-testid="workspace-prefix-badge"
                  className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-secondary text-secondary-foreground font-semibold border border-border"
                >
                  {effectiveWorkspace.keyPrefix}
                </span>
              )}
              {effectiveWorkspace?.myRole && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {effectiveWorkspace.myRole}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Category Navigation Tabs */}
        <nav
          className="flex space-x-1 border-b border-border overflow-x-auto pb-px"
          aria-label="Settings Categories"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={tab.testid}
                onClick={() => navigate(getTabUrl(tab.id))}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Content Area */}
        <div className="pt-2">
          {isLoading && !effectiveWorkspace && (
            <div className="p-12 text-center text-sm text-muted-foreground animate-pulse">
              Loading workspace settings...
            </div>
          )}

          {isError && !effectiveWorkspace && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-5 text-sm text-destructive">
              Failed to load workspace settings: {error?.message}
            </div>
          )}

          {effectiveWorkspace && (
            <>
              {activeCategory === "general" && (
                <GeneralSettingsView
                  workspace={effectiveWorkspace}
                  communityId={communityId}
                  isOwner={isOwner}
                />
              )}
              {activeCategory === "custom-fields" && <CustomFieldsSettingsView />}
              {activeCategory === "workflow" && <WorkflowSettingsView />}
              {activeCategory === "members" && <MembersSettingsView />}
              {activeCategory === "permissions" && <PermissionsSettingsView />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
