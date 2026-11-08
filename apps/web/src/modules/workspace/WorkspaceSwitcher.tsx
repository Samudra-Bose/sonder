import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  ChevronDown,
  Layers,
  Search,
  Building2,
  RefreshCw,
  AlertCircle,
  ArrowRightLeft,
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover";
import { Tooltip } from "@/components/ui/Tooltip";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { useWorkspace } from "./WorkspaceContext";
import { WorkspaceBadge } from "./WorkspaceBadge";
import { WorkspaceRolePill } from "./WorkspaceRolePill";
import { WorkspaceListItem } from "./WorkspaceListItem";
import type { WorkspaceDto } from "./types";

export interface WorkspaceSwitcherProps {
  isCollapsed?: boolean;
  className?: string;
}

export function WorkspaceSwitcher({
  isCollapsed = false,
  className,
}: WorkspaceSwitcherProps): React.JSX.Element {
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

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCommunityMenuOpen, setIsCommunityMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Filter workspaces based on search query (matches name or keyPrefix)
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
      setIsOpen(false);
      setSearchQuery("");
      // Return focus to trigger
      triggerRef.current?.focus();
    },
    [selectWorkspace]
  );

  const handleSelectCommunity = useCallback(
    async (communityId: string) => {
      try {
        await selectCommunity(communityId);
        setIsCommunityMenuOpen(false);
        setSearchQuery("");
      } catch {
        // Error recorded in workspace context
      }
    },
    [selectCommunity]
  );

  const triggerLabel = activeWorkspace
    ? `Workspace: ${activeWorkspace.name} (${activeWorkspace.keyPrefix})`
    : "Select a workspace";

  // Trigger element for collapsed sidebar
  const collapsedTrigger = (
    <PopoverTrigger
      ref={triggerRef}
      className={cn(
        "h-9 w-9 mx-auto flex items-center justify-center rounded-md transition-colors focus-ring cursor-pointer select-none border border-[var(--border-subtle)]",
        activeWorkspace
          ? "bg-[var(--surface-muted)] text-[var(--text-primary)] font-bold text-xs"
          : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
        isOpen && "ring-2 ring-[var(--border-focus)]"
      )}
      aria-label={triggerLabel}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
    >
      {activeWorkspace ? (
        <span className="font-mono text-[11px] font-bold">
          {activeWorkspace.keyPrefix.slice(0, 3)}
        </span>
      ) : (
        <Layers className="h-4 w-4" />
      )}
    </PopoverTrigger>
  );

  // Trigger element for expanded sidebar
  const expandedTrigger = (
    <PopoverTrigger
      ref={triggerRef}
      className={cn(
        "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] transition-colors focus-ring cursor-pointer select-none text-left bg-[var(--surface-card)] hover:bg-[var(--surface-muted)]/60",
        isOpen && "ring-2 ring-[var(--border-focus)] border-transparent"
      )}
      aria-label={triggerLabel}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {activeWorkspace ? (
          <>
            <WorkspaceBadge prefix={activeWorkspace.keyPrefix} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                {activeWorkspace.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-[var(--text-muted)] truncate">
                  {currentCommunity?.name ?? "Community"}
                </span>
                {activeWorkspace.myRole && (
                  <WorkspaceRolePill role={activeWorkspace.myRole} />
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="h-6 w-6 rounded bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-muted)] flex-shrink-0">
              <Layers className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[var(--text-muted)] truncate">
                Select Workspace
              </p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">
                {currentCommunity?.name ?? "No community selected"}
              </p>
            </div>
          </>
        )}
      </div>

      <ChevronDown
        className={cn(
          "h-4 w-4 text-[var(--text-muted)] transition-transform duration-150 flex-shrink-0",
          isOpen && "rotate-180"
        )}
      />
    </PopoverTrigger>
  );

  return (
    <div className={cn("relative w-full", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        {isCollapsed ? (
          <Tooltip content={triggerLabel} side="right">
            {collapsedTrigger}
          </Tooltip>
        ) : (
          expandedTrigger
        )}

        <PopoverContent
          align={isCollapsed ? "start" : "center"}
          side={isCollapsed ? "right" : "bottom"}
          sideOffset={6}
          className="w-80 p-0 overflow-hidden shadow-xl border border-[var(--border-strong)] bg-[var(--surface-card)]"
        >
          {/* Header: Current Community Context & Switcher */}
          <div className="p-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface-muted)]/50">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <Building2 className="h-3.5 w-3.5 text-[var(--text-muted)] flex-shrink-0" />
                <span className="font-semibold text-[var(--text-primary)] truncate">
                  {currentCommunity?.name ?? "No community selected"}
                </span>
              </div>

              {(communities?.length ?? 0) > 1 && (
                <button
                  type="button"
                  onClick={() => setIsCommunityMenuOpen((prev) => !prev)}
                  className="text-[11px] font-medium text-[var(--brand-accent-text)] hover:underline flex items-center gap-1 focus-ring rounded px-1 cursor-pointer"
                  aria-expanded={isCommunityMenuOpen}
                >
                  <ArrowRightLeft className="h-3 w-3" />
                  <span>Switch</span>
                </button>
              )}
            </div>

            {/* Community Switcher Dropdown (When multiple communities exist) */}
            {isCommunityMenuOpen && (communities?.length ?? 0) > 1 && (
              <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] space-y-1">
                <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] px-1">
                  Your Communities
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
                        "w-full flex items-center justify-between px-2 py-1.5 rounded text-xs text-left transition-colors focus-ring cursor-pointer",
                        isCurrent
                          ? "bg-[var(--surface-muted)] font-semibold text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]/60 hover:text-[var(--text-primary)]"
                      )}
                    >
                      <span className="truncate">{c.name}</span>
                      {isCurrent && (
                        <span className="text-[10px] text-[var(--brand-accent-text)] font-medium">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {communitySwitchError && (
              <div className="mt-1.5 p-1.5 rounded bg-[var(--feedback-danger-bg)] text-[var(--feedback-danger-text)] text-[11px] flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{communitySwitchError}</span>
              </div>
            )}
          </div>

          {/* Search Filter Input */}
          <div className="p-2 border-b border-[var(--border-subtle)]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter workspaces..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-md bg-[var(--surface-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] transition-colors"
                aria-label="Filter workspaces"
              />
            </div>
          </div>

          {/* Workspace List Body */}
          <div
            role="listbox"
            aria-label="Workspaces"
            className="max-h-64 overflow-y-auto p-1.5 space-y-2 focus:outline-none"
          >
            {isLoading ? (
              <div className="p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-8 rounded" />
                  <Skeleton className="h-4 flex-1 rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-8 rounded" />
                  <Skeleton className="h-4 flex-1 rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-8 rounded" />
                  <Skeleton className="h-4 flex-1 rounded" />
                </div>
              </div>
            ) : error ? (
              <div className="p-3 text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--feedback-danger-text)]">
                  <AlertCircle className="h-4 w-4" />
                  <span>Failed to load workspaces</span>
                </div>
                <button
                  type="button"
                  onClick={() => refetchWorkspaces()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-[var(--border-subtle)] focus-ring cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Retry</span>
                </button>
              </div>
            ) : workspaces.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                No workspaces available in this community.
              </div>
            ) : !filteredPersonal && filteredShared.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                No workspaces match &ldquo;{searchQuery}&rdquo;
              </div>
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
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
