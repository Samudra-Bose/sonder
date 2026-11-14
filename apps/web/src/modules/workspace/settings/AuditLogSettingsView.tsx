import React, { useState } from "react";
import { useParams } from "react-router-dom";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  FileDown,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  AlertTriangle,
  AlertOctagon,
  Lock,
  Hash,
  Search,
} from "lucide-react";
import { useWorkspace } from "@/modules/workspace/index.js";
import { useWorkspaceSettings } from "./useWorkspaceSettings.js";
import { canReadAuditLogs, canExportAuditLogs } from "./permissions.js";
import {
  useAuditEvents,
  useAuditIntegrityStatus,
  useExportAuditEvents,
} from "./useAuditLog.js";
import { sanitizeAuditMetadata } from "./auditExportCsv.js";
import type {
  AuditEventDto,
  AuditEventCategory,
} from "./types.js";

const CATEGORIES: { value: AuditEventCategory; label: string }[] = [
  { value: "WORKSPACE_GOVERNANCE", label: "Workspace Governance" },
  { value: "WORKSPACE_MEMBERSHIP", label: "Workspace Membership" },
  { value: "ROLE_AND_PERMISSION", label: "Roles & Permissions" },
  { value: "DATA_LIFECYCLE", label: "Data Lifecycle" },
  { value: "ACCESS_EXCEPTION", label: "Access Exceptions" },
  { value: "AUDIT_ACCESS", label: "Audit Access" },
  { value: "AUDIT_INTEGRITY", label: "Audit Integrity" },
  { value: "COMMUNITY_MEMBERSHIP", label: "Community Membership" },
  { value: "SECURITY", label: "Security" },
];

const SEVERITIES: ("INFO" | "WARNING" | "HIGH" | "CRITICAL")[] = [
  "INFO",
  "WARNING",
  "HIGH",
  "CRITICAL",
];

