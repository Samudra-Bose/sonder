import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { InlineStatusCell } from "./InlineStatusCell.js";
import { InlinePriorityCell } from "./InlinePriorityCell.js";
import { InlineDueDateCell } from "./InlineDueDateCell.js";
import { InlineAssigneeCell } from "./InlineAssigneeCell.js";
import { InlineTitleCell } from "./InlineTitleCell.js";
import { getDefaultReferenceDate, addCalendarDays } from "@/modules/my-work/date-utils.js";

const testUser = {
  id: "user-123",
  displayName: "Alex Morgan",
  email: "alex@example.com",
  avatarUrl: null,
};

const mockMembers = [
  {
    membershipId: "mem-1",
    user: {
      id: "user-123",
      displayName: "Alex Morgan",
      email: "alex@example.com",
      avatarUrl: null,
    },
    roleId: "role-1",
    roleName: "Owner",
    roleSystemKey: "owner",
    joinedAt: "2026-01-01T00:00:00Z",
  },
  {
    membershipId: "mem-2",
    user: {
      id: "user-456",
      displayName: "Jordan Lee",
      email: "jordan@example.com",
      avatarUrl: null,
    },
    roleId: "role-2",
    roleName: "Member",
    roleSystemKey: "member",
    joinedAt: "2026-01-02T00:00:00Z",
  },
  {
    membershipId: "mem-3",
    user: {
      id: "user-789",
      displayName: "Taylor Swift",
      email: "taylor@example.com",
      avatarUrl: null,
    },
    roleId: "role-3",
    roleName: "Contributor",
    roleSystemKey: "contributor",
    joinedAt: "2026-01-03T00:00:00Z",
  },
];

function createMockAuth(): AuthContextType {
  return {
    user: testUser,
    communities: [],
    csrfToken: "mock-csrf-token",
    status: "authenticated",
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
    clearError: vi.fn(),
  };
}

function createQueryClient() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  // Pre-seed workspace members cache
  qc.setQueryData(["communities", "comm-1", "workspaces", "ws-1", "members"], {
    items: mockMembers,
    nextCursor: null,
  });
  return qc;
}

function renderWithProviders(ui: React.ReactElement, queryClient = createQueryClient()) {
  const authValue = createMockAuth();
  return render(
    <AuthContext.Provider value={authValue}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </AuthContext.Provider>
  );
}

