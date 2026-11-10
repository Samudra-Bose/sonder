import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { WorkspaceProvider } from "@/modules/workspace/WorkspaceContext.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import {
  MOCK_COMMUNITY_1_ID,
  WS_SHARED_ENG_ID,
  MOCK_USER_ID,
  OTHER_USER_ID,
} from "@/mocks/data/my-work.js";
import { resetTaskMockState } from "@/mocks/handlers/tasks.js";
import { setMockCommentsError } from "@/mocks/handlers/comments.js";
import { TaskPeekDrawer } from "../TaskPeekDrawer.js";
import { useTaskPeekDrawer } from "../useTaskPeekDrawer.js";
import { COMMENT_2_ID } from "@/mocks/data/comments.js";

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
  forceMode?: "desktop" | "mobile";
  authOverrides?: Partial<AuthContextType>;
}

function renderCollaborationTest({
  initialEntries = ["/?task=ENG-101"],
  initialWorkspaceId = WS_SHARED_ENG_ID,
  forceMode = "desktop",
  authOverrides,
}: TestShellProps = {}) {
  const queryClient = createTestQueryClient();
  const authValue = createMockAuth(authOverrides);

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <WorkspaceProvider
            initialCommunityId={MOCK_COMMUNITY_1_ID}
            initialWorkspaceId={initialWorkspaceId}
          >
            <MemoryRouter initialEntries={initialEntries}>
              <LocationDisplay />
              <div className="flex">
                <main className="flex-1">
                  <TaskTestTrigger />
                </main>
                <TaskPeekDrawer forceMode={forceMode} />
              </div>
            </MemoryRouter>
          </WorkspaceProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    ),
  };
}

function TaskTestTrigger() {
  const { openTask } = useTaskPeekDrawer();
  return (
    <button
      type="button"
      data-testid="open-task-btn"
      onClick={() => openTask("ENG-101", { workspaceId: WS_SHARED_ENG_ID })}
    >
      Open ENG-101
    </button>
  );
}

async function waitForTaskLoaded(drawerTestId = "task-peek-drawer-desktop") {
  await waitFor(
    () => {
      expect(screen.getByTestId(drawerTestId)).toBeInTheDocument();
      expect(
        screen.getByText("Fix critical auth token refresh race condition")
      ).toBeInTheDocument();
    },
    { timeout: 4000 }
  );
}

async function openDrawerAndActivityTab(
  user: ReturnType<typeof userEvent.setup>,
  drawerTestId = "task-peek-drawer-desktop"
) {
  await waitForTaskLoaded(drawerTestId);

  const activityTab = screen.getByRole("tab", { name: /activity & comments/i });
  await user.click(activityTab);

  await waitFor(() => {
    expect(screen.getByTestId("task-activity-tab")).toBeInTheDocument();
  });
}

