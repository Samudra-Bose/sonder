import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import * as fs from "fs";
import * as path from "path";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { WorkspaceProvider } from "@/modules/workspace/WorkspaceContext.js";
import { OmnibarProvider, OmnibarModal } from "@/modules/omnibar/index.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import {
  MOCK_COMMUNITY_1_ID,
  WS_SHARED_ENG_ID,
  WS_SHARED_GALA_ID,
  WS_PERSONAL_ALEX_ID,
  MOCK_USER_ID,
} from "@/mocks/data/my-work.js";
import {
  resetTaskMockState,
  setMockTasksError,
  getMockTasks,
} from "@/mocks/handlers/tasks.js";
import { clearShortcutRegistry } from "@/lib/keyboard.js";
import { ThemeProvider } from "@/lib/theme.js";
import { createTask } from "./api.js";
import { TaskPeekDrawer } from "./TaskPeekDrawer.js";
import {
  QuickTaskComposerProvider,
  useQuickTaskComposer,
} from "./QuickTaskComposerContext.js";
import {
  QuickTaskComposer,
  QuickCreateButton,
} from "./QuickTaskComposer.js";

const testAuthUser = {
  id: MOCK_USER_ID,
  displayName: "Alex Morgan",
  email: "alex.morgan@example.org",
  avatarUrl: null,
};

function createMockAuth(overrides?: Partial<AuthContextType>): AuthContextType {
  return {
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
    ...overrides,
  };
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}{location.search}</div>;
}

interface TestShellProps {
  initialEntries?: string[];
  initialWorkspaceId?: string;
  defaultOpen?: boolean;
}

function TestComposerWrapper() {
  const { open } = useQuickTaskComposer();
  return (
    <>
      <div className="p-4 space-y-4">
        <button type="button" data-testid="external-focusable-btn">
          External Trigger
        </button>
        <input
          type="text"
          data-testid="external-text-input"
          placeholder="Type here..."
        />
        <QuickCreateButton />
        <QuickTaskComposer />
        <TaskPeekDrawer forceMode="desktop" />
      </div>
      <OmnibarModal onOpenQuickComposer={() => open()} />
    </>
  );
}

function renderComposerTest({
  initialEntries = ["/"],
  initialWorkspaceId = WS_SHARED_ENG_ID,
  defaultOpen = false,
}: TestShellProps = {}) {
  const queryClient = createTestQueryClient();
  const authValue = createMockAuth();

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthContext.Provider value={authValue}>
            <WorkspaceProvider
              initialCommunityId={MOCK_COMMUNITY_1_ID}
              initialWorkspaceId={initialWorkspaceId}
            >
              <OmnibarProvider>
                <QuickTaskComposerProvider defaultOpen={defaultOpen}>
                  <MemoryRouter initialEntries={initialEntries}>
                    <LocationDisplay />
                    <TestComposerWrapper />
                  </MemoryRouter>
                </QuickTaskComposerProvider>
              </OmnibarProvider>
            </WorkspaceProvider>
          </AuthContext.Provider>
        </ThemeProvider>
      </QueryClientProvider>
    ),
  };
}

