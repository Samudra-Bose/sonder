import React, { useState, useMemo } from "react";
import { User, UserX, Check, Search, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar.js";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover.js";
import { cn } from "@/lib/utils.js";
import { useWorkspaceMembers } from "@/modules/workspace/settings/useWorkspaceSettings.js";
import { useUpdateTask } from "../useUpdateTask.js";
import type { TaskDto } from "../types.js";

export interface InlineAssigneeCellProps {
  task: Pick<TaskDto, "id" | "assigneeIds" | "assigneeAssignments"> & {
    effectivePermissions?: {
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
  onAssigneeChange?: (newAssigneeIds: string[]) => Promise<void> | void;
}

export function InlineAssigneeCell({
  task,
  communityId,
  workspaceId,
  isArchived = false,
  disabled = false,
  className,
  onAssigneeChange,
}: InlineAssigneeCellProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const updateMutation = useUpdateTask();

  const { data: membersData, isLoading: isMembersLoading } = useWorkspaceMembers(communityId, workspaceId);
  const members = useMemo(() => membersData?.items ?? [], [membersData]);

  const canEdit = !disabled && !isArchived && (task.effectivePermissions?.canAssignTask ?? true);

  const assignments = task.assigneeAssignments ?? [];
  const firstAssignment = assignments[0];
  const assignedUserId = task.assigneeIds?.[0] ?? firstAssignment?.userId ?? null;
  const assignedUserName = firstAssignment?.user?.displayName ?? null;
  const assignedUserAvatar = firstAssignment?.user?.avatarUrl ?? undefined;
  const additionalCount = assignments.length > 1 ? assignments.length - 1 : 0;

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
    setIsOpen(false);

    const newAssigneeIds = userId ? [userId] : [];

    if (
      (userId === null && (!task.assigneeIds || task.assigneeIds.length === 0)) ||
      (userId !== null && task.assigneeIds?.length === 1 && task.assigneeIds[0] === userId)
    ) {
      return;
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
    } catch {
      // Optimistic update rollback handled by useUpdateTask
    }
  };

  return (
    <div
      className="inline-flex items-center"
      onClick={(e) => e.stopPropagation()}
      data-testid={`inline-assignee-cell-${task.id}`}
    >
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (open) setSearchQuery("");
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
            className
          )}
          aria-label={`Assignee: ${assignedUserName ?? "Unassigned"}. Click to change.`}
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

            {/* Unassigned button */}
            <button
              type="button"
              data-testid="inline-assignee-option-unassigned"
              onClick={(e) => handleSelectMember(e, null)}
              className={cn(
                "flex items-center justify-between px-2 py-1 rounded text-xs text-left transition-colors cursor-pointer",
                "hover:bg-[var(--surface-muted)] focus:bg-[var(--surface-muted)] focus:outline-none",
                !assignedUserId && "font-semibold text-[var(--brand-accent-text)] bg-[var(--surface-muted)]"
              )}
            >
              <div className="flex items-center gap-1.5">
                <UserX className="h-3 w-3 text-[var(--text-muted)]" />
                <span>Unassigned</span>
              </div>
              {!assignedUserId && <Check className="h-3 w-3" />}
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
                  const isSelected = assignedUserId === member.user.id;
                  return (
                    <button
                      key={member.user.id}
                      type="button"
                      data-testid={`inline-assignee-option-${member.user.id}`}
                      onClick={(e) => handleSelectMember(e, member.user.id)}
                      className={cn(
                        "flex items-center justify-between px-2 py-1 rounded text-xs text-left w-full transition-colors cursor-pointer",
                        "hover:bg-[var(--surface-muted)] focus:bg-[var(--surface-muted)] focus:outline-none",
                        isSelected && "font-semibold text-[var(--brand-accent-text)] bg-[var(--surface-muted)]"
                      )}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Avatar
                          name={member.user.displayName}
                          src={member.user.avatarUrl ?? undefined}
                          size="xs"
                        />
                        <span className="truncate">{member.user.displayName}</span>
                      </div>
                      {isSelected && <Check className="h-3 w-3 shrink-0 ml-1" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
