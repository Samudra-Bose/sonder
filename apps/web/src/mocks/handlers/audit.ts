import { http, HttpResponse, delay } from "msw";
import type { ApiSchema } from "@sonder/contracts";
import {
  getMockAuditEvents,
  getMockAuditIntegrity,
  resetMockAuditState,
} from "../data/audit.js";
import { findMockWorkspace } from "../data/workspaces.js";
import type { WorkspaceDto } from "@/modules/workspace/types.js";
import type {
  AuditEventExportRequest,
  AuditEventPageDto,
} from "@/modules/workspace/settings/types.js";
import { generateAuditEventsCsv } from "@/modules/workspace/settings/auditExportCsv.js";
import { evaluateAuthorization } from "@/lib/authorization.js";
import { initialMockWorkspaceRoles } from "../data/roles.js";

let auditDelayMs = 0;
let auditErrorOverride: {
  status: number;
  problem: ApiSchema<"Problem">;
  method?: string;
} | null = null;

export function setMockAuditDelay(ms: number): void {
  auditDelayMs = ms;
}

export function setMockAuditError(
  error: { status: number; problem: ApiSchema<"Problem">; method?: string } | null
): void {
  auditErrorOverride = error;
}

export { resetMockAuditState };

/**
 * Checks if actor possesses the required audit capability.
 * Strictly enforces: effectiveCapabilities = callerCapabilities ∩ previewRoleCapabilities (FEAT-G02b, FEAT-G03).
 */
function hasAuditCapability(
  communityId: string,
  workspaceId: string,
  capability: "audit:read" | "audit:export",
  previewRoleId?: string | null
): boolean {
  // 1. Resolve workspace within community boundary
  const ws = findMockWorkspace(workspaceId, communityId) as
    | (WorkspaceDto & { effectiveCapabilities?: string[] })
    | undefined;

  if (!ws) return false;

  // 2. Evaluate authorization using canonical intersection engine
  // effectiveCapabilities = callerCapabilities ∩ previewRoleCapabilities
  const result = evaluateAuthorization({
    callerCapabilities: ws.effectiveCapabilities,
    previewRoleId,
    availableRoles: initialMockWorkspaceRoles,
    requiredCapability: capability,
  });

  return result.allowed;
}

