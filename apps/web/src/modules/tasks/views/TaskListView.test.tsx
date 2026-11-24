import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useSearchParams } from "react-router-dom";
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
import * as tasksApi from "../api.js";
import type { TaskDto } from "../types";

function LocationDisplay() {
  const [searchParams] = useSearchParams();
  return <div data-testid="location-display">{searchParams.toString()}</div>;
}

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
          <MemoryRouter initialEntries={["/tasks"]}>
            <TaskListView {...defaultProps} />
            <LocationDisplay />
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

describe("Stage 5.3B / WP-A: Task List View Transformation", () => {
  const sampleTask = makeSampleTask({
    id: "task-001",
    taskKey: "ENG-101",
    title: "Implement List Inline Cells",
    statusCategory: "IN_PROGRESS",
    priority: "HIGH",
    dueDate: "2026-11-20",
    assigneeIds: ["user-123"],
    assigneeAssignments: [
      {
        userId: "user-123",
        user: { id: "user-123", displayName: "Alex Morgan", avatarUrl: null },
        assignedByUserId: "user-admin",
        assignedAt: "2026-11-01T10:00:00Z",
      },
    ],
  });

  describe("WP-A1: Inline Cell Primitives Integration (AC-1)", () => {
    it("renders all five inline cell primitives directly within the task row", () => {
      renderTaskListView({ tasks: [sampleTask] });

      // 1. Title cell
      expect(screen.getByTestId("inline-title-cell-task-001")).toBeInTheDocument();
      expect(screen.getByTestId("inline-title-cell-task-001")).toHaveTextContent("Implement List Inline Cells");

      // 2. Status cell
      expect(screen.getByTestId("inline-status-trigger-task-001")).toBeInTheDocument();
      expect(screen.getByTestId("inline-status-trigger-task-001")).toHaveTextContent("In Progress");

      // 3. Priority cell
      expect(screen.getByTestId("inline-priority-trigger-task-001")).toBeInTheDocument();
      expect(screen.getByTestId("inline-priority-trigger-task-001")).toHaveTextContent("High");

      // 4. Assignee cell
      expect(screen.getByTestId("inline-assignee-trigger-task-001")).toBeInTheDocument();
      expect(screen.getByTestId("inline-assignee-trigger-task-001")).toHaveTextContent("Alex Morgan");

      // 5. Due date cell
      expect(screen.getByTestId("inline-duedate-trigger-task-001")).toBeInTheDocument();
      expect(screen.getByTestId("inline-duedate-trigger-task-001")).toHaveTextContent("2026-11-20");
    });

    it("clicking title cell enters title editing mode directly inside table row", () => {
      renderTaskListView({ tasks: [sampleTask] });

      const titleTrigger = screen.getByTestId("inline-title-cell-task-001");
      fireEvent.click(titleTrigger);

      expect(screen.getByTestId("inline-title-input-task-001")).toBeInTheDocument();
      expect(screen.getByTestId("inline-title-input-task-001")).toHaveValue("Implement List Inline Cells");
    });

    it("clicking status cell opens status popover selector", async () => {
      renderTaskListView({ tasks: [sampleTask] });

      const statusTrigger = screen.getByTestId("inline-status-trigger-task-001");
      fireEvent.click(statusTrigger);

      expect(await screen.findByRole("menu", { name: /select status/i })).toBeInTheDocument();
      expect(screen.getByTestId("inline-status-option-DONE")).toBeInTheDocument();
    });

    it("clicking priority cell opens priority popover selector", async () => {
      renderTaskListView({ tasks: [sampleTask] });

      const priorityTrigger = screen.getByTestId("inline-priority-trigger-task-001");
      fireEvent.click(priorityTrigger);

      expect(await screen.findByRole("menu", { name: /select priority/i })).toBeInTheDocument();
      expect(screen.getByTestId("inline-priority-option-URGENT")).toBeInTheDocument();
    });

    it("clicking assignee cell opens assignee popover selector", async () => {
      renderTaskListView({ tasks: [sampleTask] });

      const assigneeTrigger = screen.getByTestId("inline-assignee-trigger-task-001");
      fireEvent.click(assigneeTrigger);

      expect(await screen.findByRole("dialog", { name: /assign task/i })).toBeInTheDocument();
    });

    it("clicking due date cell opens date popover selector", async () => {
      renderTaskListView({ tasks: [sampleTask] });

      const dueDateTrigger = screen.getByTestId("inline-duedate-trigger-task-001");
      fireEvent.click(dueDateTrigger);

      expect(await screen.findByRole("dialog", { name: /set due date/i })).toBeInTheDocument();
    });
  });

  describe("WP-A2: Row Navigation and Event Isolation (AC-2, AC-3)", () => {
    it("AC-3: clicking row whitespace or task key opens Task Peek Drawer via URL query param", () => {
      renderTaskListView({ tasks: [sampleTask] });

      // Click task key button
      const taskKeyBtn = screen.getByRole("button", { name: "ENG-101" });
      fireEvent.click(taskKeyBtn);

      expect(screen.getByTestId("location-display")).toHaveTextContent("task=ENG-101");
    });

    it("AC-3: clicking row background opens Task Peek Drawer", () => {
      renderTaskListView({ tasks: [sampleTask] });

      const row = screen.getByTestId("task-list-row-ENG-101");
      fireEvent.click(row);

      expect(screen.getByTestId("location-display")).toHaveTextContent("task=ENG-101");
    });

    it("AC-2: clicking title cell enters edit mode WITHOUT opening Task Peek Drawer", () => {
      renderTaskListView({ tasks: [sampleTask] });

      const titleTrigger = screen.getByTestId("inline-title-cell-task-001");
      fireEvent.click(titleTrigger);

      expect(screen.getByTestId("inline-title-input-task-001")).toBeInTheDocument();
      // Must NOT open Task Peek Drawer
      expect(screen.getByTestId("location-display")).not.toHaveTextContent("task=ENG-101");
    });

    it("AC-2: clicking status cell opens status popover WITHOUT opening Task Peek Drawer", () => {
      renderTaskListView({ tasks: [sampleTask] });

      const statusTrigger = screen.getByTestId("inline-status-trigger-task-001");
      fireEvent.click(statusTrigger);

      expect(screen.getByRole("menu", { name: /select status/i })).toBeInTheDocument();
      expect(screen.getByTestId("location-display")).not.toHaveTextContent("task=ENG-101");
    });

    it("AC-2: clicking priority cell opens priority popover WITHOUT opening Task Peek Drawer", () => {
      renderTaskListView({ tasks: [sampleTask] });

      const priorityTrigger = screen.getByTestId("inline-priority-trigger-task-001");
      fireEvent.click(priorityTrigger);

      expect(screen.getByRole("menu", { name: /select priority/i })).toBeInTheDocument();
      expect(screen.getByTestId("location-display")).not.toHaveTextContent("task=ENG-101");
    });

    it("AC-2: clicking assignee cell opens assignee popover WITHOUT opening Task Peek Drawer", () => {
      renderTaskListView({ tasks: [sampleTask] });

      const assigneeTrigger = screen.getByTestId("inline-assignee-trigger-task-001");
      fireEvent.click(assigneeTrigger);

      expect(screen.getByRole("dialog", { name: /assign task/i })).toBeInTheDocument();
      expect(screen.getByTestId("location-display")).not.toHaveTextContent("task=ENG-101");
    });

    it("AC-2: clicking due date cell opens date popover WITHOUT opening Task Peek Drawer", () => {
      renderTaskListView({ tasks: [sampleTask] });

      const dueDateTrigger = screen.getByTestId("inline-duedate-trigger-task-001");
      fireEvent.click(dueDateTrigger);

      expect(screen.getByRole("dialog", { name: /set due date/i })).toBeInTheDocument();
      expect(screen.getByTestId("location-display")).not.toHaveTextContent("task=ENG-101");
    });

    it("AC-2: clicking selection checkbox toggles selection WITHOUT opening Task Peek Drawer", () => {
      renderTaskListView({ tasks: [sampleTask] });

      const checkbox = screen.getByTestId("bulk-select-task-ENG-101");
      fireEvent.click(checkbox);

      expect(checkbox).toBeChecked();
      expect(screen.getByTestId("location-display")).not.toHaveTextContent("task=ENG-101");
    });
  });

  describe("WP-A3: Persistent Inline Task Creation (AC-4, AC-5, AC-6, AC-7)", () => {
    it("AC-4: renders persistent creation trigger at bottom of table with colSpan=9", () => {
      renderTaskListView({ tasks: [sampleTask] });

      const creationTrigger = screen.getByTestId("inline-creation-trigger");
      expect(creationTrigger).toBeInTheDocument();
      expect(creationTrigger).toHaveTextContent("New task...");

      const td = creationTrigger.querySelector("td");
      expect(td).toHaveAttribute("colspan", "9");
    });

    it("AC-4 & AC-5: clicking trigger reveals input and supports creation flow with focus retention", async () => {
      const mockCreatedTask: TaskDto = {
        ...sampleTask,
        id: "task-002",
        taskKey: "ENG-102",
        title: "Second Created Task",
      };
      vi.spyOn(tasksApi, "createTask").mockResolvedValue(mockCreatedTask);

      renderTaskListView({ tasks: [sampleTask] });

      const trigger = screen.getByTestId("inline-creation-trigger");
      fireEvent.click(trigger);

      const input = screen.getByTestId("inline-creation-input");
      expect(input).toBeInTheDocument();
      expect(input).toHaveFocus();

      fireEvent.change(input, { target: { value: "Second Created Task" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(tasksApi.createTask).toHaveBeenCalledTimes(1);
        // Input cleared for rapid-fire creation
        expect(input).toHaveValue("");
        expect(input).toHaveFocus();
      });
    });

    it("AC-7: failed creation preserves recoverable input and shows error message", async () => {
      vi.spyOn(tasksApi, "createTask").mockRejectedValue(new Error("Network timeout"));

      renderTaskListView({ tasks: [sampleTask] });

      fireEvent.click(screen.getByTestId("inline-creation-trigger"));
      const input = screen.getByTestId("inline-creation-input");

      fireEvent.change(input, { target: { value: "Retryable Task" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(screen.getByTestId("inline-creation-error")).toHaveTextContent("Network timeout");
        expect(input).toHaveValue("Retryable Task");
      });
    });
  });

  describe("WP-A4: Transient Pending-Task Row (AC-8, AC-9, AC-10, AC-11)", () => {
    it("AC-8 & AC-9: displays temporary pending row while creation is unresolved, removes on server success", async () => {
      let resolveCreation: (val: TaskDto) => void;
      const creationPromise = new Promise<TaskDto>((resolve) => {
        resolveCreation = resolve;
      });
      vi.spyOn(tasksApi, "createTask").mockImplementation(() => creationPromise);

      renderTaskListView({ tasks: [sampleTask] });

      fireEvent.click(screen.getByTestId("inline-creation-trigger"));
      const input = screen.getByTestId("inline-creation-input");

      fireEvent.change(input, { target: { value: "In-Flight Pending Task" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // AC-8: Pending row immediately rendered above the creation row
      const pendingRow = screen.getByTestId("task-list-pending-row");
      expect(pendingRow).toBeInTheDocument();
      expect(screen.getByTestId("pending-task-title")).toHaveTextContent("In-Flight Pending Task");
      expect(screen.getByTestId("pending-task-badge")).toHaveTextContent("Pending");
      expect(pendingRow).toHaveClass("opacity-60");

      // AC-11: Non-interactive, clicking pending row does NOT open Task Peek Drawer
      fireEvent.click(pendingRow);
      expect(screen.getByTestId("location-display")).not.toHaveTextContent("task=");

      // AC-9: Server confirms creation
      const canonicalTask: TaskDto = {
        ...sampleTask,
        id: "task-canonical-99",
        taskKey: "ENG-99",
        title: "In-Flight Pending Task",
      };
      resolveCreation!(canonicalTask);

      // Pending row removed upon resolution
      await waitFor(() => {
        expect(screen.queryByTestId("task-list-pending-row")).not.toBeInTheDocument();
      });
    });

    it("AC-10: removes pending row on failure without leaving orphaned state", async () => {
      let rejectCreation: (err: Error) => void;
      const creationPromise = new Promise<TaskDto>((_, reject) => {
        rejectCreation = reject;
      });
      vi.spyOn(tasksApi, "createTask").mockImplementation(() => creationPromise);

      renderTaskListView({ tasks: [sampleTask] });

      fireEvent.click(screen.getByTestId("inline-creation-trigger"));
      const input = screen.getByTestId("inline-creation-input");

      fireEvent.change(input, { target: { value: "Failing Pending Task" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // Pending row visible
      expect(screen.getByTestId("task-list-pending-row")).toBeInTheDocument();

      // Reject server mutation
      rejectCreation!(new Error("Server 500 error"));

      await waitFor(() => {
        // Pending row is removed
        expect(screen.queryByTestId("task-list-pending-row")).not.toBeInTheDocument();
        // Error displayed on creation row
        expect(screen.getByTestId("inline-creation-error")).toHaveTextContent("Server 500 error");
      });
    });
  });

  describe("Empty-State Inline Creation (AC-Empty-1, AC-Empty-2)", () => {
    it("renders inline creation trigger in empty state when tasks array is empty", () => {
      renderTaskListView({ tasks: [] });

      expect(screen.getByTestId("task-list-empty")).toBeInTheDocument();
      expect(screen.getByText("No tasks match the active filters")).toBeInTheDocument();
      const trigger = screen.getByTestId("inline-creation-trigger");
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveTextContent("New task...");
    });

    it("allows creating first task from empty state with pending feedback", async () => {
      let resolveCreation: (val: TaskDto) => void;
      const creationPromise = new Promise<TaskDto>((resolve) => {
        resolveCreation = resolve;
      });
      vi.spyOn(tasksApi, "createTask").mockImplementation(() => creationPromise);

      renderTaskListView({ tasks: [] });

      // Click trigger in empty state
      fireEvent.click(screen.getByTestId("inline-creation-trigger"));
      const input = screen.getByTestId("inline-creation-input");
      expect(input).toBeInTheDocument();
      expect(input).toHaveFocus();

      // Enter task title and submit
      fireEvent.change(input, { target: { value: "First Task in Project" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(tasksApi.createTask).toHaveBeenCalledWith(
          expect.objectContaining({
            communityId: MOCK_COMMUNITY_1_ID,
            workspaceId: WS_SHARED_ENG_ID,
            data: expect.objectContaining({
              title: "First Task in Project",
            }),
          })
        );
      });

      // Pending row visible inside empty state
      const pendingRow = screen.getByTestId("task-list-pending-row");
      expect(pendingRow).toBeInTheDocument();
      expect(pendingRow).toHaveAttribute("role", "status");
      expect(pendingRow).toHaveAttribute("aria-label", "Creating task: First Task in Project");
      expect(screen.getByTestId("pending-task-title")).toHaveTextContent("First Task in Project");
      expect(screen.getByTestId("pending-task-badge")).toHaveTextContent("Pending");

      // Resolve creation
      resolveCreation!(
        makeSampleTask({
          id: "task-first-1",
          taskKey: "ENG-1",
          title: "First Task in Project",
        })
      );

      await waitFor(() => {
        expect(screen.queryByTestId("task-list-pending-row")).not.toBeInTheDocument();
      });
    });

    it("retains draft and shows inline error when empty-state creation fails", async () => {
      let rejectCreation: (err: Error) => void;
      const creationPromise = new Promise<TaskDto>((_, reject) => {
        rejectCreation = reject;
      });
      vi.spyOn(tasksApi, "createTask").mockImplementation(() => creationPromise);

      renderTaskListView({ tasks: [] });

      fireEvent.click(screen.getByTestId("inline-creation-trigger"));
      const input = screen.getByTestId("inline-creation-input");

      fireEvent.change(input, { target: { value: "Failing Empty Task" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      expect(screen.getByTestId("task-list-pending-row")).toBeInTheDocument();

      rejectCreation!(new Error("Network connection dropped"));

      await waitFor(() => {
        expect(screen.queryByTestId("task-list-pending-row")).not.toBeInTheDocument();
        expect(screen.getByTestId("inline-creation-error")).toHaveTextContent("Network connection dropped");
        expect(input).toHaveValue("Failing Empty Task");
      });
    });
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

  describe("Batch 1: Density Architecture Foundation (DEC-M3.3-04)", () => {
    it("renders rows with Standard density (44px) by default", () => {
      const task = makeSampleTask({ taskKey: "TSK-D01" });
      renderTaskListView({ tasks: [task] });

      const row = screen.getByTestId("task-list-row-TSK-D01");
      expect(row).toHaveAttribute("data-density", "standard");
      expect(row).toHaveClass("h-11");
      expect(row.style.height).toBe("44px");
    });

    it("renders rows with Compact density (38px) when density prop is 'compact'", () => {
      const task = makeSampleTask({ taskKey: "TSK-D02" });
      renderTaskListView({ tasks: [task], density: "compact" });

      const row = screen.getByTestId("task-list-row-TSK-D02");
      expect(row).toHaveAttribute("data-density", "compact");
      expect(row).toHaveClass("h-[38px]");
      expect(row.style.height).toBe("38px");
    });

    it("renders density controls in TaskViewToolbar and handles density switching", async () => {
      const user = userEvent.setup();
      const onDensityChange = vi.fn();

      render(
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
            sortBy="priority"
            sortOrder="desc"
            onSortChange={vi.fn()}
            includeBacklog={false}
            onIncludeBacklogChange={vi.fn()}
            totalCount={10}
            density="standard"
            onDensityChange={onDensityChange}
          />
        </QuickTaskComposerProvider>
      );

      const densityGroup = screen.getByTestId("task-view-density-toggle");
      expect(densityGroup).toBeInTheDocument();

      const standardToggle = screen.getByTestId("density-toggle-standard");
      const compactToggle = screen.getByTestId("density-toggle-compact");

      expect(standardToggle).toHaveAttribute("aria-pressed", "true");
      expect(compactToggle).toHaveAttribute("aria-pressed", "false");

      await user.click(compactToggle);
      expect(onDensityChange).toHaveBeenCalledWith("compact");
    });

    it("provides accessible target dimensions meeting WCAG 2.2 AA in both densities", () => {
      const task = makeSampleTask({ taskKey: "TSK-D03" });
      const { unmount } = renderTaskListView({ tasks: [task], density: "standard" });

      // Standard mode: cell controls have touch-friendly sizing
      const standardRow = screen.getByTestId("task-list-row-TSK-D03");
      expect(standardRow).toHaveClass("h-11");
      expect(standardRow.style.height).toBe("44px");

      // Actions menu trigger in Standard
      const actionsBtn = screen.getByTestId("task-actions-trigger-TSK-D03");
      expect(actionsBtn).toBeInTheDocument();

      unmount();

      // Render in Compact mode
      renderTaskListView({ tasks: [task], density: "compact" });
      const compactRow = screen.getByTestId("task-list-row-TSK-D03");
      expect(compactRow).toHaveClass("h-[38px]");
      expect(compactRow.style.height).toBe("38px");
    });
  });
});
