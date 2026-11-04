import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import * as fs from "fs";
import * as path from "path";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { WorkspaceProvider } from "@/modules/workspace/WorkspaceContext.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import {
  MOCK_COMMUNITY_1_ID,
  WS_SHARED_ENG_ID,
  MOCK_USER_ID,
} from "@/mocks/data/my-work.js";
import {
  resetTaskMockState,
  setMockTasksError,
  simulateConcurrentFieldUpdate,
  getMockTasks,
} from "@/mocks/handlers/tasks.js";
import { ApiProblemError } from "@/lib/api-client.js";
import { updateTask } from "./api.js";
import { TaskPeekDrawer } from "./TaskPeekDrawer.js";
import { useTaskPeekDrawer } from "./useTaskPeekDrawer.js";

const testAuthUser = {
  id: MOCK_USER_ID,
  displayName: "Alex Morgan",
  email: "alex.morgan@example.org",
  avatarUrl: null,
};

function createMockAuth(overrides?: Partial<AuthContextType>): AuthContextType {
  return {
    user: testAuthUser,
    communities: defaultMockCommunities,
    csrfToken: "mock-csrf-token",
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

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });
}

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}{location.search}</div>;
}

function TaskTestTrigger() {
  const { openTask } = useTaskPeekDrawer();
  return (
    <div>
      <button
        data-testid="open-eng-101-btn"
        onClick={() => openTask("ENG-101", { workspaceId: WS_SHARED_ENG_ID })}
      >
        Open ENG-101
      </button>
      <button
        data-testid="open-eng-050-btn"
        onClick={() => openTask("ENG-050", { workspaceId: WS_SHARED_ENG_ID })}
      >
        Open ENG-050 (Viewer Readonly)
      </button>
      <button
        data-testid="open-eng-088-btn"
        onClick={() => openTask("ENG-088", { workspaceId: WS_SHARED_ENG_ID })}
      >
        Open ENG-088 (Archived)
      </button>
    </div>
  );
}

interface TestShellProps {
  initialEntries?: string[];
  initialWorkspaceId?: string;
}

function renderTaskDrawerTest({
  initialEntries = ["/?task=ENG-101"],
  initialWorkspaceId = WS_SHARED_ENG_ID,
}: TestShellProps = {}) {
  const queryClient = createTestQueryClient();
  const authValue = createMockAuth();

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <WorkspaceProvider
            initialCommunityId={MOCK_COMMUNITY_1_ID}
            initialWorkspaceId={initialWorkspaceId}
          >
            <MemoryRouter initialEntries={initialEntries}>
              <LocationDisplay />
              <div className="flex">
                <main className="flex-1">
                  <TaskTestTrigger />
                </main>
                <TaskPeekDrawer forceMode="desktop" />
              </div>
            </MemoryRouter>
          </WorkspaceProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    ),
  };
}

