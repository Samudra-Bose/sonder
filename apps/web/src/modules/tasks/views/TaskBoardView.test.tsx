import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
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
import { TaskBoardView, type TaskBoardViewProps } from "./TaskBoardView";
import * as tasksApi from "../api.js";
import type { TaskDto, TaskQueryBucketDto } from "../types";

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

function makeSampleTask(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: "task-1",
    workspaceId: "ws-1",
    parentTaskId: null,
    taskKey: "ENG-101",
    title: "Test Board Task 101",
    description: "Sample description",
    itemType: "TASK",
    statusCategory: "IN_PROGRESS",
    priority: "HIGH",
    assigneeIds: ["user-1"],
    creatorId: "user-1",
    startDate: null,
    dueDate: "2026-11-25",
    estimatePoints: 3,
    labelIds: [],
    milestoneId: null,
    rankKey: "0|hzzzzz:",
    version: 1,
    fieldRevisions: {
      title: 1,
      statusCategory: 1,
      priority: 1,
      assigneeIds: 1,
      dueDate: 1,
    },
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
    assigneeAssignments: [
      {
        userId: "user-1",
        assignedAt: "2026-11-01T10:00:00Z",
        assignedByUserId: "user-1",
        user: {
          id: "user-1",
          displayName: "Alex Morgan",
          avatarUrl: null,
        },
      },
    ],
    assigneeEditableFieldGroups: [],
    ...overrides,
  };
}

function makeSampleGroup(
  key: string,
  label: string,
  items: TaskDto[] = []
): TaskQueryBucketDto {
  return {
    key,
    label,
    total: items.length,
    items,
    nextCursor: null,
    children: [],
  };
}

function renderTaskBoardView(props: Partial<TaskBoardViewProps>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthValue}>
        <WorkspaceProvider
          initialCommunityId={MOCK_COMMUNITY_1_ID}
          initialWorkspaceId={WS_SHARED_ENG_ID}
        >
          <MemoryRouter initialEntries={["/tasks?view=board"]}>
            {children}
            <LocationDisplay />
          </MemoryRouter>
        </WorkspaceProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );

  const defaultProps: TaskBoardViewProps = {
    groups: [
      makeSampleGroup("TODO", "To Do", []),
      makeSampleGroup("IN_PROGRESS", "In Progress", [makeSampleTask()]),
      makeSampleGroup("DONE", "Done", []),
    ],
    isLoading: false,
    isError: false,
    error: null,
    onRetry: vi.fn(),
    workspaceId: WS_SHARED_ENG_ID,
    communityId: MOCK_COMMUNITY_1_ID,
    ...props,
  };

  const utils = render(<TaskBoardView {...defaultProps} />, { wrapper: Wrapper });
  return {
    ...utils,
    rerenderWithProps: (newProps: Partial<TaskBoardViewProps>) =>
      utils.rerender(<TaskBoardView {...defaultProps} {...newProps} />),
  };
}