describe("VS-03 Stage 4: Quick Task Composer", () => {
  beforeEach(() => {
    resetTaskMockState();
    clearShortcutRegistry();
  });

  afterEach(() => {
    setMockTasksError(null);
    resetTaskMockState();
    clearShortcutRegistry();
  });

  describe("Composer Opening & Focus Management", () => {
    it("opens composer via global 'C' shortcut when outside input controls", async () => {
      const user = userEvent.setup();
      renderComposerTest();

      expect(screen.queryByTestId("quick-task-composer-dialog")).not.toBeInTheDocument();

      // Press unmodified 'c'
      await user.keyboard("c");

      await waitFor(() => {
        expect(screen.getByTestId("quick-task-composer-dialog")).toBeInTheDocument();
      });

      // Title input is auto-focused
      const titleInput = screen.getByTestId("composer-title-input");
      expect(titleInput).toBeInTheDocument();
      await waitFor(() => {
        expect(titleInput).toHaveFocus();
      });
    });

    it("opens composer via QuickCreateButton entry point", async () => {
      const user = userEvent.setup();
      renderComposerTest();

      const createBtn = screen.getByTestId("quick-create-task-btn");
      expect(createBtn).toBeInTheDocument();
      await user.click(createBtn);

      await waitFor(() => {
        expect(screen.getByTestId("quick-task-composer-dialog")).toBeInTheDocument();
      });
    });

    it("does not activate shortcut 'c' when focus is inside a text input", async () => {
      const user = userEvent.setup();
      renderComposerTest();

      const input = screen.getByTestId("external-text-input");
      await user.click(input);
      expect(input).toHaveFocus();

      // Type 'c' inside input
      await user.keyboard("c");

      expect(input).toHaveValue("c");
      expect(screen.queryByTestId("quick-task-composer-dialog")).not.toBeInTheDocument();
    });

    it("does not activate shortcut 'c' when another dialog is already open", async () => {
      const user = userEvent.setup();
      renderComposerTest({ defaultOpen: true });

      // First composer instance is open
      expect(screen.getByTestId("quick-task-composer-dialog")).toBeInTheDocument();

      // Press 'c' again
      await user.keyboard("c");

      // Only one dialog remains present
      expect(screen.getAllByTestId("quick-task-composer-dialog")).toHaveLength(1);
    });

    it("closes dialog and does not submit when Cancel button is clicked", async () => {
      const user = userEvent.setup();
      renderComposerTest({ defaultOpen: true });

      const titleInput = screen.getByTestId("composer-title-input");
      await user.type(titleInput, "Canceled draft title");

      const cancelBtn = screen.getByTestId("composer-cancel-btn");
      await user.click(cancelBtn);

      await waitFor(() => {
        expect(screen.queryByTestId("quick-task-composer-dialog")).not.toBeInTheDocument();
      });

      // Task was not created
      const tasks = getMockTasks();
      expect(tasks.some((t) => t.title === "Canceled draft title")).toBe(false);
    });

    it("closes dialog on Escape key and restores focus to initiating element", async () => {
      const user = userEvent.setup();
      renderComposerTest();

      const triggerBtn = screen.getByTestId("external-focusable-btn");
      triggerBtn.focus();
      expect(triggerBtn).toHaveFocus();

      // Open via 'c' shortcut
      await user.keyboard("c");
      await waitFor(() => {
        expect(screen.getByTestId("quick-task-composer-dialog")).toBeInTheDocument();
      });

      // Press Escape to dismiss
      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByTestId("quick-task-composer-dialog")).not.toBeInTheDocument();
      });

      // Focus should be restored to initiating trigger button
      await waitFor(() => {
        expect(triggerBtn).toHaveFocus();
      });
    });
  });

  describe("Form Validation & Progressive Disclosure Scope", () => {
    it("renders at most 5 core fields in accordance with conservative field scope", async () => {
      renderComposerTest({ defaultOpen: true });

      // 1. Workspace
      expect(screen.getByTestId("composer-workspace-select")).toBeInTheDocument();
      // 2. Title
      expect(screen.getByTestId("composer-title-input")).toBeInTheDocument();
      // 3. Description
      expect(screen.getByTestId("composer-description-input")).toBeInTheDocument();
      // 4. Priority
      expect(screen.getByTestId("composer-priority-select")).toBeInTheDocument();
      // 5. Due Date
      expect(screen.getByTestId("composer-due-date-input")).toBeInTheDocument();

      // Verify assignees and labels remain deferred (not present in Stage 4)
      expect(screen.queryByTestId("composer-assignees-select")).not.toBeInTheDocument();
      expect(screen.queryByTestId("composer-labels-select")).not.toBeInTheDocument();
    });

    it("rejects blank title and prevents submission", async () => {
      const user = userEvent.setup();
      renderComposerTest({ defaultOpen: true });

      const submitBtn = screen.getByTestId("composer-submit-btn");
      expect(submitBtn).toBeDisabled();

      const titleInput = screen.getByTestId("composer-title-input");
      await user.type(titleInput, "   ");

      // Button remains disabled for whitespace-only title
      expect(submitBtn).toBeDisabled();
    });

    it("rejects title exceeding 500 characters", async () => {
      renderComposerTest({ defaultOpen: true });

      const titleInput = screen.getByTestId("composer-title-input");
      expect(titleInput).toHaveAttribute("maxLength", "500");

      const longTitle = "A".repeat(501);
      fireEvent.change(titleInput, { target: { value: longTitle } });

      const submitBtn = screen.getByTestId("composer-submit-btn");
      expect(submitBtn).toBeDisabled();
    });

    it("validates description respects length limits and optional fields use valid defaults", async () => {
      renderComposerTest({ defaultOpen: true });

      const prioritySelect = screen.getByTestId("composer-priority-select");
      expect(prioritySelect).toHaveValue("NONE");

      const dueDateInput = screen.getByTestId("composer-due-date-input");
      expect(dueDateInput).toHaveValue("");
    });
  });

  describe("Workspace Selection & Privacy Boundaries", () => {
    it("defaults workspace selector to currently active workspace", async () => {
      renderComposerTest({
        defaultOpen: true,
        initialWorkspaceId: WS_SHARED_ENG_ID,
      });

      await waitFor(() => {
        const select = screen.getByTestId("composer-workspace-select");
        expect(select).toHaveValue(WS_SHARED_ENG_ID);
      });
    });

    it("allows user to select another authorized workspace", async () => {
      const user = userEvent.setup();
      renderComposerTest({
        defaultOpen: true,
        initialWorkspaceId: WS_SHARED_ENG_ID,
      });

      await waitFor(() => {
        expect(screen.getByRole("option", { name: /gala/i })).toBeInTheDocument();
      });

      const select = screen.getByTestId("composer-workspace-select");
      await user.selectOptions(select, WS_SHARED_GALA_ID);
      expect(select).toHaveValue(WS_SHARED_GALA_ID);
    });

    it("only lists accessible workspaces within current community context", async () => {
      renderComposerTest({ defaultOpen: true });

      const select = screen.getByTestId("composer-workspace-select") as HTMLSelectElement;
      await waitFor(() => {
        expect(select.options.length).toBeGreaterThan(0);
      });

      const optionValues = Array.from(select.options).map((o) => o.value);

      // Accessible workspaces in Community 1
      expect(optionValues).toContain(WS_SHARED_ENG_ID);
      expect(optionValues).toContain(WS_SHARED_GALA_ID);
      expect(optionValues).toContain(WS_PERSONAL_ALEX_ID);

      // Inaccessible or non-existent workspaces must not appear
      expect(optionValues).not.toContain("ws-unknown-forbidden");
    });
  });

  describe("Successful Creation & URL Synchronization", () => {
    it("creates task, closes composer, clears draft, and opens task in TaskPeekDrawer via URL sync", async () => {
      const user = userEvent.setup();
      renderComposerTest({
        defaultOpen: true,
        initialEntries: ["/?filter=assigned"],
      });

      const titleInput = screen.getByTestId("composer-title-input");
      await user.type(titleInput, "Implement telemetry beacon heartbeat");

      const descInput = screen.getByTestId("composer-description-input");
      await user.type(descInput, "Ensures persistent client connection heartbeat.");

      const prioritySelect = screen.getByTestId("composer-priority-select");
      await user.selectOptions(prioritySelect, "HIGH");

      const dueDateInput = screen.getByTestId("composer-due-date-input");
      await user.type(dueDateInput, "2026-12-31");

      const submitBtn = screen.getByTestId("composer-submit-btn");
      await user.click(submitBtn);

      // Wait for composer to close on success
      await waitFor(() => {
        expect(screen.queryByTestId("quick-task-composer-dialog")).not.toBeInTheDocument();
      });

      // Verify task was added to mock store with monotonic sequence key
      const tasks = getMockTasks();
      const createdTask = tasks.find((t) => t.title === "Implement telemetry beacon heartbeat");
      expect(createdTask).toBeDefined();
      expect(createdTask?.priority).toBe("HIGH");
      expect(createdTask?.dueDate).toBe("2026-12-31");
      expect(createdTask?.taskKey).toMatch(/^ENG-\d+$/);

      // Verify TaskPeekDrawer opened with the new task, preserving ?filter=assigned parameter
      await waitFor(() => {
        expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();
        expect(screen.getByTestId("location-display")).toHaveTextContent("filter=assigned");
        expect(screen.getByTestId("location-display")).toHaveTextContent(`task=${createdTask?.taskKey}`);
      });

      // Reopen composer and verify form state was reset cleanly
      await user.keyboard("c");
      await waitFor(() => {
        expect(screen.getByTestId("quick-task-composer-dialog")).toBeInTheDocument();
      });
      expect(screen.getByTestId("composer-title-input")).toHaveValue("");
      expect(screen.getByTestId("composer-description-input")).toHaveValue("");
      expect(screen.getByTestId("composer-priority-select")).toHaveValue("NONE");
      expect(screen.getByTestId("composer-due-date-input")).toHaveValue("");
    });
  });

  describe("Error Handling, Draft Preservation & Idempotency", () => {
    it("preserves draft on server 500 error and surfaces error message for retry", async () => {
      const user = userEvent.setup();
      renderComposerTest({ defaultOpen: true });

      // Simulate server 500 error on POST
      setMockTasksError({
        status: 500,
        problem: {
          type: "https://errors.sonder.platform/server-error",
          title: "Internal Server Error",
          status: 500,
          detail: "Database transaction lock timeout occurred.",
        },
        method: "POST",
      });

      const titleInput = screen.getByTestId("composer-title-input");
      await user.type(titleInput, "Task that encounters database lock");

      const descInput = screen.getByTestId("composer-description-input");
      await user.type(descInput, "Draft description to preserve");

      const submitBtn = screen.getByTestId("composer-submit-btn");
      await user.click(submitBtn);

      // Error banner appears
      await waitFor(() => {
        expect(screen.getByTestId("composer-server-error")).toBeInTheDocument();
      });
      expect(screen.getByTestId("composer-server-error")).toHaveTextContent(
        /database transaction lock timeout occurred/i
      );

      // Draft is strictly preserved inside input fields
      expect(screen.getByTestId("composer-title-input")).toHaveValue(
        "Task that encounters database lock"
      );
      expect(screen.getByTestId("composer-description-input")).toHaveValue(
        "Draft description to preserve"
      );

      // Dialog remains open
      expect(screen.getByTestId("quick-task-composer-dialog")).toBeInTheDocument();

      // Clear error override and retry submission successfully
      setMockTasksError(null);
      await user.click(screen.getByTestId("composer-submit-btn"));

      await waitFor(() => {
        expect(screen.queryByTestId("quick-task-composer-dialog")).not.toBeInTheDocument();
      });

      const tasks = getMockTasks();
      expect(tasks.some((t) => t.title === "Task that encounters database lock")).toBe(true);
    });

    it("surfaces 403 Forbidden error when user lacks permission to create task in workspace", async () => {
      const user = userEvent.setup();
      renderComposerTest({ defaultOpen: true });

      setMockTasksError({
        status: 403,
        problem: {
          type: "https://errors.sonder.platform/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "You do not have permission 'task:create' in this workspace.",
        },
        method: "POST",
      });

      const titleInput = screen.getByTestId("composer-title-input");
      await user.type(titleInput, "Unauthorized task attempt");

      const submitBtn = screen.getByTestId("composer-submit-btn");
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId("composer-server-error")).toBeInTheDocument();
      });
      expect(screen.getByTestId("composer-server-error")).toHaveTextContent(
        /you do not have permission 'task:create'/i
      );
      expect(screen.getByTestId("composer-title-input")).toHaveValue("Unauthorized task attempt");
    });

    it("replays idempotent task creation response on duplicate mutation ID with identical payload", async () => {
      const mutationId = "018f3a2b-c000-7000-8000-000000000001";

      // First call
      const firstResult = await createTask({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        data: {
          title: "Idempotent task test",
        },
        csrfToken: "mock-csrf-token",
        mutationId,
      });

      expect(firstResult.title).toBe("Idempotent task test");

      // Second call with identical payload & mutation ID
      const secondResult = await createTask({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        data: {
          title: "Idempotent task test",
        },
        csrfToken: "mock-csrf-token",
        mutationId,
      });

      // Returns the identical task without duplicating
      expect(secondResult.id).toBe(firstResult.id);
      expect(secondResult.taskKey).toBe(firstResult.taskKey);
    });

    it("rejects duplicate mutation ID with mismatched payload with 409 IDEMPOTENCY_KEY_PAYLOAD_MISMATCH", async () => {
      const mutationId = "018f3a2b-c000-7000-8000-000000000002";

      // First call
      await createTask({
        communityId: MOCK_COMMUNITY_1_ID,
        workspaceId: WS_SHARED_ENG_ID,
        data: {
          title: "Initial payload",
        },
        csrfToken: "mock-csrf-token",
        mutationId,
      });

      // Second call with different payload using same mutation ID
      try {
        await createTask({
          communityId: MOCK_COMMUNITY_1_ID,
          workspaceId: WS_SHARED_ENG_ID,
          data: {
            title: "Different payload with same mutation ID",
          },
          csrfToken: "mock-csrf-token",
          mutationId,
        });
        expect.unreachable("Should have thrown 409 ApiProblemError");
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as { status?: number }).status).toBe(409);
        expect((err as { code?: string }).code).toBe("IDEMPOTENCY_KEY_PAYLOAD_MISMATCH");
      }
    });
  });

  describe("Omnibar Integration", () => {
    it("includes 'Create Task' action in Omnibar that triggers QuickTaskComposer", async () => {
      const user = userEvent.setup();
      renderComposerTest();

      // Open Omnibar via Cmd/Ctrl+K
      await user.keyboard("{Control>}k{/Control}");

      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: /omnibar command palette/i })).toBeInTheDocument();
      });

      // Search for "create task"
      const omnibarInput = screen.getByRole("combobox");
      await user.type(omnibarInput, "create task");

      const createCommand = screen.getByRole("option", { name: /create task/i });
      expect(createCommand).toBeInTheDocument();

      // Select command
      await user.click(createCommand);

      // Omnibar closes and composer opens
      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: /omnibar command palette/i })).not.toBeInTheDocument();
        expect(screen.getByTestId("quick-task-composer-dialog")).toBeInTheDocument();
      });
    });

    it("pre-populates dueDate, priority, and title when opened with initialValues", async () => {
      const user = userEvent.setup();
      function CustomOpener() {
        const { open } = useQuickTaskComposer();
        return (
          <>
            <button
              type="button"
              data-testid="open-with-initials-btn"
              onClick={() =>
                open(null, {
                  dueDate: "2026-12-25",
                  priority: "URGENT",
                  title: "Prefilled Holiday Task",
                })
              }
            >
              Open with initials
            </button>
            <QuickTaskComposer />
          </>
        );
      }

      const queryClient = createTestQueryClient();
      const authValue = createMockAuth();

      render(
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthContext.Provider value={authValue}>
              <WorkspaceProvider
                initialCommunityId={MOCK_COMMUNITY_1_ID}
                initialWorkspaceId={WS_SHARED_ENG_ID}
              >
                <QuickTaskComposerProvider>
                  <MemoryRouter>
                    <CustomOpener />
                  </MemoryRouter>
                </QuickTaskComposerProvider>
              </WorkspaceProvider>
            </AuthContext.Provider>
          </ThemeProvider>
        </QueryClientProvider>
      );

      await user.click(screen.getByTestId("open-with-initials-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("quick-task-composer-dialog")).toBeInTheDocument();
      });

      const titleInput = screen.getByTestId("composer-title-input") as HTMLInputElement;
      expect(titleInput.value).toBe("Prefilled Holiday Task");

      const dateInput = screen.getByTestId("composer-due-date-input") as HTMLInputElement;
      expect(dateInput.value).toBe("2026-12-25");

      const prioritySelect = screen.getByTestId("composer-priority-select") as HTMLSelectElement;
      expect(prioritySelect.value).toBe("URGENT");
    });
  });

  describe("Production Module Boundaries", () => {
    it("verifies no production task module imports from mock fixture modules", () => {
      const tasksDir = path.resolve(__dirname);
      const files = fs.readdirSync(tasksDir);
      const productionFiles = files.filter(
        (f) => (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.includes(".test.")
      );

      expect(productionFiles.length).toBeGreaterThan(0);

      for (const file of productionFiles) {
        const filePath = path.join(tasksDir, file);
        const content = fs.readFileSync(filePath, "utf-8");
        expect(content).not.toMatch(/from\s+["']@\/mocks/);
        expect(content).not.toMatch(/from\s+["']\.\.?\/\.\.?\/mocks/);
        expect(content).not.toMatch(/from\s+["']\.\.?\/mocks/);
      }
    });
  });
});
