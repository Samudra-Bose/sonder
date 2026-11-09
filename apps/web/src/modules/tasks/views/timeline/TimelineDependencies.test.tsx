import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextType } from "@/modules/auth/index.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import { TimelineView } from "./TimelineView.js";
import type { TaskDto } from "@/modules/tasks/types.js";
import type { TaskQueryDependencyEdgeDto } from "@/modules/tasks/dependencies/types.js";
import { makeTaskPermissions } from "@/mocks/data/tasks.js";

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

describe("Timeline Dependency Connectors & Conflict Visualization", () => {
  const taskA: TaskDto = {
    id: "task-a",
    workspaceId: "ws-1",
    parentTaskId: null,
    taskKey: "ENG-101",
    title: "Upstream Blocker Task",
    itemType: "TASK",
    statusCategory: "IN_PROGRESS",
    priority: "HIGH",
    assigneeIds: [],
    creatorId: "user-1",
    startDate: "2026-11-01",
    dueDate: "2026-11-15",
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

  const taskB: TaskDto = {
    id: "task-b",
    workspaceId: "ws-1",
    parentTaskId: null,
    taskKey: "ENG-102",
    title: "Conflicted Dependent Task",
    itemType: "TASK",
    statusCategory: "TODO",
    priority: "MEDIUM",
    assigneeIds: [],
    creatorId: "user-1",
    // Starts on 2026-11-10, BEFORE taskA finishes on 2026-11-15 -> CONFLICT!
    startDate: "2026-11-10",
    dueDate: "2026-11-20",
    estimatePoints: 3,
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

  const taskC: TaskDto = {
    id: "task-c",
    workspaceId: "ws-1",
    parentTaskId: null,
    taskKey: "ENG-103",
    title: "Task with Restricted Dependency",
    itemType: "TASK",
    statusCategory: "TODO",
    priority: "MEDIUM",
    assigneeIds: [],
    creatorId: "user-1",
    startDate: "2026-11-20",
    dueDate: "2026-11-28",
    estimatePoints: 2,
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

  const dependencyEdges: TaskQueryDependencyEdgeDto[] = [
    // 1. Task A blocks Task B (Conflicting)
    {
      linkId: "link-conflict-ab",
      visibleTaskId: "task-a",
      direction: "OUTGOING",
      type: "BLOCKS",
      otherEndpoint: {
        access: "VISIBLE",
        taskId: "task-b",
        taskKey: "ENG-102",
        title: "Conflicted Dependent Task",
        statusCategory: "TODO",
      },
    },
    // 2. Task C is blocked by a Restricted Task
    {
      linkId: "link-restricted-c",
      visibleTaskId: "task-c",
      direction: "INCOMING",
      type: "BLOCKS",
      otherEndpoint: {
        access: "RESTRICTED",
        label: "Restricted Task",
      },
    },
  ];

  it("renders SVG connectors and indicates scheduling conflict on both connector and task bar", () => {
    renderWithProviders(
      <TimelineView
        tasks={[taskA, taskB, taskC]}
        unscheduledTasks={[]}
        milestones={[]}
        dependencyEdges={dependencyEdges}
        timelineMode="month"
        onTimelineModeChange={vi.fn()}
        currentDate="2026-11-09"
        onCurrentDateChange={vi.fn()}
        onTaskClick={vi.fn()}
        workspaceId="ws-1"
        communityId="comm-1"
      />
    );

    // 1. Verify SVG container rendered
    const svg = screen.getByTestId("timeline-dependency-svg");
    expect(svg).toBeInTheDocument();

    // 2. Verify connector rendered for the conflicting edge
    const connector = screen.getByTestId("dependency-connector-link-conflict-ab");
    expect(connector).toBeInTheDocument();

    // 3. Verify conflict badge rendered on the connector
    const conflictBadge = screen.getByTestId("connector-conflict-badge-link-conflict-ab");
    expect(conflictBadge).toBeInTheDocument();

    // 4. Verify conflict badges rendered on task rows
    const taskAConflict = screen.getByTestId("task-conflict-badge-task-a");
    const taskBConflict = screen.getByTestId("task-conflict-badge-task-b");
    expect(taskAConflict).toBeInTheDocument();
    expect(taskBConflict).toBeInTheDocument();
  });

  it("preserves privacy invariant for restricted task dependency without exposing private fields", () => {
    const { container } = renderWithProviders(
      <TimelineView
        tasks={[taskA, taskB, taskC]}
        unscheduledTasks={[]}
        milestones={[]}
        dependencyEdges={dependencyEdges}
        timelineMode="month"
        onTimelineModeChange={vi.fn()}
        currentDate="2026-11-09"
        onCurrentDateChange={vi.fn()}
        onTaskClick={vi.fn()}
        workspaceId="ws-1"
        communityId="comm-1"
      />
    );

    // 1. Restricted dependency badge rendered on task C
    const restrictedBadge = screen.getByTestId("task-restricted-dep-badge-task-c");
    expect(restrictedBadge).toBeInTheDocument();
    expect(restrictedBadge).toHaveAttribute("title", "Linked to a restricted task");

    // 2. Privacy invariant verification: Ensure NO private identifiers or sensitive keys exist in HTML
    const html = container.innerHTML;
    expect(html).not.toContain("SECRET");
    expect(html).not.toContain("PRIVATE");
    expect(html).not.toContain("uuid-restricted");
  });
});