export const auditHandlers = [
  // 1. GET /api/v1/communities/:communityId/workspaces/:workspaceId/audit-events
  http.get(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/audit-events",
    async ({ params, request }) => {
      if (auditDelayMs > 0) {
        await delay(auditDelayMs);
      }

      if (
        auditErrorOverride &&
        (!auditErrorOverride.method || auditErrorOverride.method === "GET")
      ) {
        return HttpResponse.json(auditErrorOverride.problem, {
          status: auditErrorOverride.status,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      const { communityId, workspaceId } = params as {
        communityId: string;
        workspaceId: string;
      };

      const ws = findMockWorkspace(workspaceId, communityId);
      if (!ws) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/not-found",
            title: "Workspace Not Found",
            status: 404,
            detail: `Workspace '${workspaceId}' not found in community '${communityId}'.`,
            code: "RESOURCE_NOT_FOUND",
          },
          { status: 404, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      const previewRoleId = request.headers.get("X-Preview-Role-Id");

      if (!hasAuditCapability(communityId, workspaceId, "audit:read", previewRoleId)) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/forbidden",
            title: "Forbidden",
            status: 403,
            detail: "Caller lacks required 'audit:read' capability for this workspace.",
            code: "FORBIDDEN",
          },
          {
            status: 403,
            headers: { "Content-Type": "application/problem+json" },
          }
        );
      }

      const url = new URL(request.url);
      const categoryParams = url.searchParams.getAll("categories");
      const severityParams = url.searchParams.getAll("severities");
      const eventTypeParams = url.searchParams.getAll("eventTypes");
      const actorId = url.searchParams.get("actorId");
      const targetId = url.searchParams.get("targetId");
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const cursor = url.searchParams.get("cursor");
      const limit = parseInt(url.searchParams.get("limit") || "10", 10);

      // Workspace Isolation: Only retrieve events strictly matching this workspaceId
      let events = getMockAuditEvents().filter((e) => e.workspaceId === workspaceId);

      // Filtering
      if (categoryParams.length > 0) {
        events = events.filter((e) => categoryParams.includes(e.category));
      }
      if (severityParams.length > 0) {
        events = events.filter((e) => severityParams.includes(e.severity));
      }
      if (eventTypeParams.length > 0) {
        events = events.filter((e) => eventTypeParams.includes(e.eventType));
      }
      if (actorId) {
        const query = actorId.toLowerCase();
        events = events.filter((e) => e.actorId.toLowerCase().includes(query));
      }
      if (targetId) {
        const query = targetId.toLowerCase();
        events = events.filter((e) => e.targetId && e.targetId.toLowerCase().includes(query));
      }
      if (from) {
        events = events.filter((e) => e.occurredAt >= from);
      }
      if (to) {
        events = events.filter((e) => e.occurredAt < to);
      }

      // Order: occurredAt DESC, communitySequence DESC
      events.sort((a, b) => {
        const timeDiff = new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
        if (timeDiff !== 0) return timeDiff;
        return b.communitySequence - a.communitySequence;
      });

      // Cursor pagination
      let startIndex = 0;
      if (cursor) {
        const cursorSeq = parseInt(cursor, 10);
        if (!isNaN(cursorSeq)) {
          const foundIdx = events.findIndex((e) => e.communitySequence <= cursorSeq);
          if (foundIdx >= 0) {
            startIndex = foundIdx;
          }
        }
      }

      const paginatedItems = events.slice(startIndex, startIndex + limit);
      const hasMore = startIndex + limit < events.length;
      const nextCursor = hasMore
        ? String(paginatedItems[paginatedItems.length - 1]?.communitySequence)
        : null;

      const responseBody: AuditEventPageDto = {
        items: paginatedItems,
        nextCursor,
        snapshotSequence: 12,
      };

      return HttpResponse.json(responseBody, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
        },
      });
    }
  ),

  // 2. POST /api/v1/communities/:communityId/workspaces/:workspaceId/audit-events/export
  http.post(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/audit-events/export",
    async ({ params, request }) => {
      if (auditDelayMs > 0) {
        await delay(auditDelayMs);
      }

      if (
        auditErrorOverride &&
        (!auditErrorOverride.method || auditErrorOverride.method === "POST")
      ) {
        return HttpResponse.json(auditErrorOverride.problem, {
          status: auditErrorOverride.status,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      const previewRoleId = request.headers.get("X-Preview-Role-Id");

      const { communityId, workspaceId } = params as {
        communityId: string;
        workspaceId: string;
      };

      const ws = findMockWorkspace(workspaceId, communityId);
      if (!ws) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/not-found",
            title: "Workspace Not Found",
            status: 404,
            detail: `Workspace '${workspaceId}' not found in community '${communityId}'.`,
            code: "RESOURCE_NOT_FOUND",
          },
          { status: 404, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      // Check audit:export capability (evaluates previewRoleId if active simulation is in effect)
      if (!hasAuditCapability(communityId, workspaceId, "audit:export", previewRoleId)) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/forbidden",
            title: "Forbidden",
            status: 403,
            detail: "Caller lacks required 'audit:export' capability for this workspace.",
            code: "FORBIDDEN",
          },
          {
            status: 403,
            headers: { "Content-Type": "application/problem+json" },
          }
        );
      }

      let body: AuditEventExportRequest = {};
      try {
        body = (await request.json()) as AuditEventExportRequest;
      } catch {
        // empty body ok
      }

      // Workspace Isolation: Only retrieve events strictly matching this workspaceId
      let events = getMockAuditEvents().filter((e) => e.workspaceId === workspaceId);

      if (body.categories && body.categories.length > 0) {
        events = events.filter((e) => body.categories!.includes(e.category));
      }
      if (body.severities && body.severities.length > 0) {
        events = events.filter((e) => body.severities!.includes(e.severity));
      }
      if (body.eventTypes && body.eventTypes.length > 0) {
        events = events.filter((e) => body.eventTypes!.includes(e.eventType));
      }
      if (body.actorId) {
        const query = body.actorId.toLowerCase();
        events = events.filter((e) => e.actorId.toLowerCase().includes(query));
      }
      if (body.targetId) {
        const query = body.targetId.toLowerCase();
        events = events.filter((e) => e.targetId && e.targetId.toLowerCase().includes(query));
      }
      if (body.from) {
        events = events.filter((e) => e.occurredAt >= body.from!);
      }
      if (body.to) {
        events = events.filter((e) => e.occurredAt < body.to!);
      }

      // Order: occurredAt DESC, communitySequence DESC
      events.sort((a, b) => {
        const timeDiff = new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
        if (timeDiff !== 0) return timeDiff;
        return b.communitySequence - a.communitySequence;
      });

      const csvContent = generateAuditEventsCsv(events);

      return new HttpResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="audit-log-${workspaceId}.csv"`,
          "Cache-Control": "private, no-store",
          "X-Idempotent-Replayed": "false",
        },
      });
    }
  ),

  // 3. GET /api/v1/communities/:communityId/admin/audit-integrity
  http.get(
    "/api/v1/communities/:communityId/admin/audit-integrity",
    async () => {
      if (auditDelayMs > 0) {
        await delay(auditDelayMs);
      }

      if (
        auditErrorOverride &&
        (!auditErrorOverride.method || auditErrorOverride.method === "GET")
      ) {
        return HttpResponse.json(auditErrorOverride.problem, {
          status: auditErrorOverride.status,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      const integrity = getMockAuditIntegrity();
      return HttpResponse.json(integrity, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
        },
      });
    }
  ),
];
