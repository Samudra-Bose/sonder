/**
 * Filtered View UTF-8 CSV Export Utility (FEAT-J01a / VS-09F)
 *
 * Implements RFC 4180-compliant CSV generation with:
 * - Full UTF-8 support with UTF-8 BOM (\uFEFF) for Microsoft Excel, Apple Numbers, and Google Sheets compatibility.
 * - OWASP formula-injection mitigation: sanitizes cells starting with '=', '+', '-', '@', '\t', or '\r'.
 * - RFC 4180 escaping for commas, double quotes, and newlines.
 * - Cursor pagination traversal to export all matching records across pages, preserving filters and sorting.
 * - Safe browser download triggering.
 */

import { queryWorkspaceTasks } from "./api.js";
import type { TaskDto, ViewQuerySpec } from "./types.js";
import type { WorkspaceDto } from "@/modules/workspace/types.js";

export interface TaskCsvColumn {
  id: string;
  header: string;
  accessor: (task: TaskDto) => string | number | null | undefined;
}

/**
 * Evaluates whether the actor has permission to export tasks from the workspace.
 * Requires `task:read` capability. Fails closed on missing workspace data.
 */
export function canExportTasks(workspace: WorkspaceDto | null | undefined): boolean {
  if (!workspace) return false;
  if (workspace.effectiveCapabilities && workspace.effectiveCapabilities.length > 0) {
    return workspace.effectiveCapabilities.includes("task:read");
  }
  if (workspace.myRole) {
    // Standard workspace roles (OWNER, COORDINATOR, MEMBER, VIEWER) have task:read
    return true;
  }
  return false;
}

/**
 * Sanitizes and escapes a single CSV cell value according to RFC 4180
 * and OWASP spreadsheet formula injection prevention guidelines.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let str = String(value);

  // OWASP Formula injection mitigation:
  // If a string starts with '=', '+', '-', '@', '\t', or '\r',
  // prepend a single quote to prevent spreadsheet applications from executing formulas.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // RFC 4180 escaping:
  // If the cell contains quotes, commas, newlines, carriage returns, or starts with a single quote
  // (from formula sanitization), or has leading/trailing whitespace, enclose in double quotes.
  const needsQuotes = /["',\n\r]/.test(str) || /^\s|\s$/.test(str) || str.startsWith("'");

  if (needsQuotes) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Standard contract-approved columns for task CSV export.
 */
export const DEFAULT_TASK_CSV_COLUMNS: TaskCsvColumn[] = [
  { id: "taskKey", header: "Task Key", accessor: (t) => t.taskKey },
  { id: "title", header: "Title", accessor: (t) => t.title },
  { id: "itemType", header: "Archetype", accessor: (t) => t.itemType },
  { id: "statusCategory", header: "Status", accessor: (t) => t.statusCategory },
  { id: "priority", header: "Priority", accessor: (t) => t.priority },
  { id: "startDate", header: "Start Date", accessor: (t) => t.startDate ?? "" },
  { id: "dueDate", header: "Due Date", accessor: (t) => t.dueDate ?? "" },
  {
    id: "estimatePoints",
    header: "Estimate Points",
    accessor: (t) => (t.estimatePoints != null ? t.estimatePoints : ""),
  },
  { id: "parentTaskId", header: "Parent Task ID", accessor: (t) => t.parentTaskId ?? "" },
  {
    id: "assigneeIds",
    header: "Assignees",
    accessor: (t) => (t.assigneeIds && t.assigneeIds.length > 0 ? t.assigneeIds.join("; ") : ""),
  },
  {
    id: "labelIds",
    header: "Labels",
    accessor: (t) => (t.labelIds && t.labelIds.length > 0 ? t.labelIds.join("; ") : ""),
  },
  { id: "description", header: "Description", accessor: (t) => t.description ?? "" },
  { id: "createdAt", header: "Created At", accessor: (t) => t.createdAt },
  { id: "updatedAt", header: "Updated At", accessor: (t) => t.updatedAt },
];

/**
 * Generates an RFC 4180-compliant UTF-8 CSV string with BOM from an array of tasks.
 */
export function generateTasksCsv(
  tasks: TaskDto[],
  columns: TaskCsvColumn[] = DEFAULT_TASK_CSV_COLUMNS
): string {
  // UTF-8 Byte Order Mark (BOM) to signal UTF-8 encoding to Excel and spreadsheet tools
  const BOM = "\uFEFF";

  const headerRow = columns.map((col) => escapeCsvCell(col.header)).join(",");
  const dataRows = tasks.map((task) =>
    columns.map((col) => escapeCsvCell(col.accessor(task))).join(",")
  );

  return BOM + [headerRow, ...dataRows].join("\r\n");
}

export interface FetchAllTasksForExportParams {
  communityId: string;
  workspaceId: string;
  querySpec: ViewQuerySpec;
  csrfToken?: string;
  maxPages?: number;
}

/**
 * Fetches all matching tasks for the active querySpec by traversing cursor pagination.
 * Ensures the entire filtered dataset is exported rather than merely the currently visible page.
 * Recovers once from QUERY_SNAPSHOT_EXPIRED (409) if the snapshot expires mid-traversal.
 */
export async function fetchAllTasksForExport({
  communityId,
  workspaceId,
  querySpec,
  csrfToken,
  maxPages = 50,
}: FetchAllTasksForExportParams): Promise<TaskDto[]> {
  const allTasks: TaskDto[] = [];
  let currentCursor: string | undefined = undefined;
  let pageCount = 0;
  let restartCount = 0;

  while (pageCount < maxPages) {
    try {
      const response = await queryWorkspaceTasks({
        communityId,
        workspaceId,
        csrfToken,
        query: {
          projection: "LIST",
          pageScope: "PRIMARY",
          cursor: currentCursor,
          limit: 200,
          querySpec: {
            ...querySpec,
            subtaskMode: "NESTED",
          },
        },
      });

      allTasks.push(...response.items);
      pageCount++;

      if (response.nextCursor) {
        currentCursor = response.nextCursor;
      } else {
        break;
      }
    } catch (error: unknown) {
      const err = error as { code?: string; status?: number };
      if (
        (err?.code === "QUERY_SNAPSHOT_EXPIRED" || err?.status === 409) &&
        restartCount === 0 &&
        pageCount > 0
      ) {
        restartCount++;
        allTasks.length = 0;
        pageCount = 0;
        currentCursor = undefined;
        continue;
      }
      throw error;
    }
  }

  return allTasks;
}

/**
 * Triggers a browser download of the CSV content.
 */
export function triggerCsvDownload(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  if (
    typeof window !== "undefined" &&
    typeof window.URL !== "undefined" &&
    typeof window.URL.createObjectURL === "function"
  ) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
  }
}
