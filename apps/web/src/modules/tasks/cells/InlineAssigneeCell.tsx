import React, { useState, useMemo } from "react";
import { User, UserX, Check, Search, Loader2, AlertCircle, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar.js";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover.js";
import { cn } from "@/lib/utils.js";
import { useWorkspaceMembers } from "@/modules/workspace/settings/useWorkspaceSettings.js";
import { useUpdateTask } from "../useUpdateTask.js";
import type { TaskDto } from "../types.js";

export interface InlineAssigneeCellProps {
  task: Pick<TaskDto, "id" | "assigneeIds" | "assigneeAssignments"> & {
    effectivePermissions?: {
      canAssign?: boolean;
      canAssignTask?: boolean;
    };
    fieldRevisions?: {
      assigneeIds?: number;
      [key: string]: number | undefined;
    };
  };
  communityId: string;
  workspaceId: string;
  isArchived?: boolean;
  disabled?: boolean;
  className?: string;
  mode?: "replace" | "toggle";
  onAssigneeChange?: (newAssigneeIds: string[]) => Promise<void> | void;
}

export function InlineAssigneeCell({
  task,
  communityId,
  workspaceId,
  isArchived = false,
  disabled = false,
  className,
  mode = "replace",
  onAssigneeChange,
}: InlineAssigneeCellProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const updateMutation = useUpdateTask();

  const { data: membersData, isLoading: isMembersLoading } = useWorkspaceMembers(communityId, workspaceId);
  const members = useMemo(() => membersData?.items ?? [], [membersData]);

  // Canonical contract permission is canAssign; also supports canAssignTask alias
  const canEdit =
    !disabled &&
    !isArchived &&
    Boolean(task.effectivePermissions?.canAssign ?? task.effectivePermissions?.canAssignTask ?? true);

  const assignments = task.assigneeAssignments ?? [];
  const currentAssigneeIds = task.assigneeIds ?? assignments.map((a) => a.userId);
  const firstAssignment = assignments[0];
  const assignedUserName = firstAssignment?.user?.displayName ?? null;
  const assignedUserAvatar = firstAssignment?.user?.avatarUrl ?? undefined;
  const additionalCount = assignments.length > 1 ? assignments.length - 1 : 0;

  const isMulti = isMultiMode || currentAssigneeIds.length > 1 || mode === "toggle";

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      m.user.displayName.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  if (!canEdit) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5",
          disabled && "opacity-60 cursor-not-allowed",
          className
        )}
        data-testid={`inline-assignee-cell-${task.id}`}
      >
        {assignedUserName ? (
          <div className="flex items-center gap-1.5 truncate max-w-[120px]">
            <Avatar name={assignedUserName} src={assignedUserAvatar} size="xs" />
            <span className="text-xs text-[var(--text-secondary)] truncate">
              {assignedUserName}
            </span>
            {additionalCount > 0 && (
              <span className="text-[10px] text-[var(--text-muted)] font-mono">
                +{additionalCount}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-[var(--text-muted)] italic">Unassigned</span>
        )}
      </div>
    );
  }

  const handleSelectMember = async (
    e: React.MouseEvent,
    userId: string | null
  ) => {
    e.stopPropagation();
    setError(null);

    let newAssigneeIds: string[];

    if (userId === null) {
      // Explicit unassignment
      newAssigneeIds = [];
      setIsMultiMode(false);
      setIsOpen(false);
    } else {
      const isAlreadyAssigned = currentAssigneeIds.includes(userId);

      if (isMulti) {
        if (isAlreadyAssigned) {
          // Toggle off: remove this assignee
          newAssigneeIds = currentAssigneeIds.filter((id) => id !== userId);
        } else {
          // Multi-assignee additive toggle: keep existing, add new member
          newAssigneeIds = [...currentAssigneeIds, userId];
        }
        // In multi mode, remain open for subsequent toggles
      } else {
        if (isAlreadyAssigned) {
          // Single mode clicking currently assigned member: unassign
          newAssigneeIds = [];
        } else {
          // Single replacement: replace with new member
          newAssigneeIds = [userId];
        }
        setIsOpen(false);
      }
    }

    try {
      if (onAssigneeChange) {
        await onAssigneeChange(newAssigneeIds);
        return;
      }

      await updateMutation.mutateAsync({
        communityId,
        workspaceId,
        taskId: task.id,
        data: {
          assigneeIds: newAssigneeIds,
          baseFieldRevisions: {
            assigneeIds: task.fieldRevisions?.assigneeIds ?? 1,
          },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update assignees");
    }
  };

  return (
    <div
      className="inline-flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
      data-testid={`inline-assignee-cell-${task.id}`}
    >
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (open) {
            setSearchQuery("");
            setError(null);
            setIsMultiMode(mode === "toggle" || currentAssigneeIds.length > 1);
          }
        }}
      >
        <PopoverTrigger
          data-testid={`inline-assignee-trigger-${task.id}`}
          onClick={(e) => {
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
            }
          }}
          className={cn(
            "inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs transition-colors cursor-pointer select-none",
            "focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] hover:bg-[var(--surface-muted)]",
            updateMutation.isPending && "opacity-70 animate-pulse",
            error && "ring-1 ring-[var(--status-danger-border)]",
            className
          )}
          aria-label={`Assignee: ${assignedUserName ?? "Unassigned"}. Click to change.`}
          title={error ?? undefined}
        >
          {assignedUserName ? (
            <>
              <Avatar name={assignedUserName} src={assignedUserAvatar} size="xs" />
              <span className="text-xs text-[var(--text-secondary)] truncate max-w-[110px]">
                {assignedUserName}
              </span>
              {additionalCount > 0 && (
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  +{additionalCount}
                </span>
              )}
            </>
          ) : (
            <>
              <User className="h-3 w-3 text-[var(--text-muted)] shrink-0" />
              <span className="text-xs text-[var(--text-muted)] italic">Unassigned</span>
            </>
          )}
          {error && (
            <AlertCircle className="h-3 w-3 text-[var(--status-danger-text)] shrink-0 ml-0.5" />
          )}
        </PopoverTrigger>

        <PopoverContent
          size="compact"
          align="start"
          sideOffset={4}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            role="dialog"
            aria-label="Assign task"
            className="flex flex-col gap-1 p-1 min-w-[180px] max-w-[240px]"
          >
            {/* Member Search */}
            <div className="relative flex items-center mb-1">
              <Search className="absolute left-2 h-3 w-3 text-[var(--text-muted)]" />
              <input
                type="text"
                data-testid="inline-assignee-search"
                aria-label="Search members"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-6 pr-2 py-1 rounded bg-[var(--surface-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
              />
            </div>

            {/* Explicit Multi-Assignee Mode Action (Option 3 requirement) */}
            {currentAssigneeIds.length === 1 && !isMulti && (
              <button
                type="button"
                data-testid="inline-assignee-add-another"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMultiMode(true);
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-[var(--brand-accent-text)] hover:bg-[var(--surface-muted)] cursor-pointer transition-colors text-left"
              >
                <UserPlus className="h-3 w-3" />
                <span>Add another assignee...</span>
              </button>
            )}

            {/* Unassigned button */}
            <button
              type="button"
              data-testid="inline-assignee-option-unassigned"
              onClick={(e) => handleSelectMember(e, null)}
              className={cn(
                "flex items-center justify-between px-2 py-1 rounded text-xs text-left transition-colors cursor-pointer",
                "hover:bg-[var(--surface-muted)] focus:bg-[var(--surface-muted)] focus:outline-none",
                currentAssigneeIds.length === 0 &&
                  "font-semibold text-[var(--brand-accent-text)] bg-[var(--surface-muted)]"
              )}
            >
              <div className="flex items-center gap-1.5">
                <UserX className="h-3 w-3 text-[var(--text-muted)]" />
                <span>Unassigned</span>
              </div>
              {currentAssigneeIds.length === 0 && <Check className="h-3 w-3 text-[var(--brand-accent-text)]" />}
            </button>

            {/* Members List */}
            <div className="max-h-48 overflow-y-auto space-y-0.5 border-t border-[var(--border-subtle)] pt-1">
              {isMembersLoading ? (
                <div className="flex items-center justify-center p-3 text-xs text-[var(--text-muted)] gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Loading members...</span>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-2 text-xs text-center text-[var(--text-muted)] italic">
                  No members found
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const isAssigned = currentAssigneeIds.includes(member.user.id);
                  return (
                    <button
                      key={member.user.id}
                      type="button"
                      data-testid={`inline-assignee-option-${member.user.id}`}
                      onClick={(e) => handleSelectMember(e, member.user.id)}
                      className={cn(
                        "flex items-center justify-between px-2 py-1 rounded text-xs text-left w-full transition-colors cursor-pointer",
                        "hover:bg-[var(--surface-muted)] focus:bg-[var(--surface-muted)] focus:outline-none",
                        isAssigned && "font-semibold text-[var(--brand-accent-text)] bg-[var(--surface-muted)]"
                      )}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {isMulti ? (
                          <div
                            className={cn(
                              "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                              isAssigned
                                ? "bg-[var(--brand-accent-btn-bg)] border-[var(--brand-accent-btn-bg)] text-white"
                                : "border-[var(--border-subtle)] bg-[var(--surface-canvas)]"
                            )}
                          >
                            {isAssigned && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </div>
                        ) : null}
                        <Avatar
                          name={member.user.displayName}
                          src={member.user.avatarUrl ?? undefined}
                          size="xs"
                        />
                        <span className="truncate">{member.user.displayName}</span>
                      </div>
                      {!isMulti && isAssigned && (
                        <Check className="h-3 w-3 shrink-0 ml-1 text-[var(--brand-accent-text)]" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Multi-assignee Done Footer */}
            {isMulti && (
              <div className="border-t border-[var(--border-subtle)] pt-1 mt-0.5 flex items-center justify-between px-1">
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {currentAssigneeIds.length} assigned
                </span>
                <button
                  type="button"
                  data-testid="inline-assignee-done"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="px-2 py-0.5 text-xs font-medium rounded bg-[var(--brand-accent-btn-bg)] text-white hover:opacity-90 cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
