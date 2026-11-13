import React, { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Save, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button.js";
import { cn } from "@/lib/utils.js";
import type { WorkspaceDto } from "@/modules/workspace/types.js";
import { useUpdateWorkspaceSettings } from "./useWorkspaceSettings.js";

export interface GeneralSettingsViewProps {
  workspace: WorkspaceDto;
  communityId: string;
  isOwner: boolean;
}

export function GeneralSettingsView({
  workspace,
  communityId,
  isOwner,
}: GeneralSettingsViewProps): React.JSX.Element {
  const updateSettingsMutation = useUpdateWorkspaceSettings(communityId, workspace.id);

  const [name, setName] = useState(workspace.name);
  const [keyPrefix, setKeyPrefix] = useState(workspace.keyPrefix);
  const [maxSubtaskDepth, setMaxSubtaskDepth] = useState<number>(workspace.maxSubtaskDepth ?? 1);
  const [taskEditPolicy, setTaskEditPolicy] = useState<"CREATOR_COORDINATOR_STRICT" | "COLLABORATIVE_MEMBER">(
    workspace.taskEditPolicy ?? "CREATOR_COORDINATOR_STRICT"
  );
  const [coordinatorCanInvite, setCoordinatorCanInvite] = useState<boolean>(
    workspace.coordinatorCanInviteMembers ?? true
  );

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    setName(workspace.name);
    setKeyPrefix(workspace.keyPrefix);
    setMaxSubtaskDepth(workspace.maxSubtaskDepth ?? 1);
    setTaskEditPolicy(workspace.taskEditPolicy ?? "CREATOR_COORDINATOR_STRICT");
    setCoordinatorCanInvite(workspace.coordinatorCanInviteMembers ?? true);
  }, [workspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    setFeedback(null);

    // Validation
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 120) {
      setFeedback({
        type: "error",
        message: "Workspace name is required and must be between 1 and 120 characters.",
      });
      return;
    }

    const trimmedPrefix = keyPrefix.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9]{1,9}$/.test(trimmedPrefix)) {
      setFeedback({
        type: "error",
        message: "Key prefix must start with an uppercase letter and be 2–10 alphanumeric characters (e.g. ENG, TEAM).",
      });
      return;
    }

    try {
      await updateSettingsMutation.mutateAsync({
        name: trimmedName,
        keyPrefix: trimmedPrefix,
        maxSubtaskDepth,
        taskEditPolicy,
        coordinatorCanInviteMembers: coordinatorCanInvite,
      });

      setFeedback({
        type: "success",
        message: "Workspace settings updated successfully.",
      });
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      setFeedback({
        type: "error",
        message: e.detail || e.message || "Failed to update workspace settings.",
      });
    }
  };

  return (
    <div data-testid="general-settings-view" className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-base font-bold text-[var(--text-primary)]">General Settings</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Manage workspace identity, task key prefix, and core operational policies.
        </p>
      </div>

      {!isOwner && (
        <div
          role="status"
          data-testid="owner-restricted-notice"
          className="flex items-center gap-2 p-3 rounded-lg bg-[var(--surface-muted)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]"
        >
          <ShieldAlert className="h-4 w-4 text-[var(--brand-accent-text)] flex-shrink-0" />
          <span>
            You have read-only access. Only an active <strong>Workspace Owner</strong> may modify workspace settings.
          </span>
        </div>
      )}

      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          data-testid={`settings-feedback-${feedback.type}`}
          className={cn(
            "flex items-center gap-2 p-3 rounded-lg text-xs border",
            feedback.type === "error"
              ? "bg-[var(--status-canceled-surface)] border-[var(--status-canceled-border)] text-[var(--status-canceled-text)]"
              : "bg-[var(--status-done-surface)] border-[var(--status-done-border)] text-[var(--status-done-text)]"
          )}
        >
          {feedback.type === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} data-testid="general-settings-form" className="space-y-5">
        {/* Workspace Name */}
        <div className="space-y-1.5">
          <label htmlFor="settings-workspace-name" className="block text-xs font-semibold text-[var(--text-primary)]">
            Workspace Name <span className="text-[var(--feedback-danger-text)]">*</span>
          </label>
          <input
            id="settings-workspace-name"
            data-testid="workspace-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isOwner || updateSettingsMutation.isPending}
            maxLength={120}
            required
            className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-primary)] focus-ring disabled:opacity-50"
          />
          <p className="text-[11px] text-[var(--text-muted)]">
            Visible name of the workspace within your community.
          </p>
        </div>

        {/* Key Prefix */}
        <div className="space-y-1.5">
          <label htmlFor="settings-key-prefix" className="block text-xs font-semibold text-[var(--text-primary)]">
            Task Key Prefix <span className="text-[var(--feedback-danger-text)]">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="settings-key-prefix"
              data-testid="workspace-prefix-input"
              type="text"
              value={keyPrefix}
              onChange={(e) => setKeyPrefix(e.target.value.toUpperCase())}
              disabled={!isOwner || updateSettingsMutation.isPending}
              maxLength={10}
              required
              className="w-36 px-3 py-2 text-xs font-mono font-bold uppercase rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-primary)] focus-ring disabled:opacity-50"
            />
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              Example: {keyPrefix ? `${keyPrefix}-101` : "ENG-101"}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Uppercase identifier prefix for tasks. Renaming creates immutable historical aliases so old links continue to work.
          </p>
        </div>

        {/* Max Subtask Depth */}
        <div className="space-y-1.5">
          <label htmlFor="settings-subtask-depth" className="block text-xs font-semibold text-[var(--text-primary)]">
            Max Subtask Depth
          </label>
          <select
            id="settings-subtask-depth"
            value={maxSubtaskDepth}
            onChange={(e) => setMaxSubtaskDepth(parseInt(e.target.value, 10))}
            disabled={!isOwner || updateSettingsMutation.isPending}
            className="px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-primary)] focus-ring disabled:opacity-50"
          >
            <option value={1}>Depth 1 (Task → Subtask)</option>
            <option value={2}>Depth 2 (Task → Subtask → Nested Subtask)</option>
          </select>
          <p className="text-[11px] text-[var(--text-muted)]">
            Specifies maximum hierarchy levels. Sonder supports depth 1–2 per architecture specifications.
          </p>
        </div>

        {/* Task Edit Policy */}
        <div className="space-y-1.5">
          <label htmlFor="settings-edit-policy" className="block text-xs font-semibold text-[var(--text-primary)]">
            Task Edit Policy
          </label>
          <select
            id="settings-edit-policy"
            value={taskEditPolicy}
            onChange={(e) => setTaskEditPolicy(e.target.value as any)}
            disabled={!isOwner || updateSettingsMutation.isPending}
            className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-primary)] focus-ring disabled:opacity-50"
          >
            <option value="CREATOR_COORDINATOR_STRICT">
              Strict (Creator & Coordinator only edit task definitions)
            </option>
            <option value="COLLABORATIVE_MEMBER">
              Collaborative (Active members can edit task details)
            </option>
          </select>
          <p className="text-[11px] text-[var(--text-muted)]">
            Controls whether non-creator assignees can edit core task fields without explicit group delegation.
          </p>
        </div>

        {/* Coordinator Can Invite Members Toggle */}
        <div className="pt-2">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={coordinatorCanInvite}
              onChange={(e) => setCoordinatorCanInvite(e.target.checked)}
              disabled={!isOwner || updateSettingsMutation.isPending}
              className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand-accent-btn-bg)] focus:ring-[var(--border-focus)] disabled:opacity-50"
            />
            <span className="text-xs font-medium text-[var(--text-primary)]">
              Allow Coordinators to invite Members and Viewers
            </span>
          </label>
          <p className="text-[11px] text-[var(--text-muted)] ml-6.5 mt-0.5">
            When enabled, Coordinators can add members without requiring Owner elevation.
          </p>
        </div>

        <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end">
          <Button
            type="submit"
            variant="accent"
            size="sm"
            disabled={!isOwner || updateSettingsMutation.isPending}
            title={!isOwner ? "Only workspace owners can modify workspace settings" : undefined}
            data-testid="save-general-settings-btn"
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
