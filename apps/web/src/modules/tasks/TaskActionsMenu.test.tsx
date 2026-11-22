import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { WorkspaceContext } from "@/modules/workspace/WorkspaceContext.js";
import type { WorkspaceContextValue, WorkspaceDto } from "@/modules/workspace/types.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import {
  MOCK_COMMUNITY_1_ID,
  WS_SHARED_ENG_ID,
  MOCK_USER_ID,
} from "@/mocks/data/my-work.js";
import { mockWorkspacesCommunity1 } from "@/mocks/data/workspaces.js";
import { makeTaskPermissions } from "@/mocks/data/tasks.js";
import { TaskUndoProvider } from "./TaskUndoContext.js";
import { TaskCloneProvider } from "./TaskCloneContext.js";
import { TaskActionsMenu } from "./TaskActionsMenu.js";
import type { TaskDto } from "./types.js";

const testAuthUser = {
  id: MOCK_USER_ID,
  displayName: "Alex Morgan",
  email: "alex.morgan@example.org",
  avatarUrl: null,
};

function createMockAuth(overrides: Partial<AuthContextType> = {}): AuthContextType {
  return {
    user: testAuthUser,
    communities: defaultMockCommunities,
    csrfToken: "mock-csrf-token-valid",
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

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

const mockWorkspace: WorkspaceDto = mockWorkspacesCommunity1[1]!;

function createMockWorkspaceContext(overrides: Partial<WorkspaceContextValue> = {}): WorkspaceContextValue {
  return {
    activeWorkspaceId: WS_SHARED_ENG_ID,
    activeWorkspace: mockWorkspace,
    workspaces: [mockWorkspace],
    currentCommunityId: MOCK_COMMUNITY_1_ID,
    isLoading: false,
    error: null,
    switchWorkspace: vi.fn(),
    setActiveWorkspaceId: vi.fn(),
    createWorkspace: vi.fn(),
    updateWorkspace: vi.fn(),
    archiveWorkspace: vi.fn(),
    leaveWorkspace: vi.fn(),
    refetchWorkspaces: vi.fn(),
    ...overrides,
  } as unknown as WorkspaceContextValue;
}

const baseTask: TaskDto = {
  id: "018f98a2-task-001-overdue-assigned",
  workspaceId: WS_SHARED_ENG_ID,
  taskKey: "ENG-101",
  title: "Implement refresh token rotation",
  description: "OAuth 2.0 refresh token rotation implementation",
  itemType: "TASK",
  statusCategory: "IN_PROGRESS",
  priority: "URGENT",
  version: 1,
  assigneeIds: [MOCK_USER_ID],
  assigneeAssignments: [],
  assigneeEditableFieldGroups: [],
  creatorId: MOCK_USER_ID,
  startDate: "2026-10-15",
  dueDate: "2026-11-01",
  estimatePoints: 5,
  fieldRevisions: {
    title: 1,
    statusCategory: 1,
    priority: 1,
  },
  effectivePermissions: makeTaskPermissions(true),
  createdAt: "2026-10-15T10:00:00Z",
  updatedAt: "2026-10-15T10:00:00Z",
  archivedAt: null,
};

function renderActionsMenu({
  task = baseTask,
  workspaceContext = createMockWorkspaceContext(),
  authContext = createMockAuth(),
  onParentClick = vi.fn(),
}: {
  task?: TaskDto;
  workspaceContext?: WorkspaceContextValue;
  authContext?: AuthContextType;
  onParentClick?: () => void;
} = {}) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authContext}>
        <WorkspaceContext.Provider value={workspaceContext}>
          <TaskUndoProvider communityId={MOCK_COMMUNITY_1_ID} workspaceId={WS_SHARED_ENG_ID}>
            <TaskCloneProvider communityId={MOCK_COMMUNITY_1_ID} workspaceId={WS_SHARED_ENG_ID}>
              <MemoryRouter>
                <div data-testid="parent-container" onClick={onParentClick}>
                  <TaskActionsMenu
                    task={task}
                    workspaceId={WS_SHARED_ENG_ID}
                    communityId={MOCK_COMMUNITY_1_ID}
                  />
                </div>
              </MemoryRouter>
            </TaskCloneProvider>
          </TaskUndoProvider>
        </WorkspaceContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("WP-D Contextual Task Actions — TaskActionsMenu", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders trigger button with accessible label and stops event propagation to parent", async () => {
    const parentClick = vi.fn();
    renderActionsMenu({ onParentClick: parentClick });

    const trigger = screen.getByTestId("task-actions-trigger-ENG-101");
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-label", "Task actions for ENG-101");

    // Click trigger -> parent container should NOT receive click event
    fireEvent.click(trigger);
    expect(parentClick).not.toHaveBeenCalled();

    // Menu content opens
    expect(await screen.findByRole("menu")).toBeInTheDocument();
  });

  it("copies task key to clipboard and displays feedback without bubbling to parent", async () => {
    const parentClick = vi.fn();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    renderActionsMenu({ onParentClick: parentClick });

    const trigger = screen.getByTestId("task-actions-trigger-ENG-101");
    fireEvent.click(trigger);

    const copyKeyItem = await screen.findByTestId("task-action-copy-key-ENG-101");
    expect(copyKeyItem).toHaveTextContent("Copy Task Key");

    fireEvent.click(copyKeyItem);

    // Verify canonical task key copied
    expect(writeTextMock).toHaveBeenCalledWith("ENG-101");
    // Parent click never called
    expect(parentClick).not.toHaveBeenCalled();

    // Trigger button temporarily reflects copied confirmation
    await waitFor(() => {
      expect(screen.getByTestId("task-actions-trigger-ENG-101")).toHaveAttribute(
        "aria-label",
        "Copied ENG-101 key"
      );
    });
  });

  it("copies task link to clipboard with workspace context and taskKey param", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    renderActionsMenu();

    const trigger = screen.getByTestId("task-actions-trigger-ENG-101");
    fireEvent.click(trigger);

    const copyLinkItem = await screen.findByTestId("task-action-copy-link-ENG-101");
    expect(copyLinkItem).toHaveTextContent("Copy Task Link");

    fireEvent.click(copyLinkItem);

    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining(`/workspaces/${WS_SHARED_ENG_ID}`)
    );
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining(`task=ENG-101`)
    );

    // Trigger button reflects copied link confirmation
    await waitFor(() => {
      expect(screen.getByTestId("task-actions-trigger-ENG-101")).toHaveAttribute(
        "aria-label",
        "Copied ENG-101 link"
      );
    });
  });

  it("renders clone action when user has capability and executes clone without bubbling", async () => {
    const parentClick = vi.fn();
    renderActionsMenu({ onParentClick: parentClick });

    const trigger = screen.getByTestId("task-actions-trigger-ENG-101");
    fireEvent.click(trigger);

    const cloneItem = await screen.findByTestId("task-action-clone-ENG-101");
    expect(cloneItem).toHaveTextContent("Clone Task");

    fireEvent.click(cloneItem);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it("omits clone action when user lacks task:create capability", async () => {
    const restrictedWorkspace: WorkspaceDto = {
      ...mockWorkspace,
      effectiveCapabilities: ["task:read"] as WorkspaceDto["effectiveCapabilities"], // lacks task:create
    };
    renderActionsMenu({
      workspaceContext: createMockWorkspaceContext({
        activeWorkspace: restrictedWorkspace,
        workspaces: [restrictedWorkspace],
      }),
    });

    const trigger = screen.getByTestId("task-actions-trigger-ENG-101");
    fireEvent.click(trigger);

    await screen.findByRole("menu");
    expect(screen.queryByTestId("task-action-clone-ENG-101")).not.toBeInTheDocument();
  });

  it("renders archive action when canArchive is true and executes without bubbling", async () => {
    const parentClick = vi.fn();
    renderActionsMenu({ onParentClick: parentClick });

    const trigger = screen.getByTestId("task-actions-trigger-ENG-101");
    fireEvent.click(trigger);

    const archiveItem = await screen.findByTestId("task-action-archive-ENG-101");
    expect(archiveItem).toHaveTextContent("Archive Task");

    fireEvent.click(archiveItem);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it("omits archive action when effectivePermissions.canArchive is false", async () => {
    const readOnlyTask: TaskDto = {
      ...baseTask,
      effectivePermissions: {
        ...baseTask.effectivePermissions,
        canArchive: false,
      },
    };

    renderActionsMenu({ task: readOnlyTask });

    const trigger = screen.getByTestId("task-actions-trigger-ENG-101");
    fireEvent.click(trigger);

    await screen.findByRole("menu");
    expect(screen.queryByTestId("task-action-archive-ENG-101")).not.toBeInTheDocument();
  });

  it("is keyboard operable and handles Escape dismissal", async () => {
    const user = userEvent.setup();
    renderActionsMenu();

    const trigger = screen.getByTestId("task-actions-trigger-ENG-101");
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    // Open via click or keyboard activation
    await user.click(trigger);
    const menu = await screen.findByRole("menu");
    expect(menu).toBeInTheDocument();

    // Dismiss via Escape
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });
});
