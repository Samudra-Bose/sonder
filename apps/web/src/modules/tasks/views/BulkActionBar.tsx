import React from "react";
import {
  Archive,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/Button.js";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/DropdownMenu.js";
import { cn } from "@/lib/utils.js";
import type { TaskStatusCategory, TaskPriority } from "../types.js";

export interface BulkActionBarProps {
  selectedCount: number;
  totalCount?: number;
  maxLimit?: number;
  onClearSelection: () => void;
  onArchive: () => void;
  onStatusChange: (status: TaskStatusCategory) => void;
  onPriorityChange: (priority: TaskPriority) => void;
  isMutating?: boolean;
  className?: string;
}

const STATUS_OPTIONS: Array<{ value: TaskStatusCategory; label: string }> = [
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "DONE", label: "Done" },
  { value: "BACKLOG", label: "Backlog" },
  { value: "CANCELED", label: "Canceled" },
];

const PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string }> = [
  { value: "URGENT", label: "Urgent" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
  { value: "NONE", label: "None" },
];

export function BulkActionBar({
  selectedCount,
  totalCount,
  maxLimit = 100,
  onClearSelection,
  onArchive,
  onStatusChange,
  onPriorityChange,
  isMutating = false,
  className,
}: BulkActionBarProps): React.JSX.Element | null {
  if (selectedCount <= 0) {
    return null;
  }

  const isAtLimit = selectedCount >= maxLimit;

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions toolbar"
      data-testid="bulk-action-bar"
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-40",
        "bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-2xl rounded-xl",
        "px-4 py-2.5 flex items-center gap-3 backdrop-blur-md select-none",
        "animate-in fade-in slide-in-from-bottom-4 duration-200",
        className
      )}
    >
      {/* Selection Count & Limit Badge */}
      <div className="flex items-center gap-2 pr-2 border-r border-[var(--border-subtle)]">
        <span
          data-testid="bulk-selected-count"
          className="text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap"
        >
          {selectedCount} selected
          {totalCount !== undefined ? ` of ${totalCount}` : ""}
        </span>
        {isAtLimit && (
          <span
            data-testid="bulk-limit-badge"
            className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 whitespace-nowrap"
          >
            Max {maxLimit}
          </span>
        )}
      </div>

      {/* Action: Bulk Status */}
      <DropdownMenu>
        <DropdownMenuTrigger
          data-testid="bulk-status-trigger"
          disabled={isMutating}
          className="h-8 px-2.5 inline-flex items-center gap-1.5 text-xs font-medium rounded-md bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] focus-ring transition-colors cursor-pointer disabled:opacity-50"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          <span>Status</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={6} className="w-36 z-50">
          {STATUS_OPTIONS.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              data-testid={`bulk-status-option-${opt.value}`}
              onClick={() => onStatusChange(opt.value)}
            >
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Action: Bulk Priority */}
      <DropdownMenu>
        <DropdownMenuTrigger
          data-testid="bulk-priority-trigger"
          disabled={isMutating}
          className="h-8 px-2.5 inline-flex items-center gap-1.5 text-xs font-medium rounded-md bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] focus-ring transition-colors cursor-pointer disabled:opacity-50"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          <span>Priority</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={6} className="w-36 z-50">
          {PRIORITY_OPTIONS.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              data-testid={`bulk-priority-option-${opt.value}`}
              onClick={() => onPriorityChange(opt.value)}
            >
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Action: Bulk Archive */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isMutating}
        data-testid="bulk-archive-button"
        onClick={onArchive}
        className="gap-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 border-amber-500/30"
      >
        <Archive className="h-3.5 w-3.5" />
        <span>Archive</span>
      </Button>

      {/* Clear / Deselect Button */}
      <button
        type="button"
        onClick={onClearSelection}
        aria-label="Clear selection"
        data-testid="bulk-clear-selection"
        className="h-7 w-7 rounded-md inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-ring transition-colors cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
