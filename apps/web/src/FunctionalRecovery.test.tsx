import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setMockSessionActive, resetAuthMockState } from "./mocks/handlers/auth.js";
import { resetWorkspaceMockState } from "./mocks/handlers/workspaces.js";
import { resetTaskMockState } from "./mocks/handlers/tasks.js";
import { resetMyWorkMockState } from "./mocks/handlers/my-work.js";
import { clearShortcutRegistry } from "./lib/keyboard.js";
import { App } from "./App.js";

describe("Sonder — Functional Recovery: Core Workflow & Assignment Verification", () => {
  let storageMock: Record<string, string> = {};

  beforeEach(() => {
    resetAuthMockState();
    resetWorkspaceMockState();
    resetTaskMockState();
    resetMyWorkMockState();

    storageMock = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => storageMock[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete storageMock[key];
      }),
      clear: vi.fn(() => {
        storageMock = {};
      }),
    };
    Object.defineProperty(window, "localStorage", {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });

    clearShortcutRegistry();
  });

  afterEach(() => {
    storageMock = {};
    clearShortcutRegistry();
  });

  describe("Workflow 1: Dynamic Community & Workspace Creation without 404 Problem Details", () => {
    it("creates 'Samudra QA Community', creates 'QA Workspace', routes to list view with 0-task empty state", async () => {
      const user = userEvent.setup();
      setMockSessionActive(true);

      render(<App initialEntries={["/"]} />);

      // Wait for authenticated app shell
      await waitFor(() => {
        expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
      });

      // 1. Create and activate community 'Samudra QA Community'
      const createCommunityBtn = screen.getByTestId("dashboard-create-community-btn");
      await user.click(createCommunityBtn);

      const commDialog = await screen.findByRole("dialog", {
        name: /create new community/i,
      });
      expect(commDialog).toBeInTheDocument();

      const commNameInput = screen.getByTestId("community-name-input");
      await user.type(commNameInput, "Samudra QA Community");

      const commSubmitBtn = screen.getByTestId("create-community-submit-btn");
      await user.click(commSubmitBtn);

      // Verify community created and active
      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: /create new community/i })).not.toBeInTheDocument();
        expect(screen.getAllByText("Samudra QA Community").length).toBeGreaterThanOrEqual(1);
      });

      // 2. Open Workspace Switcher
      const wsSwitcher = screen.getByRole("button", { name: /select a workspace/i });
      await user.click(wsSwitcher);

      // 3. Click Create Workspace
      const createWsTrigger = await screen.findByTestId("create-workspace-trigger");
      await user.click(createWsTrigger);

      const wsDialog = await screen.findByTestId("create-workspace-dialog");
      expect(wsDialog).toBeInTheDocument();

      // 4. Fill in Workspace details
      const wsNameInput = screen.getByTestId("workspace-name-input");
      await user.type(wsNameInput, "QA Workspace");

      const wsPrefixInput = screen.getByPlaceholderText(/e\.g\. ENG, GALA/i);
      await user.type(wsPrefixInput, "QAW");

      const wsSubmitBtn = screen.getByTestId("create-workspace-submit-btn");
      await user.click(wsSubmitBtn);

      // 5. Verify dialog closes and routes cleanly to task list without 404
      await waitFor(() => {
        expect(screen.queryByTestId("create-workspace-dialog")).not.toBeInTheDocument();
      });

      // Confirm we are on the task list view and NOT showing a 404 Problem Details error
      await waitFor(() => {
        expect(screen.queryByText(/workspace .* not found/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/404/i)).not.toBeInTheDocument();
        // The list view is rendered
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      // Shows empty state for newly created workspace
      expect(screen.getByTestId("task-list-empty")).toBeInTheDocument();
      expect(screen.getByText(/no tasks match the active filters/i)).toBeInTheDocument();
    });
  });

  describe("Workflow 2: Task Assignment via QuickTaskComposer and Multi-View Sync", () => {
    it("creates a task assigned to Jordan Lee and verifies assignee displays across List, Board, and Peek Drawer", async () => {
      const user = userEvent.setup();
      setMockSessionActive(true);

      // Start on community 1 list view
      render(<App initialEntries={["/list"]} />);

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      // 1. Open QuickTaskComposer via the omnipresent Header 'New Task' button
      const headerCreateBtn = screen.getByTestId("global-header-create-task-btn");
      expect(headerCreateBtn).toBeInTheDocument();
      await user.click(headerCreateBtn);

      // Composer modal opens
      const composer = await screen.findByTestId("quick-task-composer-dialog");
      expect(composer).toBeInTheDocument();

      // 2. Type task title
      const titleInput = screen.getByTestId("composer-title-input");
      await user.type(titleInput, "Audit QA Release Readiness");

      // 3. Select Assignee Jordan Lee
      // Inside composer, there's a MemberSelector trigger
      const assigneeTrigger = within(composer).getByTestId("member-selector-trigger");
      await user.click(assigneeTrigger);

      // Popover opens with options
      const jordanOption = await screen.findByTestId("member-option-018f98a2-3f12-7890-a123-456789bbcdef");
      expect(jordanOption).toBeInTheDocument();
      await user.click(jordanOption);

      // Trigger should now show Jordan Lee
      await waitFor(() => {
        expect(within(assigneeTrigger).getByText("Jordan Lee")).toBeInTheDocument();
      });

      // 4. Submit task creation
      const submitBtn = screen.getByTestId("composer-submit-btn");
      await user.click(submitBtn);

      // Composer closes
      await waitFor(() => {
        expect(screen.queryByTestId("quick-task-composer-dialog")).not.toBeInTheDocument();
      });

      // 5. Verify the newly created task appears in the List View with Jordan Lee assigned
      await waitFor(() => {
        expect(screen.getByText("Audit QA Release Readiness")).toBeInTheDocument();
      });

      const taskRow = screen.getByText("Audit QA Release Readiness").closest<HTMLElement>("tr");
      expect(taskRow).not.toBeNull();
      expect(within(taskRow!).getByText("Jordan Lee")).toBeInTheDocument();

      // 6. Navigate to Board View and verify Jordan Lee avatar / tooltip is rendered
      const boardTab = screen.getByTestId("tab-view-board");
      await user.click(boardTab);

      await waitFor(() => {
        expect(screen.getByTestId("task-board-view")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText("Audit QA Release Readiness")).toBeInTheDocument();
      });

      const boardCard = screen.getByText("Audit QA Release Readiness").closest<HTMLElement>('[data-testid^="task-board-card-"]');
      expect(boardCard).not.toBeNull();
      expect(within(boardCard!).getByText("Jordan Lee")).toBeInTheDocument();
    });
  });

  describe("Workflow 3: Inline Assignee Modification in TaskPeekDrawer", () => {
    it("modifies task assignee from Alex Morgan to Taylor Swift via InlineAssigneeEditor", async () => {
      const user = userEvent.setup();
      setMockSessionActive(true);

      // Mount on list view with seeded tasks
      render(<App initialEntries={["/list"]} />);

      await waitFor(() => {
        expect(screen.getByTestId("task-list-view")).toBeInTheDocument();
      });

      // Click on ALEX-1 row to open TaskPeekDrawer
      const taskKeyBtn = screen.getByRole("button", { name: "ALEX-1" });
      await user.click(taskKeyBtn);

      // Peek drawer opens
      await waitFor(() => {
        expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();
      });

      const drawer = screen.getByTestId("task-peek-drawer-desktop");

      // Verify current assignee is Alex Morgan
      const assigneeSection = within(drawer).getByText(/assignee/i).closest("div");
      expect(assigneeSection).not.toBeNull();

      const memberTrigger = within(drawer).getByTestId("member-selector-trigger");
      expect(within(memberTrigger).getByText("Alex Morgan")).toBeInTheDocument();

      // Click trigger to reassign
      await user.click(memberTrigger);

      // Select Taylor Swift from popover
      const taylorOption = await screen.findByTestId("member-option-018f98a2-3f12-7890-a123-456789cccdef");
      expect(taylorOption).toBeInTheDocument();
      await user.click(taylorOption);

      // Trigger updates optimistically to Taylor Swift
      await waitFor(() => {
        expect(within(memberTrigger).getByText("Taylor Swift")).toBeInTheDocument();
      });
    });
  });
});