describe("VS-03 Stage 3: Inline Task Editing & Concurrency Conflict Resolution", () => {
  beforeEach(() => {
    resetTaskMockState();
  });

  describe("Editing Supported Attributes", () => {
    it("edits title successfully with baseFieldRevisions and reconciles server state", async () => {
      const user = userEvent.setup();
      renderTaskDrawerTest();

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Fix critical auth token refresh race condition" })
        ).toBeInTheDocument();
      });

      // 1. Click edit title
      const editBtn = screen.getByTestId("edit-title-btn");
      await user.click(editBtn);

      const titleInput = screen.getByTestId("title-input");
      expect(titleInput).toBeInTheDocument();
      expect(titleInput).toHaveValue("Fix critical auth token refresh race condition");

      // 2. Type new title
      await user.clear(titleInput);
      await user.type(titleInput, "Refactored auth token refresh race condition");

      // 3. Click save
      const saveBtn = screen.getByTestId("save-title-btn");
      await user.click(saveBtn);

      // 4. Verify title updated and edit mode closed
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Refactored auth token refresh race condition" })
        ).toBeInTheDocument();
      });
      expect(screen.queryByTestId("title-input")).not.toBeInTheDocument();

      // 5. Verify revision advanced in mock state
      const task = getMockTasks().find((t) => t.taskKey === "ENG-101");
      expect(task?.title).toBe("Refactored auth token refresh race condition");
      expect(task?.fieldRevisions.title).toBe(2);
    });

    it("validates title cannot be empty and prevents submission", async () => {
      const user = userEvent.setup();
      renderTaskDrawerTest();

      await waitFor(() => {
        expect(screen.getByTestId("edit-title-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("edit-title-btn"));
      const titleInput = screen.getByTestId("title-input");
      await user.clear(titleInput);

      const saveBtn = screen.getByTestId("save-title-btn");
      expect(saveBtn).toBeDisabled();

      // Press Enter to attempt submission
      await user.type(titleInput, "{Enter}");

      expect(screen.getByTestId("title-error")).toHaveTextContent(/title must not be empty/i);
      expect(screen.getByTestId("title-input")).toBeInTheDocument();
    });

    it("cancels title edit restoring original value without mutation", async () => {
      const user = userEvent.setup();
      renderTaskDrawerTest();

      await waitFor(() => {
        expect(screen.getByTestId("edit-title-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("edit-title-btn"));
      const titleInput = screen.getByTestId("title-input");
      await user.clear(titleInput);
      await user.type(titleInput, "Discarded draft title");

      // Click cancel
      const cancelBtn = screen.getByTestId("cancel-title-btn");
      await user.click(cancelBtn);

      // Verify original title is retained
      expect(
        screen.getByRole("heading", { name: "Fix critical auth token refresh race condition" })
      ).toBeInTheDocument();
      expect(screen.queryByTestId("title-input")).not.toBeInTheDocument();
    });

    it("edits description successfully", async () => {
      const user = userEvent.setup();
      renderTaskDrawerTest();

      await waitFor(() => {
        expect(screen.getByTestId("edit-description-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("edit-description-btn"));
      const textarea = screen.getByTestId("description-textarea");
      expect(textarea).toBeInTheDocument();

      await user.clear(textarea);
      await user.type(textarea, "Detailed investigation into token refresh race conditions.");

      await user.click(screen.getByTestId("save-description-btn"));

      await waitFor(() => {
        expect(
          screen.getByText("Detailed investigation into token refresh race conditions.")
        ).toBeInTheDocument();
      });
      expect(screen.queryByTestId("description-textarea")).not.toBeInTheDocument();
    });

    it("edits status category successfully with canonical CANCELED", async () => {
      const user = userEvent.setup();
      renderTaskDrawerTest();

      await waitFor(() => {
        expect(screen.getByTestId("edit-status-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("edit-status-btn"));
      const statusSelect = screen.getByTestId("status-select");
      expect(statusSelect).toBeInTheDocument();

      await user.selectOptions(statusSelect, "CANCELED");
      await user.click(screen.getByTestId("save-status-btn"));

      await waitFor(() => {
        expect(screen.getByText("CANCELED")).toBeInTheDocument();
      });

      const task = getMockTasks().find((t) => t.taskKey === "ENG-101");
      expect(task?.statusCategory).toBe("CANCELED");
      expect(task?.fieldRevisions.statusCategory).toBe(3);
    });

    it("edits priority successfully", async () => {
      const user = userEvent.setup();
      renderTaskDrawerTest();

      await waitFor(() => {
        expect(screen.getByTestId("edit-priority-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("edit-priority-btn"));
      const prioritySelect = screen.getByTestId("priority-select");
      await user.selectOptions(prioritySelect, "LOW");
      await user.click(screen.getByTestId("save-priority-btn"));

      await waitFor(() => {
        expect(screen.getByText("LOW")).toBeInTheDocument();
      });

      const task = getMockTasks().find((t) => t.taskKey === "ENG-101");
      expect(task?.priority).toBe("LOW");
      expect(task?.fieldRevisions.priority).toBe(3);
    });

    it("edits due date and start date successfully", async () => {
      const user = userEvent.setup();
      renderTaskDrawerTest();

      await waitFor(() => {
        expect(screen.getByTestId("edit-due-date-btn")).toBeInTheDocument();
      });

      // Edit due date
      await user.click(screen.getByTestId("edit-due-date-btn"));
      const dueDateInput = screen.getByTestId("due-date-input");
      await user.clear(dueDateInput);
      await user.type(dueDateInput, "2026-11-20");
      await user.click(screen.getByTestId("save-due-date-btn"));

      await waitFor(() => {
        expect(screen.getByText("2026-11-20")).toBeInTheDocument();
      });

      // Edit start date
      await user.click(screen.getByTestId("edit-start-date-btn"));
      const startDateInput = screen.getByTestId("start-date-input");
      await user.clear(startDateInput);
      await user.type(startDateInput, "2026-11-05");
      await user.click(screen.getByTestId("save-start-date-btn"));

      await waitFor(() => {
        expect(screen.getByText("2026-11-05")).toBeInTheDocument();
      });

      const task = getMockTasks().find((t) => t.taskKey === "ENG-101");
      expect(task?.dueDate).toBe("2026-11-20");
      expect(task?.startDate).toBe("2026-11-05");
    });

    it("edits estimate points successfully and validates non-negative value", async () => {
      const user = userEvent.setup();
      renderTaskDrawerTest();

      await waitFor(() => {
        expect(screen.getByTestId("edit-estimate-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("edit-estimate-btn"));
      const estimateInput = screen.getByTestId("estimate-input");
      await user.clear(estimateInput);
      await user.type(estimateInput, "8");
      await user.click(screen.getByTestId("save-estimate-btn"));

      await waitFor(() => {
        expect(screen.getByText("8 points")).toBeInTheDocument();
      });

      const task = getMockTasks().find((t) => t.taskKey === "ENG-101");
      expect(task?.estimatePoints).toBe(8);
      expect(task?.fieldRevisions.estimatePoints).toBe(2);
    });

    it("renders assignees readable with avatar and name while changing assignees is deferred", async () => {
      renderTaskDrawerTest();

      await waitFor(() => {
        expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
      });

      // Changing assignees is deferred pending an authoritative workspace member data source
      expect(screen.queryByTestId("edit-assignees-btn")).not.toBeInTheDocument();
    });

    it("renders existing assigned labels as badges while label mutation is deferred", async () => {
      renderTaskDrawerTest();

      await waitFor(() => {
        expect(screen.getByText("security")).toBeInTheDocument();
        expect(screen.getByText("backend")).toBeInTheDocument();
      });

      // Changing labels is deferred pending a canonical workspace label catalogue endpoint
      expect(screen.queryByTestId("edit-labels-btn")).not.toBeInTheDocument();
    });
  });

  describe("Permission Gating & Read-Only Behavior", () => {
    it("renders all fields read-only with no edit controls for viewer task (ENG-050)", async () => {
      renderTaskDrawerTest({ initialEntries: ["/?task=ENG-050"] });

      await waitFor(() => {
        expect(
          screen.getByRole("heading", {
            name: "Architecture boundary and dependency-cruiser report",
          })
        ).toBeInTheDocument();
      });

      // Zero edit buttons must be present
      expect(screen.queryByTestId("edit-title-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("edit-description-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("edit-status-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("edit-priority-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("edit-due-date-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("edit-start-date-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("edit-estimate-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("edit-assignees-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("edit-labels-btn")).not.toBeInTheDocument();
    });

    it("renders all fields read-only with no edit controls for archived task (ENG-088)", async () => {
      renderTaskDrawerTest({ initialEntries: ["/?task=ENG-088"] });

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Migrate Redis cluster to Sentinel v2" })
        ).toBeInTheDocument();
      });

      // Archived banner is rendered
      expect(screen.getByRole("status")).toHaveTextContent(/this task is archived/i);

      // All editing disabled
      expect(screen.queryByTestId("edit-title-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("edit-description-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("edit-status-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("edit-priority-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("edit-due-date-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("edit-estimate-btn")).not.toBeInTheDocument();
    });
  });

  describe("Optimistic Updates & Rollback", () => {
    it("optimistically updates title and rolls back on server 500 error while preserving user draft", async () => {
      const user = userEvent.setup();
      renderTaskDrawerTest();

      await waitFor(() => {
        expect(screen.getByTestId("edit-title-btn")).toBeInTheDocument();
      });

      // Configure server error
      setMockTasksError({
        status: 500,
        problem: {
          type: "https://errors.sonder.platform/server-error",
          title: "Internal Server Error",
          status: 500,
          detail: "Database write timeout occurred.",
        },
        method: "PATCH",
      });

      await user.click(screen.getByTestId("edit-title-btn"));
      const titleInput = screen.getByTestId("title-input");
      await user.clear(titleInput);
      await user.type(titleInput, "Optimistic title update that will fail");

      await user.click(screen.getByTestId("save-title-btn"));

      // Error message should appear and draft should be preserved in input
      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/database write timeout/i);
      });
      expect(screen.getByTestId("title-input")).toHaveValue(
        "Optimistic title update that will fail"
      );

      // Clear mock error and cancel
      setMockTasksError(null);
      await user.click(screen.getByTestId("cancel-title-btn"));

      // Original server title should be displayed
      expect(
        screen.getByRole("heading", { name: "Fix critical auth token refresh race condition" })
      ).toBeInTheDocument();
    });
  });

  describe("Concurrency Conflict (HTTP 409) & Deliberate Overwrite", () => {
    it("detects concurrent title modification (409) and displays conflict alert with server and client values", async () => {
      const user = userEvent.setup();
      renderTaskDrawerTest();

      await waitFor(() => {
        expect(screen.getByTestId("edit-title-btn")).toBeInTheDocument();
      });

      // User starts editing title based on revision 1
      await user.click(screen.getByTestId("edit-title-btn"));
      const titleInput = screen.getByTestId("title-input");
      await user.clear(titleInput);
      await user.type(titleInput, "Client A edit of title");

      // Another user modifies the title concurrently on server (advancing revision to 2)
      simulateConcurrentFieldUpdate(
        "ENG-101",
        "title",
        "Concurrent title update from Jordan"
      );

      // Client A submits save with stale baseFieldRevisions (1 < 2)
      await user.click(screen.getByTestId("save-title-btn"));

      // 409 Conflict alert should be displayed with current server value and client attempted value
      await waitFor(() => {
        expect(screen.getByTestId("conflict-alert-title")).toBeInTheDocument();
      });

      expect(screen.getByTestId("conflict-alert-title")).toHaveTextContent(
        /Conflict on title: modified concurrently by another user/i
      );
      expect(screen.getByTestId("conflict-alert-title")).toHaveTextContent(
        "Concurrent title update from Jordan"
      );
      expect(screen.getByTestId("conflict-alert-title")).toHaveTextContent(
        "Client A edit of title"
      );
    });

    it("allows user to discard edit on conflict and adopt current server value", async () => {
      const user = userEvent.setup();
      renderTaskDrawerTest();

      await waitFor(() => {
        expect(screen.getByTestId("edit-title-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("edit-title-btn"));
      const titleInput = screen.getByTestId("title-input");
      await user.clear(titleInput);
      await user.type(titleInput, "Client edit to discard");

      simulateConcurrentFieldUpdate(
        "ENG-101",
        "title",
        "Server accepted concurrent title"
      );

      await user.click(screen.getByTestId("save-title-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("conflict-discard-title-btn")).toBeInTheDocument();
      });

      // User chooses to discard
      await user.click(screen.getByTestId("conflict-discard-title-btn"));

      // Conflict alert closes, edit mode exits, and server title is displayed
      await waitFor(() => {
        expect(screen.queryByTestId("conflict-alert-title")).not.toBeInTheDocument();
        expect(screen.queryByTestId("title-input")).not.toBeInTheDocument();
      });
      expect(
        screen.getByRole("heading", { name: "Server accepted concurrent title" })
      ).toBeInTheDocument();
    });

    it("allows user to deliberately overwrite with fresh revisions on conflict without auto-retrying", async () => {
      const user = userEvent.setup();
      renderTaskDrawerTest();

      await waitFor(() => {
        expect(screen.getByTestId("edit-title-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("edit-title-btn"));
      const titleInput = screen.getByTestId("title-input");
      await user.clear(titleInput);
      await user.type(titleInput, "Client authoritative title decision");

      simulateConcurrentFieldUpdate(
        "ENG-101",
        "title",
        "Temporary concurrent title"
      );

      await user.click(screen.getByTestId("save-title-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("conflict-overwrite-title-btn")).toBeInTheDocument();
      });

      // Click deliberate overwrite
      await user.click(screen.getByTestId("conflict-overwrite-title-btn"));

      // Successfully saved with fresh revision and edit mode closed
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Client authoritative title decision" })
        ).toBeInTheDocument();
      });
      expect(screen.queryByTestId("conflict-alert-title")).not.toBeInTheDocument();

      const task = getMockTasks().find((t) => t.taskKey === "ENG-101");
      expect(task?.title).toBe("Client authoritative title decision");
      // Revision advanced past concurrent revision (1 -> 2 -> 3)
      expect(task?.fieldRevisions.title).toBe(3);
    });

    it("detects concurrent statusCategory modification (409) and displays conflict alert with server value", async () => {
      const user = userEvent.setup();
      renderTaskDrawerTest();

      await waitFor(() => {
        expect(screen.getByTestId("edit-status-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("edit-status-btn"));
      const statusSelect = screen.getByTestId("status-select");
      await user.selectOptions(statusSelect, "DONE");

      // Concurrently change status to CANCELED on server (advancing revision to 3)
      simulateConcurrentFieldUpdate("ENG-101", "statusCategory", "CANCELED");

      await user.click(screen.getByTestId("save-status-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("conflict-alert-statusCategory")).toBeInTheDocument();
      });

      expect(screen.getByTestId("conflict-alert-statusCategory")).toHaveTextContent(
        "CANCELED"
      );
      expect(screen.getByTestId("conflict-alert-statusCategory")).toHaveTextContent(
        "DONE"
      );

      // Discard edit and adopt server value
      await user.click(screen.getByTestId("conflict-discard-statusCategory-btn"));
      await waitFor(() => {
        expect(screen.queryByTestId("conflict-alert-statusCategory")).not.toBeInTheDocument();
        expect(screen.getByText("CANCELED")).toBeInTheDocument();
      });
    });

    it("detects concurrent dueDate modification (409) and allows deliberate overwrite", async () => {
      const user = userEvent.setup();
      renderTaskDrawerTest();

      await waitFor(() => {
        expect(screen.getByTestId("edit-due-date-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("edit-due-date-btn"));
      const dueDateInput = screen.getByTestId("due-date-input");
      fireEvent.change(dueDateInput, { target: { value: "2026-12-15" } });

      // Concurrently change due date on server
      simulateConcurrentFieldUpdate("ENG-101", "dueDate", "2026-11-30");

      await user.click(screen.getByTestId("save-due-date-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("conflict-alert-dueDate")).toBeInTheDocument();
      });

      expect(screen.getByTestId("conflict-alert-dueDate")).toHaveTextContent("2026-11-30");
      expect(screen.getByTestId("conflict-alert-dueDate")).toHaveTextContent("2026-12-15");

      // Deliberately overwrite
      await user.click(screen.getByTestId("conflict-overwrite-dueDate-btn"));

      await waitFor(() => {
        expect(screen.queryByTestId("conflict-alert-dueDate")).not.toBeInTheDocument();
        expect(screen.getByText("2026-12-15")).toBeInTheDocument();
      });

      const task = getMockTasks().find((t) => t.taskKey === "ENG-101");
      expect(task?.dueDate).toBe("2026-12-15");
      expect(task?.fieldRevisions.dueDate).toBe(3);
    });

    it("surfaces refetch error during conflict overwrite without silent retry with stale revisions", async () => {
      const user = userEvent.setup();
      renderTaskDrawerTest();

      await waitFor(() => {
        expect(screen.getByTestId("edit-title-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("edit-title-btn"));
      const titleInput = screen.getByTestId("title-input");
      await user.clear(titleInput);
      await user.type(titleInput, "Attempted title before network crash");

      simulateConcurrentFieldUpdate("ENG-101", "title", "Concurrent server title");

      await user.click(screen.getByTestId("save-title-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("conflict-overwrite-title-btn")).toBeInTheDocument();
      });

      // Now simulate server failure for the refetch (GET /tasks/:taskId)
      setMockTasksError({
        status: 500,
        problem: {
          type: "https://errors.sonder.platform/server-error",
          title: "Internal Server Error",
          status: 500,
          detail: "Database connection lost during refetch.",
        },
        method: "GET",
      });

      await user.click(screen.getByTestId("conflict-overwrite-title-btn"));

      // Error must be displayed inside conflict alert, conflict alert remains open, and no silent retry occurs
      await waitFor(() => {
        expect(screen.getByTestId("conflict-error-title")).toHaveTextContent(
          /database connection lost during refetch/i
        );
      });

      // Conflict alert is still present with user's attempted value
      expect(screen.getByTestId("conflict-alert-title")).toBeInTheDocument();
      expect(screen.getByTestId("title-input")).toHaveValue(
        "Attempted title before network crash"
      );

      // Clear error
      setMockTasksError(null);
    });
  });

  describe("Mock Concurrency & Contract Revision Rules", () => {
    const taskId = "018f98a2-task-001-overdue-assigned";

    it("matching revision succeeds and increments field revision monotonically", async () => {
      const taskBefore = getMockTasks().find((t) => t.id === taskId);
      const currentRev = taskBefore?.fieldRevisions.title ?? 1;

      const updated = await updateTask({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        taskId,
        csrfToken: "mock-csrf-token",
        data: {
          title: "Updated Title with Exact Match Revision",
          baseFieldRevisions: {
            title: currentRev,
          },
        },
      });

      expect(updated.title).toBe("Updated Title with Exact Match Revision");
      expect(updated.fieldRevisions.title).toBe(currentRev + 1);
    });

    it("stale revision (clientRev < serverRev) is rejected with 409 FIELD_REVISION_CONFLICT", async () => {
      simulateConcurrentFieldUpdate(taskId, "title", "Concurrent server title");
      const currentRev = getMockTasks().find((t) => t.id === taskId)!.fieldRevisions.title ?? 1;

      try {
        await updateTask({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          taskId,
          csrfToken: "mock-csrf-token",
          data: {
            title: "Stale update attempt",
            baseFieldRevisions: {
              title: currentRev - 1,
            },
          },
        });
        expect.unreachable("Should have thrown ApiProblemError");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiProblemError);
        const problemErr = err as ApiProblemError;
        expect(problemErr.status).toBe(409);
        const problem = problemErr.problem as Record<string, unknown>;
        expect(problem.code).toBe("FIELD_REVISION_CONFLICT");
        expect(problem.conflictingFields).toContain("title");
        expect(problem.serverTask).toBeUndefined();
        const details = problem.conflictDetails as any[];
        expect(details).toBeDefined();
        const titleDetail = details.find((d) => d.fieldPath === "title");
        expect(titleDetail.serverValue).toBe("Concurrent server title");
        expect(titleDetail.clientValue).toBe("Stale update attempt");
      }
    });

    it("future revision (clientRev > serverRev) is rejected with 409 FIELD_REVISION_CONFLICT", async () => {
      const currentRev = getMockTasks().find((t) => t.id === taskId)!.fieldRevisions.title ?? 1;

      try {
        await updateTask({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          taskId,
          csrfToken: "mock-csrf-token",
          data: {
            title: "Future revision attempt",
            baseFieldRevisions: {
              title: currentRev + 99,
            },
          },
        });
        expect.unreachable("Should have thrown ApiProblemError");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiProblemError);
        const problemErr = err as ApiProblemError;
        expect(problemErr.status).toBe(409);
        const problem = problemErr.problem as Record<string, unknown>;
        expect(problem.code).toBe("FIELD_REVISION_CONFLICT");
        expect(problem.conflictingFields).toContain("title");
      }
    });

    it("missing revision for a changed field is rejected with 409 FIELD_REVISION_CONFLICT", async () => {
      try {
        await updateTask({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          taskId,
          csrfToken: "mock-csrf-token",
          data: {
            title: "Title without revision",
            baseFieldRevisions: {
              description: 1,
            },
          },
        });
        expect.unreachable("Should have thrown ApiProblemError");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiProblemError);
        const problemErr = err as ApiProblemError;
        expect(problemErr.status).toBe(409);
        const problem = problemErr.problem as Record<string, unknown>;
        expect(problem.code).toBe("FIELD_REVISION_CONFLICT");
        expect(problem.conflictingFields).toContain("title");
      }
    });

    it("concurrent modification of one field permits modification of an unrelated field with valid base revision", async () => {
      simulateConcurrentFieldUpdate(taskId, "title", "Concurrent title from other actor");

      const currentDescRev = getMockTasks().find((t) => t.id === taskId)!.fieldRevisions.description ?? 1;

      const updated = await updateTask({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        taskId,
        csrfToken: "mock-csrf-token",
        data: {
          description: "Unrelated description updated successfully",
          baseFieldRevisions: {
            description: currentDescRev,
          },
        },
      });

      expect(updated.description).toBe("Unrelated description updated successfully");
      expect(updated.title).toBe("Concurrent title from other actor");
      expect(updated.fieldRevisions.description).toBe(currentDescRev + 1);
    });
  });

  describe("Production Module Boundaries", () => {
    it("verifies no production task module imports from mock fixture modules", () => {
      const tasksDir = path.resolve(__dirname);
      const files = fs.readdirSync(tasksDir);
      const productionFiles = files.filter(
        (f) => (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.includes(".test.")
      );

      expect(productionFiles.length).toBeGreaterThan(0);

      for (const file of productionFiles) {
        const filePath = path.join(tasksDir, file);
        const content = fs.readFileSync(filePath, "utf-8");
        expect(content).not.toMatch(/from\s+["']@\/mocks/);
        expect(content).not.toMatch(/from\s+["']\.\.?\/\.\.?\/mocks/);
        expect(content).not.toMatch(/from\s+["']\.\.?\/mocks/);
      }
    });
  });

  describe("URL & Drawer State Preservation", () => {
    it("preserves URL query parameters across editing workflows", async () => {
      const user = userEvent.setup();
      renderTaskDrawerTest({
        initialEntries: ["/?filter=assigned&sort=due&task=ENG-101"],
      });

      await waitFor(() => {
        expect(screen.getByTestId("edit-title-btn")).toBeInTheDocument();
      });

      expect(screen.getByTestId("location-display")).toHaveTextContent(
        "/?filter=assigned&sort=due&task=ENG-101"
      );

      // Perform an edit
      await user.click(screen.getByTestId("edit-title-btn"));
      const titleInput = screen.getByTestId("title-input");
      await user.clear(titleInput);
      await user.type(titleInput, "Preserved URL parameters test");
      await user.click(screen.getByTestId("save-title-btn"));

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Preserved URL parameters test" })
        ).toBeInTheDocument();
      });

      // URL still contains filter=assigned&sort=due&task=ENG-101
      expect(screen.getByTestId("location-display")).toHaveTextContent(
        "/?filter=assigned&sort=due&task=ENG-101"
      );
    });
  });
});