describe("Stage 5.3C / WP-B: Task Board View Transformation", () => {
  const sampleTask = makeSampleTask();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("WP-B1: Inline Card Editing", () => {
    it("renders all five inline cell primitives directly within the board card", () => {
      renderTaskBoardView({
        groups: [makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask])],
      });

      // Card container
      expect(screen.getByTestId("task-board-card-ENG-101")).toBeInTheDocument();

      // 1. Title cell
      expect(screen.getByTestId("inline-title-cell-task-1")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Edit title: Test Board Task 101/i })).toBeInTheDocument();

      // 2. Status cell
      expect(screen.getByTestId("inline-status-cell-task-1")).toBeInTheDocument();

      // 3. Priority cell
      expect(screen.getByTestId("inline-priority-cell-task-1")).toBeInTheDocument();

      // 4. Assignee cell
      expect(screen.getByTestId("board-card-assignee-ENG-101")).toBeInTheDocument();
      expect(screen.getByTestId("inline-assignee-cell-task-1")).toBeInTheDocument();

      // 5. Due Date cell
      expect(screen.getByTestId("inline-duedate-cell-task-1")).toBeInTheDocument();
    });

    it("clicking title cell enters title editing mode directly inside board card and commits on Enter", async () => {
      vi.spyOn(tasksApi, "updateTask").mockResolvedValue({
        ...sampleTask,
        title: "Updated Board Title",
      });

      renderTaskBoardView({
        groups: [makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask])],
      });

      const titleBtn = screen.getByRole("button", { name: /Edit title: Test Board Task 101/i });
      fireEvent.click(titleBtn);

      const titleInput = screen.getByTestId("inline-title-input-task-1");
      expect(titleInput).toBeInTheDocument();
      expect(titleInput).toHaveFocus();

      fireEvent.change(titleInput, { target: { value: "Updated Board Title" } });
      fireEvent.keyDown(titleInput, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(tasksApi.updateTask).toHaveBeenCalledWith(
          expect.objectContaining({
            taskId: "task-1",
            data: expect.objectContaining({
              title: "Updated Board Title",
            }),
          })
        );
      });
    });

    it("canceling title editing with Escape restores original title without committing", async () => {
      const updateSpy = vi.spyOn(tasksApi, "updateTask");

      renderTaskBoardView({
        groups: [makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask])],
      });

      const titleBtn = screen.getByRole("button", { name: /Edit title: Test Board Task 101/i });
      fireEvent.click(titleBtn);

      const titleInput = screen.getByTestId("inline-title-input-task-1");
      fireEvent.change(titleInput, { target: { value: "Abandoned Draft" } });
      fireEvent.keyDown(titleInput, { key: "Escape", code: "Escape" });

      // Exits editing mode
      expect(screen.queryByTestId("inline-title-input-task-1")).not.toBeInTheDocument();
      expect(screen.getByText("Test Board Task 101")).toBeInTheDocument();
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("clicking status cell opens status popover selector and updates status", async () => {
      vi.spyOn(tasksApi, "updateTask").mockResolvedValue({
        ...sampleTask,
        statusCategory: "DONE",
      });

      renderTaskBoardView({
        groups: [makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask])],
      });

      const statusTrigger = screen.getByTestId("inline-status-trigger-task-1");
      fireEvent.click(statusTrigger);

      expect(await screen.findByRole("menu", { name: /select status/i })).toBeInTheDocument();
      const doneOption = screen.getByTestId("inline-status-option-DONE");
      fireEvent.click(doneOption);

      await waitFor(() => {
        expect(tasksApi.updateTask).toHaveBeenCalledWith(
          expect.objectContaining({
            taskId: "task-1",
            data: expect.objectContaining({
              statusCategory: "DONE",
            }),
          })
        );
      });
    });

    it("clicking priority cell opens priority popover selector and updates priority", async () => {
      vi.spyOn(tasksApi, "updateTask").mockResolvedValue({
        ...sampleTask,
        priority: "URGENT",
      });

      renderTaskBoardView({
        groups: [makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask])],
      });

      const priorityTrigger = screen.getByTestId("inline-priority-trigger-task-1");
      fireEvent.click(priorityTrigger);

      expect(await screen.findByRole("menu", { name: /select priority/i })).toBeInTheDocument();
      const urgentOption = screen.getByTestId("inline-priority-option-URGENT");
      fireEvent.click(urgentOption);

      await waitFor(() => {
        expect(tasksApi.updateTask).toHaveBeenCalledWith(
          expect.objectContaining({
            taskId: "task-1",
            data: expect.objectContaining({
              priority: "URGENT",
            }),
          })
        );
      });
    });

    it("clicking assignee cell opens assignee popover selector", async () => {
      renderTaskBoardView({
        groups: [makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask])],
      });

      const assigneeTrigger = screen.getByTestId("inline-assignee-trigger-task-1");
      fireEvent.click(assigneeTrigger);

      expect(await screen.findByRole("dialog", { name: /assign task/i })).toBeInTheDocument();
    });

    it("clicking due date cell opens date popover selector", async () => {
      renderTaskBoardView({
        groups: [makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask])],
      });

      const dueDateTrigger = screen.getByTestId("inline-duedate-trigger-task-1");
      fireEvent.click(dueDateTrigger);

      expect(await screen.findByRole("dialog", { name: /set due date/i })).toBeInTheDocument();
    });
  });

  describe("WP-B2: Board Card Event Isolation", () => {
    it("AC-Card-1: clicking card whitespace or task key button opens Task Peek Drawer via URL", () => {
      renderTaskBoardView({
        groups: [makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask])],
      });

      const card = screen.getByTestId("task-board-card-ENG-101");
      expect(screen.getByTestId("location-display")).not.toHaveTextContent("task=ENG-101");

      // Click card background
      fireEvent.click(card);
      expect(screen.getByTestId("location-display")).toHaveTextContent("task=ENG-101");
    });

    it("AC-Card-1: clicking task key button opens Task Peek Drawer", () => {
      renderTaskBoardView({
        groups: [makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask])],
      });

      const keyButton = screen.getByRole("button", { name: "ENG-101" });
      fireEvent.click(keyButton);
      expect(screen.getByTestId("location-display")).toHaveTextContent("task=ENG-101");
    });

    it("AC-Card-2: clicking title cell enters edit mode WITHOUT opening Task Peek Drawer", () => {
      renderTaskBoardView({
        groups: [makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask])],
      });

      const titleBtn = screen.getByRole("button", { name: /Edit title: Test Board Task 101/i });
      fireEvent.click(titleBtn);

      expect(screen.getByTestId("inline-title-input-task-1")).toBeInTheDocument();
      expect(screen.getByTestId("location-display")).not.toHaveTextContent("task=ENG-101");
    });

    it("AC-Card-3: clicking status cell opens status popover WITHOUT opening Task Peek Drawer", async () => {
      renderTaskBoardView({
        groups: [makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask])],
      });

      const statusTrigger = screen.getByTestId("inline-status-trigger-task-1");
      fireEvent.click(statusTrigger);

      expect(await screen.findByRole("menu", { name: /select status/i })).toBeInTheDocument();
      expect(screen.getByTestId("location-display")).not.toHaveTextContent("task=ENG-101");
    });

    it("AC-Card-4: clicking priority cell opens priority popover WITHOUT opening Task Peek Drawer", async () => {
      renderTaskBoardView({
        groups: [makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask])],
      });

      const priorityTrigger = screen.getByTestId("inline-priority-trigger-task-1");
      fireEvent.click(priorityTrigger);

      expect(await screen.findByRole("menu", { name: /select priority/i })).toBeInTheDocument();
      expect(screen.getByTestId("location-display")).not.toHaveTextContent("task=ENG-101");
    });

    it("AC-Card-5: clicking assignee cell opens assignee popover WITHOUT opening Task Peek Drawer", async () => {
      renderTaskBoardView({
        groups: [makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask])],
      });

      const assigneeTrigger = screen.getByTestId("inline-assignee-trigger-task-1");
      fireEvent.click(assigneeTrigger);

      expect(await screen.findByRole("dialog", { name: /assign task/i })).toBeInTheDocument();
      expect(screen.getByTestId("location-display")).not.toHaveTextContent("task=ENG-101");
    });

    it("AC-Card-6: clicking due date cell opens date popover WITHOUT opening Task Peek Drawer", async () => {
      renderTaskBoardView({
        groups: [makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask])],
      });

      const dueDateTrigger = screen.getByTestId("inline-duedate-trigger-task-1");
      fireEvent.click(dueDateTrigger);

      expect(await screen.findByRole("dialog", { name: /set due date/i })).toBeInTheDocument();
      expect(screen.getByTestId("location-display")).not.toHaveTextContent("task=ENG-101");
    });

    it("AC-Card-7: keyboard Enter on card container opens drawer, but keyboard interactions inside inline cells do NOT open drawer", () => {
      renderTaskBoardView({
        groups: [makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask])],
      });

      const card = screen.getByTestId("task-board-card-ENG-101");

      // Enter on title button enters editing, does NOT open drawer
      const titleBtn = screen.getByRole("button", { name: /Edit title: Test Board Task 101/i });
      fireEvent.keyDown(titleBtn, { key: "Enter", code: "Enter" });
      expect(screen.getByTestId("inline-title-input-task-1")).toBeInTheDocument();
      expect(screen.getByTestId("location-display")).not.toHaveTextContent("task=ENG-101");

      // Enter directly on card container opens drawer
      fireEvent.keyDown(card, { key: "Enter", code: "Enter" });
      expect(screen.getByTestId("location-display")).toHaveTextContent("task=ENG-101");
    });

    it("AC-Card-8: keyboard Space on card container opens drawer, but Space on interactive children does NOT open drawer", () => {
      renderTaskBoardView({
        groups: [makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask])],
      });

      const card = screen.getByTestId("task-board-card-ENG-101");

      // Space on status trigger does NOT open drawer
      const statusTrigger = screen.getByTestId("inline-status-trigger-task-1");
      fireEvent.keyDown(statusTrigger, { key: " ", code: "Space" });
      expect(screen.getByTestId("location-display")).not.toHaveTextContent("task=ENG-101");

      // Space directly on card container opens drawer
      fireEvent.keyDown(card, { key: " ", code: "Space" });
      expect(screen.getByTestId("location-display")).toHaveTextContent("task=ENG-101");
    });

    it("AC-Card-9: Escape in title editing cancels editing and restores focus without opening drawer", () => {
      renderTaskBoardView({
        groups: [makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask])],
      });

      // Enter title editing
      const titleBtn = screen.getByRole("button", { name: /Edit title: Test Board Task 101/i });
      fireEvent.click(titleBtn);
      const input = screen.getByTestId("inline-title-input-task-1");
      expect(input).toBeInTheDocument();

      // Escape cancels editing
      fireEvent.keyDown(input, { key: "Escape", code: "Escape" });
      expect(screen.queryByTestId("inline-title-input-task-1")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Edit title: Test Board Task 101/i })).toBeInTheDocument();
      expect(screen.getByTestId("location-display")).not.toHaveTextContent("task=ENG-101");
    });
  });

  describe("WP-B3: Inline Creation Within Columns", () => {
    it("renders inline creation trigger in each board column with '+ Add card'", () => {
      renderTaskBoardView({
        groups: [
          makeSampleGroup("TODO", "To Do", []),
          makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask]),
        ],
      });

      const triggers = screen.getAllByTestId("inline-creation-trigger");
      expect(triggers).toHaveLength(2);
      expect(triggers[0]).toHaveTextContent("+ Add card");
      expect(triggers[1]).toHaveTextContent("+ Add card");
    });

    it("creates task in a populated column with that column's statusCategory", async () => {
      vi.spyOn(tasksApi, "createTask").mockResolvedValue(
        makeSampleTask({ id: "task-new-1", taskKey: "ENG-102", title: "New In Progress Card", statusCategory: "IN_PROGRESS" })
      );

      renderTaskBoardView({
        groups: [
          makeSampleGroup("TODO", "To Do", []),
          makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask]),
        ],
      });

      // Target In Progress column's trigger
      const inProgressCol = screen.getByTestId("board-column-IN_PROGRESS");
      const trigger = inProgressCol.querySelector('[data-testid="inline-creation-trigger"]')!;
      fireEvent.click(trigger);

      const input = inProgressCol.querySelector('[data-testid="inline-creation-input"]')!;
      expect(input).toBeInTheDocument();
      expect(input).toHaveFocus();

      fireEvent.change(input, { target: { value: "New In Progress Card" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(tasksApi.createTask).toHaveBeenCalledWith(
          expect.objectContaining({
            communityId: MOCK_COMMUNITY_1_ID,
            workspaceId: WS_SHARED_ENG_ID,
            data: expect.objectContaining({
              title: "New In Progress Card",
              statusCategory: "IN_PROGRESS",
            }),
          })
        );
      });
    });

    it("creates task in an empty column with that column's statusCategory", async () => {
      vi.spyOn(tasksApi, "createTask").mockResolvedValue(
        makeSampleTask({ id: "task-new-2", taskKey: "ENG-103", title: "New To Do Card", statusCategory: "TODO" })
      );

      renderTaskBoardView({
        groups: [
          makeSampleGroup("TODO", "To Do", []),
          makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask]),
        ],
      });

      const todoCol = screen.getByTestId("board-column-TODO");
      expect(todoCol).toHaveTextContent("No tasks in this stage");

      const trigger = todoCol.querySelector('[data-testid="inline-creation-trigger"]')!;
      fireEvent.click(trigger);

      const input = todoCol.querySelector('[data-testid="inline-creation-input"]')!;
      fireEvent.change(input, { target: { value: "New To Do Card" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(tasksApi.createTask).toHaveBeenCalledWith(
          expect.objectContaining({
            communityId: MOCK_COMMUNITY_1_ID,
            workspaceId: WS_SHARED_ENG_ID,
            data: expect.objectContaining({
              title: "New To Do Card",
              statusCategory: "TODO",
            }),
          })
        );
      });
    });

    it("failed creation preserves draft input and displays inline error in that column", async () => {
      vi.spyOn(tasksApi, "createTask").mockRejectedValue(new Error("Database connection failure"));

      renderTaskBoardView({
        groups: [makeSampleGroup("TODO", "To Do", [])],
      });

      const todoCol = screen.getByTestId("board-column-TODO");
      const trigger = todoCol.querySelector('[data-testid="inline-creation-trigger"]')!;
      fireEvent.click(trigger);

      const input = todoCol.querySelector('[data-testid="inline-creation-input"]')!;
      fireEvent.change(input, { target: { value: "Draft Title To Retry" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(todoCol.querySelector('[data-testid="inline-creation-error"]')).toHaveTextContent(
          "Database connection failure"
        );
        expect(input).toHaveValue("Draft Title To Retry");
      });
    });
  });

  describe("WP-B4: Transient Pending Task Cards", () => {
    it("displays temporary pending card with spinner in originating column while creation is unresolved", async () => {
      let resolveCreation: (val: TaskDto) => void;
      const creationPromise = new Promise<TaskDto>((resolve) => {
        resolveCreation = resolve;
      });
      vi.spyOn(tasksApi, "createTask").mockImplementation(() => creationPromise);

      renderTaskBoardView({
        groups: [makeSampleGroup("TODO", "To Do", [])],
      });

      const todoCol = screen.getByTestId("board-column-TODO");
      fireEvent.click(todoCol.querySelector('[data-testid="inline-creation-trigger"]')!);
      const input = todoCol.querySelector('[data-testid="inline-creation-input"]')!;

      fireEvent.change(input, { target: { value: "In-Flight Board Task" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // Pending card is visible in column
      const pendingCard = todoCol.querySelector('[data-testid="task-board-pending-card"]')!;
      expect(pendingCard).toBeInTheDocument();
      expect(pendingCard).toHaveAttribute("role", "status");
      expect(pendingCard).toHaveAttribute("aria-label", "Creating task: In-Flight Board Task");
      expect(screen.getByTestId("pending-task-badge")).toHaveTextContent("Pending");
      expect(screen.getByTestId("pending-task-title")).toHaveTextContent("In-Flight Board Task");

      // No provisional task key, rank, or fake ID is displayed as server-authoritative
      expect(todoCol).not.toHaveTextContent("ENG-");
      expect(todoCol).not.toHaveTextContent("0|h");
      expect(todoCol).not.toHaveTextContent("task-temp");

      // Non-interactive: clicking does not navigate
      fireEvent.click(pendingCard);
      expect(screen.getByTestId("location-display")).not.toHaveTextContent("task=");

      // Resolve creation
      resolveCreation!(
        makeSampleTask({
          id: "task-canonical-1",
          taskKey: "ENG-201",
          title: "In-Flight Board Task",
          statusCategory: "TODO",
        })
      );

      await waitFor(() => {
        expect(screen.queryByTestId("task-board-pending-card")).not.toBeInTheDocument();
      });
    });

    it("proves complete creation lifecycle: column targeting, pending state, no provisional IDs, disappearance on success, and canonical task appearance in correct column", async () => {
      let resolveCreation: (val: TaskDto) => void;
      const creationPromise = new Promise<TaskDto>((resolve) => {
        resolveCreation = resolve;
      });
      vi.spyOn(tasksApi, "createTask").mockImplementation(() => creationPromise);

      const { rerenderWithProps } = renderTaskBoardView({
        groups: [
          makeSampleGroup("TODO", "To Do", []),
          makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask]),
        ],
      });

      const todoCol = screen.getByTestId("board-column-TODO");
      const inProgressCol = screen.getByTestId("board-column-IN_PROGRESS");

      // 1. Begin creation in intended column (TODO)
      fireEvent.click(todoCol.querySelector('[data-testid="inline-creation-trigger"]')!);
      const input = todoCol.querySelector('[data-testid="inline-creation-input"]')!;
      fireEvent.change(input, { target: { value: "Deploy Edge Compute Worker" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // 2. Verified mutation received column's status category
      await waitFor(() => {
        expect(tasksApi.createTask).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              title: "Deploy Edge Compute Worker",
              statusCategory: "TODO",
            }),
          })
        );
      });

      // 3. Temporary pending card appears in TODO, NOT in IN_PROGRESS
      const pendingCard = todoCol.querySelector('[data-testid="task-board-pending-card"]')!;
      expect(pendingCard).toBeInTheDocument();
      expect(inProgressCol.querySelector('[data-testid="task-board-pending-card"]')).not.toBeInTheDocument();
      expect(pendingCard).toHaveAttribute("role", "status");

      // 4. No provisional task key, rank, or fake ID presented as server-authoritative
      expect(todoCol).not.toHaveTextContent("ENG-");
      expect(todoCol).not.toHaveTextContent("0|h");

      // 5. Server responds with confirmed canonical task
      const canonicalTask = makeSampleTask({
        id: "task-canonical-edge-99",
        taskKey: "ENG-350",
        title: "Deploy Edge Compute Worker",
        statusCategory: "TODO",
      });
      resolveCreation!(canonicalTask);

      // 6. On server success, pending card disappears
      await waitFor(() => {
        expect(screen.queryByTestId("task-board-pending-card")).not.toBeInTheDocument();
      });

      // 7. Canonical server-confirmed task appears in the correct column
      rerenderWithProps({
        groups: [
          makeSampleGroup("TODO", "To Do", [canonicalTask]),
          makeSampleGroup("IN_PROGRESS", "In Progress", [sampleTask]),
        ],
      });

      const canonicalCard = within(todoCol).getByTestId("task-board-card-ENG-350");
      expect(canonicalCard).toBeInTheDocument();
      expect(within(canonicalCard).getByText("ENG-350")).toBeInTheDocument();
      expect(within(canonicalCard).getByText("Deploy Edge Compute Worker")).toBeInTheDocument();
      expect(within(canonicalCard).getByTestId("inline-status-cell-task-canonical-edge-99")).toBeInTheDocument();
    });

    it("removes pending card on creation failure without leaving orphaned state", async () => {
      let rejectCreation: (err: Error) => void;
      const creationPromise = new Promise<TaskDto>((_, reject) => {
        rejectCreation = reject;
      });
      vi.spyOn(tasksApi, "createTask").mockImplementation(() => creationPromise);

      renderTaskBoardView({
        groups: [makeSampleGroup("TODO", "To Do", [])],
      });

      const todoCol = screen.getByTestId("board-column-TODO");
      fireEvent.click(todoCol.querySelector('[data-testid="inline-creation-trigger"]')!);
      const input = todoCol.querySelector('[data-testid="inline-creation-input"]')!;

      fireEvent.change(input, { target: { value: "Failing Card" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      expect(todoCol.querySelector('[data-testid="task-board-pending-card"]')).toBeInTheDocument();

      rejectCreation!(new Error("Server 500 error"));

      await waitFor(() => {
        expect(screen.queryByTestId("task-board-pending-card")).not.toBeInTheDocument();
        expect(screen.getByTestId("inline-creation-error")).toHaveTextContent("Server 500 error");
      });
    });

    it("supports concurrent creation across different columns without state collisions", async () => {
      let resolveTodo: (val: TaskDto) => void;
      const todoPromise = new Promise<TaskDto>((res) => { resolveTodo = res; });
      let resolveInProgress: (val: TaskDto) => void;
      const inProgressPromise = new Promise<TaskDto>((res) => { resolveInProgress = res; });

      vi.spyOn(tasksApi, "createTask").mockImplementation((opts) => {
        if (opts.data.statusCategory === "TODO") return todoPromise;
        return inProgressPromise;
      });

      renderTaskBoardView({
        groups: [
          makeSampleGroup("TODO", "To Do", []),
          makeSampleGroup("IN_PROGRESS", "In Progress", []),
        ],
      });

      const todoCol = screen.getByTestId("board-column-TODO");
      const inProgressCol = screen.getByTestId("board-column-IN_PROGRESS");

      // Submit in To Do
      fireEvent.click(todoCol.querySelector('[data-testid="inline-creation-trigger"]')!);
      const todoInput = todoCol.querySelector('[data-testid="inline-creation-input"]')!;
      fireEvent.change(todoInput, { target: { value: "Concurrent To Do Task" } });
      fireEvent.keyDown(todoInput, { key: "Enter", code: "Enter" });

      // Submit in In Progress
      fireEvent.click(inProgressCol.querySelector('[data-testid="inline-creation-trigger"]')!);
      const inProgressInput = inProgressCol.querySelector('[data-testid="inline-creation-input"]')!;
      fireEvent.change(inProgressInput, { target: { value: "Concurrent In Progress Task" } });
      fireEvent.keyDown(inProgressInput, { key: "Enter", code: "Enter" });

      // Both pending cards visible simultaneously in their respective columns
      expect(todoCol.querySelector('[data-testid="task-board-pending-card"]')).toBeInTheDocument();
      expect(inProgressCol.querySelector('[data-testid="task-board-pending-card"]')).toBeInTheDocument();
      expect(todoCol).toHaveTextContent("Concurrent To Do Task");
      expect(inProgressCol).toHaveTextContent("Concurrent In Progress Task");

      // Resolve To Do
      resolveTodo!(makeSampleTask({ id: "t-todo", title: "Concurrent To Do Task", statusCategory: "TODO" }));
      await waitFor(() => {
        expect(todoCol.querySelector('[data-testid="task-board-pending-card"]')).not.toBeInTheDocument();
      });

      // In Progress pending card is still visible
      expect(inProgressCol.querySelector('[data-testid="task-board-pending-card"]')).toBeInTheDocument();

      // Resolve In Progress
      resolveInProgress!(makeSampleTask({ id: "t-in-progress", title: "Concurrent In Progress Task", statusCategory: "IN_PROGRESS" }));
      await waitFor(() => {
        expect(inProgressCol.querySelector('[data-testid="task-board-pending-card"]')).not.toBeInTheDocument();
      });
    });
  });

  describe("WP-B5 & WP-B6: Mobile Stage Switcher & Empty States", () => {
    it("renders empty state when groups array is empty", () => {
      renderTaskBoardView({ groups: [] });
      expect(screen.getByTestId("task-board-empty")).toBeInTheDocument();
    });

    it("renders mobile stage tabs and switches active column on tab selection", () => {
      const onSelectMobileStage = vi.fn();
      renderTaskBoardView({
        groups: [
          makeSampleGroup("TODO", "To Do", [makeSampleTask({ id: "t-1", taskKey: "ENG-1" })]),
          makeSampleGroup("IN_PROGRESS", "In Progress", [makeSampleTask({ id: "t-2", taskKey: "ENG-2" })]),
        ],
        selectedMobileStage: "TODO",
        onSelectMobileStage,
      });

      const todoTab = screen.getByTestId("mobile-stage-tab-TODO");
      const inProgressTab = screen.getByTestId("mobile-stage-tab-IN_PROGRESS");

      expect(todoTab).toHaveAttribute("aria-selected", "true");
      expect(inProgressTab).toHaveAttribute("aria-selected", "false");

      fireEvent.click(inProgressTab);
      expect(onSelectMobileStage).toHaveBeenCalledWith("IN_PROGRESS");
    });
  });
});
