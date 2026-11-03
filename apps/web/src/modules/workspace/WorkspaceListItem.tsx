import React from "react";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceBadge } from "./WorkspaceBadge";
import { WorkspaceRolePill } from "./WorkspaceRolePill";
import type { WorkspaceDto } from "./types";

export interface WorkspaceListItemProps {
  workspace: WorkspaceDto;
  isSelected: boolean;
  onSelect: (workspace: WorkspaceDto) => void;
  isMobile?: boolean;
}

export function WorkspaceListItem({
  workspace,
  isSelected,
  onSelect,
  isMobile = false,
}: WorkspaceListItemProps): React.JSX.Element {
  const isPersonal = workspace.kind === "PERSONAL";

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={() => onSelect(workspace)}
      className={cn(
        "w-full flex items-center justify-between text-left rounded-md transition-colors focus-ring cursor-pointer select-none",
        isMobile
          ? "px-3 py-2.5 min-h-[44px] gap-2.5"
          : "px-2 py-1.5 min-h-[36px] gap-2 text-xs",
        isSelected
          ? "bg-[var(--surface-muted)] text-[var(--text-primary)] font-semibold"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]/70 hover:text-[var(--text-primary)]"
      )}
    >
      {/* Left: Prefix Badge & Title */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <WorkspaceBadge prefix={workspace.keyPrefix} size="sm" />
        <span className="truncate flex-1 font-medium">{workspace.name}</span>
      </div>

      {/* Right: Kind/Role Tag & Active Checkmark */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isPersonal ? (
          <span
            className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-medium px-1.5 py-0.5 rounded bg-[var(--surface-canvas)] border border-[var(--border-subtle)]"
            title="Personal Workspace (Private to you)"
          >
            <Lock className="h-3 w-3 text-[var(--text-muted)]" aria-hidden="true" />
            <span>Personal</span>
          </span>
        ) : (
          <WorkspaceRolePill role={workspace.myRole} />
        )}

        {isSelected && (
          <Check
            className="h-4 w-4 text-[var(--brand-accent-text)] ml-0.5 flex-shrink-0"
            aria-label="Selected"
          />
        )}
      </div>
    </button>
  );
}
