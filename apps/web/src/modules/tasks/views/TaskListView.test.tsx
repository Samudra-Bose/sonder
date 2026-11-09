import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
import { TaskListView, type TaskListViewProps } from "./TaskListView";
import { TaskViewToolbar } from "./TaskViewToolbar";
import { QuickTaskComposerProvider } from "../QuickTaskComposerContext";
import type { TaskDto } from "../types";

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

function renderTaskListView(props: Partial<TaskListViewProps>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
    },
  });

  const defaultProps: TaskListViewProps = {
    tasks: [makeSampleTask()],
    isLoading: false,
    isError: false,
    error: null,
    onRetry: vi.fn(),
    workspaceId: WS_SHARED_ENG_ID,
    communityId: MOCK_COMMUNITY_1_ID,
    ...props,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthValue}>
        <WorkspaceProvider
          initialCommunityId={MOCK_COMMUNITY_1_ID}
          initialWorkspaceId={WS_SHARED_ENG_ID}
        >
          <MemoryRouter>
            <TaskListView {...defaultProps} />
          </MemoryRouter>
        </WorkspaceProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

function makeSampleTask(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: "task-1",
    workspaceId: "ws-1",
    parentTaskId: null,
    taskKey: "ENG-101",
    title: "Test Task 101",
    description: "Sample description",
    itemType: "TASK",
    statusCategory: "IN_PROGRESS",
    priority: "HIGH",
    assigneeIds: [],
    creatorId: "user-1",
    startDate: null,
    dueDate: "2026-11-15",
    estimatePoints: 3,
    labelIds: [],
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
      canCreateSubtask: true,
      canMove: true,
      canComment: true,
      canWatch: true,
      canArchive: true,
      canRestore: true,
      canDeletePermanent: false,
      restrictedActions: [],
      canManageAssigneeFieldGrants: false,
    },
    createdAt: "2026-11-01T10:00:00Z",
    updatedAt: "2026-11-01T10:00:00Z",
    archivedAt: null,
    assigneeAssignments: [],
    assigneeEditableFieldGroups: [],
    ...overrides,
  };
}

describe("TaskListView — Interactive Column Sorting & Accessibility", () => {
  it("renders sortable headers for Key, Priority, and Due Date with aria-sort", () => {
    renderTaskListView({
      tasks: [makeSampleTask()],
      sortBy: "dueDate",
      sortOrder: "asc",
    });

    // Sortable column headers
    const keyHeader = screen.getByTestId("sort-header-currentKey").closest("th");
    const priorityHeader = screen.getByTestId("sort-header-priority").closest("th");
    const dueDateHeader = screen.getByTestId("sort-header-dueDate").closest("th");

    expect(keyHeader).toHaveAttribute("aria-sort", "none");
    expect(priorityHeader).toHaveAttribute("aria-sort", "none");
    expect(dueDateHeader).toHaveAttribute("aria-sort", "ascending");

    // Accessible buttons inside headers
    expect(screen.getByTestId("sort-header-currentKey")).toHaveAttribute(
      "aria-label",
      "Sort by Key, currently not sorted"
    );
    expect(screen.getByTestId("sort-header-dueDate")).toHaveAttribute(
      "aria-label",
      "Sort by Due Date, currently ascending"
    );
  });

  it("ensures non-sortable headers (Title, Status, Subtasks) do not have sort buttons or aria-sort", () => {
    renderTaskListView({
      tasks: [makeSampleTask()],
      sortBy: "dueDate",
      sortOrder: "asc",
    });

    const titleTh = screen.getByText("Title").closest("th");
    const statusTh = screen.getByText("Status").closest("th");
    const subtasksTh = screen.getByText("Subtasks").closest("th");

    expect(titleTh).not.toHaveAttribute("aria-sort");
    expect(statusTh).not.toHaveAttribute("aria-sort");
    expect(subtasksTh).not.toHaveAttribute("aria-sort");

    expect(titleTh?.querySelector("button")).toBeNull();
    expect(statusTh?.querySelector("button")).toBeNull();
    expect(subtasksTh?.querySelector("button")).toBeNull();
  });

  it("toggles sort direction when clicking the currently active column header", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();

    renderTaskListView({
      tasks: [makeSampleTask()],
      sortBy: "dueDate",
      sortOrder: "asc",
      onSortChange,
    });

    const dueDateBtn = screen.getByTestId("sort-header-dueDate");
    await user.click(dueDateBtn);

    expect(onSortChange).toHaveBeenCalledTimes(1);
    expect(onSortChange).toHaveBeenCalledWith("dueDate", "desc");
  });

  it("defaults to sensible directions when clicking an inactive column header", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();

    renderTaskListView({
      tasks: [makeSampleTask()],
      sortBy: "dueDate",
      sortOrder: "asc",
      onSortChange,
    });

    // Clicking Priority should default to desc (highest priority first)
    const priorityBtn = screen.getByTestId("sort-header-priority");
    await user.click(priorityBtn);
    expect(onSortChange).toHaveBeenCalledWith("priority", "desc");

    // Clicking Key should default to asc (alphabetical/sequential)
    const keyBtn = screen.getByTestId("sort-header-currentKey");
    await user.click(keyBtn);
    expect(onSortChange).toHaveBeenCalledWith("currentKey", "asc");
  });

  it("supports keyboard activation on sort header buttons (Enter and Space)", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();

    renderTaskListView({
      tasks: [makeSampleTask()],
      sortBy: "currentKey",
      sortOrder: "asc",
      onSortChange,
    });

    const keyBtn = screen.getByTestId("sort-header-currentKey");
    keyBtn.focus();
    expect(keyBtn).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onSortChange).toHaveBeenCalledWith("currentKey", "desc");

    await user.keyboard(" ");
    expect(onSortChange).toHaveBeenCalledWith("currentKey", "desc");
  });

  it("renders empty state when task array is empty", () => {
    renderTaskListView({
      tasks: [],
    });

    expect(screen.getByTestId("task-list-empty")).toBeInTheDocument();
  });
});