export const AuditLogSettingsView: React.FC = () => {
  const params = useParams<{ communityId?: string; workspaceId?: string }>();
  const { currentCommunityId, activeWorkspace } = useWorkspace();

  const communityId = params.communityId ?? currentCommunityId ?? "default-community";
  const workspaceId = params.workspaceId ?? activeWorkspace?.id ?? "default-workspace";

  const { data: workspaceData } = useWorkspaceSettings(communityId, workspaceId);
  const effectiveWorkspace = workspaceData ?? activeWorkspace;

  // Authorization Gates
  const canRead = canReadAuditLogs(effectiveWorkspace);
  const canExport = canExportAuditLogs(effectiveWorkspace);

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [targetIdQuery, setTargetIdQuery] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Pagination State
  const [pageHistory, setPageHistory] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const pageSize = 10;

  // Selected event for detail drawer
  const [selectedEvent, setSelectedEvent] = useState<AuditEventDto | null>(null);

  // Query audit events
  const queryParams = {
    limit: pageSize,
    cursor: currentCursor,
    actorId: searchQuery.trim() || undefined,
    targetId: targetIdQuery.trim() || undefined,
    categories:
      selectedCategory !== "ALL" ? [selectedCategory as AuditEventCategory] : undefined,
    severities:
      selectedSeverity !== "ALL"
        ? [selectedSeverity as "INFO" | "WARNING" | "HIGH" | "CRITICAL"]
        : undefined,
    from: fromDate ? new Date(fromDate).toISOString() : undefined,
    to: toDate ? new Date(toDate).toISOString() : undefined,
  };

  const {
    data: auditPage,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAuditEvents(communityId, workspaceId, queryParams, {
    enabled: canRead,
  });

  // Query community audit-chain integrity status
  const { data: integrityStatus } = useAuditIntegrityStatus(communityId, {
    enabled: canRead,
  });

  // Export hook
  const { exportAuditEvents, isExporting, exportError, resetExportError } =
    useExportAuditEvents(communityId, workspaceId);

  // Handler for Export CSV
  const handleExport = async () => {
    if (!canExport || isExporting) return;
    try {
      await exportAuditEvents({
        actorId: searchQuery.trim() || undefined,
        targetId: targetIdQuery.trim() || undefined,
        categories:
          selectedCategory !== "ALL" ? [selectedCategory as AuditEventCategory] : undefined,
        severities:
          selectedSeverity !== "ALL"
            ? [selectedSeverity as "INFO" | "WARNING" | "HIGH" | "CRITICAL"]
            : undefined,
        from: fromDate ? new Date(fromDate).toISOString() : undefined,
        to: toDate ? new Date(toDate).toISOString() : undefined,
      });
    } catch {
      // Error handled by hook
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSelectedCategory("ALL");
    setSelectedSeverity("ALL");
    setSearchQuery("");
    setTargetIdQuery("");
    setFromDate("");
    setToDate("");
    setCurrentCursor(undefined);
    setPageHistory([]);
  };

  // Next Page
  const handleNextPage = () => {
    if (auditPage?.nextCursor) {
      setPageHistory((prev) => [...prev, currentCursor || ""]);
      setCurrentCursor(auditPage.nextCursor);
    }
  };

  // Prev Page
  const handlePrevPage = () => {
    if (pageHistory.length > 0) {
      const prevCursor = pageHistory[pageHistory.length - 1];
      setPageHistory((prev) => prev.slice(0, -1));
      setCurrentCursor(prevCursor || undefined);
    }
  };

  // 1. Permission Denied State
  if (!canRead) {
    return (
      <div
        className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4"
        data-testid="audit-log-permission-denied"
      >
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Access Restricted</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You do not have permission to view audit logs for this workspace. The{" "}
            <code className="text-xs font-mono font-bold bg-muted px-1.5 py-0.5 rounded-sm">
              audit:read
            </code>{" "}
            capability is required (Workspace Owners and Coordinators).
          </p>
          {effectiveWorkspace?.myRole && (
            <p className="text-xs text-muted-foreground pt-1">
              Current workspace role:{" "}
              <span className="font-semibold text-foreground">{effectiveWorkspace.myRole}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  // Format timestamp
  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
    } catch {
      return iso;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[11px] font-semibold bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900">
            <AlertOctagon className="w-3 h-3" />
            CRITICAL
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[11px] font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200 dark:border-orange-900">
            <AlertTriangle className="w-3 h-3" />
            HIGH
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
            <AlertTriangle className="w-3 h-3" />
            WARNING
          </span>
        );
      case "INFO":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[11px] font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Info className="w-3 h-3" />
            INFO
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" data-testid="audit-log-settings-view">
      {/* Top Banner: Overview and Server Integrity Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-border bg-card">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Append-Only Audit Log
            </h2>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Shield className="w-3 h-3" />
              Cryptographic Hash-Chain
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tamper-evident record of workspace administrative, role, and data events. Every
            entry is cryptographically linked using SHA-256 hashes.
          </p>
        </div>

        {/* Server Cryptographic Verification Status Pill */}
        <div className="flex flex-col items-start md:items-end gap-1 shrink-0">
          <div
            data-testid="audit-integrity-badge"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border ${
              integrityStatus?.status === "HEALTHY"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                : integrityStatus?.status === "VERIFYING"
                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                : integrityStatus?.status === "DEGRADED"
                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                : integrityStatus?.status === "FAILED"
                ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            {integrityStatus?.status === "HEALTHY" ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            )}
            <span>
              {integrityStatus?.status === "HEALTHY"
                ? "Mock / Server-Reported: Hash-Chain Verified"
                : integrityStatus?.status === "VERIFYING"
                ? "Server-Reported: Verifying Integrity..."
                : integrityStatus?.status === "DEGRADED"
                ? "Server-Reported: Integrity Degraded"
                : integrityStatus?.status === "FAILED"
                ? "Server-Reported: Verification Failed"
                : "Server-Reported: Status Pending"}
            </span>
            {integrityStatus?.verifiedThroughSequence && (
              <span className="font-mono text-[10px] opacity-80">
                (Seq #{integrityStatus.verifiedThroughSequence})
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">
            Mock/server-reported status • Authoritative verification enforced by backend service
          </span>
        </div>
      </div>

      {/* Export Error Alert */}
      {exportError && (
        <div className="flex items-center justify-between p-3 text-xs rounded-lg border border-destructive/40 bg-destructive/10 text-destructive">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 shrink-0" />
            <span>Export failed: {exportError}</span>
          </div>
          <button
            type="button"
            onClick={resetExportError}
            className="p-1 hover:bg-destructive/20 rounded-xs"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filters & Actions Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Filter: Actor ID */}
          <div className="flex items-center gap-1.5 relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter Actor ID..."
              data-testid="audit-search-filter"
              aria-label="Filter Actor ID"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentCursor(undefined);
                setPageHistory([]);
              }}
              className="text-xs h-8 pl-7 pr-2.5 rounded-md border border-input bg-background text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring w-32 sm:w-40"
            />
          </div>

          {/* Filter: Target ID */}
          <div className="flex items-center gap-1.5 relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter Target ID..."
              data-testid="audit-target-filter"
              aria-label="Filter Target ID"
              value={targetIdQuery}
              onChange={(e) => {
                setTargetIdQuery(e.target.value);
                setCurrentCursor(undefined);
                setPageHistory([]);
              }}
              className="text-xs h-8 pl-7 pr-2.5 rounded-md border border-input bg-background text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring w-32 sm:w-40"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="category-filter" className="text-xs font-medium text-muted-foreground">
              Category:
            </label>
            <select
              id="category-filter"
              data-testid="audit-category-filter"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentCursor(undefined);
                setPageHistory([]);
              }}
              className="text-xs h-8 px-2.5 rounded-md border border-input bg-background text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="severity-filter" className="text-xs font-medium text-muted-foreground">
              Severity:
            </label>
            <select
              id="severity-filter"
              data-testid="audit-severity-filter"
              value={selectedSeverity}
              onChange={(e) => {
                setSelectedSeverity(e.target.value);
                setCurrentCursor(undefined);
                setPageHistory([]);
              }}
              className="text-xs h-8 px-2.5 rounded-md border border-input bg-background text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Severities</option>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range: From */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="audit-from-date" className="text-xs font-medium text-muted-foreground">
              From:
            </label>
            <input
              id="audit-from-date"
              type="date"
              data-testid="audit-date-from"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentCursor(undefined);
                setPageHistory([]);
              }}
              className="text-xs h-8 px-2 rounded-md border border-input bg-background text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Date Range: To */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="audit-to-date" className="text-xs font-medium text-muted-foreground">
              To:
            </label>
            <input
              id="audit-to-date"
              type="date"
              data-testid="audit-date-to"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentCursor(undefined);
                setPageHistory([]);
              }}
              className="text-xs h-8 px-2 rounded-md border border-input bg-background text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Reset Filters */}
          {(selectedCategory !== "ALL" ||
            selectedSeverity !== "ALL" ||
            searchQuery.trim() !== "" ||
            fromDate ||
            toDate) && (
            <button
              type="button"
              data-testid="audit-reset-filters-btn"
              onClick={handleResetFilters}
              className="text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {/* Right Actions: Refresh & CSV Export */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="audit-refresh-btn"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background hover:bg-accent text-foreground transition-colors disabled:opacity-50"
            title="Refresh Events"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>

          {/* CSV Export Button */}
          <button
            type="button"
            data-testid="audit-export-csv-btn"
            onClick={handleExport}
            disabled={!canExport || isExporting}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              !canExport
                ? "Requires 'audit:export' capability (Workspace Owner only)"
                : "Export matching audit events as UTF-8 CSV"
            }
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
          </button>
        </div>
      </div>

      {/* Audit Log Table Container */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Loading State */}
        {isLoading && (
          <div
            className="p-12 text-center text-sm text-muted-foreground animate-pulse"
            data-testid="audit-log-loading"
          >
            Loading audit events...
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div
            className="p-8 text-center space-y-3"
            data-testid="audit-log-error"
          >
            <p className="text-sm text-destructive">
              Failed to load audit events: {error?.message}
            </p>
            <button
              type="button"
              data-testid="audit-log-retry-btn"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-input bg-background hover:bg-accent text-foreground font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && auditPage?.items.length === 0 && (
          <div
            className="p-12 text-center space-y-2"
            data-testid="audit-log-empty"
          >
            <Shield className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <h3 className="text-sm font-semibold text-foreground">No Audit Events Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No audit events match the current filter criteria for this workspace.
            </p>
          </div>
        )}

        {/* Table View */}
        {!isLoading && !isError && auditPage && auditPage.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" data-testid="audit-log-table">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                <tr>
                  <th className="py-2.5 px-3 w-16">Seq #</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Target</th>
                  <th className="py-2.5 px-3">Hash</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditPage.items.map((event) => (
                  <tr
                    key={event.id}
                    data-testid={`audit-event-row-${event.id}`}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono font-semibold text-foreground">
                      #{event.communitySequence}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(event.occurredAt)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-[11px] font-semibold text-foreground">
                        {event.eventType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] text-muted-foreground">
                        {event.category.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">{getSeverityBadge(event.severity)}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                      {event.actorId.slice(0, 8)}...
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-muted-foreground">
                      {event.targetType ? (
                        <span>
                          <span className="font-medium text-foreground">{event.targetType}</span>
                          {event.targetId && (
                            <span className="font-mono ml-1 opacity-70">
                              ({event.targetId.slice(0, 8)}...)
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                      <span title={`SHA-256: ${event.entryHash}`}>
                        {event.entryHash.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        data-testid={`audit-event-detail-btn-${event.id}`}
                        onClick={() => setSelectedEvent(event)}
                        className="inline-flex items-center text-xs text-primary hover:underline font-medium"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer: Snapshot Sequence & Pagination Controls */}
        {!isLoading && !isError && auditPage && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Snapshot Head:</span>
              <span className="font-mono font-semibold text-foreground">
                Seq #{auditPage.snapshotSequence}
              </span>
              <span>•</span>
              <span>Showing {auditPage.items.length} records</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="audit-prev-page-btn"
                onClick={handlePrevPage}
                disabled={pageHistory.length === 0 || isFetching}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-input bg-background text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                type="button"
                data-testid="audit-next-page-btn"
                onClick={handleNextPage}
                disabled={!auditPage.nextCursor || isFetching}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-input bg-background text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Event Detail Drawer / Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          data-testid="audit-event-detail-drawer"
        >
          <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Audit Event #{selectedEvent.communitySequence}
                  </h3>
                  <p className="font-mono text-xs text-muted-foreground">{selectedEvent.id}</p>
                </div>
              </div>
              <button
                type="button"
                data-testid="audit-detail-close-btn"
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Core Event Fields */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border space-y-1">
                <span className="text-muted-foreground">Event Type</span>
                <p className="font-mono font-semibold text-foreground">{selectedEvent.eventType}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border space-y-1">
                <span className="text-muted-foreground">Category</span>
                <p className="font-medium text-foreground">{selectedEvent.category}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border space-y-1">
                <span className="text-muted-foreground">Severity</span>
                <div>{getSeverityBadge(selectedEvent.severity)}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border space-y-1">
                <span className="text-muted-foreground">Timestamp</span>
                <p className="text-foreground">{formatTimestamp(selectedEvent.occurredAt)}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border space-y-1">
                <span className="text-muted-foreground">Actor ID</span>
                <p className="font-mono text-foreground">{selectedEvent.actorId}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border space-y-1">
                <span className="text-muted-foreground">Target</span>
                <p className="font-medium text-foreground">
                  {selectedEvent.targetType ?? "None"}{" "}
                  {selectedEvent.targetId && (
                    <span className="font-mono text-[11px] block text-muted-foreground">
                      {selectedEvent.targetId}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Cryptographic Hash Chain Block */}
            <div className="space-y-2 p-3.5 rounded-lg border border-border bg-muted/20">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Hash className="w-3.5 h-3.5 text-primary" />
                <span>Cryptographic Hash-Chain Verification</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div>
                  <span className="text-muted-foreground block text-[10px] font-sans">
                    Hash Algorithm:
                  </span>
                  <span className="text-foreground font-semibold">
                    {selectedEvent.hashAlgorithm}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] font-sans">
                    Current Entry Hash:
                  </span>
                  <div className="p-2 rounded-sm bg-background border border-border break-all text-[11px] text-foreground">
                    {selectedEvent.entryHash}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] font-sans">
                    Previous Entry Hash:
                  </span>
                  <div className="p-2 rounded-sm bg-background border border-border break-all text-[11px] text-muted-foreground">
                    {selectedEvent.previousEntryHash ?? "Genesis Event (0000...)"}
                  </div>
                </div>
              </div>
            </div>

            {/* Non-Content Allow-Listed Metadata */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-foreground">
                Metadata (Allow-Listed Facts)
              </span>
              <pre className="p-3.5 rounded-lg border border-border bg-muted/40 font-mono text-xs overflow-x-auto text-foreground">
                {JSON.stringify(sanitizeAuditMetadata(selectedEvent.metadata), null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
