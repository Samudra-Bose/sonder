import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextType } from "@/modules/auth/index.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import { TaskDependencies } from "./TaskDependencies.js";
import type { TaskDto } from "./types.js";
import { makeTaskPermissions } from "@/mocks/data/tasks.js";
import { resetTaskMockState } from "@/mocks/handlers/tasks.js";
import {
  WS_SHARED_ENG_ID,
  MOCK_COMMUNITY_1_ID,
} from "@/mocks/data/my-work.js";

const mockAuthValue: AuthContextType = {
  user: {
    id: "018f98a2-3f12-7890-a001-23456789abcd",
    email: "alex@example.com",
    displayName: "Alex Morgan",
    avatarUrl: null,
  },
  communities: defaultMockCommunities,
  status: "authenticated",
  error: null,
  csrfToken: "mock-valid-csrf-token",
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
  clearError: vi.fn(),
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthValue}>
        {ui}
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("TaskDependencies Section in TaskPeekDrawer", () => {
  beforeEach(() => {
    resetTaskMockState();
  });

  const eng101: TaskDto = {
    id: "018f98a2-task-001-overdue-assigned",
    workspaceId: WS_SHARED_ENG_ID,
    parentTaskId: null,
    taskKey: "ENG-101",
    title: "Fix critical auth token refresh race condition",
    itemType: "TASK",
    statusCategory: "IN_PROGRESS",
    priority: "URGENT",
    assigneeIds: [],
    creatorId: "user-1",
    startDate: "2026-10-20",
    dueDate: "2026-10-28",
    estimatePoints: 5,
    labelIds: [],
    milestoneId: null,
    rankKey: "0|hzzzzz1:",
    version: 1,
    fieldRevisions: {},
    effectivePermissions: makeTaskPermissions(true),
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    archivedAt: null,
    assigneeAssignments: [],
    assigneeEditableFieldGroups: [],
  };

  const eng105: TaskDto = {
    id: "018f98a2-task-001-subtask-1",
    workspaceId: WS_SHARED_ENG_ID,
    parentTaskId: "018f98a2-task-001-overdue-assigned",
    taskKey: "ENG-105",
    title: "Write concurrent refresh token unit tests",
    itemType: "TASK",
    statusCategory: "TODO",
    priority: "HIGH",
    assigneeIds: [],
    creatorId: "user-1",
    startDate: "2026-10-25",
    dueDate: "2026-11-04",
    estimatePoints: 2,
    labelIds: [],
    milestoneId: null,
    rankKey: "0|hzzzzz2:",
    version: 1,
    fieldRevisions: {},
    effectivePermissions: makeTaskPermissions(true),
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    archivedAt: null,
    assigneeAssignments: [],
    assigneeEditableFieldGroups: [],
  };

  const eng102: TaskDto = {
    id: "018f98a2-task-003-today-assigned-created",
    workspaceId: WS_SHARED_ENG_ID,
    parentTaskId: null,
    taskKey: "ENG-102",
    title: "Ship VS-02E My Work cross-workspace dashboard",
    itemType: "TASK",
    statusCategory: "IN_PROGRESS",
    priority: "HIGH",
    assigneeIds: [],
    creatorId: "user-1",
    startDate: "2026-11-01",
    dueDate: "2026-11-03",
    estimatePoints: 8,
    labelIds: [],
    milestoneId: null,
    rankKey: "0|hzzzzz3:",
    version: 1,
    fieldRevisions: {},
    effectivePermissions: makeTaskPermissions(true),
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    archivedAt: null,
    assigneeAssignments: [],
    assigneeEditableFieldGroups: [],
  };

  const allTasks = [eng101, eng105, eng102];

  it("renders dependencies list with link types and detects scheduling conflict", async () => {
    renderWithProviders(
      <TaskDependencies
        task={eng101}
        allTasks={allTasks}
        communityId={MOCK_COMMUNITY_1_ID}
        workspaceId={WS_SHARED_ENG_ID}
      />
    );

    // 1. Heading and count badge
    expect(screen.getByText("Dependencies & Relations")).toBeInTheDocument();

    await waitFor(() => {
      const badge = screen.getByTestId("dependencies-count-badge");
      expect(badge).toHaveTextContent("2");
    });

    // 2. Link 1: ENG-101 BLOCKS ENG-105 (conflicting)
    expect(screen.getByText("ENG-105")).toBeInTheDocument();
    expect(screen.getByText("Write concurrent refresh token unit tests")).toBeInTheDocument();

    // 3. Section conflict indicator
    expect(screen.getByTestId("section-conflict-indicator")).toBeInTheDocument();

    // 4. Specific link conflict explanation
    const conflictAlert = screen.getByTestId(
      "dependency-conflict-alert-018f98a2-link-001-eng101-blocks-eng105"
    );
    expect(conflictAlert).toBeInTheDocument();
    expect(conflictAlert).toHaveTextContent("ENG-101 is scheduled to finish on 2026-10-28");
    expect(conflictAlert).toHaveTextContent("ENG-105 is scheduled to begin on 2026-10-25");
  });

  it("handles restricted task endpoints with privacy preservation", async () => {
    // In seed data: ENG-102 has a restricted dependency
    renderWithProviders(
      <TaskDependencies
        task={eng102}
        allTasks={allTasks}
        communityId={MOCK_COMMUNITY_1_ID}
        workspaceId={WS_SHARED_ENG_ID}
      />
    );

    // Restricted Task pill is shown
    const restrictedPill = await screen.findByTestId(
      "restricted-target-018f98a2-link-004-eng102-restricted"
    );
    expect(restrictedPill).toBeInTheDocument();
    expect(restrictedPill).toHaveTextContent("Restricted Task");

    // Ensure NO private title, key or internal UUID is leaked
    expect(screen.queryByText("018f98a2-task-restricted-cross-ws")).not.toBeInTheDocument();
  });

  it("creates a new dependency link and displays it in list", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <TaskDependencies
        task={eng105}
        allTasks={allTasks}
        communityId={MOCK_COMMUNITY_1_ID}
        workspaceId={WS_SHARED_ENG_ID}
      />
    );

    // Open Add Link form
    const addBtn = await screen.findByTestId("add-dependency-button");
    await user.click(addBtn);

    expect(screen.getByTestId("add-dependency-form")).toBeInTheDocument();

    // Select type RELATES_TO
    const typeSelect = screen.getByTestId("dependency-type-select");
    await user.selectOptions(typeSelect, "RELATES_TO");

    // Select target ENG-102
    const targetSelect = screen.getByTestId("dependency-target-select");
    await user.selectOptions(targetSelect, eng102.id);

    // Submit form
    const submitBtn = screen.getByTestId("submit-dependency-button");
    await user.click(submitBtn);

    // Verify form closed and new link appears
    await waitFor(() => {
      expect(screen.queryByTestId("add-dependency-form")).not.toBeInTheDocument();
      expect(screen.getByText("ENG-102")).toBeInTheDocument();
    });
  });

  it("displays cycle error when attempting to add a cyclic dependency", async () => {
    const user = userEvent.setup();

    // In seed: ENG-101 BLOCKS ENG-105. Attempting ENG-105 BLOCKS ENG-101 is a cycle!
    renderWithProviders(
      <TaskDependencies
        task={eng105}
        allTasks={allTasks}
        communityId={MOCK_COMMUNITY_1_ID}
        workspaceId={WS_SHARED_ENG_ID}
      />
    );

    const addBtn = await screen.findByTestId("add-dependency-button");
    await user.click(addBtn);

    const typeSelect = screen.getByTestId("dependency-type-select");
    await user.selectOptions(typeSelect, "BLOCKS");

    const targetSelect = screen.getByTestId("dependency-target-select");
    await user.selectOptions(targetSelect, eng101.id);

    const submitBtn = screen.getByTestId("submit-dependency-button");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Dependency Cycle Detected|cycle in the task dependency graph/i)
      ).toBeInTheDocument();
    });
  });

  it("deletes a dependency link when trash button is clicked", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <TaskDependencies
        task={eng101}
        allTasks={allTasks}
        communityId={MOCK_COMMUNITY_1_ID}
        workspaceId={WS_SHARED_ENG_ID}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("ENG-105")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTestId(
      "delete-dependency-018f98a2-link-001-eng101-blocks-eng105"
    );
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(screen.queryByText("ENG-105")).not.toBeInTheDocument();
    });
  });

  it("hides add and delete actions when user lacks edit permissions or task is archived", () => {
    const readOnlyTask = {
      ...eng101,
      effectivePermissions: makeTaskPermissions(false),
    };

    renderWithProviders(
      <TaskDependencies
        task={readOnlyTask}
        allTasks={allTasks}
        communityId={MOCK_COMMUNITY_1_ID}
        workspaceId={WS_SHARED_ENG_ID}
      />
    );

    expect(screen.queryByTestId("add-dependency-button")).not.toBeInTheDocument();
  });
});
