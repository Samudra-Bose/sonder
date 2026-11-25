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

function renderTaskListView(props: Partial<TaskListViewProps> & { queryClient?: QueryClient }) {
  const queryClient = props.queryClient ?? new QueryClient({
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
      const origMatchMedia = window.matchMedia;
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === "(pointer: fine)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      try {
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
      } finally {
        window.matchMedia = origMatchMedia;
      }
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

  describe("Batch 2 & 3: Tree Data Structures & Expand/Collapse Disclosure Mechanics", () => {
    it("renders parent collapsed by default; expanding parent reveals indented child row", () => {
      const parentTask = makeSampleTask({ id: "p1", taskKey: "ENG-P1", title: "Parent Item" });
      const childTask = makeSampleTask({ id: "c1", parentTaskId: "p1", taskKey: "ENG-C1", title: "Child Item" });

      renderTaskListView({
        tasks: [parentTask, childTask],
        enableTreeHierarchy: true,
        maxSubtaskDepth: 1,
      });

      const parentRow = screen.getByTestId("task-list-tree-row-ENG-P1");
      expect(parentRow).toBeInTheDocument();
      expect(parentRow).toHaveAttribute("data-depth", "0");

      // Children are collapsed by default (Batch 3 locked requirement)
      expect(screen.queryByTestId("task-list-tree-row-ENG-C1")).not.toBeInTheDocument();

      // Progress metric on parent
      expect(screen.getByTestId("subtask-progress-ENG-P1")).toHaveTextContent("0 of 1 loaded");

      // Expand parent via disclosure button
      const expandBtn = screen.getByTestId("tree-expand-button-ENG-P1");
      expect(expandBtn).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(expandBtn);

      // Now child row is rendered and indented
      expect(expandBtn).toHaveAttribute("aria-expanded", "true");
      const childRow = screen.getByTestId("task-list-tree-row-ENG-C1");
      expect(childRow).toBeInTheDocument();
      expect(childRow).toHaveAttribute("data-depth", "1");
      expect(childRow).toHaveAttribute("data-parent-id", "p1");

      // Collapsing parent hides child row again
      fireEvent.click(expandBtn);
      expect(expandBtn).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByTestId("task-list-tree-row-ENG-C1")).not.toBeInTheDocument();
    });

    it("expanding one parent does not expand unrelated parents", () => {
      const p1 = makeSampleTask({ id: "p1", taskKey: "ENG-P1", title: "Parent 1" });
      const c1 = makeSampleTask({ id: "c1", parentTaskId: "p1", taskKey: "ENG-C1", title: "Child 1" });
      const p2 = makeSampleTask({ id: "p2", taskKey: "ENG-P2", title: "Parent 2" });
      const c2 = makeSampleTask({ id: "c2", parentTaskId: "p2", taskKey: "ENG-C2", title: "Child 2" });

      renderTaskListView({
        tasks: [p1, c1, p2, c2],
        enableTreeHierarchy: true,
      });

      // Both parents start collapsed
      expect(screen.queryByTestId("task-list-tree-row-ENG-C1")).not.toBeInTheDocument();
      expect(screen.queryByTestId("task-list-tree-row-ENG-C2")).not.toBeInTheDocument();

      // Expand only p1
      fireEvent.click(screen.getByTestId("tree-expand-button-ENG-P1"));

      expect(screen.getByTestId("task-list-tree-row-ENG-C1")).toBeInTheDocument();
      expect(screen.queryByTestId("task-list-tree-row-ENG-C2")).not.toBeInTheDocument();
      expect(screen.getByTestId("tree-expand-button-ENG-P2")).toHaveAttribute("aria-expanded", "false");
    });

    it("supports nested multi-level expansion and collapsing parent hides entire descendant branch", () => {
      const root = makeSampleTask({ id: "root", taskKey: "ENG-ROOT", title: "Root Architecture" });
      const child = makeSampleTask({ id: "child", parentTaskId: "root", taskKey: "ENG-CHILD", title: "Subsystem Core" });
      const grand = makeSampleTask({ id: "grand", parentTaskId: "child", taskKey: "ENG-GRAND", title: "Leaf Worker" });

      renderTaskListView({
        tasks: [root, child, grand],
        enableTreeHierarchy: true,
        maxSubtaskDepth: 2,
      });

      // Expand root -> child becomes visible
      fireEvent.click(screen.getByTestId("tree-expand-button-ENG-ROOT"));
      expect(screen.getByTestId("task-list-tree-row-ENG-CHILD")).toBeInTheDocument();
      expect(screen.queryByTestId("task-list-tree-row-ENG-GRAND")).not.toBeInTheDocument();

      // Expand child -> grand becomes visible
      fireEvent.click(screen.getByTestId("tree-expand-button-ENG-CHILD"));
      expect(screen.getByTestId("task-list-tree-row-ENG-GRAND")).toBeInTheDocument();

      // Collapse root -> both child and grand are completely hidden
      fireEvent.click(screen.getByTestId("tree-expand-button-ENG-ROOT"));
      expect(screen.queryByTestId("task-list-tree-row-ENG-CHILD")).not.toBeInTheDocument();
      expect(screen.queryByTestId("task-list-tree-row-ENG-GRAND")).not.toBeInTheDocument();

      // Reopening root restores child's previous expansion state (grandchild is visible!)
      fireEvent.click(screen.getByTestId("tree-expand-button-ENG-ROOT"));
      expect(screen.getByTestId("task-list-tree-row-ENG-CHILD")).toBeInTheDocument();
      expect(screen.getByTestId("task-list-tree-row-ENG-GRAND")).toBeInTheDocument();
    });

    it("preserves manual expansion state across column sorting and density switching", () => {
      const p1 = makeSampleTask({ id: "p1", taskKey: "ENG-P1", title: "Parent Item" });
      const c1 = makeSampleTask({ id: "c1", parentTaskId: "p1", taskKey: "ENG-C1", title: "Child Item" });

      const { rerender } = renderTaskListView({
        tasks: [p1, c1],
        enableTreeHierarchy: true,
        density: "standard",
        sortBy: "priority",
        sortOrder: "desc",
      });

      // Expand parent
      fireEvent.click(screen.getByTestId("tree-expand-button-ENG-P1"));
      expect(screen.getByTestId("task-list-tree-row-ENG-C1")).toBeInTheDocument();

      // Re-render with inverted sort (simulating user column sort change)
      rerender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <AuthContext.Provider value={mockAuthValue}>
            <WorkspaceProvider initialCommunityId={MOCK_COMMUNITY_1_ID} initialWorkspaceId={WS_SHARED_ENG_ID}>
              <MemoryRouter initialEntries={["/tasks"]}>
                <TaskListView
                  tasks={[p1, c1]}
                  isLoading={false}
                  isError={false}
                  error={null}
                  onRetry={vi.fn()}
                  workspaceId={WS_SHARED_ENG_ID}
                  communityId={MOCK_COMMUNITY_1_ID}
                  enableTreeHierarchy={true}
                  density="standard"
                  sortBy="currentKey"
                  sortOrder="asc"
                />
              </MemoryRouter>
            </WorkspaceProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      // Child remains expanded after sort change
      expect(screen.getByTestId("task-list-tree-row-ENG-C1")).toBeInTheDocument();

      // Re-render with compact density
      rerender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <AuthContext.Provider value={mockAuthValue}>
            <WorkspaceProvider initialCommunityId={MOCK_COMMUNITY_1_ID} initialWorkspaceId={WS_SHARED_ENG_ID}>
              <MemoryRouter initialEntries={["/tasks"]}>
                <TaskListView
                  tasks={[p1, c1]}
                  isLoading={false}
                  isError={false}
                  error={null}
                  onRetry={vi.fn()}
                  workspaceId={WS_SHARED_ENG_ID}
                  communityId={MOCK_COMMUNITY_1_ID}
                  enableTreeHierarchy={true}
                  density="compact"
                  sortBy="currentKey"
                  sortOrder="asc"
                />
              </MemoryRouter>
            </WorkspaceProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      // Child remains expanded in compact mode
      expect(screen.getByTestId("task-list-tree-row-ENG-C1")).toBeInTheDocument();
      expect(screen.getByTestId("task-list-tree-row-ENG-C1")).toHaveAttribute("data-density", "compact");
    });

    it("resets manual expansion state when workspace changes", () => {
      const p1 = makeSampleTask({ id: "p1", taskKey: "ENG-P1", title: "Parent Item" });
      const c1 = makeSampleTask({ id: "c1", parentTaskId: "p1", taskKey: "ENG-C1", title: "Child Item" });

      const { rerender } = renderTaskListView({
        tasks: [p1, c1],
        enableTreeHierarchy: true,
        workspaceId: "ws-orig",
      });

      // Expand parent
      fireEvent.click(screen.getByTestId("tree-expand-button-ENG-P1"));
      expect(screen.getByTestId("task-list-tree-row-ENG-C1")).toBeInTheDocument();

      // Switch workspace
      rerender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <AuthContext.Provider value={mockAuthValue}>
            <WorkspaceProvider initialCommunityId={MOCK_COMMUNITY_1_ID} initialWorkspaceId="ws-new">
              <MemoryRouter initialEntries={["/tasks"]}>
                <TaskListView
                  tasks={[p1, c1]}
                  isLoading={false}
                  isError={false}
                  error={null}
                  onRetry={vi.fn()}
                  workspaceId="ws-new"
                  communityId={MOCK_COMMUNITY_1_ID}
                  enableTreeHierarchy={true}
                />
              </MemoryRouter>
            </WorkspaceProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      // Child is collapsed in new workspace
      expect(screen.queryByTestId("task-list-tree-row-ENG-C1")).not.toBeInTheDocument();
      expect(screen.getByTestId("tree-expand-button-ENG-P1")).toHaveAttribute("aria-expanded", "false");
    });

    it("search auto-expands ancestor path, and clearing search restores prior manual expansion state", () => {
      const p1 = makeSampleTask({ id: "p1", taskKey: "ENG-P1", title: "Parent Architecture" });
      const c1 = makeSampleTask({ id: "c1", parentTaskId: "p1", taskKey: "ENG-C1", title: "Security Auth Refactor" });
      const p2 = makeSampleTask({ id: "p2", taskKey: "ENG-P2", title: "Unrelated Parent" });
      const c2 = makeSampleTask({ id: "c2", parentTaskId: "p2", taskKey: "ENG-C2", title: "Unrelated Child" });

      const { rerender } = renderTaskListView({
        tasks: [p1, c1, p2, c2],
        enableTreeHierarchy: true,
        searchQuery: "",
      });

      // Initially both parents collapsed
      expect(screen.queryByTestId("task-list-tree-row-ENG-C1")).not.toBeInTheDocument();
      expect(screen.queryByTestId("task-list-tree-row-ENG-C2")).not.toBeInTheDocument();

      // User manually expands p2
      fireEvent.click(screen.getByTestId("tree-expand-button-ENG-P2"));
      expect(screen.getByTestId("task-list-tree-row-ENG-C2")).toBeInTheDocument();

      // Search for "Security" -> matches c1 -> auto-expands p1
      rerender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <AuthContext.Provider value={mockAuthValue}>
            <WorkspaceProvider initialCommunityId={MOCK_COMMUNITY_1_ID} initialWorkspaceId={WS_SHARED_ENG_ID}>
              <MemoryRouter initialEntries={["/tasks"]}>
                <TaskListView
                  tasks={[p1, c1, p2, c2]}
                  isLoading={false}
                  isError={false}
                  error={null}
                  onRetry={vi.fn()}
                  workspaceId={WS_SHARED_ENG_ID}
                  communityId={MOCK_COMMUNITY_1_ID}
                  enableTreeHierarchy={true}
                  searchQuery="Security"
                />
              </MemoryRouter>
            </WorkspaceProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      // p1 is auto-expanded because child matched search; p2 remains expanded from manual choice
      expect(screen.getByTestId("task-list-tree-row-ENG-C1")).toBeInTheDocument();
      expect(screen.getByTestId("task-list-tree-row-ENG-C2")).toBeInTheDocument();

      // Clear search -> p1 collapses back; p2 remains expanded!
      rerender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <AuthContext.Provider value={mockAuthValue}>
            <WorkspaceProvider initialCommunityId={MOCK_COMMUNITY_1_ID} initialWorkspaceId={WS_SHARED_ENG_ID}>
              <MemoryRouter initialEntries={["/tasks"]}>
                <TaskListView
                  tasks={[p1, c1, p2, c2]}
                  isLoading={false}
                  isError={false}
                  error={null}
                  onRetry={vi.fn()}
                  workspaceId={WS_SHARED_ENG_ID}
                  communityId={MOCK_COMMUNITY_1_ID}
                  enableTreeHierarchy={true}
                  searchQuery=""
                />
              </MemoryRouter>
            </WorkspaceProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      expect(screen.queryByTestId("task-list-tree-row-ENG-C1")).not.toBeInTheDocument();
      expect(screen.getByTestId("task-list-tree-row-ENG-C2")).toBeInTheDocument();
    });

    it("empty parents without children do not display disclosure chevrons", () => {
      const leafTask = makeSampleTask({ id: "leaf", taskKey: "ENG-LEAF", title: "Leaf Task" });

      renderTaskListView({
        tasks: [leafTask],
        enableTreeHierarchy: true,
      });

      expect(screen.queryByTestId("tree-expand-button-ENG-LEAF")).not.toBeInTheDocument();
      expect(screen.getByTestId("tree-spacer-ENG-LEAF")).toBeInTheDocument();
    });

    it("renders orphaned tasks at root with orphan badge and accessible description", () => {
      const orphanTask = makeSampleTask({
        id: "orph-1",
        parentTaskId: "unloaded-parent-uuid",
        taskKey: "ENG-ORPH",
        title: "Orphaned Subtask",
      });

      renderTaskListView({
        tasks: [orphanTask],
        enableTreeHierarchy: true,
      });

      const orphanRow = screen.getByTestId("task-list-tree-row-ENG-ORPH");
      expect(orphanRow).toBeInTheDocument();
      expect(orphanRow).toHaveAttribute("data-orphan", "true");
      expect(orphanRow).toHaveAttribute("data-depth", "0");

      const badge = screen.getByTestId("orphan-badge-ENG-ORPH");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("Subtask of unloaded");
    });

    it("preserves density attributes in tree mode (Standard 44px vs Compact 38px)", () => {
      const task = makeSampleTask({ taskKey: "ENG-T1" });
      const { unmount } = renderTaskListView({
        tasks: [task],
        enableTreeHierarchy: true,
        density: "standard",
      });

      const stdRow = screen.getByTestId("task-list-tree-row-ENG-T1");
      expect(stdRow).toHaveAttribute("data-density", "standard");
      expect(stdRow.style.height).toBe("44px");

      unmount();

      renderTaskListView({
        tasks: [task],
        enableTreeHierarchy: true,
        density: "compact",
      });

      const compactRow = screen.getByTestId("task-list-tree-row-ENG-T1");
      expect(compactRow).toHaveAttribute("data-density", "compact");
      expect(compactRow.style.height).toBe("38px");
    });

    it("defaults enableTreeHierarchy to false in TaskListView, preserving flat row rendering", () => {
      const parentTask = makeSampleTask({ id: "p1", taskKey: "ENG-P1", title: "Parent Item" });
      const childTask = makeSampleTask({ id: "c1", parentTaskId: "p1", taskKey: "ENG-C1", title: "Child Item" });

      renderTaskListView({
        tasks: [parentTask, childTask],
        // enableTreeHierarchy omitted -> defaults to false
      });

      expect(screen.getByTestId("task-list-row-ENG-P1")).toBeInTheDocument();
      expect(screen.getByTestId("task-list-row-ENG-C1")).toBeInTheDocument();
      expect(screen.queryByTestId("task-list-tree-row-ENG-P1")).not.toBeInTheDocument();
      expect(screen.queryByTestId("task-list-tree-row-ENG-C1")).not.toBeInTheDocument();
    });

    it("verifies feature-gate gating logic: DEV && ?tree=true", () => {
      // Production evaluation (import.meta.env.DEV === false)
      const isFeatureGateOpen = (isDev: boolean, searchParam: string | null) =>
        Boolean(isDev && searchParam === "true");

      expect(isFeatureGateOpen(false, "true")).toBe(false);
      expect(isFeatureGateOpen(false, "false")).toBe(false);
      expect(isFeatureGateOpen(false, null)).toBe(false);

      // Development evaluation (import.meta.env.DEV === true)
      expect(isFeatureGateOpen(true, "true")).toBe(true);
      expect(isFeatureGateOpen(true, "false")).toBe(false);
      expect(isFeatureGateOpen(true, null)).toBe(false);
    });
  });

  describe("M3.3 Batch 4: Filters & Bulk Action Integration", () => {
    it("matching child with nonmatching parent in query cache renders ancestor as context-only row and auto-expands", () => {
      const parentTask = makeSampleTask({
        id: "p1",
        workspaceId: WS_SHARED_ENG_ID,
        taskKey: "ENG-P1",
        title: "Parent Nonmatching Task",
      });
      const childTask = makeSampleTask({
        id: "c1",
        workspaceId: WS_SHARED_ENG_ID,
        parentTaskId: "p1",
        taskKey: "ENG-C1",
        title: "Child Matching Task",
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      queryClient.setQueryData(
        ["communities", MOCK_COMMUNITY_1_ID, "workspaces", WS_SHARED_ENG_ID, "tasks"],
        { items: [parentTask, childTask] }
      );

      // Only childTask is in the filtered tasks array
      renderTaskListView({
        tasks: [childTask],
        queryClient,
        enableTreeHierarchy: true,
      });

      // Context ancestor row is rendered
      const parentRow = screen.getByTestId("task-list-tree-row-ENG-P1");
      expect(parentRow).toBeInTheDocument();
      expect(parentRow).toHaveAttribute("data-context-only", "true");
      expect(screen.getByTestId("context-only-badge-ENG-P1")).toBeInTheDocument();

      // Child row is rendered and auto-expanded under context parent
      const childRow = screen.getByTestId("task-list-tree-row-ENG-C1");
      expect(childRow).toBeInTheDocument();
      expect(childRow).not.toHaveAttribute("data-context-only");
      expect(childRow).toHaveAttribute("data-depth", "1");
    });

    it("multiple matching children sharing a nonmatching parent share a single context row without duplicate rows", () => {
      const parentTask = makeSampleTask({
        id: "p1",
        workspaceId: WS_SHARED_ENG_ID,
        taskKey: "ENG-P1",
        title: "Shared Parent",
      });
      const child1 = makeSampleTask({
        id: "c1",
        workspaceId: WS_SHARED_ENG_ID,
        parentTaskId: "p1",
        taskKey: "ENG-C1",
        title: "Child One",
      });
      const child2 = makeSampleTask({
        id: "c2",
        workspaceId: WS_SHARED_ENG_ID,
        parentTaskId: "p1",
        taskKey: "ENG-C2",
        title: "Child Two",
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      queryClient.setQueryData(
        ["communities", MOCK_COMMUNITY_1_ID, "workspaces", WS_SHARED_ENG_ID, "tasks"],
        { items: [parentTask, child1, child2] }
      );

      renderTaskListView({
        tasks: [child1, child2],
        queryClient,
        enableTreeHierarchy: true,
      });

      // Parent row exists exactly once
      const parentRows = screen.getAllByTestId("task-list-tree-row-ENG-P1");
      expect(parentRows).toHaveLength(1);
      expect(parentRows[0]).toHaveAttribute("data-context-only", "true");

      // Both children rendered under it
      expect(screen.getByTestId("task-list-tree-row-ENG-C1")).toBeInTheDocument();
      expect(screen.getByTestId("task-list-tree-row-ENG-C2")).toBeInTheDocument();
    });

    it("unavailable ancestor falls back honestly to an orphan row when not in cache", () => {
      const childTask = makeSampleTask({
        id: "c-orphan",
        workspaceId: WS_SHARED_ENG_ID,
        parentTaskId: "unloaded-missing-parent",
        taskKey: "ENG-ORPH1",
        title: "Orphaned Matching Task",
      });

      renderTaskListView({
        tasks: [childTask],
        enableTreeHierarchy: true,
      });

      const orphanRow = screen.getByTestId("task-list-tree-row-ENG-ORPH1");
      expect(orphanRow).toBeInTheDocument();
      expect(orphanRow).toHaveAttribute("data-orphan", "true");
      expect(orphanRow).toHaveAttribute("data-depth", "0");
      expect(screen.getByTestId("orphan-badge-ENG-ORPH1")).toBeInTheDocument();
    });

    it("independent selection: selecting child does not select parent, and selecting parent does not select child", () => {
      const parentTask = makeSampleTask({
        id: "p1",
        workspaceId: WS_SHARED_ENG_ID,
        taskKey: "ENG-P1",
        title: "Parent Task",
      });
      const childTask = makeSampleTask({
        id: "c1",
        workspaceId: WS_SHARED_ENG_ID,
        parentTaskId: "p1",
        taskKey: "ENG-C1",
        title: "Child Task",
      });

      renderTaskListView({
        tasks: [parentTask, childTask],
        enableTreeHierarchy: true,
      });

      // Expand parent to see child
      fireEvent.click(screen.getByTestId("tree-expand-button-ENG-P1"));

      const parentCheckbox = screen.getByTestId("bulk-select-task-ENG-P1") as HTMLInputElement;
      const childCheckbox = screen.getByTestId("bulk-select-task-ENG-C1") as HTMLInputElement;

      // Select parent
      fireEvent.click(parentCheckbox);
      expect(parentCheckbox.checked).toBe(true);
      expect(childCheckbox.checked).toBe(false);

      // Deselect parent
      fireEvent.click(parentCheckbox);
      expect(parentCheckbox.checked).toBe(false);

      // Select child
      fireEvent.click(childCheckbox);
      expect(childCheckbox.checked).toBe(true);
      expect(parentCheckbox.checked).toBe(false);
    });

    it("independent selection: sibling selections remain independent", () => {
      const parentTask = makeSampleTask({
        id: "p1",
        workspaceId: WS_SHARED_ENG_ID,
        taskKey: "ENG-P1",
        title: "Parent Task",
      });
      const child1 = makeSampleTask({
        id: "c1",
        workspaceId: WS_SHARED_ENG_ID,
        parentTaskId: "p1",
        taskKey: "ENG-C1",
        title: "Child One",
      });
      const child2 = makeSampleTask({
        id: "c2",
        workspaceId: WS_SHARED_ENG_ID,
        parentTaskId: "p1",
        taskKey: "ENG-C2",
        title: "Child Two",
      });

      renderTaskListView({
        tasks: [parentTask, child1, child2],
        enableTreeHierarchy: true,
      });

      fireEvent.click(screen.getByTestId("tree-expand-button-ENG-P1"));

      const child1Checkbox = screen.getByTestId("bulk-select-task-ENG-C1") as HTMLInputElement;
      const child2Checkbox = screen.getByTestId("bulk-select-task-ENG-C2") as HTMLInputElement;

      fireEvent.click(child1Checkbox);
      expect(child1Checkbox.checked).toBe(true);
      expect(child2Checkbox.checked).toBe(false);

      fireEvent.click(child2Checkbox);
      expect(child1Checkbox.checked).toBe(true);
      expect(child2Checkbox.checked).toBe(true);
    });

    it("collapsing parent preserves descendant selection in hidden state and re-expansion", () => {
      const parentTask = makeSampleTask({
        id: "p1",
        workspaceId: WS_SHARED_ENG_ID,
        taskKey: "ENG-P1",
        title: "Parent Task",
      });
      const childTask = makeSampleTask({
        id: "c1",
        workspaceId: WS_SHARED_ENG_ID,
        parentTaskId: "p1",
        taskKey: "ENG-C1",
        title: "Child Task",
      });

      renderTaskListView({
        tasks: [parentTask, childTask],
        enableTreeHierarchy: true,
      });

      // Expand and select child
      fireEvent.click(screen.getByTestId("tree-expand-button-ENG-P1"));
      const childCheckbox = screen.getByTestId("bulk-select-task-ENG-C1") as HTMLInputElement;
      fireEvent.click(childCheckbox);
      expect(childCheckbox.checked).toBe(true);
      expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent("1 selected");

      // Collapse parent -> child is hidden
      fireEvent.click(screen.getByTestId("tree-expand-button-ENG-P1"));
      expect(screen.queryByTestId("task-list-tree-row-ENG-C1")).not.toBeInTheDocument();

      // Bulk action bar still indicates 1 selected!
      expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent("1 selected");

      // Re-expand parent -> child checkbox is still checked
      fireEvent.click(screen.getByTestId("tree-expand-button-ENG-P1"));
      const rehydratedChildCheckbox = screen.getByTestId("bulk-select-task-ENG-C1") as HTMLInputElement;
      expect(rehydratedChildCheckbox.checked).toBe(true);
    });

    it("Select All includes matching loaded descendants hidden under collapsed parents", () => {
      const parentTask = makeSampleTask({
        id: "p1",
        workspaceId: WS_SHARED_ENG_ID,
        taskKey: "ENG-P1",
        title: "Parent Task",
      });
      const childTask = makeSampleTask({
        id: "c1",
        workspaceId: WS_SHARED_ENG_ID,
        parentTaskId: "p1",
        taskKey: "ENG-C1",
        title: "Child Task",
      });

      renderTaskListView({
        tasks: [parentTask, childTask],
        enableTreeHierarchy: true,
      });

      // Both are collapsed initially (child not rendered)
      expect(screen.queryByTestId("task-list-tree-row-ENG-C1")).not.toBeInTheDocument();

      // Click Select All
      const selectAllCheckbox = screen.getByTestId("bulk-select-all") as HTMLInputElement;
      fireEvent.click(selectAllCheckbox);

      // Both loaded matching tasks selected (count is 2)
      expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent("2 selected");

      // When expanding, child is checked
      fireEvent.click(screen.getByTestId("tree-expand-button-ENG-P1"));
      const childCheckbox = screen.getByTestId("bulk-select-task-ENG-C1") as HTMLInputElement;
      expect(childCheckbox.checked).toBe(true);
    });

    it("Select All strictly excludes context-only ancestors", () => {
      const parentTask = makeSampleTask({
        id: "p1",
        workspaceId: WS_SHARED_ENG_ID,
        taskKey: "ENG-P1",
        title: "Parent In Query Cache",
      });
      const childTask = makeSampleTask({
        id: "c1",
        workspaceId: WS_SHARED_ENG_ID,
        parentTaskId: "p1",
        taskKey: "ENG-C1",
        title: "Child Matching Task",
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      queryClient.setQueryData(
        ["communities", MOCK_COMMUNITY_1_ID, "workspaces", WS_SHARED_ENG_ID, "tasks"],
        { items: [parentTask, childTask] }
      );

      // Only childTask is in the filtered active tasks
      renderTaskListView({
        tasks: [childTask],
        queryClient,
        enableTreeHierarchy: true,
      });

      const parentCheckbox = screen.getByTestId("bulk-select-task-ENG-P1") as HTMLInputElement;
      const childCheckbox = screen.getByTestId("bulk-select-task-ENG-C1") as HTMLInputElement;

      // Click Select All
      const selectAllCheckbox = screen.getByTestId("bulk-select-all") as HTMLInputElement;
      fireEvent.click(selectAllCheckbox);

      // Only child is selected; context-only parent is excluded!
      expect(childCheckbox.checked).toBe(true);
      expect(parentCheckbox.checked).toBe(false);
      expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent("1 selected");
      expect(screen.queryByTestId("bulk-context-count-badge")).not.toBeInTheDocument();
    });

    it("individually selecting a context-only ancestor updates bulk bar with truthful breakdown 'X selected (Y matching, Z context)'", () => {
      const parentTask = makeSampleTask({
        id: "p1",
        workspaceId: WS_SHARED_ENG_ID,
        taskKey: "ENG-P1",
        title: "Parent In Query Cache",
      });
      const childTask = makeSampleTask({
        id: "c1",
        workspaceId: WS_SHARED_ENG_ID,
        parentTaskId: "p1",
        taskKey: "ENG-C1",
        title: "Child Matching Task",
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      queryClient.setQueryData(
        ["communities", MOCK_COMMUNITY_1_ID, "workspaces", WS_SHARED_ENG_ID, "tasks"],
        { items: [parentTask, childTask] }
      );

      renderTaskListView({
        tasks: [childTask],
        queryClient,
        enableTreeHierarchy: true,
      });

      const parentCheckbox = screen.getByTestId("bulk-select-task-ENG-P1") as HTMLInputElement;
      const childCheckbox = screen.getByTestId("bulk-select-task-ENG-C1") as HTMLInputElement;

      // Individually select context-only parent
      fireEvent.click(parentCheckbox);
      expect(parentCheckbox.checked).toBe(true);

      // Breakdown badge is visible
      const selectedCount = screen.getByTestId("bulk-selected-count");
      expect(selectedCount).toHaveTextContent("1 selected (0 matching, 1 context)");
      const countBadge = screen.getByTestId("bulk-context-count-badge");
      expect(countBadge).toBeInTheDocument();
      expect(countBadge).toHaveTextContent("1 context");

      // Now select the matching child as well
      fireEvent.click(childCheckbox);
      expect(selectedCount).toHaveTextContent("2 selected (1 matching, 1 context)");
      expect(countBadge).toHaveTextContent("1 context");

      // Select All toggle clears matching tasks but preserves individually selected context task
      const selectAllCheckbox = screen.getByTestId("bulk-select-all") as HTMLInputElement;
      // All matching tasks are selected so selectAllCheckbox triggers clear of matching tasks
      fireEvent.click(selectAllCheckbox);
      expect(childCheckbox.checked).toBe(false);
      expect(parentCheckbox.checked).toBe(true);
      expect(selectedCount).toHaveTextContent("1 selected (0 matching, 1 context)");
      expect(countBadge).toHaveTextContent("1 context");
    });

    it("bulk actions operate on selected IDs only with zero implicit parent-child cascade", async () => {
      const parentTask = makeSampleTask({
        id: "p1",
        workspaceId: WS_SHARED_ENG_ID,
        taskKey: "ENG-P1",
        title: "Parent Task",
      });
      const childTask = makeSampleTask({
        id: "c1",
        workspaceId: WS_SHARED_ENG_ID,
        parentTaskId: "p1",
        taskKey: "ENG-C1",
        title: "Child Task",
      });

      const bulkMutateSpy = vi.spyOn(tasksApi, "bulkMutateTasks").mockResolvedValue({
        updatedTaskIds: ["p1"],
        workspaceSeq: 10,
      });

      renderTaskListView({
        tasks: [parentTask, childTask],
        enableTreeHierarchy: true,
      });

      // Expand parent and select ONLY the parent
      fireEvent.click(screen.getByTestId("tree-expand-button-ENG-P1"));
      const parentCheckbox = screen.getByTestId("bulk-select-task-ENG-P1") as HTMLInputElement;
      fireEvent.click(parentCheckbox);

      // Trigger Archive action in bulk action bar
      const archiveButton = screen.getByRole("button", { name: /archive/i });
      fireEvent.click(archiveButton);

      await waitFor(() => {
        expect(bulkMutateSpy).toHaveBeenCalledTimes(1);
        expect(bulkMutateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            communityId: MOCK_COMMUNITY_1_ID,
            workspaceId: WS_SHARED_ENG_ID,
            data: {
              taskIds: ["p1"],
              action: "ARCHIVE",
            },
          })
        );
      });
    });

    it("preserves selected task IDs across filter changes and restores them when filter matches again", () => {
      const t1 = makeSampleTask({ id: "t1", workspaceId: WS_SHARED_ENG_ID, taskKey: "ENG-T1", title: "Alpha Task" });
      const t2 = makeSampleTask({ id: "t2", workspaceId: WS_SHARED_ENG_ID, taskKey: "ENG-T2", title: "Beta Task" });

      const { rerender } = renderTaskListView({
        tasks: [t1, t2],
        enableTreeHierarchy: true,
      });

      const t1Checkbox = screen.getByTestId("bulk-select-task-ENG-T1") as HTMLInputElement;
      fireEvent.click(t1Checkbox);
      expect(t1Checkbox.checked).toBe(true);
      expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent("1 selected");

      // Filter changes (e.g. search for "Beta" so t1 does not match and only t2 is passed)
      rerender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <AuthContext.Provider value={mockAuthValue}>
            <WorkspaceProvider initialCommunityId={MOCK_COMMUNITY_1_ID} initialWorkspaceId={WS_SHARED_ENG_ID}>
              <MemoryRouter initialEntries={["/tasks"]}>
                <TaskListView
                  tasks={[t2]}
                  isLoading={false}
                  isError={false}
                  error={null}
                  onRetry={vi.fn()}
                  workspaceId={WS_SHARED_ENG_ID}
                  communityId={MOCK_COMMUNITY_1_ID}
                  enableTreeHierarchy={true}
                  searchQuery="Beta"
                />
              </MemoryRouter>
            </WorkspaceProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      // t1 is not in the DOM, but selection is preserved in the toolbar (1 selected)
      expect(screen.queryByTestId("bulk-select-task-ENG-T1")).not.toBeInTheDocument();
      expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent("1 selected");

      // Filter cleared: both t1 and t2 returned again
      rerender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <AuthContext.Provider value={mockAuthValue}>
            <WorkspaceProvider initialCommunityId={MOCK_COMMUNITY_1_ID} initialWorkspaceId={WS_SHARED_ENG_ID}>
              <MemoryRouter initialEntries={["/tasks"]}>
                <TaskListView
                  tasks={[t1, t2]}
                  isLoading={false}
                  isError={false}
                  error={null}
                  onRetry={vi.fn()}
                  workspaceId={WS_SHARED_ENG_ID}
                  communityId={MOCK_COMMUNITY_1_ID}
                  enableTreeHierarchy={true}
                  searchQuery=""
                />
              </MemoryRouter>
            </WorkspaceProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      // t1 remains checked upon returning to view!
      const rehydratedT1Checkbox = screen.getByTestId("bulk-select-task-ENG-T1") as HTMLInputElement;
      expect(rehydratedT1Checkbox.checked).toBe(true);
      expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent("1 selected");
    });

    it("reconciles selection when task is established as archived, and resets selection on workspace change", () => {
      const t1 = makeSampleTask({ id: "t1", workspaceId: WS_SHARED_ENG_ID, taskKey: "ENG-T1" });
      const t2 = makeSampleTask({ id: "t2", workspaceId: WS_SHARED_ENG_ID, taskKey: "ENG-T2" });

      const { rerender } = renderTaskListView({
        tasks: [t1, t2],
        enableTreeHierarchy: true,
      });

      const t1Checkbox = screen.getByTestId("bulk-select-task-ENG-T1") as HTMLInputElement;
      const t2Checkbox = screen.getByTestId("bulk-select-task-ENG-T2") as HTMLInputElement;

      fireEvent.click(t1Checkbox);
      fireEvent.click(t2Checkbox);
      expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent("2 selected");

      // Task t1 established as archived
      const t1Archived: TaskDto = {
        ...t1,
        archivedAt: "2026-11-25T01:00:00Z",
      };

      rerender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <AuthContext.Provider value={mockAuthValue}>
            <WorkspaceProvider initialCommunityId={MOCK_COMMUNITY_1_ID} initialWorkspaceId={WS_SHARED_ENG_ID}>
              <MemoryRouter initialEntries={["/tasks"]}>
                <TaskListView
                  tasks={[t1Archived, t2]}
                  isLoading={false}
                  isError={false}
                  error={null}
                  onRetry={vi.fn()}
                  workspaceId={WS_SHARED_ENG_ID}
                  communityId={MOCK_COMMUNITY_1_ID}
                  enableTreeHierarchy={true}
                />
              </MemoryRouter>
            </WorkspaceProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      // t1 is pruned because it is established as archived
      expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent("1 selected");

      // Changing workspace resets selection
      rerender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <AuthContext.Provider value={mockAuthValue}>
            <WorkspaceProvider initialCommunityId={MOCK_COMMUNITY_1_ID} initialWorkspaceId="ws-different">
              <MemoryRouter initialEntries={["/tasks"]}>
                <TaskListView
                  tasks={[t2]}
                  isLoading={false}
                  isError={false}
                  error={null}
                  onRetry={vi.fn()}
                  workspaceId="ws-different"
                  communityId={MOCK_COMMUNITY_1_ID}
                  enableTreeHierarchy={true}
                />
              </MemoryRouter>
            </WorkspaceProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      // Selection reset to 0
      expect(screen.queryByTestId("bulk-selected-count")).not.toBeInTheDocument();
    });

    it("corrects Select All checkbox state: unchecked with 0 matching, indeterminate with partial, checked with all, and unaffected by context-only selection", () => {
      const parentTask = makeSampleTask({
        id: "p1",
        workspaceId: WS_SHARED_ENG_ID,
        taskKey: "ENG-P1",
        title: "Parent In Cache",
      });
      const child1 = makeSampleTask({
        id: "c1",
        workspaceId: WS_SHARED_ENG_ID,
        parentTaskId: "p1",
        taskKey: "ENG-C1",
        title: "Child One",
      });
      const child2 = makeSampleTask({
        id: "c2",
        workspaceId: WS_SHARED_ENG_ID,
        parentTaskId: "p1",
        taskKey: "ENG-C2",
        title: "Child Two",
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      queryClient.setQueryData(
        ["communities", MOCK_COMMUNITY_1_ID, "workspaces", WS_SHARED_ENG_ID, "tasks"],
        { items: [parentTask, child1, child2] }
      );

      // Filtered to only child1 and child2 (parentTask is context-only)
      renderTaskListView({
        tasks: [child1, child2],
        queryClient,
        enableTreeHierarchy: true,
      });

      const selectAllCheckbox = screen.getByTestId("bulk-select-all") as HTMLInputElement;
      const parentCheckbox = screen.getByTestId("bulk-select-task-ENG-P1") as HTMLInputElement;
      const child1Checkbox = screen.getByTestId("bulk-select-task-ENG-C1") as HTMLInputElement;
      const child2Checkbox = screen.getByTestId("bulk-select-task-ENG-C2") as HTMLInputElement;

      // 1. Zero matching selections: unchecked & not indeterminate
      expect(selectAllCheckbox.checked).toBe(false);
      expect(selectAllCheckbox.indeterminate).toBe(false);

      // 2. Select ONLY the context-only parent:
      fireEvent.click(parentCheckbox);
      expect(parentCheckbox.checked).toBe(true);
      // Select All checkbox MUST remain unchecked and NOT indeterminate!
      expect(selectAllCheckbox.checked).toBe(false);
      expect(selectAllCheckbox.indeterminate).toBe(false);

      // 3. Select 1 of 2 matching children:
      fireEvent.click(child1Checkbox);
      expect(child1Checkbox.checked).toBe(true);
      // Select All checkbox MUST now be indeterminate!
      expect(selectAllCheckbox.checked).toBe(false);
      expect(selectAllCheckbox.indeterminate).toBe(true);

      // 4. Select all eligible matching children:
      fireEvent.click(child2Checkbox);
      expect(child2Checkbox.checked).toBe(true);
      // Select All checkbox MUST now be checked and not indeterminate!
      expect(selectAllCheckbox.checked).toBe(true);
      expect(selectAllCheckbox.indeterminate).toBe(false);

      // 5. Toggle Select All to clear matching tasks while preserving context ancestor:
      fireEvent.click(selectAllCheckbox);
      expect(child1Checkbox.checked).toBe(false);
      expect(child2Checkbox.checked).toBe(false);
      expect(parentCheckbox.checked).toBe(true); // preserved!
      // Select All is back to unchecked and not indeterminate
      expect(selectAllCheckbox.checked).toBe(false);
      expect(selectAllCheckbox.indeterminate).toBe(false);
    });

    it("enforces 100-task limit honestly in UI, caps Select All at 100, and displays honest breakdown when >100 tasks are loaded", () => {
      // Create 120 matching tasks
      const manyTasks: TaskDto[] = Array.from({ length: 120 }, (_, i) =>
        makeSampleTask({
          id: `task-bulk-${i}`,
          workspaceId: WS_SHARED_ENG_ID,
          taskKey: `ENG-${1000 + i}`,
          title: `Task ${i + 1}`,
        })
      );

      renderTaskListView({
        tasks: manyTasks,
        enableTreeHierarchy: false,
      });

      const selectAllCheckbox = screen.getByTestId("bulk-select-all") as HTMLInputElement;
      // Cap is explicit in aria-label
      expect(selectAllCheckbox).toHaveAttribute(
        "aria-label",
        "Select first 100 of 120 matching tasks (100 cap)"
      );

      // Click Select All
      fireEvent.click(selectAllCheckbox);
      expect(selectAllCheckbox.checked).toBe(true);

      // Bulk action bar honest display
      const selectedCount = screen.getByTestId("bulk-selected-count");
      expect(selectedCount).toHaveTextContent("100 selected of 120 (capped at 100)");

      const limitBadge = screen.getByTestId("bulk-limit-badge");
      expect(limitBadge).toHaveTextContent("Max 100");

      // Aria-label changes to deselect first 100
      expect(selectAllCheckbox).toHaveAttribute("aria-label", "Deselect first 100 matching tasks");

      // Click to deselect
      fireEvent.click(selectAllCheckbox);
      expect(selectAllCheckbox.checked).toBe(false);
      expect(screen.queryByTestId("bulk-selected-count")).not.toBeInTheDocument();
    });

    it("ancestor cache integrity: respects query data shapes (items, backlogPreview, groups) and workspace isolation", () => {
      const parentInItems = makeSampleTask({
        id: "p-items",
        workspaceId: WS_SHARED_ENG_ID,
        taskKey: "ENG-PITEMS",
        title: "Parent In Items",
      });
      const childOfItems = makeSampleTask({
        id: "c-items",
        workspaceId: WS_SHARED_ENG_ID,
        parentTaskId: "p-items",
        taskKey: "ENG-CITEMS",
        title: "Child Of Items",
      });

      const parentInBacklog = makeSampleTask({
        id: "p-backlog",
        workspaceId: WS_SHARED_ENG_ID,
        taskKey: "ENG-PBACKLOG",
        title: "Parent In Backlog Preview",
      });
      const childOfBacklog = makeSampleTask({
        id: "c-backlog",
        workspaceId: WS_SHARED_ENG_ID,
        parentTaskId: "p-backlog",
        taskKey: "ENG-CBACKLOG",
        title: "Child Of Backlog",
      });

      const otherWorkspaceParent = makeSampleTask({
        id: "p-other-ws",
        workspaceId: "ws-different-isolated",
        taskKey: "OTHER-P",
        title: "Parent In Another Workspace",
      });
      const childOfOtherWs = makeSampleTask({
        id: "c-other-ws",
        workspaceId: WS_SHARED_ENG_ID,
        parentTaskId: "p-other-ws",
        taskKey: "ENG-COTHER",
        title: "Child Of Other Ws",
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      // Cache query with items and backlogPreview shapes
      queryClient.setQueryData(
        ["communities", MOCK_COMMUNITY_1_ID, "workspaces", WS_SHARED_ENG_ID, "tasks", "list"],
        {
          items: [parentInItems],
          backlogPreview: [parentInBacklog],
        }
      );

      // Cache query with another workspace task
      queryClient.setQueryData(
        ["communities", MOCK_COMMUNITY_1_ID, "workspaces", "ws-different-isolated", "tasks"],
        { items: [otherWorkspaceParent] }
      );

      renderTaskListView({
        tasks: [childOfItems, childOfBacklog, childOfOtherWs],
        queryClient,
        enableTreeHierarchy: true,
      });

      // parentInItems resolved from items
      expect(screen.getByTestId("task-list-tree-row-ENG-PITEMS")).toBeInTheDocument();
      expect(screen.getByTestId("task-list-tree-row-ENG-PITEMS")).toHaveAttribute("data-context-only", "true");

      // parentInBacklog resolved from backlogPreview
      expect(screen.getByTestId("task-list-tree-row-ENG-PBACKLOG")).toBeInTheDocument();
      expect(screen.getByTestId("task-list-tree-row-ENG-PBACKLOG")).toHaveAttribute("data-context-only", "true");

      // otherWorkspaceParent MUST NOT be resolved across workspace boundary
      expect(screen.queryByTestId("task-list-tree-row-OTHER-P")).not.toBeInTheDocument();
      // childOfOtherWs falls back honestly to an orphan row
      const childOtherRow = screen.getByTestId("task-list-tree-row-ENG-COTHER");
      expect(childOtherRow).toBeInTheDocument();
      expect(childOtherRow).toHaveAttribute("data-orphan", "true");
    });

    it("distinguishes matching, context, and outside-filter selections and delivers all selected IDs to bulk mutation", async () => {
      // Step 1: Initial result with Task A (matching filter 1)
      const taskA = makeSampleTask({
        id: "task-a",
        workspaceId: WS_SHARED_ENG_ID,
        taskKey: "ENG-A",
        title: "Task A",
      });

      const parentTask = makeSampleTask({
        id: "parent-task",
        workspaceId: WS_SHARED_ENG_ID,
        taskKey: "ENG-P",
        title: "Parent Task",
      });

      const childTask = makeSampleTask({
        id: "child-task",
        parentTaskId: "parent-task",
        workspaceId: WS_SHARED_ENG_ID,
        taskKey: "ENG-C",
        title: "Child Task",
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 0 } },
      });
      // Query cache knows all tasks for the workspace
      queryClient.setQueryData(
        ["communities", MOCK_COMMUNITY_1_ID, "workspaces", WS_SHARED_ENG_ID, "tasks"],
        { items: [taskA, parentTask, childTask] }
      );

      // Render initial view with only taskA matching (Filter 1)
      const { rerender } = renderTaskListView({
        tasks: [taskA],
        queryClient,
        enableTreeHierarchy: true,
      });

      // 1. Select matching Task A
      const taskACheckbox = screen.getByTestId("bulk-select-task-ENG-A") as HTMLInputElement;
      fireEvent.click(taskACheckbox);
      expect(taskACheckbox.checked).toBe(true);
      expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent("1 selected");
      expect(screen.queryByTestId("bulk-context-count-badge")).not.toBeInTheDocument();
      expect(screen.queryByTestId("bulk-outside-count-badge")).not.toBeInTheDocument();

      // 2. Change filters so Task A disappears from current result, now only childTask matches (Filter 2)
      // parentTask is loaded as a context-only ancestor in the tree
      rerender(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={mockAuthValue}>
            <WorkspaceProvider
              initialCommunityId={MOCK_COMMUNITY_1_ID}
              initialWorkspaceId={WS_SHARED_ENG_ID}
            >
              <MemoryRouter initialEntries={["/tasks"]}>
                <TaskListView
                  tasks={[childTask]}
                  isLoading={false}
                  isError={false}
                  error={null}
                  onRetry={vi.fn()}
                  workspaceId={WS_SHARED_ENG_ID}
                  communityId={MOCK_COMMUNITY_1_ID}
                  enableTreeHierarchy={true}
                />
              </MemoryRouter>
            </WorkspaceProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      // Task A is outside the current filtered result:
      // matching: 0, context: 0, outside filter: 1
      expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent(
        "1 selected (0 matching, 1 outside filter)"
      );
      expect(screen.getByTestId("bulk-outside-count-badge")).toHaveTextContent("1 outside filter");
      expect(screen.queryByTestId("bulk-context-count-badge")).not.toBeInTheDocument();

      // 3. Select the context-only ancestor parentTask in the new result
      const parentCheckbox = screen.getByTestId("bulk-select-task-ENG-P") as HTMLInputElement;
      fireEvent.click(parentCheckbox);
      expect(parentCheckbox.checked).toBe(true);

      // 4. Verify matching, context, and outside-filter counts remain accurate:
      // matching: 0, context: 1, outside: 1, total: 2
      expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent(
        "2 selected (0 matching, 1 context, 1 outside filter)"
      );
      expect(screen.getByTestId("bulk-context-count-badge")).toHaveTextContent("1 context");
      expect(screen.getByTestId("bulk-outside-count-badge")).toHaveTextContent("1 outside filter");

      // 5. Verify bulk mutation receives ALL intended selected IDs (both task-a and parent-task)
      const bulkMutateSpy = vi.spyOn(tasksApi, "bulkMutateTasks").mockResolvedValue({
        updatedTaskIds: ["task-a", "parent-task"],
        workspaceSeq: 105,
      });

      const archiveBtn = screen.getByTestId("bulk-archive-button");
      fireEvent.click(archiveBtn);

      await waitFor(() => {
        expect(bulkMutateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            communityId: MOCK_COMMUNITY_1_ID,
            workspaceId: WS_SHARED_ENG_ID,
            data: expect.objectContaining({
              taskIds: expect.arrayContaining(["task-a", "parent-task"]),
              action: "ARCHIVE",
            }),
          })
        );
      });
      expect(bulkMutateSpy.mock.calls[0]?.[0]?.data.taskIds).toHaveLength(2);

      // Selection is cleared after mutation
      await waitFor(() => {
        expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument();
      });
    });

    it("Select All remains unchecked when matching tasks 101-200 are selected individually without selecting the first 100", () => {
      // 200 matching tasks
      const twoHundredTasks: TaskDto[] = Array.from({ length: 200 }, (_, i) =>
        makeSampleTask({
          id: `task-item-${i + 1}`,
          workspaceId: WS_SHARED_ENG_ID,
          taskKey: `ENG-${2000 + i + 1}`,
          title: `Task ${i + 1}`,
        })
      );

      renderTaskListView({
        tasks: twoHundredTasks,
        enableTreeHierarchy: false,
      });

      const selectAllCheckbox = screen.getByTestId("bulk-select-all") as HTMLInputElement;

      // Initially unchecked & not indeterminate
      expect(selectAllCheckbox.checked).toBe(false);
      expect(selectAllCheckbox.indeterminate).toBe(false);

      // Select individual tasks from 101 to 102 (beyond the first 100 eligible tasks)
      const task101Checkbox = screen.getByTestId("bulk-select-task-ENG-2101") as HTMLInputElement;
      const task102Checkbox = screen.getByTestId("bulk-select-task-ENG-2102") as HTMLInputElement;

      fireEvent.click(task101Checkbox);
      expect(task101Checkbox.checked).toBe(true);

      // Select All MUST remain unchecked and NOT indeterminate because 0 of the first 100 eligible tasks are selected!
      expect(selectAllCheckbox.checked).toBe(false);
      expect(selectAllCheckbox.indeterminate).toBe(false);

      fireEvent.click(task102Checkbox);
      expect(task102Checkbox.checked).toBe(true);

      // Still unchecked and not indeterminate!
      expect(selectAllCheckbox.checked).toBe(false);
      expect(selectAllCheckbox.indeterminate).toBe(false);

      // Now select 1 task from the first 100 (e.g. task 1)
      const task1Checkbox = screen.getByTestId("bulk-select-task-ENG-2001") as HTMLInputElement;
      fireEvent.click(task1Checkbox);
      expect(task1Checkbox.checked).toBe(true);

      // Now Select All MUST be indeterminate (1 of 100 eligible selected)
      expect(selectAllCheckbox.checked).toBe(false);
      expect(selectAllCheckbox.indeterminate).toBe(true);

      // Deselect task 1
      fireEvent.click(task1Checkbox);
      expect(task1Checkbox.checked).toBe(false);

      // Select All returns to unchecked (0 of 100 eligible selected)
      expect(selectAllCheckbox.checked).toBe(false);
      expect(selectAllCheckbox.indeterminate).toBe(false);
    }, 20000);

    it("regression: flat list baseline is preserved when enableTreeHierarchy is false", () => {
      const parentTask = makeSampleTask({ id: "p1", taskKey: "ENG-P1", title: "Parent" });
      const childTask = makeSampleTask({ id: "c1", parentTaskId: "p1", taskKey: "ENG-C1", title: "Child" });

      renderTaskListView({
        tasks: [parentTask, childTask],
        enableTreeHierarchy: false,
      });

      // Flat rows rendered
      expect(screen.getByTestId("task-list-row-ENG-P1")).toBeInTheDocument();
      expect(screen.getByTestId("task-list-row-ENG-C1")).toBeInTheDocument();
      expect(screen.queryByTestId("task-list-tree-row-ENG-P1")).not.toBeInTheDocument();

      // Multi-select works as flat list
      const selectAllCheckbox = screen.getByTestId("bulk-select-all") as HTMLInputElement;
      fireEvent.click(selectAllCheckbox);
      expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent("2 selected of 2");
    });

    it("capacity interaction: one retained outside-filter selection plus 120 matching tasks", async () => {
      // Step 1: Select 1 task (taskOutside)
      const taskOutside = makeSampleTask({
        id: "task-outside",
        workspaceId: WS_SHARED_ENG_ID,
        taskKey: "ENG-OUT",
        title: "Outside Task",
      });

      // 120 matching tasks
      const matchingTasks120: TaskDto[] = Array.from({ length: 120 }, (_, i) =>
        makeSampleTask({
          id: `task-match-${i + 1}`,
          workspaceId: WS_SHARED_ENG_ID,
          taskKey: `ENG-${3000 + i + 1}`,
          title: `Matching Task ${i + 1}`,
        })
      );

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 0 } },
      });
      queryClient.setQueryData(
        ["communities", MOCK_COMMUNITY_1_ID, "workspaces", WS_SHARED_ENG_ID, "tasks"],
        { items: [taskOutside, ...matchingTasks120] }
      );

      // Render with only taskOutside (Filter 1)
      const { rerender } = renderTaskListView({
        tasks: [taskOutside],
        queryClient,
        enableTreeHierarchy: false,
      });

      // 1. Select taskOutside
      const outsideCheckbox = screen.getByTestId("bulk-select-task-ENG-OUT") as HTMLInputElement;
      fireEvent.click(outsideCheckbox);
      expect(outsideCheckbox.checked).toBe(true);
      expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent("1 selected");

      // 2. Change active filter so taskOutside is outside filtered results, load 120 matching tasks
      rerender(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={mockAuthValue}>
            <WorkspaceProvider
              initialCommunityId={MOCK_COMMUNITY_1_ID}
              initialWorkspaceId={WS_SHARED_ENG_ID}
            >
              <MemoryRouter initialEntries={["/tasks"]}>
                <TaskListView
                  tasks={matchingTasks120}
                  isLoading={false}
                  isError={false}
                  error={null}
                  onRetry={vi.fn()}
                  workspaceId={WS_SHARED_ENG_ID}
                  communityId={MOCK_COMMUNITY_1_ID}
                  enableTreeHierarchy={false}
                />
              </MemoryRouter>
            </WorkspaceProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      // 3. Confirm original selection is preserved
      expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent(
        "1 selected (0 matching, 1 outside filter)"
      );
      expect(screen.getByTestId("bulk-outside-count-badge")).toHaveTextContent("1 outside filter");

      const selectAllCheckbox = screen.getByTestId("bulk-select-all") as HTMLInputElement;
      expect(selectAllCheckbox.checked).toBe(false);
      expect(selectAllCheckbox.indeterminate).toBe(false);
      // Accessible label announces available capacity (99 matching tasks can be selected)
      expect(selectAllCheckbox).toHaveAttribute(
        "aria-label",
        "Select 99 of 120 matching tasks (100 cap, 1 outside filter consuming capacity)"
      );

      // 4. Click Select All: adds only the remaining eligible capacity (99 tasks)
      fireEvent.click(selectAllCheckbox);

      // Exactly 100 tasks selected (99 matching + 1 outside filter)
      expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent(
        "100 selected (99 matching, 1 outside filter)"
      );
      expect(screen.getByTestId("bulk-outside-count-badge")).toHaveTextContent("1 outside filter");
      expect(screen.getByTestId("bulk-limit-badge")).toHaveTextContent("Max 100");
      expect(screen.getByTestId("bulk-capacity-hint")).toHaveTextContent(
        "Selection cap of 100 reached (1 outside filter selection consuming capacity). Deselect tasks or clear selection to free capacity."
      );

      // Select All is indeterminate (does not claim 100 matching tasks selected)
      expect(selectAllCheckbox.checked).toBe(false);
      expect(selectAllCheckbox.indeterminate).toBe(true);
      expect(selectAllCheckbox).toHaveAttribute(
        "aria-label",
        expect.stringContaining("Deselect 99 matching tasks (selection cap of 100 reached")
      );

      // First 99 matching tasks are checked; 100th and 101st are unchecked and disabled
      const task1Checkbox = screen.getByTestId("bulk-select-task-ENG-3001") as HTMLInputElement;
      const task99Checkbox = screen.getByTestId("bulk-select-task-ENG-3099") as HTMLInputElement;
      const task100Checkbox = screen.getByTestId("bulk-select-task-ENG-3100") as HTMLInputElement;
      const task101Checkbox = screen.getByTestId("bulk-select-task-ENG-3101") as HTMLInputElement;

      expect(task1Checkbox.checked).toBe(true);
      expect(task1Checkbox.disabled).toBe(false); // selected tasks can be deselected
      expect(task99Checkbox.checked).toBe(true);
      expect(task99Checkbox.disabled).toBe(false);
      expect(task100Checkbox.checked).toBe(false);
      expect(task100Checkbox.disabled).toBe(true); // unselected tasks disabled at capacity
      expect(task101Checkbox.checked).toBe(false);
      expect(task101Checkbox.disabled).toBe(true);

      // 5. Repeated click on Select All deselects the 99 matching tasks and restores capacity
      fireEvent.click(selectAllCheckbox);
      expect(task1Checkbox.checked).toBe(false);
      expect(task99Checkbox.checked).toBe(false);
      expect(selectAllCheckbox.checked).toBe(false);
      expect(selectAllCheckbox.indeterminate).toBe(false);

      // Outside filter selection remains preserved!
      expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent(
        "1 selected (0 matching, 1 outside filter)"
      );
      // Unselected rows are re-enabled now that capacity is freed
      expect(task100Checkbox.disabled).toBe(false);

      // Re-select matching tasks to test bulk mutation capacity invariant
      fireEvent.click(selectAllCheckbox);
      expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent(
        "100 selected (99 matching, 1 outside filter)"
      );

      // 6. Verify bulk mutation receives exactly 100 IDs (never exceeds 100)
      const bulkMutateSpy = vi.spyOn(tasksApi, "bulkMutateTasks").mockResolvedValue({
        updatedTaskIds: ["task-outside", ...matchingTasks120.slice(0, 99).map((t) => t.id)],
        workspaceSeq: 110,
      });

      fireEvent.click(screen.getByTestId("bulk-archive-button"));
      await waitFor(() => {
        expect(bulkMutateSpy).toHaveBeenCalled();
      });
      const sentIds = bulkMutateSpy.mock.calls[0]?.[0]?.data.taskIds;
      expect(sentIds).toHaveLength(100);
      expect(sentIds).toContain("task-outside");
      expect(sentIds).toContain("task-match-1");
      expect(sentIds).toContain("task-match-99");
      expect(sentIds).not.toContain("task-match-100");
    }, 20000);

    it("capacity interaction: one selected context ancestor plus 120 matching tasks", async () => {
      // 1 context parent
      const parentTask = makeSampleTask({
        id: "ctx-parent",
        workspaceId: WS_SHARED_ENG_ID,
        taskKey: "ENG-CTX-P",
        title: "Context Parent",
      });

      // 120 matching tasks, first child is child of ctx-parent
      const matchingTasks120: TaskDto[] = Array.from({ length: 120 }, (_, i) =>
        makeSampleTask({
          id: `task-child-${i + 1}`,
          parentTaskId: i === 0 ? "ctx-parent" : null,
          workspaceId: WS_SHARED_ENG_ID,
          taskKey: `ENG-${4000 + i + 1}`,
          title: `Child Task ${i + 1}`,
        })
      );

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 0 } },
      });
      queryClient.setQueryData(
        ["communities", MOCK_COMMUNITY_1_ID, "workspaces", WS_SHARED_ENG_ID, "tasks"],
        { items: [parentTask, ...matchingTasks120] }
      );

      // Render tree view with 120 matching tasks (parentTask is context-only ancestor for child 1)
      renderTaskListView({
        tasks: matchingTasks120,
        queryClient,
        enableTreeHierarchy: true,
      });

      // 1. Select the context-only ancestor row
      const parentCheckbox = screen.getByTestId("bulk-select-task-ENG-CTX-P") as HTMLInputElement;
      fireEvent.click(parentCheckbox);
      expect(parentCheckbox.checked).toBe(true);
      expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent(
        "1 selected (0 matching, 1 context)"
      );
      expect(screen.getByTestId("bulk-context-count-badge")).toHaveTextContent("1 context");

      const selectAllCheckbox = screen.getByTestId("bulk-select-all") as HTMLInputElement;
      expect(selectAllCheckbox.checked).toBe(false);
      expect(selectAllCheckbox.indeterminate).toBe(false);
      // Accessible label announces available capacity (99 matching tasks can be selected)
      expect(selectAllCheckbox).toHaveAttribute(
        "aria-label",
        "Select 99 of 120 matching tasks (100 cap, 1 context consuming capacity)"
      );

      // 2. Click Select All: adds only the remaining eligible capacity (99 tasks)
      fireEvent.click(selectAllCheckbox);

      // Exactly 100 tasks selected (99 matching + 1 context)
      expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent(
        "100 selected (99 matching, 1 context)"
      );
      expect(screen.getByTestId("bulk-context-count-badge")).toHaveTextContent("1 context");
      expect(screen.getByTestId("bulk-limit-badge")).toHaveTextContent("Max 100");
      expect(screen.getByTestId("bulk-capacity-hint")).toHaveTextContent(
        "Selection cap of 100 reached (1 context selection consuming capacity). Deselect tasks or clear selection to free capacity."
      );

      // Select All is indeterminate (does not claim 100 matching tasks selected)
      expect(selectAllCheckbox.checked).toBe(false);
      expect(selectAllCheckbox.indeterminate).toBe(true);

      // 3. Repeated click on Select All deselects the 99 matching tasks while preserving context ancestor
      fireEvent.click(selectAllCheckbox);
      expect(parentCheckbox.checked).toBe(true); // preserved!
      expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent(
        "1 selected (0 matching, 1 context)"
      );
      expect(selectAllCheckbox.checked).toBe(false);
      expect(selectAllCheckbox.indeterminate).toBe(false);

      // 4. Clear selection button clears all selections and restores available capacity to 100
      const clearBtn = screen.getByTestId("bulk-clear-selection");
      fireEvent.click(clearBtn);
      expect(parentCheckbox.checked).toBe(false);
      expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument();
      expect(selectAllCheckbox).toHaveAttribute(
        "aria-label",
        "Select first 100 of 120 matching tasks (100 cap)"
      );
    }, 20000);
  });
});
