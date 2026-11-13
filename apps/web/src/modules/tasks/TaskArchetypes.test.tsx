import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { WorkspaceProvider } from "@/modules/workspace/WorkspaceContext.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import {
  MOCK_COMMUNITY_1_ID,
  WS_SHARED_ENG_ID,
  MOCK_USER_ID,
} from "@/mocks/data/my-work.js";
import { makeTaskPermissions } from "@/mocks/data/tasks.js";
import {
  TaskArchetypeBadge,
  formatArchetype,
  ARCHETYPE_LABELS,
} from "./TaskArchetypeBadge.js";
import { InlineArchetypeEditor } from "./InlineArchetypeEditor.js";
import { QuickTaskComposer } from "./QuickTaskComposer.js";
import { QuickTaskComposerContext } from "./QuickTaskComposerContext.js";
import { TaskListView } from "./views/TaskListView.js";
import { TaskBoardView } from "./views/TaskBoardView.js";
import * as tasksApi from "./api.js";
import { ApiProblemError } from "@/lib/api-client.js";
import type { TaskDto, TaskType, TaskQueryBucketDto } from "./types.js";

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

function createMockTask(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: "018f98a2-3f12-7890-a001-456789abcdef",
    workspaceId: WS_SHARED_ENG_ID,
    parentTaskId: null,
    taskKey: "ENG-101",
    title: "Implement Architectural Boundary Check",
    description: "Detailed description",
    itemType: "TASK",
    statusCategory: "TODO",
    priority: "HIGH",
    assigneeIds: [MOCK_USER_ID],
    assigneeAssignments: [],
    assigneeEditableFieldGroups: [],
    creatorId: MOCK_USER_ID,
    startDate: null,
    dueDate: "2026-11-20",
    estimatePoints: 3,
    labelIds: [],
    milestoneId: null,
    rankKey: "0|hzzzzz:",
    version: 1,
    fieldRevisions: {
      itemType: 1,
      title: 1,
      statusCategory: 1,
      priority: 1,
    },
    effectivePermissions: {
      ...makeTaskPermissions(true),
      canEditTitleDescription: true,
    },
    createdAt: "2026-11-01T10:00:00Z",
    updatedAt: "2026-11-01T10:00:00Z",
    archivedAt: null,
    ...overrides,
  };
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthValue}>
        <WorkspaceProvider
          initialCommunityId={MOCK_COMMUNITY_1_ID}
          initialWorkspaceId={WS_SHARED_ENG_ID}
        >
          <MemoryRouter>{ui}</MemoryRouter>
        </WorkspaceProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("VS-09D: Work-Item Archetypes (FEAT-A01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("TaskArchetypeBadge Component & Dual Indicators", () => {
    const archetypes: { type: TaskType; label: string; iconTestId: string }[] = [
      { type: "TASK", label: "Task", iconTestId: "archetype-icon-TASK" },
      { type: "DELIVERABLE", label: "Deliverable", iconTestId: "archetype-icon-DELIVERABLE" },
      { type: "BUG", label: "Bug", iconTestId: "archetype-icon-BUG" },
      { type: "DECISION", label: "Decision", iconTestId: "archetype-icon-DECISION" },
    ];

    archetypes.forEach(({ type, label, iconTestId }) => {
      it(`renders the ${label} archetype badge with its dual-indicator icon and accessible label`, () => {
        render(<TaskArchetypeBadge archetype={type} />);

        const badge = screen.getByTestId(`archetype-badge-${type}`);
        expect(badge).toBeInTheDocument();
        expect(within(badge).getByText(label)).toBeInTheDocument();
        expect(screen.getByTestId(iconTestId)).toBeInTheDocument();
        expect(badge).toHaveAttribute("aria-label", `Archetype: ${label}`);
      });
    });

    it("renders compact mode (showLabel=false) with visually-hidden text and accessible tooltip", () => {
      render(<TaskArchetypeBadge archetype="BUG" showLabel={false} />);

      const badge = screen.getByTestId("archetype-badge-BUG");
      expect(badge).toBeInTheDocument();
      expect(screen.getByTestId("archetype-icon-BUG")).toBeInTheDocument();

      // Label is rendered inside sr-only for screen readers
      const srOnlyLabel = within(badge).getByText("Bug");
      expect(srOnlyLabel).toHaveClass("sr-only");
    });

    it("formats archetype helper correctly", () => {
      expect(formatArchetype("TASK")).toBe("Task");
      expect(formatArchetype("DELIVERABLE")).toBe("Deliverable");
      expect(formatArchetype("BUG")).toBe("Bug");
      expect(formatArchetype("DECISION")).toBe("Decision");
      expect(ARCHETYPE_LABELS.DECISION).toBe("Decision");
    });
  });

  describe("InlineArchetypeEditor Component (Drawer & Property Inspector)", () => {
    it("renders current archetype and Edit button when user has permission", () => {
      const task = createMockTask({ itemType: "TASK" });
      renderWithProviders(
        <InlineArchetypeEditor
          task={task}
          communityId={MOCK_COMMUNITY_1_ID}
          workspaceId={WS_SHARED_ENG_ID}
        />
      );

      expect(screen.getByTestId("inline-archetype-view")).toBeInTheDocument();
      expect(screen.getByTestId("archetype-badge-TASK")).toBeInTheDocument();
      expect(screen.getByTestId("edit-archetype-btn")).toBeInTheDocument();
    });

    it("renders read-only badge without Edit button when user lacks canEditTitleDescription permission", () => {
      const task = createMockTask({
        itemType: "DELIVERABLE",
        effectivePermissions: {
          ...makeTaskPermissions(false),
          canEditTitleDescription: false,
        },
      });

      renderWithProviders(
        <InlineArchetypeEditor
          task={task}
          communityId={MOCK_COMMUNITY_1_ID}
          workspaceId={WS_SHARED_ENG_ID}
        />
      );

      expect(screen.getByTestId("archetype-badge-DELIVERABLE")).toBeInTheDocument();
      expect(screen.queryByTestId("edit-archetype-btn")).not.toBeInTheDocument();
    });

    it("renders read-only badge when task is archived", () => {
      const task = createMockTask({
        itemType: "BUG",
        archivedAt: "2026-11-10T12:00:00Z",
      });

      renderWithProviders(
        <InlineArchetypeEditor
          task={task}
          communityId={MOCK_COMMUNITY_1_ID}
          workspaceId={WS_SHARED_ENG_ID}
          isArchived={true}
        />
      );

      expect(screen.getByTestId("archetype-badge-BUG")).toBeInTheDocument();
      expect(screen.queryByTestId("edit-archetype-btn")).not.toBeInTheDocument();
    });

    it("enters edit mode, updates archetype, and submits patch with baseFieldRevisions.itemType", async () => {
      const user = userEvent.setup();
      const task = createMockTask({ itemType: "TASK" });
      const updateSpy = vi.spyOn(tasksApi, "updateTask").mockResolvedValue({
        ...task,
        itemType: "BUG",
        fieldRevisions: { ...task.fieldRevisions, itemType: 2 },
      });

      renderWithProviders(
        <InlineArchetypeEditor
          task={task}
          communityId={MOCK_COMMUNITY_1_ID}
          workspaceId={WS_SHARED_ENG_ID}
        />
      );

      // Click Edit
      await user.click(screen.getByTestId("edit-archetype-btn"));

      expect(screen.getByTestId("inline-archetype-editing")).toBeInTheDocument();
      const select = screen.getByTestId("archetype-select");
      expect(select).toHaveValue("TASK");

      // Select BUG
      await user.selectOptions(select, "BUG");
      expect(select).toHaveValue("BUG");

      // Save
      await user.click(screen.getByTestId("save-archetype-btn"));

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            communityId: MOCK_COMMUNITY_1_ID,
            workspaceId: WS_SHARED_ENG_ID,
            taskId: task.id,
            data: {
              itemType: "BUG",
              baseFieldRevisions: {
                itemType: 1,
              },
            },
          })
        );
      });
    });

    it("cancels editing and reverts to original archetype without submitting API call", async () => {
      const user = userEvent.setup();
      const task = createMockTask({ itemType: "DECISION" });
      const updateSpy = vi.spyOn(tasksApi, "updateTask");

      renderWithProviders(
        <InlineArchetypeEditor
          task={task}
          communityId={MOCK_COMMUNITY_1_ID}
          workspaceId={WS_SHARED_ENG_ID}
        />
      );

      await user.click(screen.getByTestId("edit-archetype-btn"));
      const select = screen.getByTestId("archetype-select");
      await user.selectOptions(select, "DELIVERABLE");

      // Cancel
      await user.click(screen.getByTestId("cancel-archetype-btn"));

      expect(screen.queryByTestId("inline-archetype-editing")).not.toBeInTheDocument();
      expect(screen.getByTestId("archetype-badge-DECISION")).toBeInTheDocument();
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("handles 409 concurrency conflict and supports overwriting with latest revision", async () => {
      const user = userEvent.setup();
      const task = createMockTask({ itemType: "TASK" });

      const conflictError = new ApiProblemError(409, {
        type: "https://errors.sonder.platform/task-concurrency-conflict",
        title: "Task Concurrency Conflict",
        status: 409,
        detail: "Field 'itemType' was modified concurrently.",
        code: "FIELD_REVISION_CONFLICT",
      });

      const updateSpy = vi
        .spyOn(tasksApi, "updateTask")
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce({
          ...task,
          itemType: "DECISION",
          fieldRevisions: { itemType: 3 },
        });

      vi.spyOn(tasksApi, "getTaskById").mockResolvedValue({
        ...task,
        itemType: "DELIVERABLE",
        fieldRevisions: { itemType: 2 },
        version: 2,
      });

      renderWithProviders(
        <InlineArchetypeEditor
          task={task}
          communityId={MOCK_COMMUNITY_1_ID}
          workspaceId={WS_SHARED_ENG_ID}
        />
      );

      await user.click(screen.getByTestId("edit-archetype-btn"));
      await user.selectOptions(screen.getByTestId("archetype-select"), "DECISION");
      await user.click(screen.getByTestId("save-archetype-btn"));

      // Conflict alert appears
      expect(await screen.findByTestId("conflict-alert-itemType")).toBeInTheDocument();

      // Click overwrite
      const overwriteBtn = screen.getByTestId("conflict-overwrite-itemType-btn");
      await user.click(overwriteBtn);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledTimes(2);
        expect(updateSpy).toHaveBeenLastCalledWith(
          expect.objectContaining({
            data: {
              itemType: "DECISION",
              baseFieldRevisions: {
                itemType: 2,
              },
            },
          })
        );
      });
    });
  });

  describe("QuickTaskComposer Archetype Selection & Creation", () => {
    it("renders archetype selector defaulting to TASK and creates task with selected archetype", async () => {
      const user = userEvent.setup();
      const createSpy = vi.spyOn(tasksApi, "createTask").mockResolvedValue(
        createMockTask({
          id: "018f98a2-new-task",
          taskKey: "ENG-105",
          title: "Memory leak in event listener",
          itemType: "BUG",
        })
      );

      const mockContextValue = {
        isOpen: true,
        initialValues: null,
        open: vi.fn(),
        close: vi.fn(),
        toggle: vi.fn(),
      };

      renderWithProviders(
        <QuickTaskComposerContext.Provider value={mockContextValue}>
          <QuickTaskComposer />
        </QuickTaskComposerContext.Provider>
      );

      // Verify archetype selector exists and defaults to TASK
      const archetypeSelect = screen.getByTestId("composer-archetype-select");
      expect(archetypeSelect).toBeInTheDocument();
      expect(archetypeSelect).toHaveValue("TASK");

      // Enter title
      const titleInput = screen.getByTestId("composer-title-input");
      await user.type(titleInput, "Memory leak in event listener");

      // Select BUG archetype
      await user.selectOptions(archetypeSelect, "BUG");
      expect(archetypeSelect).toHaveValue("BUG");

      // Submit
      const submitBtn = screen.getByRole("button", { name: /create task/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              title: "Memory leak in event listener",
              itemType: "BUG",
            }),
          })
        );
      });
    });

    it("prefills archetype selector when initialValues.itemType is provided", () => {
      const mockContextValue = {
        isOpen: true,
        initialValues: {
          itemType: "DELIVERABLE" as TaskType,
          title: "Final Architecture Documentation",
        },
        open: vi.fn(),
        close: vi.fn(),
        toggle: vi.fn(),
      };

      renderWithProviders(
        <QuickTaskComposerContext.Provider value={mockContextValue}>
          <QuickTaskComposer />
        </QuickTaskComposerContext.Provider>
      );

      const archetypeSelect = screen.getByTestId("composer-archetype-select");
      expect(archetypeSelect).toHaveValue("DELIVERABLE");
    });
  });

  describe("Task Views Archetype Badge Presentation", () => {
    it("renders archetype badge in TaskListView row alongside title", () => {
      const tasks = [
        createMockTask({ id: "t1", taskKey: "ENG-1", title: "Task Item", itemType: "TASK" }),
        createMockTask({ id: "t2", taskKey: "ENG-2", title: "Deliverable Item", itemType: "DELIVERABLE" }),
        createMockTask({ id: "t3", taskKey: "ENG-3", title: "Bug Item", itemType: "BUG" }),
        createMockTask({ id: "t4", taskKey: "ENG-4", title: "Decision Item", itemType: "DECISION" }),
      ];

      renderWithProviders(
        <TaskListView
          tasks={tasks}
          isLoading={false}
          isError={false}
          error={null}
          onRetry={vi.fn()}
          workspaceId={WS_SHARED_ENG_ID}
          communityId={MOCK_COMMUNITY_1_ID}
        />
      );

      expect(screen.getByTestId("archetype-badge-TASK")).toBeInTheDocument();
      expect(screen.getByTestId("archetype-badge-DELIVERABLE")).toBeInTheDocument();
      expect(screen.getByTestId("archetype-badge-BUG")).toBeInTheDocument();
      expect(screen.getByTestId("archetype-badge-DECISION")).toBeInTheDocument();
    });

    it("renders archetype badge in TaskBoardView card header alongside taskKey", () => {
      const groups: TaskQueryBucketDto[] = [
        {
          key: "TODO",
          title: "To Do",
          category: "TODO",
          position: 1,
          total: 2,
          items: [
            createMockTask({ id: "t1", taskKey: "ENG-10", title: "Defect in navbar", itemType: "BUG" }),
            createMockTask({ id: "t2", taskKey: "ENG-11", title: "ADR 05 Architecture", itemType: "DECISION" }),
          ],
        },
      ];

      renderWithProviders(
        <TaskBoardView
          groups={groups}
          isLoading={false}
          isError={false}
          error={null}
          onRetry={vi.fn()}
          workspaceId={WS_SHARED_ENG_ID}
          communityId={MOCK_COMMUNITY_1_ID}
        />
      );

      expect(screen.getByTestId("task-board-card-ENG-10")).toBeInTheDocument();
      expect(screen.getByTestId("archetype-badge-BUG")).toBeInTheDocument();

      expect(screen.getByTestId("task-board-card-ENG-11")).toBeInTheDocument();
      expect(screen.getByTestId("archetype-badge-DECISION")).toBeInTheDocument();
    });
  });
});
