import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { WorkspaceProvider } from "@/modules/workspace/WorkspaceContext.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import {
  MOCK_COMMUNITY_1_ID,
  WS_SHARED_ENG_ID,
  MOCK_USER_ID,
} from "@/mocks/data/my-work.js";
import { WorkspaceTrashView } from "./WorkspaceTrashView.js";
import * as tasksApi from "../api.js";
import type { TrashedTaskListDto, TaskDto } from "../types.js";

const testAuthUser = {
  id: MOCK_USER_ID,
  displayName: "Alex Morgan",
  email: "alex.morgan@example.org",
  avatarUrl: null,
};

const mockAuthValue: AuthContextType = {
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
};

function makeSampleTrashedTask(id: string, key: string, archivedAtDaysAgo = 2): {
  task: TaskDto;
  archivedAt: string;
  recoverableUntil: string;
} {
  const now = Date.now();
  const archivedTime = now - archivedAtDaysAgo * 24 * 60 * 60 * 1000;
  const recoverableTime = archivedTime + 30 * 24 * 60 * 60 * 1000;

  return {
    archivedAt: new Date(archivedTime).toISOString(),
    recoverableUntil: new Date(recoverableTime).toISOString(),
    task: {
      id,
      workspaceId: WS_SHARED_ENG_ID,
      parentTaskId: null,
      taskKey: key,
      title: `Archived Task ${key}`,
      description: "Archived sample task description",
      itemType: "TASK",
      statusCategory: "DONE",
      priority: "HIGH",
      assigneeIds: [],
      creatorId: MOCK_USER_ID,
      startDate: null,
      dueDate: "2026-11-20",
      estimatePoints: 2,
      labelIds: [],
      milestoneId: null,
      rankKey: "0|hzzzzz:",
      version: 2,
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
        canArchive: false,
        canRestore: true,
        canDeleteForever: false,
      },
      createdAt: "2026-10-01T10:00:00Z",
      updatedAt: "2026-10-15T10:00:00Z",
      archivedAt: new Date(archivedTime).toISOString(),
    },
  };
}

function renderTrashView(initialPath = `/workspaces/${WS_SHARED_ENG_ID}/trash`) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthValue}>
        <WorkspaceProvider
          initialCommunityId={MOCK_COMMUNITY_1_ID}
          initialWorkspaceId={WS_SHARED_ENG_ID}
        >
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route
                path="/workspaces/:workspaceId/trash"
                element={<WorkspaceTrashView />}
              />
              <Route path="/trash" element={<WorkspaceTrashView />} />
            </Routes>
          </MemoryRouter>
        </WorkspaceProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("Workspace Trash View (FEAT-A10b / DEC-OPEN-03)", () => {
  let listTrashedSpy: any;
  let restoreSpy: any;
  let bulkMutateSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Workspace Trash header and DEC-OPEN-03 safety policy banner", async () => {
    listTrashedSpy = vi.spyOn(tasksApi, "listTrashedTasks").mockResolvedValue({
      items: [],
      nextCursor: null,
    });

    renderTrashView();

    expect(screen.getByText("Workspace Trash")).toBeInTheDocument();
    expect(screen.getByTestId("dec-open-03-banner")).toBeInTheDocument();
    expect(screen.getByText(/Zero Automatic Permanent Deletion/i)).toBeInTheDocument();
  });

  it("DEC-OPEN-03 Safety Invariant: verifies NO permanent purge/delete button exists", async () => {
    const item1 = makeSampleTrashedTask("t-1", "ENG-088");
    listTrashedSpy = vi.spyOn(tasksApi, "listTrashedTasks").mockResolvedValue({
      items: [item1],
      nextCursor: null,
    });

    renderTrashView();

    await waitFor(() => {
      expect(screen.getByText("Archived Task ENG-088")).toBeInTheDocument();
    });

    // Zero permanent delete or purge action buttons
    expect(screen.queryByRole("button", { name: /delete forever/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /purge/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /empty trash/i })).not.toBeInTheDocument();
  });

  it("renders trashed tasks with 30-day retention countdown", async () => {
    const item1 = makeSampleTrashedTask("t-1", "ENG-088", 2);
    const item2 = makeSampleTrashedTask("t-2", "ENG-099", 25);
    listTrashedSpy = vi.spyOn(tasksApi, "listTrashedTasks").mockResolvedValue({
      items: [item1, item2],
      nextCursor: null,
    });

    renderTrashView();

    await waitFor(() => {
      expect(screen.getByText("ENG-088")).toBeInTheDocument();
      expect(screen.getByText("ENG-099")).toBeInTheDocument();
    });

    expect(screen.getByTestId("retention-badge-ENG-088")).toHaveTextContent("28 days remaining");
    expect(screen.getByTestId("retention-badge-ENG-099")).toHaveTextContent("5 days remaining");
  });

  it("executes single-task restore upon clicking Restore button", async () => {
    const user = userEvent.setup();
    const item1 = makeSampleTrashedTask("t-1", "ENG-088");
    listTrashedSpy = vi.spyOn(tasksApi, "listTrashedTasks").mockResolvedValue({
      items: [item1],
      nextCursor: null,
    });
    restoreSpy = vi.spyOn(tasksApi, "restoreTask").mockResolvedValue(item1.task);

    renderTrashView();

    const restoreBtn = await screen.findByTestId("restore-task-ENG-088");
    await user.click(restoreBtn);

    await waitFor(() => {
      expect(restoreSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: WS_SHARED_ENG_ID,
          taskId: "t-1",
        })
      );
    });
  });

  it("supports multi-selection and bulk restore of trashed tasks", async () => {
    const user = userEvent.setup();
    const item1 = makeSampleTrashedTask("t-1", "ENG-088");
    const item2 = makeSampleTrashedTask("t-2", "ENG-099");
    listTrashedSpy = vi.spyOn(tasksApi, "listTrashedTasks").mockResolvedValue({
      items: [item1, item2],
      nextCursor: null,
    });
    bulkMutateSpy = vi.spyOn(tasksApi, "bulkMutateTasks").mockResolvedValue({
      updatedTaskIds: ["t-1", "t-2"],
      workspaceSeq: 110,
    });

    renderTrashView();

    const selectAll = await screen.findByTestId("trash-select-all");
    await user.click(selectAll);

    expect(screen.getByTestId("trash-bulk-action-bar")).toBeInTheDocument();
    expect(screen.getByTestId("trash-bulk-count")).toHaveTextContent("2 selected");

    const bulkRestoreBtn = screen.getByTestId("bulk-restore-button");
    await user.click(bulkRestoreBtn);

    await waitFor(() => {
      expect(bulkMutateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: WS_SHARED_ENG_ID,
          data: {
            taskIds: ["t-1", "t-2"],
            action: "RESTORE",
          },
        })
      );
    });
  });

  it("renders empty state when no tasks are trashed", async () => {
    listTrashedSpy = vi.spyOn(tasksApi, "listTrashedTasks").mockResolvedValue({
      items: [],
      nextCursor: null,
    });

    renderTrashView();

    await waitFor(() => {
      expect(screen.getByTestId("trash-empty-state")).toBeInTheDocument();
      expect(screen.getByText("Workspace Trash is empty")).toBeInTheDocument();
    });
  });
});
