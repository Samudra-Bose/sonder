import React from "react";
import { useParams } from "react-router-dom";
import { useWorkspace } from "@/modules/workspace/index.js";
import { useWorkspaceMembers } from "./useWorkspaceSettings.js";
import type { WorkspaceMemberDto } from "./types.js";

const ROLE_BADGES: Record<string, string> = {
  OWNER: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  COORDINATOR: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  MEMBER: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  VIEWER: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700",
};

export const MembersSettingsView: React.FC = () => {
  const params = useParams<{ communityId?: string; workspaceId?: string }>();
  const { currentCommunityId, activeWorkspace } = useWorkspace();
  const communityId = params.communityId ?? currentCommunityId;
  const workspaceId = params.workspaceId ?? activeWorkspace?.id;

  const { data, isLoading, isError, error } = useWorkspaceMembers(communityId, workspaceId);

  const members: WorkspaceMemberDto[] = data?.items ?? [];

  return (
    <div className="space-y-6" data-testid="members-settings">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Workspace Members
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage member access, roles, and collaboration permissions for this workspace.
        </p>
      </div>

      {isLoading && (
        <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
          Loading workspace members...
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-xs text-destructive">
          Failed to load workspace members: {error?.message}
        </div>
      )}

      {!isLoading && !isError && (
        <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Active Members ({members.length})
            </span>
          </div>

          <div className="divide-y divide-border">
            {members.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No members found in this workspace.
              </div>
            ) : (
              members.map((member) => {
                const roleKey = member.roleSystemKey ?? "MEMBER";
                const badgeClass = ROLE_BADGES[roleKey] || ROLE_BADGES.MEMBER;
                const initials = (member.user.displayName || "User")
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                return (
                  <div
                    key={member.user.id}
                    data-testid={`member-row-${member.user.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3">
                      {member.user.avatarUrl ? (
                        <img
                          src={member.user.avatarUrl}
                          alt={member.user.displayName}
                          className="w-9 h-9 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center border border-border">
                          {initials}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {member.user.displayName}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {member.user.id}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      {member.isDefaultCoordinator && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-secondary-foreground">
                          Default Coordinator
                        </span>
                      )}
                      <span
                        data-testid={`member-role-${member.user.id}`}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}
                      >
                        {member.roleName || roleKey}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
