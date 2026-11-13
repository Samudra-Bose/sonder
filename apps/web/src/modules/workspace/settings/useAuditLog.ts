import { useState } from "react";
import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/useAuth.js";
import {
  fetchWorkspaceAuditEvents,
  exportWorkspaceAuditEventsApi,
  fetchAuditIntegrityStatus,
  type AuditEventQueryParams,
} from "./api.js";
import type {
  AuditEventPageDto,
  AuditEventExportRequest,
  AuditIntegrityStatusDto,
} from "./types.js";
import { triggerCsvDownload } from "./auditExportCsv.js";

export function useAuditEvents(
  communityId: string | null | undefined,
  workspaceId: string | null | undefined,
  query?: AuditEventQueryParams,
  options?: { enabled?: boolean }
) {
  return useQuery<AuditEventPageDto>({
    queryKey: [
      "communities",
      communityId,
      "workspaces",
      workspaceId,
      "audit-events",
      query,
    ],
    queryFn: async () => {
      if (!communityId || !workspaceId) {
        return { items: [], nextCursor: null, snapshotSequence: 0 };
      }
      return fetchWorkspaceAuditEvents(communityId, workspaceId, query);
    },
    enabled: Boolean(communityId && workspaceId && (options?.enabled ?? true)),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useAuditIntegrityStatus(
  communityId: string | null | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery<AuditIntegrityStatusDto>({
    queryKey: ["communities", communityId, "audit-integrity"],
    queryFn: async () => {
      if (!communityId) {
        return {
          status: "UNKNOWN",
          currentHeadSequence: 0,
          verifiedThroughSequence: 0,
          lastVerifiedAt: null,
          externalCheckpointSequence: null,
        };
      }
      return fetchAuditIntegrityStatus(communityId);
    },
    enabled: Boolean(communityId && (options?.enabled ?? true)),
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useExportAuditEvents(
  communityId: string | null | undefined,
  workspaceId: string | null | undefined
) {
  const { csrfToken } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (request: AuditEventExportRequest) => {
      if (!communityId || !workspaceId) {
        throw new Error("Community and Workspace IDs are required for audit export.");
      }
      if (!csrfToken) {
        throw new Error("CSRF token is required for audit export.");
      }
      setIsExporting(true);
      setExportError(null);
      return exportWorkspaceAuditEventsApi(communityId, workspaceId, request, csrfToken);
    },
    onSuccess: (csvData) => {
      setIsExporting(false);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `audit-log-${workspaceId}-${timestamp}.csv`;
      triggerCsvDownload(csvData, filename);
    },
    onError: (err: Error) => {
      setIsExporting(false);
      setExportError(err.message || "Failed to export audit events.");
    },
  });

  return {
    exportAuditEvents: mutation.mutateAsync,
    isExporting: isExporting || mutation.isPending,
    exportError: exportError || (mutation.error?.message ?? null),
    resetExportError: () => {
      setExportError(null);
      mutation.reset();
    },
  };
}
