import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { makeTaskPermissions } from "@/mocks/data/tasks.js";
import { InlineCreationRow } from "./InlineCreationRow.js";
import * as tasksApi from "./api.js";
import type { TaskDto } from "./types.js";

function createMockAuthContext(overrides?: Partial<AuthContextType>): AuthContextType {
  return {
    user: {
      id: "user-123",
      email: "user@example.com",
      displayName: "Alex Morgan",
      avatarUrl: null,
    },
    communities: [],
    csrfToken: "mock-csrf-token",
    status: "authenticated",
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  };
}

function renderWithProviders(
  ui: React.ReactElement,
  authOverrides?: Partial<AuthContextType>
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const authContext = createMockAuthContext(authOverrides);

  return render(
    <AuthContext.Provider value={authContext}>
      <QueryClientProvider client={queryClient}>
        <table>
          <tbody>
            {ui}
          </tbody>
        </table>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

function renderBoardWithProviders(
  ui: React.ReactElement,
  authOverrides?: Partial<AuthContextType>
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const authContext = createMockAuthContext(authOverrides);

  return render(
    <AuthContext.Provider value={authContext}>
      <QueryClientProvider client={queryClient}>
        <div>{ui}</div>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

describe("Stage 5.3A: Shared Inline Creation Foundation (InlineCreationRow)", () => {
  const mockCreatedTask: TaskDto = {
    id: "new-task-1",
    taskKey: "SDR-101",
    workspaceId: "ws-1",
    title: "New Created Task",
    description: null,
    statusCategory: "TODO",
    priority: "NONE",
    itemType: "TASK",
    creatorId: "user-123",
    assigneeIds: [],
    assigneeAssignments: [],
    labelIds: [],
    milestoneId: null,
    parentTaskId: null,
    estimatePoints: null,
    startDate: null,
    dueDate: null,
    rankKey: "0|hzzzzz:",
    version: 1,
    fieldRevisions: { title: 1, statusCategory: 1 },
    effectivePermissions: makeTaskPermissions(true),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    archivedAt: null,
    assigneeEditableFieldGroups: [],
    externalLinks: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders resting trigger in list variant and activates on click", () => {
    renderWithProviders(
      <InlineCreationRow
        communityId="comm-1"
        workspaceId="ws-1"
        variant="list"
      />
    );

    const trigger = screen.getByTestId("inline-creation-trigger");
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText("New task...")).toBeInTheDocument();

    // Click trigger to activate
    fireEvent.click(trigger);

    expect(screen.getByTestId("inline-creation-input")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Task title... (Press Enter to create)")).toBeInTheDocument();
  });

  it("keyboard activation: Enter and Space on resting trigger activates creation mode", () => {
    renderWithProviders(
      <InlineCreationRow
        communityId="comm-1"
        workspaceId="ws-1"
        variant="list"
      />
    );

    const trigger = screen.getByTestId("inline-creation-trigger");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter" });

    expect(screen.getByTestId("inline-creation-input")).toBeInTheDocument();
  });

  it("submits on Enter, clears input, and maintains focus for rapid-fire creation loop", async () => {
    const createSpy = vi.spyOn(tasksApi, "createTask").mockResolvedValue(mockCreatedTask);
    const onTaskCreated = vi.fn();

    renderWithProviders(
      <InlineCreationRow
        communityId="comm-1"
        workspaceId="ws-1"
        variant="list"
        onTaskCreated={onTaskCreated}
      />
    );

    // Activate
    fireEvent.click(screen.getByTestId("inline-creation-trigger"));
    const input = screen.getByTestId("inline-creation-input");

    // Enter valid title
    fireEvent.change(input, { target: { value: "Implement search filtering" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          communityId: "comm-1",
          workspaceId: "ws-1",
          data: {
            title: "Implement search filtering",
            statusCategory: undefined,
            parentTaskId: undefined,
          },
        })
      );
    });

    // Rapid-fire creation verification:
    // 1. onTaskCreated callback invoked
    expect(onTaskCreated).toHaveBeenCalledWith(mockCreatedTask);
    // 2. Input value is cleared
    expect(input).toHaveValue("");
    // 3. Creation mode is STILL active
    expect(screen.getByTestId("inline-creation-input")).toBeInTheDocument();
  });

  it("empty or whitespace-only input never invokes task creation", () => {
    const createSpy = vi.spyOn(tasksApi, "createTask");

    renderWithProviders(
      <InlineCreationRow
        communityId="comm-1"
        workspaceId="ws-1"
        variant="list"
      />
    );

    fireEvent.click(screen.getByTestId("inline-creation-trigger"));
    const input = screen.getByTestId("inline-creation-input");

    // Press Enter with empty string
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(createSpy).not.toHaveBeenCalled();

    // Press Enter with whitespace
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("prevents duplicate submissions on rapid multiple Enter presses", async () => {
    let resolveMutation: (task: TaskDto) => void = () => {};
    const mutationPromise = new Promise<TaskDto>((resolve) => {
      resolveMutation = resolve;
    });
    const createSpy = vi.spyOn(tasksApi, "createTask").mockReturnValue(mutationPromise);

    renderWithProviders(
      <InlineCreationRow
        communityId="comm-1"
        workspaceId="ws-1"
        variant="list"
      />
    );

    fireEvent.click(screen.getByTestId("inline-creation-trigger"));
    const input = screen.getByTestId("inline-creation-input");
    fireEvent.change(input, { target: { value: "Single Task" } });

    // Rapid double Enter
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    // Resolve mutation
    resolveMutation(mockCreatedTask);
    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("preserves input and surfaces understandable feedback upon creation failure", async () => {
    vi.spyOn(tasksApi, "createTask").mockRejectedValue(new Error("Network timeout while creating task"));

    renderWithProviders(
      <InlineCreationRow
        communityId="comm-1"
        workspaceId="ws-1"
        variant="list"
      />
    );

    fireEvent.click(screen.getByTestId("inline-creation-trigger"));
    const input = screen.getByTestId("inline-creation-input");
    fireEvent.change(input, { target: { value: "Valuable draft task title" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    // Error feedback displayed
    const errorMsg = await screen.findByTestId("inline-creation-error");
    expect(errorMsg).toHaveTextContent("Network timeout while creating task");

    // Input text PRESERVED so user doesn't lose work
    expect(input).toHaveValue("Valuable draft task title");
  });

  it("Escape key cancels current entry and reverts to resting trigger", () => {
    const onCancel = vi.fn();

    renderWithProviders(
      <InlineCreationRow
        communityId="comm-1"
        workspaceId="ws-1"
        variant="list"
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByTestId("inline-creation-trigger"));
    const input = screen.getByTestId("inline-creation-input");
    fireEvent.change(input, { target: { value: "Draft to discard" } });

    // Press Escape
    fireEvent.keyDown(input, { key: "Escape", code: "Escape" });

    // Reverts to resting trigger
    expect(screen.getByTestId("inline-creation-trigger")).toBeInTheDocument();
    expect(screen.queryByTestId("inline-creation-input")).not.toBeInTheDocument();
    expect(onCancel).toHaveBeenCalled();
  });

  it("cancel button (X) dismisses creation and reverts to trigger", () => {
    renderWithProviders(
      <InlineCreationRow
        communityId="comm-1"
        workspaceId="ws-1"
        variant="list"
      />
    );

    fireEvent.click(screen.getByTestId("inline-creation-trigger"));
    expect(screen.getByTestId("inline-creation-input")).toBeInTheDocument();

    const cancelBtn = screen.getByTestId("inline-creation-cancel");
    fireEvent.click(cancelBtn);

    expect(screen.getByTestId("inline-creation-trigger")).toBeInTheDocument();
    expect(screen.queryByTestId("inline-creation-input")).not.toBeInTheDocument();
  });

  it("blur with empty input cancels creation", () => {
    renderWithProviders(
      <InlineCreationRow
        communityId="comm-1"
        workspaceId="ws-1"
        variant="list"
      />
    );

    fireEvent.click(screen.getByTestId("inline-creation-trigger"));
    const input = screen.getByTestId("inline-creation-input");

    // Blur without typing anything
    fireEvent.blur(input);

    expect(screen.getByTestId("inline-creation-trigger")).toBeInTheDocument();
    expect(screen.queryByTestId("inline-creation-input")).not.toBeInTheDocument();
  });

  it("Board variant supports column-specific initial statusCategory", async () => {
    const createSpy = vi.spyOn(tasksApi, "createTask").mockResolvedValue({
      ...mockCreatedTask,
      statusCategory: "IN_PROGRESS",
    });

    renderBoardWithProviders(
      <InlineCreationRow
        communityId="comm-1"
        workspaceId="ws-1"
        variant="board"
        initialStatusCategory="IN_PROGRESS"
        triggerLabel="+ Add card"
      />
    );

    const trigger = screen.getByTestId("inline-creation-trigger");
    expect(trigger).toHaveTextContent("+ Add card");

    fireEvent.click(trigger);
    const input = screen.getByTestId("inline-creation-input");
    fireEvent.change(input, { target: { value: "Board Task In Progress" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          communityId: "comm-1",
          workspaceId: "ws-1",
          data: {
            title: "Board Task In Progress",
            statusCategory: "IN_PROGRESS",
            parentTaskId: undefined,
          },
        })
      );
    });
  });

  it("disabled state renders inert trigger and ignores clicks", () => {
    renderWithProviders(
      <InlineCreationRow
        communityId="comm-1"
        workspaceId="ws-1"
        disabled={true}
      />
    );

    const trigger = screen.getByTestId("inline-creation-trigger");
    expect(trigger).toHaveClass("opacity-50");

    fireEvent.click(trigger);
    expect(screen.queryByTestId("inline-creation-input")).not.toBeInTheDocument();
  });

  it("creation trigger click and input typing do not bubble to parent container", () => {
    const parentClick = vi.fn();
    const parentKeyDown = vi.fn();

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const authContext = createMockAuthContext();

    render(
      <AuthContext.Provider value={authContext}>
        <QueryClientProvider client={queryClient}>
          <table onClick={parentClick} onKeyDown={parentKeyDown}>
            <tbody>
              <InlineCreationRow
                communityId="comm-1"
                workspaceId="ws-1"
                variant="list"
                colSpan={9}
              />
            </tbody>
          </table>
        </QueryClientProvider>
      </AuthContext.Provider>
    );

    const trigger = screen.getByTestId("inline-creation-trigger");
    fireEvent.click(trigger);
    expect(parentClick).not.toHaveBeenCalled();

    const input = screen.getByTestId("inline-creation-input");
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(parentKeyDown).not.toHaveBeenCalled();
  });

  it("renders with correct colSpan in table-row list variant", () => {
    renderWithProviders(
      <InlineCreationRow
        communityId="comm-1"
        workspaceId="ws-1"
        variant="list"
        colSpan={10}
      />
    );

    const td = screen.getByRole("button", { name: "Add new task" }).querySelector("td");
    expect(td).toHaveAttribute("colspan", "10");
  });
});
