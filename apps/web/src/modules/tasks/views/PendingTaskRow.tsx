import React from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge.js";
import { cn } from "@/lib/utils.js";
import type { PendingTaskItem } from "../InlineCreationRow.js";
import type { TaskStatusCategory } from "../types.js";

function formatStatus(status: TaskStatusCategory): string {
  switch (status) {
    case "BACKLOG":
      return "Backlog";
    case "TODO":
      return "To Do";
    case "IN_PROGRESS":
      return "In Progress";
    case "DONE":
      return "Done";
    case "CANCELED":
      return "Canceled";
    default:
      return status;
  }
}

export interface PendingTaskRowProps {
  pendingTask: PendingTaskItem;
  className?: string;
}

/**
 * Temporary, non-interactive visual row representation for an in-flight task creation.
 * Rendered strictly while the server-authoritative creation mutation is unresolved.
 * Never masquerades as a canonical TaskDto and exposes zero edit controls or drawer opens.
 */
export function PendingTaskRow({
  pendingTask,
  className,
}: PendingTaskRowProps): React.JSX.Element {
  return (
    <tr
      data-testid="task-list-pending-row"
      role="row"
      aria-label={`Creating task: ${pendingTask.title}`}
      className={cn(
        "opacity-60 bg-[var(--surface-muted)]/40 select-none cursor-default border-b border-[var(--border-subtle)] transition-opacity",
        className
      )}
    >
      {/* 1. Selection column: subtle loading spinner */}
      <td className="py-2.5 px-3 w-10 text-center" aria-hidden="true">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--brand-accent-text)] mx-auto" />
      </td>

      {/* 2. Key column: Pending badge indicator */}
      <td className="py-2.5 px-3 w-28 font-mono font-medium text-[var(--text-muted)] text-[11px]">
        <span
          data-testid="pending-task-badge"
          className="inline-flex items-center px-1.5 py-0.5 rounded bg-[var(--surface-muted)] text-[10px] font-semibold text-[var(--text-muted)] tracking-wider uppercase"
        >
          Pending
        </span>
      </td>

      {/* 3. Title column: pending task title */}
      <td className="py-2.5 px-3 min-w-[200px]">
        <div className="flex items-center gap-2">
          <span
            className="font-medium text-[var(--text-secondary)] italic line-clamp-1"
            data-testid="pending-task-title"
          >
            {pendingTask.title}
          </span>
        </div>
      </td>

      {/* 4. Status column: pending category if specified */}
      <td className="py-2.5 px-3 w-32">
        {pendingTask.statusCategory ? (
          <Badge status={pendingTask.statusCategory} className="opacity-70">
            {formatStatus(pendingTask.statusCategory)}
          </Badge>
        ) : (
          <span className="text-[var(--text-muted)] text-xs">—</span>
        )}
      </td>

      {/* 5. Assignee column */}
      <td className="py-2.5 px-3 w-32">
        <span className="text-xs text-[var(--text-muted)] italic">Unassigned</span>
      </td>

      {/* 6. Priority column */}
      <td className="py-2.5 px-3 w-28">
        <span className="text-xs text-[var(--text-muted)]">—</span>
      </td>

      {/* 7. Due Date column */}
      <td className="py-2.5 px-3 w-32">
        <span className="text-xs text-[var(--text-muted)]">—</span>
      </td>

      {/* 8. Subtasks column */}
      <td className="py-2.5 px-3 w-24 text-center text-[var(--text-muted)]">
        {pendingTask.parentTaskId ? (
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--surface-muted)]">
            child
          </span>
        ) : (
          <span className="text-[var(--text-muted)] text-[11px]">—</span>
        )}
      </td>

      {/* 9. Actions column */}
      <td className="py-2.5 px-3 w-10 text-right">
        <span className="sr-only">Creating task</span>
      </td>
    </tr>
  );
}