describe("VS-08A: Collaboration Spine — Comments, @Mentions & Task Watchers", () => {
  beforeEach(() => {
    resetTaskMockState();
    setMockCommentsError(null);
  });

  describe("1. Task Activity Tab & Comment Loading", () => {
    it("renders Activity & Comments tab in TaskPeekDrawer and displays seeded comments", async () => {
      const user = userEvent.setup();
      renderCollaborationTest();

      await openDrawerAndActivityTab(user);

      // Verify seeded comments are present
      await waitFor(() => {
        expect(
          screen.getByText(/parallel requests trigger duplicate refresh calls/i)
        ).toBeInTheDocument();
      });

      // Verify author identity and avatars
      expect(screen.getAllByText("Jordan Lee").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Alex Morgan").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("2. Comment Creation (Authorized Member)", () => {
    it("allows authorized user to compose and submit a Markdown comment", async () => {
      const user = userEvent.setup();
      renderCollaborationTest();

      await openDrawerAndActivityTab(user);

      await waitFor(() => {
        expect(screen.getByTestId("comment-composer-input")).toBeInTheDocument();
      });

      const textarea = screen.getByTestId("comment-composer-input");
      const submitBtn = screen.getByTestId("comment-submit-button");

      expect(submitBtn).toBeDisabled();

      // Type new comment with markdown and mention
      await user.type(
        textarea,
        "Confirmed fix in staging. Regression suite passed! **All green**."
      );

      expect(submitBtn).not.toBeDisabled();
      await user.click(submitBtn);

      // Verify comment appears in the stream
      await waitFor(() => {
        expect(screen.getByText(/Confirmed fix in staging/i)).toBeInTheDocument();
        expect(screen.getByText("All green")).toBeInTheDocument();
      });

      // Textarea should be cleared
      expect(textarea).toHaveValue("");
    });

    it("supports keyboard shortcut Cmd+Enter / Ctrl+Enter to submit comment", async () => {
      const user = userEvent.setup();
      renderCollaborationTest();

      await openDrawerAndActivityTab(user);

      await waitFor(() => {
        expect(screen.getByTestId("comment-composer-input")).toBeInTheDocument();
      });

      const textarea = screen.getByTestId("comment-composer-input");
      await user.type(textarea, "Submitted via keyboard shortcut.");
      await user.keyboard("{Meta>}{Enter}{/Meta}");

      await waitFor(() => {
        expect(
          screen.getByText(/Submitted via keyboard shortcut/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("3. Comment Editing & Soft Deletion", () => {
    it("allows comment author to edit own comment with optimistic concurrency", async () => {
      const user = userEvent.setup();
      renderCollaborationTest();

      await openDrawerAndActivityTab(user);

      // Alex Morgan is author of COMMENT_2_ID
      await waitFor(() => {
        expect(screen.getByTestId(`comment-item-${COMMENT_2_ID}`)).toBeInTheDocument();
      });

      const alexComment = screen.getByTestId(`comment-item-${COMMENT_2_ID}`);
      const editBtn = within(alexComment).getByRole("button", { name: /edit comment/i });
      await user.click(editBtn);

      // Edit composer appears
      const editTextarea = within(alexComment).getByRole("textbox", { name: /comment message/i });
      expect(editTextarea).toHaveValue(
        "Agreed. Will also check #ENG-102 to make sure regression tests cover this flow."
      );

      await user.clear(editTextarea);
      await user.type(editTextarea, "Updated: Checked #ENG-102 and tests pass.");

      const saveBtn = within(alexComment).getByRole("button", { name: /save changes/i });
      await user.click(saveBtn);

      await waitFor(() => {
        expect(
          within(alexComment).getByText(/Updated: Checked/i)
        ).toBeInTheDocument();
        expect(within(alexComment).getByText("(edited)")).toBeInTheDocument();
      });
    });

    it("allows author to soft-delete own comment and displays deletion tombstone", async () => {
      const user = userEvent.setup();
      renderCollaborationTest();

      await openDrawerAndActivityTab(user);

      await waitFor(() => {
        expect(screen.getByTestId(`comment-item-${COMMENT_2_ID}`)).toBeInTheDocument();
      });

      const alexComment = screen.getByTestId(`comment-item-${COMMENT_2_ID}`);
      const deleteBtn = within(alexComment).getByRole("button", { name: /delete comment/i });
      await user.click(deleteBtn);

      // Delete confirmation banner appears
      expect(
        within(alexComment).getByText(/Delete this comment\?/i)
      ).toBeInTheDocument();

      const confirmBtn = within(alexComment).getByTestId("confirm-delete-comment-btn");
      await user.click(confirmBtn);

      // Tombstone replaces comment body
      await waitFor(() => {
        expect(
          within(alexComment).getByText("This comment was deleted.")
        ).toBeInTheDocument();
      });

      // Original text is no longer rendered
      expect(
        within(alexComment).queryByText(/Will also check #ENG-102/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("4. @Mentions Autocomplete & Rendering", () => {
    it("suggests eligible workspace members when typing @ and inserts mention token", async () => {
      const user = userEvent.setup();
      renderCollaborationTest();

      await openDrawerAndActivityTab(user);

      const textarea = await screen.findByTestId("comment-composer-input");
      await user.type(textarea, "Hey @Jo");

      // Mention popover appears with Jordan Lee
      await waitFor(() => {
        expect(screen.getByTestId("mention-autocomplete-popover")).toBeInTheDocument();
      });

      const popover = screen.getByTestId("mention-autocomplete-popover");
      expect(within(popover).getByText("Jordan Lee")).toBeInTheDocument();

      // Keyboard selection with Enter
      await user.keyboard("{Enter}");

      // Token inserted into textarea: @[Jordan Lee](user:...)
      expect(textarea).toHaveValue(
        `Hey @[Jordan Lee](user:${OTHER_USER_ID}) `
      );
    });

    it("renders mentions as styled badge pills in comment body", async () => {
      const user = userEvent.setup();
      renderCollaborationTest();

      await openDrawerAndActivityTab(user);

      await waitFor(() => {
        expect(screen.getByText("@Alex Morgan")).toBeInTheDocument();
      });

      const mentionBadge = screen.getByText("@Alex Morgan");
      expect(mentionBadge).toHaveAttribute("data-user-id", MOCK_USER_ID);
    });
  });

  describe("5. Task-Key (#KEY) Links & Navigation", () => {
    it("renders #KEY tokens as interactive links that navigate to the task", async () => {
      const user = userEvent.setup();
      renderCollaborationTest();

      await openDrawerAndActivityTab(user);

      // Find #ENG-102 link in comment 2
      const taskKeyBtn = await screen.findByTestId("task-key-link-ENG-102");
      expect(taskKeyBtn).toBeInTheDocument();

      await user.click(taskKeyBtn);

      // Deep link query parameter should update to ?task=ENG-102
      await waitFor(() => {
        expect(screen.getByTestId("location-display")).toHaveTextContent("task=ENG-102");
      });
    });
  });

  describe("6. Task Watchers & Follow Toggling", () => {
    it("displays watching state and allows toggling watch preference with optimistic rollback on error", async () => {
      const user = userEvent.setup();
      renderCollaborationTest();

      await waitForTaskLoaded();

      // Watch button in header
      const watchButton = screen.getByTestId("task-watch-button");
      expect(watchButton).toHaveAttribute("aria-pressed", "true");
      expect(within(watchButton).getByText("Watching")).toBeInTheDocument();

      // Click to unfollow
      await user.click(watchButton);

      await waitFor(() => {
        expect(within(watchButton).getByText("Watch")).toBeInTheDocument();
        expect(watchButton).toHaveAttribute("aria-pressed", "false");
      });

      // Click again to follow
      await user.click(watchButton);

      await waitFor(() => {
        expect(within(watchButton).getByText("Watching")).toBeInTheDocument();
        expect(watchButton).toHaveAttribute("aria-pressed", "true");
      });
    });

    it("rolls back optimistic toggle if server returns an error", async () => {
      const user = userEvent.setup();
      renderCollaborationTest();

      await waitForTaskLoaded();

      const watchButton = screen.getByTestId("task-watch-button");
      expect(within(watchButton).getByText("Watching")).toBeInTheDocument();

      // Simulate watch error
      setMockCommentsError({
        status: 500,
        problem: {
          type: "https://errors.sonder.platform/internal-error",
          title: "Internal Error",
          status: 500,
          detail: "Database connection failed",
        },
        endpoint: "watch",
      });

      // Try to unwatch
      await user.click(watchButton);

      // Should roll back to Watching
      await waitFor(() => {
        expect(within(watchButton).getByText("Watching")).toBeInTheDocument();
      });
    });
  });

  describe("7. Empty, Error, and Responsive States", () => {
    it("handles error response and allows retrying", async () => {
      const user = userEvent.setup();

      // Simulate comments fetch failure
      setMockCommentsError({
        status: 503,
        problem: {
          type: "https://errors.sonder.platform/service-unavailable",
          title: "Service Unavailable",
          status: 503,
          detail: "Comment service temporarily unavailable",
        },
        endpoint: "comments",
      });

      renderCollaborationTest();

      await waitForTaskLoaded();

      await user.click(screen.getByRole("tab", { name: /activity & comments/i }));

      // Error message with Retry button
      await waitFor(() => {
        expect(screen.getByText("Failed to load comments")).toBeInTheDocument();
      });

      const retryBtn = screen.getByRole("button", { name: /retry/i });
      expect(retryBtn).toBeInTheDocument();

      // Clear error and click retry
      setMockCommentsError(null);
      await user.click(retryBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/parallel requests trigger duplicate refresh calls/i)
        ).toBeInTheDocument();
      });
    });

    it("renders accessible bottom sheet layout on mobile viewport", async () => {
      renderCollaborationTest({ forceMode: "mobile" });

      await waitForTaskLoaded("task-peek-drawer-mobile");

      expect(screen.getByRole("tab", { name: /activity & comments/i })).toBeInTheDocument();
    });
  });
});