describe("Stage 5.2: Standalone Inline Cell Primitives", () => {
  const defaultTask = {
    id: "task-001",
    statusCategory: "TODO" as const,
    priority: "HIGH" as const,
    dueDate: "2026-12-01",
    title: "Implement Inline Primitives",
    assigneeIds: ["user-123"],
    assigneeAssignments: [
      {
        userId: "user-123",
        user: {
          id: "user-123",
          displayName: "Alex Morgan",
          avatarUrl: null,
        },
        assignedByUserId: "user-123",
        assignedAt: "2026-11-20T00:00:00Z",
      },
    ],
    effectivePermissions: {
      canUpdateStatus: true,
      canEditDatesPriority: true,
      canAssignTask: true,
      canEditTitleDescription: true,
    },
    fieldRevisions: {
      statusCategory: 1,
      priority: 1,
      dueDate: 1,
      assigneeIds: 1,
      title: 1,
    },
  };

  // ==========================================================================
  // ADR-001: stopPropagation Invariant Tests
  // ==========================================================================
  describe("ADR-001: stopPropagation Invariant", () => {
    it("InlineStatusCell does not bubble click events to parent row", async () => {
      const parentRowClick = vi.fn();
      renderWithProviders(
        <div onClick={parentRowClick} data-testid="parent-row">
          <InlineStatusCell
            task={defaultTask}
            communityId="comm-1"
            workspaceId="ws-1"
          />
        </div>
      );

      const trigger = screen.getByTestId("inline-status-trigger-task-001");
      fireEvent.click(trigger);

      expect(parentRowClick).not.toHaveBeenCalled();
      expect(await screen.findByRole("menu", { name: /select status/i })).toBeInTheDocument();
    });

    it("InlinePriorityCell does not bubble click events to parent row", async () => {
      const parentRowClick = vi.fn();
      renderWithProviders(
        <div onClick={parentRowClick} data-testid="parent-row">
          <InlinePriorityCell
            task={defaultTask}
            communityId="comm-1"
            workspaceId="ws-1"
          />
        </div>
      );

      const trigger = screen.getByTestId("inline-priority-trigger-task-001");
      fireEvent.click(trigger);

      expect(parentRowClick).not.toHaveBeenCalled();
      expect(await screen.findByRole("menu", { name: /select priority/i })).toBeInTheDocument();
    });

    it("InlineDueDateCell does not bubble click events to parent row", async () => {
      const parentRowClick = vi.fn();
      renderWithProviders(
        <div onClick={parentRowClick} data-testid="parent-row">
          <InlineDueDateCell
            task={defaultTask}
            communityId="comm-1"
            workspaceId="ws-1"
          />
        </div>
      );

      const trigger = screen.getByTestId("inline-duedate-trigger-task-001");
      fireEvent.click(trigger);

      expect(parentRowClick).not.toHaveBeenCalled();
      expect(await screen.findByRole("dialog", { name: /set due date/i })).toBeInTheDocument();
    });

    it("InlineAssigneeCell does not bubble click events to parent row", async () => {
      const parentRowClick = vi.fn();
      renderWithProviders(
        <div onClick={parentRowClick} data-testid="parent-row">
          <InlineAssigneeCell
            task={defaultTask}
            communityId="comm-1"
            workspaceId="ws-1"
          />
        </div>
      );

      const trigger = screen.getByTestId("inline-assignee-trigger-task-001");
      fireEvent.click(trigger);

      expect(parentRowClick).not.toHaveBeenCalled();
      expect(await screen.findByRole("dialog", { name: /assign task/i })).toBeInTheDocument();
    });

    it("InlineTitleCell does not bubble click events to parent row", async () => {
      const parentRowClick = vi.fn();
      renderWithProviders(
        <div onClick={parentRowClick} data-testid="parent-row">
          <InlineTitleCell
            task={defaultTask}
            communityId="comm-1"
            workspaceId="ws-1"
          />
        </div>
      );

      const trigger = screen.getByTestId("inline-title-cell-task-001");
      fireEvent.click(trigger);

      expect(parentRowClick).not.toHaveBeenCalled();
      expect(screen.getByTestId("inline-title-input-task-001")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // InlineStatusCell Tests
  // ==========================================================================
  describe("InlineStatusCell", () => {
    it("renders current status and calls onStatusChange when option selected", async () => {
      const onStatusChange = vi.fn();
      renderWithProviders(
        <InlineStatusCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
          onStatusChange={onStatusChange}
        />
      );

      const trigger = screen.getByTestId("inline-status-trigger-task-001");
      expect(trigger).toHaveTextContent("To Do");

      fireEvent.click(trigger);
      const doneOption = await screen.findByTestId("inline-status-option-DONE");
      fireEvent.click(doneOption);

      expect(onStatusChange).toHaveBeenCalledWith("DONE");
    });

    it("does not call onStatusChange if clicking the already selected status", async () => {
      const onStatusChange = vi.fn();
      renderWithProviders(
        <InlineStatusCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
          onStatusChange={onStatusChange}
        />
      );

      fireEvent.click(screen.getByTestId("inline-status-trigger-task-001"));
      const todoOption = await screen.findByTestId("inline-status-option-TODO");
      fireEvent.click(todoOption);

      expect(onStatusChange).not.toHaveBeenCalled();
    });

    it("renders inert badge when permissions forbid update", () => {
      const taskNoPerm = {
        ...defaultTask,
        effectivePermissions: { ...defaultTask.effectivePermissions, canUpdateStatus: false },
      };
      renderWithProviders(
        <InlineStatusCell
          task={taskNoPerm}
          communityId="comm-1"
          workspaceId="ws-1"
        />
      );

      expect(screen.queryByTestId("inline-status-trigger-task-001")).not.toBeInTheDocument();
      expect(screen.getByText("To Do")).toBeInTheDocument();
    });

    it("renders disabled state when disabled prop is true", () => {
      renderWithProviders(
        <InlineStatusCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
          disabled={true}
        />
      );

      expect(screen.queryByTestId("inline-status-trigger-task-001")).not.toBeInTheDocument();
      expect(screen.getByText("To Do")).toBeInTheDocument();
    });

    it("handles mutation failure gracefully without unhandled exception", async () => {
      const failingMutation = vi.fn().mockRejectedValue(new Error("Network failure"));
      renderWithProviders(
        <InlineStatusCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
          onStatusChange={failingMutation}
        />
      );

      fireEvent.click(screen.getByTestId("inline-status-trigger-task-001"));
      const doneOption = await screen.findByTestId("inline-status-option-DONE");
      fireEvent.click(doneOption);

      expect(failingMutation).toHaveBeenCalledWith("DONE");
      // Component remains intact and displays original status
      expect(screen.getByTestId("inline-status-trigger-task-001")).toBeInTheDocument();
    });

    it("keyboard navigation: ArrowDown and ArrowUp cycles through menu options", async () => {
      renderWithProviders(
        <InlineStatusCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
        />
      );

      fireEvent.click(screen.getByTestId("inline-status-trigger-task-001"));
      const menu = await screen.findByRole("menu", { name: /select status/i });
      expect(menu).toBeInTheDocument();

      const backlogOption = screen.getByTestId("inline-status-option-BACKLOG");
      const todoOption = screen.getByTestId("inline-status-option-TODO");
      backlogOption.focus();
      expect(document.activeElement).toBe(backlogOption);

      fireEvent.keyDown(menu, { key: "ArrowDown", code: "ArrowDown" });
      expect(document.activeElement).toBe(todoOption);

      fireEvent.keyDown(menu, { key: "ArrowUp", code: "ArrowUp" });
      expect(document.activeElement).toBe(backlogOption);
    });

    it("keyboard dismissal: Escape closes the menu", async () => {
      renderWithProviders(
        <InlineStatusCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
        />
      );

      fireEvent.click(screen.getByTestId("inline-status-trigger-task-001"));
      const menu = await screen.findByRole("menu", { name: /select status/i });
      expect(menu).toBeInTheDocument();

      fireEvent.keyDown(menu, { key: "Escape", code: "Escape" });
      expect(screen.queryByRole("menu", { name: /select status/i })).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // InlinePriorityCell Tests
  // ==========================================================================
  describe("InlinePriorityCell", () => {
    it("renders current priority and calls onPriorityChange when option selected", async () => {
      const onPriorityChange = vi.fn();
      renderWithProviders(
        <InlinePriorityCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
          onPriorityChange={onPriorityChange}
        />
      );

      const trigger = screen.getByTestId("inline-priority-trigger-task-001");
      expect(trigger).toHaveTextContent("High");

      fireEvent.click(trigger);
      const urgentOption = await screen.findByTestId("inline-priority-option-URGENT");
      fireEvent.click(urgentOption);

      expect(onPriorityChange).toHaveBeenCalledWith("URGENT");
    });

    it("does not call onPriorityChange when selecting the active priority", async () => {
      const onPriorityChange = vi.fn();
      renderWithProviders(
        <InlinePriorityCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
          onPriorityChange={onPriorityChange}
        />
      );

      fireEvent.click(screen.getByTestId("inline-priority-trigger-task-001"));
      const highOption = await screen.findByTestId("inline-priority-option-HIGH");
      fireEvent.click(highOption);

      expect(onPriorityChange).not.toHaveBeenCalled();
    });

    it("renders inert badge when permissions forbid update", () => {
      const taskNoPerm = {
        ...defaultTask,
        effectivePermissions: { ...defaultTask.effectivePermissions, canEditDatesPriority: false },
      };
      renderWithProviders(
        <InlinePriorityCell
          task={taskNoPerm}
          communityId="comm-1"
          workspaceId="ws-1"
        />
      );

      expect(screen.queryByTestId("inline-priority-trigger-task-001")).not.toBeInTheDocument();
      expect(screen.getByText("High")).toBeInTheDocument();
    });

    it("renders disabled state when disabled prop is true", () => {
      renderWithProviders(
        <InlinePriorityCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
          disabled={true}
        />
      );

      expect(screen.queryByTestId("inline-priority-trigger-task-001")).not.toBeInTheDocument();
      expect(screen.getByText("High")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // InlineDueDateCell Tests
  // ==========================================================================
  describe("InlineDueDateCell", () => {
    it("renders due date and quick presets work (Today, Tomorrow, Next Week)", async () => {
      const onDueDateChange = vi.fn();
      renderWithProviders(
        <InlineDueDateCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
          onDueDateChange={onDueDateChange}
        />
      );

      const trigger = screen.getByTestId("inline-duedate-trigger-task-001");
      expect(trigger).toHaveTextContent("2026-12-01");

      fireEvent.click(trigger);
      const todayBtn = await screen.findByTestId("inline-duedate-today");
      fireEvent.click(todayBtn);

      const todayExpected = getDefaultReferenceDate();
      expect(onDueDateChange).toHaveBeenCalledWith(todayExpected);

      // Re-open and click tomorrow
      fireEvent.click(trigger);
      const tomorrowBtn = await screen.findByTestId("inline-duedate-tomorrow");
      fireEvent.click(tomorrowBtn);
      expect(onDueDateChange).toHaveBeenCalledWith(addCalendarDays(todayExpected, 1));
    });

    it("clears due date when clear button is clicked", async () => {
      const onDueDateChange = vi.fn();
      renderWithProviders(
        <InlineDueDateCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
          onDueDateChange={onDueDateChange}
        />
      );

      fireEvent.click(screen.getByTestId("inline-duedate-trigger-task-001"));
      const clearBtn = await screen.findByTestId("inline-duedate-clear");
      fireEvent.click(clearBtn);

      expect(onDueDateChange).toHaveBeenCalledWith(null);
    });

    it("updates date when native date input is changed", async () => {
      const onDueDateChange = vi.fn();
      renderWithProviders(
        <InlineDueDateCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
          onDueDateChange={onDueDateChange}
        />
      );

      fireEvent.click(screen.getByTestId("inline-duedate-trigger-task-001"));
      const dateInput = await screen.findByTestId("inline-duedate-input-task-001");
      fireEvent.change(dateInput, { target: { value: "2026-12-25" } });

      expect(onDueDateChange).toHaveBeenCalledWith("2026-12-25");
    });

    it("renders empty state placeholder when dueDate is null", () => {
      const emptyTask = { ...defaultTask, dueDate: null };
      renderWithProviders(
        <InlineDueDateCell
          task={emptyTask}
          communityId="comm-1"
          workspaceId="ws-1"
        />
      );

      const trigger = screen.getByTestId("inline-duedate-trigger-task-001");
      expect(trigger).toHaveTextContent("Set date");
    });

    it("renders inert date when permissions forbid date editing", () => {
      const taskNoPerm = {
        ...defaultTask,
        effectivePermissions: { ...defaultTask.effectivePermissions, canEditDatesPriority: false },
      };
      renderWithProviders(
        <InlineDueDateCell
          task={taskNoPerm}
          communityId="comm-1"
          workspaceId="ws-1"
        />
      );

      expect(screen.queryByTestId("inline-duedate-trigger-task-001")).not.toBeInTheDocument();
      expect(screen.getByText("2026-12-01")).toBeInTheDocument();
    });

    it("renders disabled state when disabled prop is true", () => {
      renderWithProviders(
        <InlineDueDateCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
          disabled={true}
        />
      );

      expect(screen.queryByTestId("inline-duedate-trigger-task-001")).not.toBeInTheDocument();
      expect(screen.getByText("2026-12-01")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // InlineAssigneeCell Tests
  // ==========================================================================
  describe("InlineAssigneeCell", () => {
    it("renders assigned member name and avatar", () => {
      renderWithProviders(
        <InlineAssigneeCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
        />
      );

      const trigger = screen.getByTestId("inline-assignee-trigger-task-001");
      expect(trigger).toHaveTextContent("Alex Morgan");
    });

    it("renders empty state when task has no assignees", () => {
      const unassignedTask = {
        ...defaultTask,
        assigneeIds: [],
        assigneeAssignments: [],
      };
      renderWithProviders(
        <InlineAssigneeCell
          task={unassignedTask}
          communityId="comm-1"
          workspaceId="ws-1"
        />
      );

      const trigger = screen.getByTestId("inline-assignee-trigger-task-001");
      expect(trigger).toHaveTextContent("Unassigned");
    });

    it("renders multi-assignee badge when multiple assignees are present", () => {
      const multiTask = {
        ...defaultTask,
        assigneeIds: ["user-123", "user-456", "user-789"],
        assigneeAssignments: [
          {
            userId: "user-123",
            user: { id: "user-123", displayName: "Alex Morgan", avatarUrl: null },
            assignedByUserId: "user-123",
            assignedAt: "2026-11-20T00:00:00Z",
          },
          {
            userId: "user-456",
            user: { id: "user-456", displayName: "Jordan Lee", avatarUrl: null },
            assignedByUserId: "user-123",
            assignedAt: "2026-11-20T00:00:00Z",
          },
        ],
      };
      renderWithProviders(
        <InlineAssigneeCell
          task={multiTask}
          communityId="comm-1"
          workspaceId="ws-1"
        />
      );

      const trigger = screen.getByTestId("inline-assignee-trigger-task-001");
      expect(trigger).toHaveTextContent("+1");
    });

    it("filters members list when searching", async () => {
      renderWithProviders(
        <InlineAssigneeCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
        />
      );

      fireEvent.click(screen.getByTestId("inline-assignee-trigger-task-001"));
      const searchInput = await screen.findByTestId("inline-assignee-search");
      fireEvent.change(searchInput, { target: { value: "Jordan" } });

      expect(screen.getByTestId("inline-assignee-option-user-456")).toBeInTheDocument();
      expect(screen.queryByTestId("inline-assignee-option-user-789")).not.toBeInTheDocument();
    });

    it("shows 'No members found' when search has no matches", async () => {
      renderWithProviders(
        <InlineAssigneeCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
        />
      );

      fireEvent.click(screen.getByTestId("inline-assignee-trigger-task-001"));
      const searchInput = await screen.findByTestId("inline-assignee-search");
      fireEvent.change(searchInput, { target: { value: "NonExistentName" } });

      expect(screen.getByText("No members found")).toBeInTheDocument();
    });

    it("assigns selected member when member option is clicked", async () => {
      const onAssigneeChange = vi.fn();
      renderWithProviders(
        <InlineAssigneeCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
          onAssigneeChange={onAssigneeChange}
        />
      );

      fireEvent.click(screen.getByTestId("inline-assignee-trigger-task-001"));
      const memberOption = await screen.findByTestId("inline-assignee-option-user-456");
      fireEvent.click(memberOption);

      expect(onAssigneeChange).toHaveBeenCalledWith(["user-456"]);
    });

    it("clears assignees when Unassigned option is clicked", async () => {
      const onAssigneeChange = vi.fn();
      renderWithProviders(
        <InlineAssigneeCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
          onAssigneeChange={onAssigneeChange}
        />
      );

      fireEvent.click(screen.getByTestId("inline-assignee-trigger-task-001"));
      const unassignedBtn = await screen.findByTestId("inline-assignee-option-unassigned");
      fireEvent.click(unassignedBtn);

      expect(onAssigneeChange).toHaveBeenCalledWith([]);
    });

    it("renders inert text when permissions forbid assigning", () => {
      const taskNoPerm = {
        ...defaultTask,
        effectivePermissions: { ...defaultTask.effectivePermissions, canAssignTask: false },
      };
      renderWithProviders(
        <InlineAssigneeCell
          task={taskNoPerm}
          communityId="comm-1"
          workspaceId="ws-1"
        />
      );

      expect(screen.queryByTestId("inline-assignee-trigger-task-001")).not.toBeInTheDocument();
      expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    });

    it("renders disabled state when disabled prop is true", () => {
      renderWithProviders(
        <InlineAssigneeCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
          disabled={true}
        />
      );

      expect(screen.queryByTestId("inline-assignee-trigger-task-001")).not.toBeInTheDocument();
      expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // InlineTitleCell Tests
  // ==========================================================================
  describe("InlineTitleCell", () => {
    it("allows editing and saves on Enter", async () => {
      const onTitleChange = vi.fn();
      renderWithProviders(
        <InlineTitleCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
          onTitleChange={onTitleChange}
        />
      );

      fireEvent.click(screen.getByTestId("inline-title-cell-task-001"));
      const input = screen.getByTestId("inline-title-input-task-001");
      fireEvent.change(input, { target: { value: "Updated Task Title" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      expect(onTitleChange).toHaveBeenCalledWith("Updated Task Title");
    });

    it("saves trimmed changes on blur", async () => {
      const onTitleChange = vi.fn();
      renderWithProviders(
        <InlineTitleCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
          onTitleChange={onTitleChange}
        />
      );

      fireEvent.click(screen.getByTestId("inline-title-cell-task-001"));
      const input = screen.getByTestId("inline-title-input-task-001");
      fireEvent.change(input, { target: { value: "  Saved on Blur  " } });
      fireEvent.blur(input);

      expect(onTitleChange).toHaveBeenCalledWith("Saved on Blur");
    });

    it("validation rejects empty or whitespace-only title and reverts", () => {
      const onTitleChange = vi.fn();
      renderWithProviders(
        <InlineTitleCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
          onTitleChange={onTitleChange}
        />
      );

      fireEvent.click(screen.getByTestId("inline-title-cell-task-001"));
      const input = screen.getByTestId("inline-title-input-task-001");
      fireEvent.change(input, { target: { value: "    " } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      expect(onTitleChange).not.toHaveBeenCalled();
      expect(screen.getByText("Implement Inline Primitives")).toBeInTheDocument();
    });

    it("cancels edit on Escape without invoking onTitleChange", () => {
      const onTitleChange = vi.fn();
      renderWithProviders(
        <InlineTitleCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
          onTitleChange={onTitleChange}
        />
      );

      fireEvent.click(screen.getByTestId("inline-title-cell-task-001"));
      const input = screen.getByTestId("inline-title-input-task-001");
      fireEvent.change(input, { target: { value: "Temporary edit" } });
      fireEvent.keyDown(input, { key: "Escape", code: "Escape" });

      expect(onTitleChange).not.toHaveBeenCalled();
      expect(screen.getByText("Implement Inline Primitives")).toBeInTheDocument();
    });

    it("renders inert text when permissions forbid editing title", () => {
      const taskNoPerm = {
        ...defaultTask,
        effectivePermissions: { ...defaultTask.effectivePermissions, canEditTitleDescription: false },
      };
      renderWithProviders(
        <InlineTitleCell
          task={taskNoPerm}
          communityId="comm-1"
          workspaceId="ws-1"
        />
      );

      const cell = screen.getByTestId("inline-title-cell-task-001");
      fireEvent.click(cell);
      expect(screen.queryByTestId("inline-title-input-task-001")).not.toBeInTheDocument();
      expect(screen.getByText("Implement Inline Primitives")).toBeInTheDocument();
    });

    it("renders disabled state when disabled prop is true", () => {
      renderWithProviders(
        <InlineTitleCell
          task={defaultTask}
          communityId="comm-1"
          workspaceId="ws-1"
          disabled={true}
        />
      );

      const cell = screen.getByTestId("inline-title-cell-task-001");
      fireEvent.click(cell);
      expect(screen.queryByTestId("inline-title-input-task-001")).not.toBeInTheDocument();
      expect(screen.getByText("Implement Inline Primitives")).toBeInTheDocument();
    });
  });
});
