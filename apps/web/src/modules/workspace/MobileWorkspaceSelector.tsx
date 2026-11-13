import React, { useState, useMemo, useCallback } from "react";
import {
  Building2,
  Search,
  RefreshCw,
  AlertCircle,
  ArrowRightLeft,
  ChevronDown,
  Layers,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { useWorkspace } from "./WorkspaceContext";
import { WorkspaceBadge } from "./WorkspaceBadge";
import { WorkspaceRolePill } from "./WorkspaceRolePill";
import { WorkspaceListItem } from "./WorkspaceListItem";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";
import type { WorkspaceDto } from "./types";

export interface MobileWorkspaceSelectorProps {
  onWorkspaceSelected?: () => void;
  className?: string;
}

export function MobileWorkspaceSelector({
  onWorkspaceSelected,
  className,
}: MobileWorkspaceSelectorProps): React.JSX.Element {
  const {
    currentCommunity,
    communities,
    activeWorkspace,
    workspaces,
    personalWorkspace,
    sharedWorkspaces,
    isLoading,
    error,
    refetchWorkspaces,
    selectWorkspace,
    selectCommunity,
    isSwitchingCommunity,
    communitySwitchError,
  } = useWorkspace();

  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCommunitySelectorOpen, setIsCommunitySelectorOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const query = searchQuery.trim().toLowerCase();

  const filteredPersonal = useMemo<WorkspaceDto | null>(() => {
    if (!personalWorkspace) return null;
    if (!query) return personalWorkspace;
    const matchesName = personalWorkspace.name.toLowerCase().includes(query);
    const matchesPrefix = personalWorkspace.keyPrefix.toLowerCase().includes(query);
    return matchesName || matchesPrefix ? personalWorkspace : null;
  }, [personalWorkspace, query]);

  const filteredShared = useMemo<WorkspaceDto[]>(() => {
    if (!query) return sharedWorkspaces;
    return sharedWorkspaces.filter(
      (w) =>
        w.name.toLowerCase().includes(query) ||
        w.keyPrefix.toLowerCase().includes(query)
    );
  }, [sharedWorkspaces, query]);

  const handleSelectWorkspace = useCallback(
    (workspace: WorkspaceDto) => {
      selectWorkspace(workspace.id);
      setIsExpanded(false);
      setSearchQuery("");
      onWorkspaceSelected?.();
    },
    [selectWorkspace, onWorkspaceSelected]
  );

  const handleSelectCommunity = useCallback(
    async (communityId: string) => {
      try {
        await selectCommunity(communityId);
        setIsCommunitySelectorOpen(false);
        setSearchQuery("");
      } catch {
        // Handled in context
      }
    },
    [selectCommunity]
  );

  return (
    <div className={cn("space-y-2 select-none", className)}>
      {/* Community Context Header (with Switcher if multiple) */}
      <div className="flex items-center justify-between px-2 py-1 bg-[var(--surface-muted)]/60 rounded-lg border border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
          <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
            {currentCommunity?.name ?? "No community selected"}
          </span>
        </div>

        {(communities?.length ?? 0) > 1 && (
          <button
            type="button"
            onClick={() => setIsCommunitySelectorOpen((prev) => !prev)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-medium text-[var(--brand-accent-text)] hover:underline focus-ring rounded cursor-pointer"
            aria-expanded={isCommunitySelectorOpen}
            aria-label="Switch community"
          >
            <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
            <span>Switch</span>
          </button>
        )}
      </div>

      {/* Community Picker Accordion (if multiple communities) */}
      {isCommunitySelectorOpen && (communities?.length ?? 0) > 1 && (
        <div className="p-2 bg-[var(--surface-card)] rounded-lg border border-[var(--border-strong)] space-y-1">
          <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] px-1">
            Select Active Community
          </p>
          {(communities ?? []).map((c) => {
            const isCurrent = c.communityId === currentCommunity?.communityId;
            return (
              <button
                key={c.communityId}
                type="button"
                disabled={isSwitchingCommunity}
                onClick={() => handleSelectCommunity(c.communityId)}
                className={cn(
                  "w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors focus-ring cursor-pointer text-left",
                  isCurrent
                    ? "bg-[var(--surface-muted)] font-semibold text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]/60"
                )}
              >
                <span className="truncate">{c.name}</span>
                {isCurrent && (
                  <span className="text-[11px] text-[var(--brand-accent-text)] font-semibold">
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {communitySwitchError && (
        <div className="p-2 rounded bg-[var(--feedback-danger-bg)] text-[var(--feedback-danger-text)] text-xs flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{communitySwitchError}</span>
        </div>
      )}

      {/* Active Workspace Card / Collapsible Trigger */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className={cn(
          "w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] transition-colors focus-ring cursor-pointer text-left",
          isExpanded && "border-[var(--border-strong)] bg-[var(--surface-muted)]/40"
        )}
        aria-expanded={isExpanded}
        aria-label={
          activeWorkspace
            ? `Active workspace: ${activeWorkspace.name} (${activeWorkspace.keyPrefix}). Tap to switch.`
            : "Select a workspace. Tap to open workspace list."
        }
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {activeWorkspace ? (
            <>
              <WorkspaceBadge prefix={activeWorkspace.keyPrefix} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {activeWorkspace.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {activeWorkspace.kind === "PERSONAL" ? (
                    <span className="text-[10px] text-[var(--text-muted)] font-medium">
                      Personal Workspace
                    </span>
                  ) : (
                    activeWorkspace.myRole && (
                      <WorkspaceRolePill role={activeWorkspace.myRole} />
                    )
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="h-7 w-7 rounded bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-muted)] flex-shrink-0">
                <Layers className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[var(--text-muted)]">
                  Select Workspace
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  Tap to choose a workspace
                </p>
              </div>
            </>
          )}
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 text-[var(--text-muted)] transition-transform duration-150 flex-shrink-0 ml-2",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {/* Expanded Workspace Picker */}
      {isExpanded && (
        <div className="p-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)] space-y-2">
          {/* Search Input (Only show if > 2 workspaces) */}
          {workspaces.length > 2 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workspaces..."
                className="w-full min-h-[44px] pl-9 pr-3 py-2 text-xs rounded-md bg-[var(--surface-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
                aria-label="Search workspaces"
              />
            </div>
          )}

          {/* Workspaces List */}
          <div role="listbox" aria-label="Available Workspaces" className="space-y-2 max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 space-y-2">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ) : error ? (
              <div className="p-3 text-center space-y-2">
                <p className="text-xs text-[var(--feedback-danger-text)]">
                  Failed to load workspaces
                </p>
                <button
                  type="button"
                  onClick={() => refetchWorkspaces()}
                  className="min-h-[44px] px-3 py-1.5 text-xs rounded bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-[var(--border-subtle)] focus-ring cursor-pointer flex items-center justify-center gap-1 mx-auto"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            ) : workspaces.length === 0 ? (
              <p className="p-3 text-center text-xs text-[var(--text-muted)]">
                No workspaces available.
              </p>
            ) : !filteredPersonal && filteredShared.length === 0 ? (
              <p className="p-3 text-center text-xs text-[var(--text-muted)]">
                No workspaces match &ldquo;{searchQuery}&rdquo;
              </p>
            ) : (
              <>
                {/* Personal Workspace Group */}
                {filteredPersonal && (
                  <div role="group" aria-label="Personal Workspace" className="space-y-1">
                    <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Personal Workspace
                    </p>
                    <WorkspaceListItem
                      workspace={filteredPersonal}
                      isSelected={activeWorkspace?.id === filteredPersonal.id}
                      onSelect={handleSelectWorkspace}
                      isMobile={true}
                    />
                  </div>
                )}

                {/* Shared Workspaces Group */}
                {filteredShared.length > 0 && (
                  <div role="group" aria-label="Shared Workspaces" className="space-y-1 pt-1">
                    <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Shared Workspaces
                    </p>
                    {filteredShared.map((w) => (
                      <WorkspaceListItem
                        key={w.id}
                        workspace={w}
                        isSelected={activeWorkspace?.id === w.id}
                        onSelect={handleSelectWorkspace}
                        isMobile={true}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Create Workspace Action for Mobile */}
          <div className="pt-2 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                setIsCreateDialogOpen(true);
              }}
              data-testid="mobile-create-workspace-trigger"
              className="w-full min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold text-[var(--brand-primary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-active)] transition-colors active:scale-[0.99] touch-manipulation cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Workspace</span>
            </button>
          </div>
        </div>
      )}

      <CreateWorkspaceDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        communityId={currentCommunity?.communityId ?? null}
        onSuccess={() => onWorkspaceSelected?.()}
      />
    </div>
  );
}
