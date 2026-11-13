/**
 * Audit Log UTF-8 CSV Export Utility (FEAT-G04 / VS-09J)
 *
 * Implements RFC 4180-compliant CSV generation with:
 * - Full UTF-8 support with UTF-8 BOM (\uFEFF) for Microsoft Excel, Apple Numbers, and Google Sheets compatibility.
 * - OWASP formula-injection mitigation: sanitizes cells starting with '=', '+', '-', '@', '\t', or '\r' by prepending a single quote.
 * - RFC 4180 escaping for quotes, commas, and newlines.
 * - Authoritative columns for immutable audit verification.
 * - Browser download triggering.
 */

import type { AuditEventDto } from "./types.js";

export interface AuditCsvColumn {
  id: string;
  header: string;
  accessor: (event: AuditEventDto) => string | number | null | undefined;
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

export const AUDIT_CSV_COLUMNS: AuditCsvColumn[] = [
  { id: "communitySequence", header: "Sequence", accessor: (e) => e.communitySequence },
  { id: "occurredAt", header: "Occurred At", accessor: (e) => e.occurredAt },
  { id: "eventType", header: "Event Type", accessor: (e) => e.eventType },
  { id: "category", header: "Category", accessor: (e) => e.category },
  { id: "severity", header: "Severity", accessor: (e) => e.severity },
  { id: "actorId", header: "Actor ID", accessor: (e) => e.actorId },
  { id: "targetType", header: "Target Type", accessor: (e) => e.targetType ?? "" },
  { id: "targetId", header: "Target ID", accessor: (e) => e.targetId ?? "" },
  { id: "hashAlgorithm", header: "Algorithm", accessor: (e) => e.hashAlgorithm },
  { id: "entryHash", header: "Entry Hash", accessor: (e) => e.entryHash },
  { id: "previousEntryHash", header: "Previous Hash", accessor: (e) => e.previousEntryHash ?? "" },
  {
    id: "metadata",
    header: "Metadata",
    accessor: (e) => (e.metadata && Object.keys(e.metadata).length > 0 ? JSON.stringify(e.metadata) : ""),
  },
];

/**
 * Generates an RFC 4180-compliant CSV string from audit events,
 * prefixed with UTF-8 BOM (\uFEFF) and sanitized against formula injection.
 */
export function generateAuditEventsCsv(
  events: AuditEventDto[],
  columns: AuditCsvColumn[] = AUDIT_CSV_COLUMNS
): string {
  const headerRow = columns.map((col) => escapeCsvCell(col.header)).join(",");
  const dataRows = events.map((event) =>
    columns.map((col) => escapeCsvCell(col.accessor(event))).join(",")
  );

  return "\uFEFF" + [headerRow, ...dataRows].join("\r\n");
}

/**
 * Triggers a browser download of the CSV content.
 */
export function triggerCsvDownload(csvContent: string, filename: string): void {
  // Ensure the BOM is present for Excel/Sheets compatibility if not already included
  const contentWithBom = csvContent.startsWith("\uFEFF") ? csvContent : `\uFEFF${csvContent}`;
  const blob = new Blob([contentWithBom], { type: "text/csv;charset=utf-8;" });

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
