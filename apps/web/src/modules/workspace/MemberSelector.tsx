import React, { useState, useMemo, useRef, useEffect } from "react";
import { User, UserX, Check, Search, RefreshCw, AlertCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useWorkspaceMembers } from "./settings/useWorkspaceSettings.js";
import type { WorkspaceMemberDto } from "./settings/types.js";

export interface MemberSelectorProps {
  communityId: string | null | undefined;
  workspaceId: string | null | undefined;
  selectedMemberId?: string | null;
  initialMember?: { id: string; displayName: string; avatarUrl?: string | null } | null;
  onSelectMember: (member: WorkspaceMemberDto | null) => void;
  disabled?: boolean;
  triggerLabel?: string;
  placeholder?: string;
  className?: string;
  align?: "start" | "center" | "end";
}

export function MemberSelector({
  communityId,
  workspaceId,
  selectedMemberId,
  initialMember,
  onSelectMember,
  disabled = false,
  triggerLabel,
  placeholder = "Assign to...",
  className,
  align = "start",
}: MemberSelectorProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    data: membersData,
    isLoading,
    isError,
    refetch,
  } = useWorkspaceMembers(communityId, workspaceId);

  const members = useMemo(() => membersData?.items ?? [], [membersData]);

  const selectedMember = useMemo(() => {
    if (!selectedMemberId) return null;
    const found = members.find((m) => m.user.id === selectedMemberId);
    if (found) {
      return {
        id: found.user.id,
        displayName: found.user.displayName,
        avatarUrl: found.user.avatarUrl,
      };
    }
    if (initialMember && initialMember.id === selectedMemberId) {
      return initialMember;
    }
    return null;
  }, [members, selectedMemberId, initialMember]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const email = (m.user as { email?: string }).email;
      return (
        m.user.displayName.toLowerCase().includes(q) ||
        (email && email.toLowerCase().includes(q)) ||
        (m.roleName && m.roleName.toLowerCase().includes(q))
      );
    });
  }, [members, searchQuery]);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSelect = (member: WorkspaceMemberDto | null) => {
    onSelectMember(member);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        disabled={disabled}
        data-testid="member-selector-trigger"
        aria-label={triggerLabel || (selectedMember ? `Assigned to ${selectedMember.displayName}` : placeholder)}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors focus-ring cursor-pointer select-none",
          disabled && "opacity-50 pointer-events-none cursor-not-allowed",
          selectedMember
            ? "bg-[var(--surface-card)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--border-strong)] shadow-2xs"
            : "bg-[var(--surface-muted)]/50 border-dashed border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]",
          className
        )}
      >
        {selectedMember ? (
          <>
            <Avatar
              name={selectedMember.displayName}
              src={selectedMember.avatarUrl ?? undefined}
              size="xs"
            />
            <span className="truncate max-w-[120px]">{selectedMember.displayName}</span>
          </>
        ) : (
          <>
            <User className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            <span>{placeholder}</span>
          </>
        )}
      </PopoverTrigger>

      <PopoverContent
        align={align}
        sideOffset={4}
        className="w-72 p-0 overflow-hidden bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-lg z-50"
      >
        {/* Search header */}
        <div className="p-2 border-b border-[var(--border-subtle)] bg-[var(--surface-muted)]/30">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-[var(--text-muted)]" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              data-testid="member-selector-search"
              aria-label="Search workspace members"
              placeholder="Search members by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-md bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] focus:border-[var(--border-focus)] transition-all"
            />
          </div>
        </div>

        {/* Member options list */}
        <div
          role="listbox"
          aria-label="Workspace members"
          className="max-h-56 overflow-y-auto p-1 space-y-0.5 divide-y-0"
        >
          {isLoading && (
            <div className="flex items-center justify-center py-6 text-xs text-[var(--text-muted)] gap-2">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Loading members...</span>
            </div>
          )}

          {isError && (
            <div className="p-3 text-xs space-y-2 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[var(--state-error)]">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Failed to load members</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetch()}
                className="h-6 text-[11px] px-2"
              >
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !isError && (
            <>
              {/* Unassigned Option */}
              <div
                role="option"
                aria-selected={!selectedMemberId}
                tabIndex={0}
                data-testid="member-option-unassigned"
                onClick={() => handleSelect(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(null);
                  }
                }}
                className={cn(
                  "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer select-none transition-colors focus:outline-none focus:bg-[var(--surface-muted)]",
                  !selectedMemberId
                    ? "bg-[var(--surface-muted)] text-[var(--brand-accent-text)] font-semibold"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full border border-dashed border-[var(--border-strong)] flex items-center justify-center text-[var(--text-muted)]">
                    <UserX className="h-3 w-3" />
                  </div>
                  <span className="italic">Unassigned</span>
                </div>
                {!selectedMemberId && <Check className="h-3.5 w-3.5 text-[var(--brand-accent-text)]" />}
              </div>

              {/* Filtered Member Items */}
              {filteredMembers.length === 0 ? (
                <div className="py-4 text-center text-xs text-[var(--text-muted)]">
                  No members match "{searchQuery}"
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const isSelected = selectedMemberId === member.user.id;
                  return (
                    <div
                      key={member.user.id}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={0}
                      data-testid={`member-option-${member.user.id}`}
                      onClick={() => handleSelect(member)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelect(member);
                        }
                      }}
                      className={cn(
                        "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer select-none transition-colors focus:outline-none focus:bg-[var(--surface-muted)]",
                        isSelected
                          ? "bg-[var(--surface-muted)] text-[var(--brand-accent-text)] font-semibold"
                          : "text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar
                          name={member.user.displayName}
                          src={member.user.avatarUrl ?? undefined}
                          size="xs"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-medium">{member.user.displayName}</span>
                          <span className="text-[10px] text-[var(--text-muted)] truncate">
                            {(member.user as { email?: string }).email ?? member.roleName ?? "Member"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {member.roleName && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                            {member.roleName}
                          </span>
                        )}
                        {isSelected && <Check className="h-3.5 w-3.5 text-[var(--brand-accent-text)]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
