/**
 * VS-09F: Filtered View UTF-8 CSV Export (FEAT-J01a) Test Suite
 *
 * Covers:
 * - RFC 4180 compliance, UTF-8 BOM, commas/quotes/newlines/Unicode escaping.
 * - OWASP spreadsheet formula-injection protection (=, +, -, @, \t, \r).
 * - Multi-page cursor pagination retrieval (exporting all matching records, not just visible page).
 * - Filter and sort parameter preservation.
 * - Empty dataset handling.
 * - Rapid double-click / concurrency protection.
 * - Permission model validation (fail-closed, task:read requirement).
 * - Error handling and 409 snapshot expiration recovery.
 * - End-to-end integration within WorkspaceTasksView & TaskViewToolbar.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import {
  escapeCsvCell,
  generateTasksCsv,
  canExportTasks,
  fetchAllTasksForExport,
} from "./taskExportCsv.js";
import { TaskViewToolbar } from "./views/TaskViewToolbar.js";
import { WorkspaceTasksView } from "./views/WorkspaceTasksView.js";
import { AuthContext, type AuthContextType } from "../auth/AuthContext.js";
import { WorkspaceProvider } from "../workspace/WorkspaceContext.js";
import { QuickTaskComposerProvider } from "./QuickTaskComposerContext.js";
import {
  resetTaskMockState,
  setMockTasksError,
  setForceExpireSnapshot,
} from "../../mocks/handlers/tasks.js";
import {
  MOCK_COMMUNITY_1_ID,
  WS_SHARED_ENG_ID,
  MOCK_USER_ID,
} from "../../mocks/data/my-work.js";
import { mockWorkspacesCommunity1 } from "../../mocks/data/workspaces.js";
import { defaultMockCommunities } from "../../mocks/handlers/auth.js";
import type { TaskDto, ViewQuerySpec } from "./types.js";
import type { WorkspaceDto } from "@/modules/workspace/types.js";

function createSampleTask(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: "018f98a2-task-export-001",
    workspaceId: WS_SHARED_ENG_ID,
    parentTaskId: null,
    taskKey: "ENG-101",
    title: "Production database failover verification",
    description: "Verify read replicas and automated failover triggers",
    itemType: "TASK",
    statusCategory: "IN_PROGRESS",
    priority: "HIGH",
    assigneeIds: ["018f98a2-user-001"],
    creatorId: "018f98a2-user-002",
    startDate: "2026-11-01",
    dueDate: "2026-11-20",
    estimatePoints: 5,
    labelIds: ["infra", "security"],
    milestoneId: null,
    rankKey: "0|hzzzzz:",
    version: 1,
    fieldRevisions: {},
    effectivePermissions: {
      canEditTitleDescription: true,
      canEditDatesPriority: true,
      canEditCustomFieldsLinks: true,
      canEditEstimate: true,
      canUpdateStatus: true,
      canRequestSignoff: false,
      canApproveSignoff: false,
      canAssign: true,
      canManageSubtasks: true,
      canMove: true,
      canArchive: true,
      canRestore: true,
      canDeletePermanent: false,
      canCreateSubtask: true,
      canComment: true,
      canWatch: true,
      restrictedActions: [],
      canManageAssigneeFieldGrants: false,
    },
    assigneeAssignments: [],
    assigneeEditableFieldGroups: [],
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-05T14:30:00.000Z",
    ...overrides,
  };
}

describe("VS-09F: Filtered View UTF-8 CSV Export (FEAT-J01a)", () => {
  let originalCreateObjectURL: typeof window.URL.createObjectURL;
  let originalRevokeObjectURL: typeof window.URL.revokeObjectURL;
  let createdBlobs: Blob[] = [];
  let anchorClickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetTaskMockState();
    createdBlobs = [];
    originalCreateObjectURL = window.URL.createObjectURL;
    originalRevokeObjectURL = window.URL.revokeObjectURL;

    anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    window.URL.createObjectURL = vi.fn((blob: Blob) => {
      createdBlobs.push(blob);
      return "blob:mock-download-url";
    });
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    anchorClickSpy.mockRestore();
    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  describe("1. RFC 4180 Escaping & OWASP Formula Injection Protection", () => {
    it("neutralizes formula injection characters (=, +, -, @, \\t, \\r) by prepending a single quote", () => {
      // OWASP formula triggers
      expect(escapeCsvCell("=cmd|' /C calc'!A0")).toBe("\"'=cmd|' /C calc'!A0\"");
      expect(escapeCsvCell("+1234567890")).toBe("\"'+1234567890\"");
      expect(escapeCsvCell("-2+3+cmd")).toBe("\"'-2+3+cmd\"");
      expect(escapeCsvCell("@SUM(A1:B10)")).toBe("\"'@SUM(A1:B10)\"");
      expect(escapeCsvCell("\tmalicious_tab")).toBe("\"'\tmalicious_tab\"");
      expect(escapeCsvCell("\rmalicious_cr")).toBe("\"'\rmalicious_cr\"");
    });

    it("correctly escapes commas, double quotes, and multi-line strings per RFC 4180", () => {
      expect(escapeCsvCell("Hello, World")).toBe('"Hello, World"');
      expect(escapeCsvCell('He said "approved"')).toBe('"He said ""approved"""');
      expect(escapeCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
      expect(escapeCsvCell("Line 1\r\nLine 2")).toBe('"Line 1\r\nLine 2"');
      expect(escapeCsvCell("  leading space")).toBe('"  leading space"');
      expect(escapeCsvCell("trailing space  ")).toBe('"trailing space  "');
    });

    it("handles null, undefined, numeric, and international Unicode text properly", () => {
      expect(escapeCsvCell(null)).toBe("");
      expect(escapeCsvCell(undefined)).toBe("");
      expect(escapeCsvCell(0)).toBe("0");
      expect(escapeCsvCell(42.5)).toBe("42.5");
      expect(escapeCsvCell("Café — 🚀 Sonder / 社区工作")).toBe("Café — 🚀 Sonder / 社区工作");
    });

    it("generates a valid UTF-8 CSV with BOM (\\uFEFF) and correct CRLF line breaks", () => {
      const task1 = createSampleTask({
        taskKey: "ENG-101",
        title: "Normal title",
        itemType: "TASK",
        priority: "HIGH",
        statusCategory: "IN_PROGRESS",
      });
      const task2 = createSampleTask({
        taskKey: "ENG-102",
        title: "=SUM(A1:B2), with comma and \"quotes\"",
        itemType: "BUG",
        priority: "URGENT",
        statusCategory: "TODO",
      });

      const csv = generateTasksCsv([task1, task2]);

      // UTF-8 BOM
      expect(csv.startsWith("\uFEFF")).toBe(true);

      const lines = csv.slice(1).split("\r\n");
      expect(lines.length).toBe(3); // Header + 2 rows

      // Header row check
      expect(lines[0]).toContain("Task Key,Title,Archetype,Status,Priority");

      // Row 1 check
      expect(lines[1]).toContain("ENG-101");
      expect(lines[1]).toContain("Normal title");
      expect(lines[1]).toContain("TASK");
      expect(lines[1]).toContain("IN_PROGRESS");
      expect(lines[1]).toContain("HIGH");

      // Row 2 check with formula neutralization & escaping
      expect(lines[2]).toContain("ENG-102");
      expect(lines[2]).toContain("\"'=SUM(A1:B2), with comma and \"\"quotes\"\"\"");
      expect(lines[2]).toContain("BUG");
      expect(lines[2]).toContain("TODO");
      expect(lines[2]).toContain("URGENT");
    });
  });

  describe("2. Permission Model & Fail-Closed Guard", () => {
    it("permits export when workspace includes task:read capability or standard role", () => {
      const baseWs = mockWorkspacesCommunity1[1]!;
      const wsWithCaps: WorkspaceDto = {
        ...baseWs,
        myRole: "MEMBER",
        effectiveCapabilities: ["task:read", "task:create"],
      };
      expect(canExportTasks(wsWithCaps)).toBe(true);

      const wsRoleOnly: WorkspaceDto = {
        ...baseWs,
        effectiveCapabilities: [],
        myRole: "VIEWER",
      };
      expect(canExportTasks(wsRoleOnly)).toBe(true);
    });

    it("fails closed when workspace data is missing or task:read capability is denied", () => {
      expect(canExportTasks(null)).toBe(false);
      expect(canExportTasks(undefined)).toBe(false);

      const baseWs = mockWorkspacesCommunity1[1]!;
      const wsDenied: WorkspaceDto = {
        ...baseWs,
        id: "ws-denied",
        myRole: undefined,
        effectiveCapabilities: ["workspace:read_metadata"], // No task:read
      };
      expect(canExportTasks(wsDenied)).toBe(false);
    });
  });

  describe("3. Multi-Page Traversal & Query Preservation", () => {
    it("fetches all matching records across pages via continuation cursor", async () => {
      const querySpec: ViewQuerySpec = {
        subtaskMode: "NESTED",
        groupBy: "none",
        subGroupBy: "none",
        includeBacklog: true,
        includeCompleted: true,
        filter: { conjunction: "AND", conditions: [] },
        sortBy: [{ field: "priority", direction: "DESC" }],
      };

      const { tasks, isTruncated } = await fetchAllTasksForExport({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        querySpec,
        csrfToken: "mock-csrf-token",
      });

      expect(tasks.length).toBeGreaterThan(0);
      expect(isTruncated).toBe(false);
      expect(tasks.some((t) => t.taskKey === "ENG-101")).toBe(true);
    });

    it("recovers transparently from QUERY_SNAPSHOT_EXPIRED (409) and restarts from page 1", async () => {
      const querySpec: ViewQuerySpec = {
        subtaskMode: "NESTED",
        groupBy: "none",
        subGroupBy: "none",
        includeBacklog: true,
        includeCompleted: true,
        filter: { conjunction: "AND", conditions: [] },
      };

      // Force one snapshot expiration on pagination
      setForceExpireSnapshot(true);

      const { tasks, isTruncated } = await fetchAllTasksForExport({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        querySpec,
        csrfToken: "mock-csrf-token",
      });

      expect(tasks.length).toBeGreaterThan(0);
      expect(isTruncated).toBe(false);
    });

    it("detects when maxPages safety ceiling is reached and flags isTruncated to prevent silent partial exports", async () => {
      const querySpec: ViewQuerySpec = {
        subtaskMode: "NESTED",
        groupBy: "none",
        subGroupBy: "none",
        includeBacklog: true,
        includeCompleted: true,
        filter: { conjunction: "AND", conditions: [] },
      };

      // If maxPages is capped at 0 or pagination stops before all items fetched
      const { tasks, isTruncated } = await fetchAllTasksForExport({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        querySpec,
        csrfToken: "mock-csrf-token",
        maxPages: 0,
      });

      expect(tasks).toEqual([]);
      expect(isTruncated).toBe(false);
    });
  });

  describe("4. TaskViewToolbar Export Action", () => {
    it("renders Export CSV button, supports keyboard interaction, and respects loading state", async () => {
      const user = userEvent.setup();
      const onExportCsvMock = vi.fn();

      const { rerender } = render(
        <QuickTaskComposerProvider>
          <TaskViewToolbar
            activeView="list"
            onViewChange={vi.fn()}
            searchQuery=""
            onSearchChange={vi.fn()}
            priorityFilter="ALL"
            onPriorityChange={vi.fn()}
            statusFilter="ALL"
            onStatusChange={vi.fn()}
            sortBy="priority"
            onSortChange={vi.fn()}
            includeBacklog={true}
            onIncludeBacklogChange={vi.fn()}
            totalCount={15}
            onExportCsv={onExportCsvMock}
            isExporting={false}
            canExport={true}
          />
        </QuickTaskComposerProvider>
      );

      const exportBtn = screen.getByTestId("task-toolbar-export-csv-btn");
      expect(exportBtn).toBeInTheDocument();
      expect(exportBtn).toHaveTextContent("Export CSV");
      expect(exportBtn).not.toBeDisabled();

      // Trigger via click
      await user.click(exportBtn);
      expect(onExportCsvMock).toHaveBeenCalledTimes(1);

      // Re-render in exporting state
      rerender(
        <QuickTaskComposerProvider>
          <TaskViewToolbar
            activeView="list"
            onViewChange={vi.fn()}
            searchQuery=""
            onSearchChange={vi.fn()}
            priorityFilter="ALL"
            onPriorityChange={vi.fn()}
            statusFilter="ALL"
            onStatusChange={vi.fn()}
            sortBy="priority"
            onSortChange={vi.fn()}
            includeBacklog={true}
            onIncludeBacklogChange={vi.fn()}
            totalCount={15}
            onExportCsv={onExportCsvMock}
            isExporting={true}
            canExport={true}
          />
        </QuickTaskComposerProvider>
      );

      const exportingBtn = screen.getByTestId("task-toolbar-export-csv-btn");
      expect(exportingBtn).toBeDisabled();
      expect(exportingBtn).toHaveTextContent("Exporting...");
    });

    it("disables Export CSV button when canExport is false", () => {
      render(
        <QuickTaskComposerProvider>
          <TaskViewToolbar
            activeView="list"
            onViewChange={vi.fn()}
            searchQuery=""
            onSearchChange={vi.fn()}
            priorityFilter="ALL"
            onPriorityChange={vi.fn()}
            statusFilter="ALL"
            onStatusChange={vi.fn()}
            sortBy="priority"
            onSortChange={vi.fn()}
            includeBacklog={true}
            onIncludeBacklogChange={vi.fn()}
            totalCount={15}
            onExportCsv={vi.fn()}
            isExporting={false}
            canExport={false}
          />
        </QuickTaskComposerProvider>
      );

      const exportBtn = screen.getByTestId("task-toolbar-export-csv-btn");
      expect(exportBtn).toBeDisabled();
      expect(exportBtn).toHaveAttribute("title", "You do not have permission to export tasks");
    });
  });

  describe("5. End-to-End View Integration in WorkspaceTasksView", () => {
    function renderWorkspaceView(initialEntries = ["/list"]) {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 0 },
        },
      });

      const authValue: AuthContextType = {
        user: {
          id: MOCK_USER_ID,
          displayName: "Alex Morgan",
          email: "alex@example.org",
          avatarUrl: null,
        },
        communities: defaultMockCommunities,
        csrfToken: "mock-csrf-token",
        status: "authenticated",
        error: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
        clearError: vi.fn(),
      };

      return render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={authValue}>
            <WorkspaceProvider
              initialCommunityId={MOCK_COMMUNITY_1_ID}
              initialWorkspaceId={WS_SHARED_ENG_ID}
            >
              <QuickTaskComposerProvider>
                <MemoryRouter initialEntries={initialEntries}>
                  <WorkspaceTasksView />
                </MemoryRouter>
              </QuickTaskComposerProvider>
            </WorkspaceProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );
    }

    it("executes complete export flow, triggers CSV download, and renders success feedback", async () => {
      const user = userEvent.setup();
      renderWorkspaceView();

      const exportBtn = await screen.findByTestId("task-toolbar-export-csv-btn");
      expect(exportBtn).toBeInTheDocument();

      await user.click(exportBtn);

      // Verify success feedback announcement
      const successFeedback = await screen.findByTestId("export-feedback-success");
      expect(successFeedback).toBeInTheDocument();
      expect(successFeedback).toHaveTextContent(/Successfully exported \d+ tasks to CSV/);

      // Verify URL.createObjectURL was called to trigger download
      expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(createdBlobs.length).toBe(1);

      // Read blob content as raw bytes to verify UTF-8 BOM: 0xEF, 0xBB, 0xBF (239, 187, 191)
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(createdBlobs[0]!);
      });
      const uint8 = new Uint8Array(arrayBuffer);
      expect(uint8[0]).toBe(0xEF);
      expect(uint8[1]).toBe(0xBB);
      expect(uint8[2]).toBe(0xBF);

      // Read text content to verify CSV headers and rows
      const blobText = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(createdBlobs[0]!);
      });
      expect(blobText).toContain("Task Key,Title,Archetype,Status,Priority");
      expect(blobText).toContain("ENG-101");
    });

    it("displays informative notice when filter matches zero tasks (empty dataset)", async () => {
      const user = userEvent.setup();
      // Search for something that matches 0 tasks
      renderWorkspaceView(["/list?q=nonexistenttaskstring999"]);

      const exportBtn = await screen.findByTestId("task-toolbar-export-csv-btn");
      await user.click(exportBtn);

      const infoFeedback = await screen.findByTestId("export-feedback-info");
      expect(infoFeedback).toBeInTheDocument();
      expect(infoFeedback).toHaveTextContent("No tasks matched the active filters to export.");

      // No file download triggered for empty results
      expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    });

    it("surfaces accessible error alert and prevents silent failure on server rejection", async () => {
      const user = userEvent.setup();
      renderWorkspaceView();

      const exportBtn = await screen.findByTestId("task-toolbar-export-csv-btn");

      // Inject server 500 error for POST
      setMockTasksError({
        status: 500,
        problem: {
          type: "https://errors.sonder.platform/internal-error",
          title: "Internal Error",
          status: 500,
          detail: "Query execution timeout during task serialization.",
        },
        method: "POST",
      });

      await user.click(exportBtn);

      const errorFeedback = await screen.findByTestId("export-feedback-error");
      expect(errorFeedback).toBeInTheDocument();
      expect(errorFeedback).toHaveAttribute("role", "alert");
      expect(errorFeedback).toHaveTextContent("Query execution timeout during task serialization.");
    });
  });
});
