import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { WorkspaceProvider } from "@/modules/workspace/WorkspaceContext.js";
import { WorkspaceSettingsLayout } from "./WorkspaceSettingsLayout.js";
import { resetWorkspaceMockState } from "@/mocks/handlers/workspaces.js";
import { resetMockAuditState } from "@/mocks/handlers/audit.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import { WS_SHARED_ENG_ID, WS_SHARED_GALA_ID } from "@/mocks/data/my-work.js";
import {
  escapeCsvCell,
  generateAuditEventsCsv,
  sanitizeAuditMetadata,
} from "./auditExportCsv.js";
import type { AuditEventDto } from "./types.js";
import { canReadAuditLogs, canExportAuditLogs } from "./permissions.js";

const testUser = {
  id: "018f98a2-3f12-7890-a123-456789abcdef",
  displayName: "Alex Morgan",
  email: "alex.morgan@example.org",
  avatarUrl: null,
};

function createMockAuth(overrides?: Partial<AuthContextType>): AuthContextType {
  return {
    user: testUser,
    communities: defaultMockCommunities,
    csrfToken: "test-csrf-token",
    status: "authenticated",
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  };
}

function renderAuditSettings({
  initialRoute = `/c/018f98a2-3f12-7890-b123-456789abcdef/w/${WS_SHARED_ENG_ID}/settings/audit`,
  workspaceId = WS_SHARED_ENG_ID,
  communityId = "018f98a2-3f12-7890-b123-456789abcdef",
  authOverrides,
}: {
  initialRoute?: string;
  workspaceId?: string;
  communityId?: string;
  authOverrides?: Partial<AuthContextType>;
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const authValue = createMockAuth(authOverrides);

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <WorkspaceProvider
          initialCommunityId={communityId}
          initialWorkspaceId={workspaceId}
        >
          <MemoryRouter initialEntries={[initialRoute]}>
            <Routes>
              <Route
                path="/c/:communityId/w/:workspaceId/settings"
                element={<WorkspaceSettingsLayout />}
              />
              <Route
                path="/c/:communityId/w/:workspaceId/settings/:category"
                element={<WorkspaceSettingsLayout />}
              />
              <Route
                path="/workspaces/:workspaceId/settings/:category"
                element={<WorkspaceSettingsLayout />}
              />
            </Routes>
          </MemoryRouter>
        </WorkspaceProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("VS-09J: Append-Only Hash-Chained Audit Log Table & CSV Export (FEAT-G04)", () => {
  beforeEach(() => {
    resetWorkspaceMockState();
    resetMockAuditState();
  });

  describe("1. Rendering & Layout", () => {
    it("renders the Audit Log tab in navigation and loads the audit log view", async () => {
      renderAuditSettings();

      const auditTab = screen.getByTestId("settings-tab-audit");
      expect(auditTab).toBeInTheDocument();
      expect(auditTab).toHaveAttribute("aria-current", "page");

      expect(await screen.findByTestId("audit-log-settings-view")).toBeInTheDocument();
      expect(screen.getByText("Append-Only Audit Log")).toBeInTheDocument();
      expect(await screen.findByTestId("audit-log-table")).toBeInTheDocument();
    });

    it("displays the authoritative server-verified cryptographic hash-chain status", async () => {
      renderAuditSettings();

      const integrityBadge = await screen.findByTestId("audit-integrity-badge");
      expect(integrityBadge).toBeInTheDocument();
      await waitFor(() => {
        expect(integrityBadge).toHaveTextContent("Hash-Chain Verified");
        expect(integrityBadge).toHaveTextContent("Seq #12");
      });
      expect(
        screen.getByText(/Authoritative verification/i)
      ).toBeInTheDocument();
    });

    it("renders audit events ordered by sequence and occurredAt descending", async () => {
      renderAuditSettings();

      const table = await screen.findByTestId("audit-log-table");
      expect(table).toBeInTheDocument();

      // Events for WS_SHARED_ENG_ID (latest is seq 11)
      const row11 = screen.getByTestId("audit-event-row-018f98a2-3f12-7890-ae11-456789abcdef");
      expect(row11).toBeInTheDocument();
      expect(within(row11).getByText("#11")).toBeInTheDocument();
      expect(within(row11).getByText("WORKSPACE_MEMBER_ADDED")).toBeInTheDocument();
    });
  });

  describe("2. Filtering & Search", () => {
    it("filters events by Category", async () => {
      const user = userEvent.setup();
      renderAuditSettings();

      await screen.findByTestId("audit-log-table");

      const categoryFilter = screen.getByTestId("audit-category-filter");
      await user.selectOptions(categoryFilter, "ROLE_AND_PERMISSION");

      await waitFor(() => {
        expect(screen.queryByText("WORKSPACE_SETTINGS_CHANGED")).not.toBeInTheDocument();
        expect(screen.getByText("WORKSPACE_MEMBER_ROLE_CHANGED")).toBeInTheDocument();
        expect(screen.getByText("CUSTOM_ROLE_CREATED")).toBeInTheDocument();
      });
    });

    it("filters events by Severity", async () => {
      const user = userEvent.setup();
      renderAuditSettings();

      await screen.findByTestId("audit-log-table");

      const severityFilter = screen.getByTestId("audit-severity-filter");
      await user.selectOptions(severityFilter, "CRITICAL");

      await waitFor(() => {
        expect(screen.getByText("BREAK_GLASS_GRANTED")).toBeInTheDocument();
        expect(screen.queryByText("WORKSPACE_CREATED")).not.toBeInTheDocument();
      });
    });

    it("filters events by Search input (Actor ID)", async () => {
      const user = userEvent.setup();
      renderAuditSettings();

      await screen.findByTestId("audit-log-table");

      const searchInput = screen.getByTestId("audit-search-filter");
      // Search for Jordan's events (MOCK_ACTOR_JORDAN = "...bbcdef")
      await user.type(searchInput, "bbcdef");

      await waitFor(() => {
        expect(screen.getByText("WORKSPACE_MEMBER_ROLE_CHANGED")).toBeInTheDocument();
        expect(screen.queryByText("WORKSPACE_CREATED")).not.toBeInTheDocument();
      });
    });

    it("resets filters when clicking the Reset button", async () => {
      const user = userEvent.setup();
      renderAuditSettings();

      await screen.findByTestId("audit-log-table");

      const severityFilter = screen.getByTestId("audit-severity-filter");
      await user.selectOptions(severityFilter, "CRITICAL");

      const resetBtn = await screen.findByTestId("audit-reset-filters-btn");
      await user.click(resetBtn);

      await waitFor(() => {
        expect(screen.getByText("#11")).toBeInTheDocument();
        expect(screen.queryByTestId("audit-reset-filters-btn")).not.toBeInTheDocument();
      });
    });
  });

  describe("3. Event Details Drawer & Cryptographic Verification", () => {
    it("opens the event detail drawer displaying full SHA-256 hash-chain and allow-listed metadata", async () => {
      const user = userEvent.setup();
      renderAuditSettings();

      await screen.findByTestId("audit-log-table");

      // Click Details for event 11
      const detailBtn = screen.getByTestId(
        "audit-event-detail-btn-018f98a2-3f12-7890-ae11-456789abcdef"
      );
      await user.click(detailBtn);

      const drawer = await screen.findByTestId("audit-event-detail-drawer");
      expect(drawer).toBeInTheDocument();
      expect(within(drawer).getByText("Audit Event #11")).toBeInTheDocument();

      // Check SHA-256 hash algorithm and full entry hash
      expect(within(drawer).getByText("SHA-256")).toBeInTheDocument();
      expect(
        within(drawer).getByText("86efb9d919aae90df6d9453ea25d6e5f068425753ef4c8a5d8737df4be40c37e")
      ).toBeInTheDocument();
      expect(
        within(drawer).getByText("e27c95fe8cf455885f1aed8a9171bbbf99832af4681ff5fa64ebf583b0c12171")
      ).toBeInTheDocument();

      // Non-content allow-listed facts (roleId, membershipId)
      expect(within(drawer).getByText(/018f98a2-3f12-7890-role-viewer-004/)).toBeInTheDocument();

      // Close drawer
      const closeBtn = screen.getByTestId("audit-detail-close-btn");
      await user.click(closeBtn);
      expect(screen.queryByTestId("audit-event-detail-drawer")).not.toBeInTheDocument();
    });
  });

  describe("4. Workspace Isolation", () => {
    it("excludes events from other workspaces when viewing a workspace", async () => {
      renderAuditSettings({ workspaceId: WS_SHARED_ENG_ID });

      await screen.findByTestId("audit-log-table");
      // In Engineering Platform (WS_SHARED_ENG_ID), Gala event (Seq #12) must NOT be present
      expect(screen.queryByText("#12")).not.toBeInTheDocument();
      expect(screen.getByText("#11")).toBeInTheDocument();
    });

    it("displays only workspace-scoped events when viewing Gala Planning", async () => {
      renderAuditSettings({
        workspaceId: WS_SHARED_GALA_ID,
        initialRoute: `/c/018f98a2-3f12-7890-b123-456789abcdef/w/${WS_SHARED_GALA_ID}/settings/audit`,
      });

      await screen.findByTestId("audit-log-table");
      // Seq #12 was recorded in Gala Planning
      expect(screen.getByText("#12")).toBeInTheDocument();
      // And Engineering Platform events like Seq #11 must NOT appear in Gala Planning
      expect(screen.queryByText("#11")).not.toBeInTheDocument();
    });
  });

  describe("5. Permission Model: Separation of audit:read and audit:export", () => {
    it("allows OWNER to both read and export audit events", async () => {
      renderAuditSettings({ workspaceId: WS_SHARED_ENG_ID }); // User is OWNER in ENG

      await screen.findByTestId("audit-log-table");

      const exportBtn = screen.getByTestId("audit-export-csv-btn");
      expect(exportBtn).toBeInTheDocument();
      expect(exportBtn).not.toBeDisabled();
      expect(exportBtn).toHaveTextContent("Export CSV");
    });

    it("allows COORDINATOR to read audit events but DISALLOWS export (export button disabled)", async () => {
      renderAuditSettings({
        workspaceId: WS_SHARED_GALA_ID, // User is COORDINATOR in GALA
        initialRoute: `/c/018f98a2-3f12-7890-b123-456789abcdef/w/${WS_SHARED_GALA_ID}/settings/audit`,
      });

      // Coordinator CAN read audit logs
      await screen.findByTestId("audit-log-table");

      // But Coordinator LACKS audit:export capability -> Export button must be disabled
      const exportBtn = screen.getByTestId("audit-export-csv-btn");
      expect(exportBtn).toBeInTheDocument();
      expect(exportBtn).toBeDisabled();
      expect(exportBtn).toHaveAttribute(
        "title",
        expect.stringContaining("audit:export")
      );
    });

    it("evaluates permission helper functions strictly against authoritative effectiveCapabilities and fails closed when absent", () => {
      // Missing or unpopulated effectiveCapabilities must strictly FAIL CLOSED even if myRole is set
      const ownerWithoutCaps = { id: "ws-1", myRole: "OWNER" } as any;
      expect(canReadAuditLogs(ownerWithoutCaps)).toBe(false);
      expect(canExportAuditLogs(ownerWithoutCaps)).toBe(false);

      // Workspace with authoritative Owner capabilities
      const ownerWs = {
        id: "ws-1",
        myRole: "OWNER",
        effectiveCapabilities: ["audit:read", "audit:export", "task:read"],
      } as any;
      expect(canReadAuditLogs(ownerWs)).toBe(true);
      expect(canExportAuditLogs(ownerWs)).toBe(true);

      // Workspace with authoritative Coordinator capabilities (has read, lacks export)
      const coordWs = {
        id: "ws-2",
        myRole: "COORDINATOR",
        effectiveCapabilities: ["audit:read", "task:read"],
      } as any;
      expect(canReadAuditLogs(coordWs)).toBe(true);
      expect(canExportAuditLogs(coordWs)).toBe(false);

      // Workspace with Member capabilities (lacks both)
      const memberWs = {
        id: "ws-3",
        myRole: "MEMBER",
        effectiveCapabilities: ["task:read", "task:create"],
      } as any;
      expect(canReadAuditLogs(memberWs)).toBe(false);
      expect(canExportAuditLogs(memberWs)).toBe(false);

      // Workspace with Viewer capabilities (lacks both)
      const viewerWs = {
        id: "ws-4",
        myRole: "VIEWER",
        effectiveCapabilities: ["task:read"],
      } as any;
      expect(canReadAuditLogs(viewerWs)).toBe(false);
      expect(canExportAuditLogs(viewerWs)).toBe(false);

      // Fails closed on null/undefined/empty
      expect(canReadAuditLogs(null)).toBe(false);
      expect(canExportAuditLogs(null)).toBe(false);
      expect(canReadAuditLogs({ id: "ws-5", effectiveCapabilities: [] } as any)).toBe(false);
      expect(canExportAuditLogs({ id: "ws-5", effectiveCapabilities: [] } as any)).toBe(false);
    });

    it("evaluates role preview simulation capability independently for export without breaking ordinary export", async () => {
      // Simulate Coordinator role (lacks audit:export) -> export returns 403 Forbidden
      const coordExportRes = await fetch(
        `/api/v1/communities/018f98a2-3f12-7890-b123-456789abcdef/workspaces/${WS_SHARED_ENG_ID}/audit-events/export`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Preview-Role-Id": "018f98a2-3f12-7890-role-coord-002",
            "X-CSRF-Token": "test-csrf-token",
          },
          body: JSON.stringify({}),
        }
      );
      expect(coordExportRes.status).toBe(403);
      const coordErr = await coordExportRes.json();
      expect(coordErr.detail).toContain("audit:export");

      // Simulate Owner role (has audit:export) -> export succeeds
      const ownerExportRes = await fetch(
        `/api/v1/communities/018f98a2-3f12-7890-b123-456789abcdef/workspaces/${WS_SHARED_ENG_ID}/audit-events/export`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Preview-Role-Id": "018f98a2-3f12-7890-role-owner-001",
            "X-CSRF-Token": "test-csrf-token",
          },
          body: JSON.stringify({}),
        }
      );
      expect(ownerExportRes.status).toBe(200);
      const csvText = await ownerExportRes.text();
      expect(csvText).toContain("Sequence");
      expect(csvText).toContain("Occurred At");
    });
  });

  describe("6. CSV Generation & Formula Injection Protections", () => {
    it("generates CSV with UTF-8 BOM and RFC 4180 headers", () => {
      const mockEvent: AuditEventDto = {
        id: "evt-001",
        communityId: "comm-001",
        communitySequence: 1,
        workspaceId: "ws-001",
        eventType: "WORKSPACE_CREATED",
        category: "WORKSPACE_GOVERNANCE",
        occurredAt: "2026-02-01T08:00:00Z",
        severity: "INFO",
        actorId: "actor-001",
        targetType: "WORKSPACE",
        targetId: "ws-001",
        metadata: { reasonCode: "ACCOUNT_RECOVERY" },
        previousEntryHash: null,
        entryHash: "abc123hash",
        hashAlgorithm: "SHA-256",
      };

      const csv = generateAuditEventsCsv([mockEvent]);

      // Starts with UTF-8 BOM
      expect(csv.startsWith("\uFEFF")).toBe(true);

      // Check header columns
      const lines = csv.slice(1).split("\r\n");
      const headers = lines[0]!.split(",");
      expect(headers).toContain("Sequence");
      expect(headers).toContain("Occurred At");
      expect(headers).toContain("Event Type");
      expect(headers).toContain("Algorithm");
      expect(headers).toContain("Entry Hash");
      expect(headers).toContain("Previous Hash");
    });

    it("mitigates OWASP spreadsheet formula injection by prefixing dangerous characters with a single quote", () => {
      expect(escapeCsvCell("=SUM(A1:A10)")).toBe(`"'=SUM(A1:A10)"`);
      expect(escapeCsvCell("+12345")).toBe(`"'+12345"`);
      expect(escapeCsvCell("-100")).toBe(`"'-100"`);
      expect(escapeCsvCell("@username")).toBe(`"'@username"`);
      expect(escapeCsvCell("\tcmd")).toBe(`"'\tcmd"`);
      expect(escapeCsvCell("\rcmd")).toBe(`"'\rcmd"`);
    });

    it("escapes quotes, commas, and newlines per RFC 4180", () => {
      expect(escapeCsvCell('Hello "World"')).toBe('"Hello ""World"""');
      expect(escapeCsvCell("Name, Title")).toBe('"Name, Title"');
      expect(escapeCsvCell("Line1\nLine2")).toBe('"Line1\nLine2"');
      expect(escapeCsvCell(null)).toBe("");
      expect(escapeCsvCell(undefined)).toBe("");
      expect(escapeCsvCell(42)).toBe("42");
    });

    it("sanitizes audit metadata to strictly allow-listed non-content fields (CR-14)", () => {
      const dirtyMetadata = {
        roleId: "018f98a2-role-1",
        membershipId: "018f98a2-mem-1",
        changedFields: ["status"],
        // Malicious or leaked content
        password: "cleartext-password",
        userEmail: "victim@example.com",
        taskTitle: "Secret Task Title",
        taskDescription: "Sensitive project details",
        authToken: "secret-token-xyz",
      };

      const clean = sanitizeAuditMetadata(dirtyMetadata);

      // Allow-listed facts preserved
      expect(clean.roleId).toBe("018f98a2-role-1");
      expect(clean.membershipId).toBe("018f98a2-mem-1");
      expect(clean.changedFields).toEqual(["status"]);

      // Content and credential leaks stripped
      expect(clean).not.toHaveProperty("password");
      expect(clean).not.toHaveProperty("userEmail");
      expect(clean).not.toHaveProperty("taskTitle");
      expect(clean).not.toHaveProperty("taskDescription");
      expect(clean).not.toHaveProperty("authToken");
    });
  });

  describe("7. Append-Only Immutability", () => {
    it("ensures zero mutation or deletion controls exist on the audit view", async () => {
      renderAuditSettings();

      await screen.findByTestId("audit-log-table");

      // No edit, delete, remove, clear, or modify buttons should exist anywhere
      expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /clear/i })).not.toBeInTheDocument();
    });
  });
});
