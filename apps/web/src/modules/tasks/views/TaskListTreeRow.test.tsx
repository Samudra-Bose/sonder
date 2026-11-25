import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
import { TaskListTreeRow } from "./TaskListTreeRow.js";
import type { TaskTreeNode } from "../hierarchy/types.js";
import type { TaskDto } from "../types.js";

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

function makeTask(overrides: Partial<TaskDto>): TaskDto {
  return {
    id: overrides.id ?? "task-1",
    workspaceId: "ws-1",
    parentTaskId: overrides.parentTaskId ?? null,
    taskKey: overrides.taskKey ?? "ENG-101",
    title: overrides.title ?? "Test Title",
    description: "Sample",
    itemType: "TASK",
    statusCategory: "IN_PROGRESS",
    priority: "HIGH",
    assigneeIds: [],
    creatorId: "user-1",
    startDate: null,
    dueDate: null,
    estimatePoints: null,
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

function renderTreeRow(node: TaskTreeNode, props: Partial<React.ComponentProps<typeof TaskListTreeRow>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthValue}>
        <WorkspaceProvider
          initialCommunityId={MOCK_COMMUNITY_1_ID}
          initialWorkspaceId={WS_SHARED_ENG_ID}
        >
          <MemoryRouter>
            <table>
              <tbody>
                <TaskListTreeRow
                  node={node}
                  workspaceId={WS_SHARED_ENG_ID}
                  communityId={MOCK_COMMUNITY_1_ID}
                  density="standard"
                  isSelected={false}
                  onToggleSelect={vi.fn()}
                  onOpenTask={vi.fn()}
                  bodyCellPadding="py-0 px-3"
                  isCompact={false}
                  {...props}
                />
              </tbody>
            </table>
          </MemoryRouter>
        </WorkspaceProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("TaskListTreeRow — Hierarchical Row Presentation", () => {
  it("renders a root task at depth 0 with 0px indentation", () => {
    const node: TaskTreeNode = {
      task: makeTask({ taskKey: "ENG-1" }),
      depth: 0,
      parentId: null,
      children: [],
      subtaskCount: 0,
      completedSubtaskCount: 0,
      hasChildren: false,
      isOrphaned: false,
    };

    renderTreeRow(node);
    const row = screen.getByTestId("task-list-tree-row-ENG-1");
    expect(row).toBeInTheDocument();
    expect(row).toHaveAttribute("data-depth", "0");
    expect(row).not.toHaveAttribute("data-orphan");

    // Title cell container has 0px padding
    const titleContainer = row.querySelector("td:nth-child(3) > div");
    expect(titleContainer).toHaveStyle({ paddingLeft: "0px" });
  });

  it("renders a subtask at depth 1 with 24px indentation and guide line", () => {
    const node: TaskTreeNode = {
      task: makeTask({ taskKey: "ENG-2", parentTaskId: "parent-id" }),
      depth: 1,
      parentId: "parent-id",
      children: [],
      subtaskCount: 0,
      completedSubtaskCount: 0,
      hasChildren: false,
      isOrphaned: false,
    };

    renderTreeRow(node);
    const row = screen.getByTestId("task-list-tree-row-ENG-2");
    expect(row).toHaveAttribute("data-depth", "1");
    expect(row).toHaveAttribute("data-parent-id", "parent-id");

    const titleContainer = row.querySelector("td:nth-child(3) > div");
    expect(titleContainer).toHaveStyle({ paddingLeft: "24px" });
  });

  it("renders a grandchild at depth 2 with 48px indentation", () => {
    const node: TaskTreeNode = {
      task: makeTask({ taskKey: "ENG-3", parentTaskId: "child-id" }),
      depth: 2,
      parentId: "child-id",
      children: [],
      subtaskCount: 0,
      completedSubtaskCount: 0,
      hasChildren: false,
      isOrphaned: false,
    };

    renderTreeRow(node);
    const row = screen.getByTestId("task-list-tree-row-ENG-3");
    expect(row).toHaveAttribute("data-depth", "2");

    const titleContainer = row.querySelector("td:nth-child(3) > div");
    expect(titleContainer).toHaveStyle({ paddingLeft: "48px" });
  });

  it("renders an orphaned subtask with explicit badge and accessible description", () => {
    const node: TaskTreeNode = {
      task: makeTask({ taskKey: "ENG-4", parentTaskId: "missing-parent" }),
      depth: 0,
      parentId: null,
      children: [],
      subtaskCount: 0,
      completedSubtaskCount: 0,
      hasChildren: false,
      isOrphaned: true,
      orphanParentId: "missing-parent",
      orphanParentLabel: "Subtask of ENG-100",
    };

    renderTreeRow(node);
    const row = screen.getByTestId("task-list-tree-row-ENG-4");
    expect(row).toHaveAttribute("data-orphan", "true");

    const badge = screen.getByTestId("orphan-badge-ENG-4");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Subtask of ENG-100");
  });

  it("renders honest subtask progress metric when parent has children", () => {
    const node: TaskTreeNode = {
      task: makeTask({ taskKey: "ENG-5" }),
      depth: 0,
      parentId: null,
      children: [],
      subtaskCount: 4,
      completedSubtaskCount: 2,
      hasChildren: true,
      isOrphaned: false,
    };

    renderTreeRow(node);
    const progress = screen.getByTestId("subtask-progress-ENG-5");
    expect(progress).toHaveTextContent("2 of 4 loaded");
  });

  it("handles selection and open-task keyboard events", () => {
    const onToggleSelect = vi.fn();
    const onOpenTask = vi.fn();

    const node: TaskTreeNode = {
      task: makeTask({ id: "task-test", taskKey: "ENG-99" }),
      depth: 0,
      parentId: null,
      children: [],
      subtaskCount: 0,
      completedSubtaskCount: 0,
      hasChildren: false,
      isOrphaned: false,
    };

    renderTreeRow(node, { onToggleSelect, onOpenTask });

    // Click checkbox
    const checkbox = screen.getByTestId("bulk-select-task-ENG-99");
    fireEvent.click(checkbox);
    expect(onToggleSelect).toHaveBeenCalledWith("task-test");

    // Keydown on row
    const row = screen.getByTestId("task-list-tree-row-ENG-99");
    fireEvent.keyDown(row, { key: "Enter" });
    expect(onOpenTask).toHaveBeenCalledWith("ENG-99");
  });

  describe("Batch 3: Expand/Collapse Disclosure Mechanics", () => {
    it("renders disclosure button when hasChildren is true with correct aria-expanded and label", () => {
      const onToggleExpand = vi.fn();
      const onOpenTask = vi.fn();
      const node: TaskTreeNode = {
        task: makeTask({ id: "parent-task", taskKey: "ENG-PARENT" }),
        depth: 0,
        parentId: null,
        children: [],
        subtaskCount: 3,
        completedSubtaskCount: 1,
        hasChildren: true,
        isOrphaned: false,
      };

      renderTreeRow(node, {
        isExpanded: false,
        onToggleExpand,
        onOpenTask,
      });

      const button = screen.getByTestId("tree-expand-button-ENG-PARENT");
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(button).toHaveAttribute("aria-label", "Expand subtasks for ENG-PARENT");
      // aria-controls is omitted to prevent dangling IDREF accessibility violations (rows are sibling <tr>s)
      expect(button).not.toHaveAttribute("aria-controls");

      // Clicking invokes onToggleExpand without triggering onOpenTask (event stopped)
      fireEvent.click(button);
      expect(onToggleExpand).toHaveBeenCalledWith("parent-task");
      expect(onOpenTask).not.toHaveBeenCalled();

      // KeyDown stops propagation to prevent triggering row navigation (native button handles Enter/Space activation)
      fireEvent.keyDown(button, { key: "Enter" });
      expect(onOpenTask).not.toHaveBeenCalled();

      fireEvent.keyDown(button, { key: " " });
      expect(onOpenTask).not.toHaveBeenCalled();
    });

    it("updates aria-expanded and label when isExpanded is true", () => {
      const node: TaskTreeNode = {
        task: makeTask({ id: "parent-task", taskKey: "ENG-EXP" }),
        depth: 0,
        parentId: null,
        children: [],
        subtaskCount: 2,
        completedSubtaskCount: 0,
        hasChildren: true,
        isOrphaned: false,
      };

      renderTreeRow(node, { isExpanded: true });

      const button = screen.getByTestId("tree-expand-button-ENG-EXP");
      expect(button).toHaveAttribute("aria-expanded", "true");
      expect(button).toHaveAttribute("aria-label", "Collapse subtasks for ENG-EXP");
    });

    it("renders spacer instead of button when task has no children", () => {
      const node: TaskTreeNode = {
        task: makeTask({ id: "leaf-task", taskKey: "ENG-LEAF" }),
        depth: 0,
        parentId: null,
        children: [],
        subtaskCount: 0,
        completedSubtaskCount: 0,
        hasChildren: false,
        isOrphaned: false,
      };

      renderTreeRow(node);

      expect(screen.queryByTestId("tree-expand-button-ENG-LEAF")).not.toBeInTheDocument();
      const spacer = screen.getByTestId("tree-spacer-ENG-LEAF");
      expect(spacer).toBeInTheDocument();
      expect(spacer).toHaveAttribute("aria-hidden", "true");
    });

    it("preserves density interactive target constraints (44x44px Standard vs 24x24px Compact)", () => {
      const node: TaskTreeNode = {
        task: makeTask({ id: "parent-task", taskKey: "ENG-DENS" }),
        depth: 0,
        parentId: null,
        children: [],
        subtaskCount: 1,
        completedSubtaskCount: 0,
        hasChildren: true,
        isOrphaned: false,
      };

      // Standard density
      const { unmount } = renderTreeRow(node, { density: "standard", isCompact: false });
      const stdButton = screen.getByTestId("tree-expand-button-ENG-DENS");
      expect(stdButton.className).toContain("min-h-[44px]");
      expect(stdButton.className).toContain("min-w-[44px]");

      unmount();

      // Compact density
      renderTreeRow(node, { density: "compact", isCompact: true });
      const compactButton = screen.getByTestId("tree-expand-button-ENG-DENS");
      expect(compactButton.className).toContain("min-h-[24px]");
      expect(compactButton.className).toContain("min-w-[24px]");
    });
  });

  describe("Batch 4: Context-Only Ancestor Row Presentation", () => {
    it("renders context-only ancestor row with data-context-only and accessible badge", () => {
      const node: TaskTreeNode = {
        task: makeTask({ id: "ctx-parent", taskKey: "ENG-CTX", title: "Context Parent Task" }),
        depth: 0,
        parentId: null,
        children: [],
        subtaskCount: 2,
        completedSubtaskCount: 1,
        hasChildren: true,
        isOrphaned: false,
        isContextOnly: true,
      };

      renderTreeRow(node);

      const row = screen.getByTestId("task-list-tree-row-ENG-CTX");
      expect(row).toBeInTheDocument();
      expect(row).toHaveAttribute("data-context-only", "true");

      const badge = screen.getByTestId("context-only-badge-ENG-CTX");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("Context only");
      expect(badge.querySelector(".sr-only")).toHaveTextContent(
        "Hierarchy context only; does not match active filter"
      );
    });

    it("allows individual selection of a context-only ancestor row", () => {
      const onToggleSelect = vi.fn();
      const node: TaskTreeNode = {
        task: makeTask({ id: "ctx-parent-sel", taskKey: "ENG-CSEL" }),
        depth: 0,
        parentId: null,
        children: [],
        subtaskCount: 1,
        completedSubtaskCount: 0,
        hasChildren: true,
        isOrphaned: false,
        isContextOnly: true,
      };

      renderTreeRow(node, { onToggleSelect });

      const checkbox = screen.getByTestId("bulk-select-task-ENG-CSEL");
      fireEvent.click(checkbox);
      expect(onToggleSelect).toHaveBeenCalledWith("ctx-parent-sel");
    });

    it("preserves exact target dimensions on context-only ancestor row", () => {
      const node: TaskTreeNode = {
        task: makeTask({ id: "ctx-parent-targ", taskKey: "ENG-CTARG" }),
        depth: 0,
        parentId: null,
        children: [],
        subtaskCount: 1,
        completedSubtaskCount: 0,
        hasChildren: true,
        isOrphaned: false,
        isContextOnly: true,
      };

      // Standard density
      const { unmount } = renderTreeRow(node, { density: "standard", isCompact: false });
      const stdButton = screen.getByTestId("tree-expand-button-ENG-CTARG");
      expect(stdButton.className).toContain("min-h-[44px]");
      expect(stdButton.className).toContain("min-w-[44px]");

      unmount();

      // Compact density
      renderTreeRow(node, { density: "compact", isCompact: true });
      const compactButton = screen.getByTestId("tree-expand-button-ENG-CTARG");
      expect(compactButton.className).toContain("min-h-[24px]");
      expect(compactButton.className).toContain("min-w-[24px]");
    });
  });
});
