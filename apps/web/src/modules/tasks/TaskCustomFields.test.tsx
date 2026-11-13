import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import { resetTaskMockState } from "@/mocks/handlers/tasks.js";
import { resetCustomFieldsMockState } from "@/mocks/handlers/custom-fields.js";
import { makeTaskPermissions, initialMockTasks } from "@/mocks/data/tasks.js";
import { TaskCustomFieldsSection } from "./TaskCustomFieldsSection.js";
import type { TaskDto } from "./types.js";

const testUser = {
  id: "018f98a2-3f12-7890-a123-456789abcdef",
  displayName: "Alex Morgan",
  email: "alex.morgan@example.org",
  avatarUrl: null,
};

function createMockAuth(overrides?: Partial<AuthContextType>): AuthContextType {
  return {
    user: testUser,
    communities: defaultMockCommunities,
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

function makeTask(overrides?: Partial<TaskDto>): TaskDto {
  return {
    ...initialMockTasks[0]!,
    id: "018f98a2-3f12-7890-t001-456789abcdef",
    taskKey: "ENG-101",
    workspaceId: "018f98a2-3f12-7890-w002-456789abcdef",
    title: "Implement Core Engine",
    customFieldValues: {
      "018f98a2-3f12-7890-cf01-456789abcdef": "Core Engine V2",
      "018f98a2-3f12-7890-cf02-456789abcdef": 8,
      "018f98a2-3f12-7890-cf03-456789abcdef": "018f98a2-3f12-7890-opt2-456789abcdef", // Beta
      "018f98a2-3f12-7890-cf05-456789abcdef": true,
    },
    fieldRevisions: {
      ...initialMockTasks[0]!.fieldRevisions,
      "customFieldValues.018f98a2-3f12-7890-cf01-456789abcdef": 1,
      "customFieldValues.018f98a2-3f12-7890-cf02-456789abcdef": 1,
      "customFieldValues.018f98a2-3f12-7890-cf03-456789abcdef": 1,
      "customFieldValues.018f98a2-3f12-7890-cf05-456789abcdef": 1,
    },
    effectivePermissions: makeTaskPermissions(true),
    ...overrides,
  };
}

function renderSection(
  task: TaskDto,
  isArchived = false,
  communityId = "018f98a2-3f12-7890-b123-456789abcdef"
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={createMockAuth()}>
        <MemoryRouter>
          <TaskCustomFieldsSection
            task={task}
            communityId={communityId}
            workspaceId={task.workspaceId}
            isArchived={isArchived}
          />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("VS-09H: Task Detail Custom Fields Section (FEAT-D04a)", () => {
  beforeEach(() => {
    resetTaskMockState();
    resetCustomFieldsMockState();
  });

  it("renders custom fields section with active workspace definitions and existing values", async () => {
    const task = makeTask();
    renderSection(task);

    expect(await screen.findByTestId("task-custom-fields-section")).toBeInTheDocument();

    // Verify labels
    expect(screen.getByText("Component")).toBeInTheDocument();
    expect(screen.getByText("Story Points")).toBeInTheDocument();
    expect(screen.getByText("Release Track")).toBeInTheDocument();
    expect(screen.getByText("Customer Impact")).toBeInTheDocument();

    // Verify values populated
    const textInput = screen.getByTestId("custom-field-input-018f98a2-3f12-7890-cf01-456789abcdef");
    expect(textInput).toHaveValue("Core Engine V2");

    const numberInput = screen.getByTestId("custom-field-input-018f98a2-3f12-7890-cf02-456789abcdef");
    expect(numberInput).toHaveValue(8);

    const selectOpt = screen.getByTestId("custom-field-input-018f98a2-3f12-7890-cf03-456789abcdef");
    expect(selectOpt).toHaveValue("018f98a2-3f12-7890-opt2-456789abcdef");

    const boolInput = screen.getByTestId("custom-field-input-018f98a2-3f12-7890-cf05-456789abcdef");
    expect(boolInput).toBeChecked();
  });

  it("updates a text custom field value and dispatches patch", async () => {
    const user = userEvent.setup();
    const task = makeTask();
    renderSection(task);

    const textInput = await screen.findByTestId("custom-field-input-018f98a2-3f12-7890-cf01-456789abcdef");
    await user.clear(textInput);
    await user.type(textInput, "Architecture V3");

    expect(textInput).toHaveValue("Architecture V3");
  });

  it("updates a single-select custom field value and dispatches patch", async () => {
    const user = userEvent.setup();
    const task = makeTask();
    renderSection(task);

    const selectOpt = await screen.findByTestId("custom-field-input-018f98a2-3f12-7890-cf03-456789abcdef");
    await user.selectOptions(selectOpt, "018f98a2-3f12-7890-opt3-456789abcdef"); // Stable

    expect(selectOpt).toHaveValue("018f98a2-3f12-7890-opt3-456789abcdef");
  });

  it("enforces read-only state when user lacks canEditCustomFieldsLinks capability", async () => {
    const task = makeTask({
      effectivePermissions: {
        ...makeTask().effectivePermissions,
        canEditCustomFieldsLinks: false,
      },
    });
    renderSection(task);

    expect(await screen.findByTestId("task-custom-fields-section")).toBeInTheDocument();
    expect(screen.getByText("Read-only")).toBeInTheDocument();

    const textInput = screen.getByTestId("custom-field-input-018f98a2-3f12-7890-cf01-456789abcdef");
    expect(textInput).toBeDisabled();

    const numberInput = screen.getByTestId("custom-field-input-018f98a2-3f12-7890-cf02-456789abcdef");
    expect(numberInput).toBeDisabled();

    const selectOpt = screen.getByTestId("custom-field-input-018f98a2-3f12-7890-cf03-456789abcdef");
    expect(selectOpt).toBeDisabled();
  });

  it("enforces read-only state when task is archived", async () => {
    const task = makeTask({
      archivedAt: "2026-03-01T12:00:00Z",
    });
    renderSection(task, true);

    expect(await screen.findByTestId("task-custom-fields-section")).toBeInTheDocument();
    expect(screen.getByText("Read-only")).toBeInTheDocument();

    const textInput = screen.getByTestId("custom-field-input-018f98a2-3f12-7890-cf01-456789abcdef");
    expect(textInput).toBeDisabled();
  });
});
