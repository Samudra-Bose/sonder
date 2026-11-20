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

const testUser = {
  id: "user-123",
  displayName: "Alex Morgan",
  email: "alex@example.com",
  avatarUrl: null,
};

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
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createQueryClient();
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

    it("renders inert badge when permissions forbid update", () => {
      const taskNoPerm = {
        ...defaultTask,
        effectivePermissions: { canUpdateStatus: false },
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
  });

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
  });

  describe("InlineDueDateCell", () => {
    it("renders due date and quick actions work", async () => {
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
      const clearBtn = await screen.findByTestId("inline-duedate-clear");
      fireEvent.click(clearBtn);

      expect(onDueDateChange).toHaveBeenCalledWith(null);
    });
  });

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

    it("cancels edit on Escape", () => {
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
  });
});