describe("TaskViewToolbar — Sort Controls & Direction Toggle", () => {
  it("renders sort order toggle button and calls onSortOrderToggle with inverted direction", async () => {
    const user = userEvent.setup();
    const onSortOrderToggle = vi.fn();
    const onSortChange = vi.fn();

    const { rerender } = render(
      <QuickTaskComposerProvider>
        <TaskViewToolbar
          activeView="list"
          onViewChange={vi.fn()}
          searchQuery=""
          onSearchChange={vi.fn()}
          priorityFilter=""
          onPriorityChange={vi.fn()}
          statusFilter=""
          onStatusChange={vi.fn()}
          sortBy="dueDate"
          sortOrder="asc"
          onSortChange={onSortChange}
          onSortOrderToggle={onSortOrderToggle}
          includeBacklog={false}
          onIncludeBacklogChange={vi.fn()}
          totalCount={5}
        />
      </QuickTaskComposerProvider>
    );

    const toggleBtn = screen.getByTestId("toolbar-sort-order-toggle");
    expect(toggleBtn).toHaveAttribute(
      "aria-label",
      "Toggle sort direction: currently ascending"
    );

    await user.click(toggleBtn);
    expect(onSortOrderToggle).toHaveBeenCalledWith("desc");

    // Rerender with desc
    rerender(
      <QuickTaskComposerProvider>
        <TaskViewToolbar
          activeView="list"
          onViewChange={vi.fn()}
          searchQuery=""
          onSearchChange={vi.fn()}
          priorityFilter=""
          onPriorityChange={vi.fn()}
          statusFilter=""
          onStatusChange={vi.fn()}
          sortBy="dueDate"
          sortOrder="desc"
          onSortChange={onSortChange}
          onSortOrderToggle={onSortOrderToggle}
          includeBacklog={false}
          onIncludeBacklogChange={vi.fn()}
          totalCount={5}
        />
      </QuickTaskComposerProvider>
    );

    const toggleBtnDesc = screen.getByTestId("toolbar-sort-order-toggle");
    expect(toggleBtnDesc).toHaveAttribute(
      "aria-label",
      "Toggle sort direction: currently descending"
    );

    await user.click(toggleBtnDesc);
    expect(onSortOrderToggle).toHaveBeenLastCalledWith("asc");
  });
});
