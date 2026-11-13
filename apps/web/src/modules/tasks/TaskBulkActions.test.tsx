import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { WorkspaceProvider } from "@/modules/workspace/WorkspaceContext.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import {
  MOCK_COMMUNITY_1_ID,
  WS_SHARED_ENG_ID,
  MOCK_USER_ID,
} from "@/mocks/data/my-work.js";
import { TaskListView } from "./views/TaskListView.js";
import * as tasksApi from "./api.js";
import type { TaskDto } from "./types.js";
import { makeTaskPermissions } from "@/mocks/data/tasks.js";

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

function makeSampleTask(id: string, key: string, overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id,
    workspaceId: WS_SHARED_ENG_ID,
    parentTaskId: null,
    taskKey: key,
    title: `Sample Task ${key}`,
    description: "Sample description",
    itemType: "TASK",
    statusCategory: "TODO",
    priority: "MEDIUM",
    assigneeIds: [],
    assigneeAssignments: [],
    assigneeEditableFieldGroups: [],
    creatorId: MOCK_USER_ID,
    startDate: null,
    dueDate: "2026-11-20",
    estimatePoints: 2,
    labelIds: [],
    milestoneId: null,
    rankKey: "0|hzzzzz:",
    version: 1,
    fieldRevisions: {},
    effectivePermissions: makeTaskPermissions(true),
    createdAt: "2026-11-01T10:00:00Z",
    updatedAt: "2026-11-01T10:00:00Z",
    archivedAt: null,
    ...overrides,
  };
}

function renderComponent(tasks: TaskDto[]) {
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
          <MemoryRouter>
            <TaskListView
              tasks={tasks}
              isLoading={false}
              isError={false}
              error={null}
              onRetry={vi.fn()}
              workspaceId={WS_SHARED_ENG_ID}
              communityId={MOCK_COMMUNITY_1_ID}
            />
          </MemoryRouter>
        </WorkspaceProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("Task Bulk Actions (FEAT-A10b)", () => {
  let bulkMutateSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    bulkMutateSpy = vi.spyOn(tasksApi, "bulkMutateTasks").mockResolvedValue({
      updatedTaskIds: ["task-1", "task-2"],
      workspaceSeq: 105,
    });
  });

  it("renders multi-select checkboxes in table header and on each row", () => {
    const tasks = [
      makeSampleTask("task-1", "ENG-101"),
      makeSampleTask("task-2", "ENG-102"),
    ];
    renderComponent(tasks);

    expect(screen.getByTestId("bulk-select-all")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-select-task-ENG-101")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-select-task-ENG-102")).toBeInTheDocument();
    // Bulk action bar should be hidden initially
    expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument();
  });

  it("shows floating BulkActionBar when a row checkbox is selected", async () => {
    const user = userEvent.setup();
    const tasks = [
      makeSampleTask("task-1", "ENG-101"),
      makeSampleTask("task-2", "ENG-102"),
    ];
    renderComponent(tasks);

    const checkbox1 = screen.getByTestId("bulk-select-task-ENG-101");
    await user.click(checkbox1);

    expect(checkbox1).toBeChecked();
    expect(screen.getByTestId("bulk-action-bar")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent("1 selected of 2");
  });

  it("selects all visible tasks when header checkbox is clicked", async () => {
    const user = userEvent.setup();
    const tasks = [
      makeSampleTask("task-1", "ENG-101"),
      makeSampleTask("task-2", "ENG-102"),
      makeSampleTask("task-3", "ENG-103"),
    ];
    renderComponent(tasks);

    const selectAll = screen.getByTestId("bulk-select-all");
    await user.click(selectAll);

    expect(screen.getByTestId("bulk-select-task-ENG-101")).toBeChecked();
    expect(screen.getByTestId("bulk-select-task-ENG-102")).toBeChecked();
    expect(screen.getByTestId("bulk-select-task-ENG-103")).toBeChecked();
    expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent("3 selected of 3");

    // Clicking again clears selection
    await user.click(selectAll);
    expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument();
  });

  it("clears selection when clear button is clicked", async () => {
    const user = userEvent.setup();
    const tasks = [makeSampleTask("task-1", "ENG-101")];
    renderComponent(tasks);

    await user.click(screen.getByTestId("bulk-select-task-ENG-101"));
    expect(screen.getByTestId("bulk-action-bar")).toBeInTheDocument();

    await user.click(screen.getByTestId("bulk-clear-selection"));
    expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument();
  });

  it("enforces max limit of 100 tasks on bulk selection", async () => {
    const user = userEvent.setup();
    // Create 105 tasks
    const tasks = Array.from({ length: 105 }, (_, i) =>
      makeSampleTask(`task-${i + 1}`, `ENG-${100 + i + 1}`)
    );
    renderComponent(tasks);

    await user.click(screen.getByTestId("bulk-select-all"));

    // Should cap at 100
    expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent("100 selected of 105");
    expect(screen.getByTestId("bulk-limit-badge")).toHaveTextContent("Max 100");
  });

  it("executes Bulk Archive mutation and clears selection", async () => {
    const user = userEvent.setup();
    const tasks = [
      makeSampleTask("task-1", "ENG-101"),
      makeSampleTask("task-2", "ENG-102"),
    ];
    renderComponent(tasks);

    await user.click(screen.getByTestId("bulk-select-task-ENG-101"));
    await user.click(screen.getByTestId("bulk-select-task-ENG-102"));

    const archiveButton = screen.getByTestId("bulk-archive-button");
    await user.click(archiveButton);

    await waitFor(() => {
      expect(bulkMutateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          data: {
            taskIds: ["task-1", "task-2"],
            action: "ARCHIVE",
          },
        })
      );
    });

    // Selection clears upon completion
    await waitFor(() => {
      expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument();
    });
  });

  it("executes Bulk Status change mutation", async () => {
    const user = userEvent.setup();
    const tasks = [makeSampleTask("task-1", "ENG-101")];
    renderComponent(tasks);

    await user.click(screen.getByTestId("bulk-select-task-ENG-101"));

    // Open status dropdown
    const statusTrigger = screen.getByTestId("bulk-status-trigger");
    await user.click(statusTrigger);

    const doneOption = await screen.findByTestId("bulk-status-option-DONE");
    await user.click(doneOption);

    await waitFor(() => {
      expect(bulkMutateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          data: {
            taskIds: ["task-1"],
            action: "SET_STATUS",
            statusCategory: "DONE",
          },
        })
      );
    });
  });

  it("executes Bulk Priority change mutation", async () => {
    const user = userEvent.setup();
    const tasks = [makeSampleTask("task-1", "ENG-101")];
    renderComponent(tasks);

    await user.click(screen.getByTestId("bulk-select-task-ENG-101"));

    // Open priority dropdown
    const priorityTrigger = screen.getByTestId("bulk-priority-trigger");
    await user.click(priorityTrigger);

    const urgentOption = await screen.findByTestId("bulk-priority-option-URGENT");
    await user.click(urgentOption);

    await waitFor(() => {
      expect(bulkMutateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          data: {
            taskIds: ["task-1"],
            action: "SET_PRIORITY",
            priority: "URGENT",
          },
        })
      );
    });
  });
});
