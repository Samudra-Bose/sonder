import React from "react";
import { useParams } from "react-router-dom";
import { useWorkspace } from "@/modules/workspace/index.js";
import { useWorkspaceSettings } from "./useWorkspaceSettings.js";
import { PermissionInspector } from "./PermissionInspector.js";

interface RoleCapabilitySummary {
  role: string;
  badgeClass: string;
  capabilities: string[];
}

const ROLES: RoleCapabilitySummary[] = [
  {
    role: "Owner",
    badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    capabilities: [
      "Configure workspace name, prefix, and settings",
      "Create, edit, and archive custom fields (FEAT-D04a)",
      "Manage roles and workspace membership",
      "Set task edit policy and assignee delegation defaults",
      "Full capability over all tasks, views, and trash recovery",
    ],
  },
  {
    role: "Coordinator",
    badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    capabilities: [
      "Invite members (when coordinator invitation policy is enabled)",
      "Execute bulk status, priority, and archive operations",
      "Manage task dependencies and timeline scheduling",
      "Promote backlog items and manage subtasks",
      "All Member capabilities",
    ],
  },
  {
    role: "Member",
    badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    capabilities: [
      "Create new tasks and subtask checklists",
      "Update task status, priority, dates, and estimates",
      "Post comments and mention workspace teammates",
      "Edit custom field values and task links on permitted tasks",
      "Participate in triage and personal My Work dashboards",
    ],
  },
  {
    role: "Viewer",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700",
    capabilities: [
      "View tasks, subtasks, and comments across all views",
      "Inspect custom fields and dependency graphs",
      "Export filtered views to UTF-8 CSV",
      "Receive in-app notifications on watched tasks",
      "Read-only access (no creation or state mutations)",
    ],
  },
];

export const PermissionsSettingsView: React.FC = () => {
  const params = useParams<{ communityId?: string; workspaceId?: string }>();
  const { currentCommunityId, activeWorkspace } = useWorkspace();
  const communityId = params.communityId ?? currentCommunityId;
  const workspaceId = params.workspaceId ?? activeWorkspace?.id;

  const { data: settings } = useWorkspaceSettings(communityId, workspaceId);
  const effectiveWorkspace = settings ?? activeWorkspace;

  return (
    <div className="space-y-8" data-testid="permissions-settings">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Roles & Permissions Governance
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sonder enforces role-based capabilities and task-level permission checks. Use the interactive Role Simulator (FEAT-G03) to inspect effective permissions or consult the built-in roles matrix.
        </p>
      </div>

      {/* Interactive Permission Inspector & Role Simulator */}
      <PermissionInspector
        workspace={effectiveWorkspace}
        communityId={communityId}
        workspaceId={workspaceId}
      />

      {/* Built-in Role Capabilities Matrix */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Built-In Roles Reference Matrix
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Standard baseline capability sets for immutable built-in roles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="role-matrix">
          {ROLES.map((r) => (
            <div
              key={r.role}
              className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${r.badgeClass}`}>
                  {r.role}
                </span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                {r.capabilities.map((cap, i) => (
                  <li key={i} className="leading-relaxed">
                    <span className="text-foreground/90">{cap}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Delegation & Task Policy Summary */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-4" data-testid="delegation-policy-card">
        <h3 className="text-sm font-semibold text-foreground">
          Workspace Delegation & Subtask Policy
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1 p-3 rounded-md bg-muted/40 border border-border/60">
            <span className="font-medium text-foreground">Task Edit Policy:</span>
            <p className="text-muted-foreground">
              {settings?.taskEditPolicy === "COLLABORATIVE_MEMBER"
                ? "Collaborative Member — Any active workspace member can edit permitted fields on active tasks."
                : "Creator and Coordinator Strict — Editing restricted to task creator, assigned members, and coordinators."}
            </p>
          </div>

          <div className="space-y-1 p-3 rounded-md bg-muted/40 border border-border/60">
            <span className="font-medium text-foreground">Max Subtask Depth:</span>
            <p className="text-muted-foreground">
              Level {settings?.maxSubtaskDepth ?? 1} (Strict maximum depth limit preventing deeply nested cognitive trees).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
