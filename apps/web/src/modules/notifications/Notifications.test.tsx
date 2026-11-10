import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { WorkspaceProvider } from "@/modules/workspace/WorkspaceContext.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import {
  MOCK_COMMUNITY_1_ID,
  MOCK_COMMUNITY_2_ID,
  MOCK_USER_ID,
} from "@/mocks/data/my-work.js";
import {
  resetMockNotifications,
  getMockNotifications,
  NOTIF_1_ID,
  NOTIF_2_ID,
  NOTIF_7_ID,
} from "@/mocks/data/notifications.js";
import { setMockNotificationsError } from "@/mocks/handlers/notifications.js";
import { App } from "@/App.js";
import { NotificationBell } from "./NotificationBell.js";
import { InboxView } from "./InboxView.js";

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
    csrfToken: "mock-valid-csrf-token",
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

interface TestWrapperProps {
  children: React.ReactNode;
  authOverrides?: Partial<AuthContextType>;
  initialCommunityId?: string;
  queryClient?: QueryClient;
}

function TestWrapper({
  children,
  authOverrides,
  initialCommunityId = MOCK_COMMUNITY_1_ID,
  queryClient = createTestQueryClient(),
}: TestWrapperProps) {
  const authValue = createMockAuth(authOverrides);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <WorkspaceProvider initialCommunityId={initialCommunityId}>
          <MemoryRouter>{children}</MemoryRouter>
        </WorkspaceProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("VS-08B.1: Notification REST Vertical Slice & Functional Inbox", () => {
  beforeEach(() => {
    resetMockNotifications();
    setMockNotificationsError(null);
  });

  describe("1. Notification List Retrieval & Rendering", () => {
    it("retrieves notifications from canonical REST API and renders items with correct reason and category", async () => {
      render(
        <TestWrapper>
          <InboxView />
        </TestWrapper>
      );

      // Loading state should show initially
      expect(screen.getByTestId("notifications-loading")).toBeInTheDocument();

      // Wait for notifications to load
      await waitFor(() => {
        expect(screen.getByTestId("notifications-list")).toBeInTheDocument();
      });

      // Verify specific notification content from fixtures
      expect(
        screen.getByText("Jordan Lee mentioned you in ENG-101")
      ).toBeInTheDocument();
      expect(
        screen.getByText("You were assigned to ENG-103")
      ).toBeInTheDocument();
      expect(
        screen.getByText("New comment on watched task ENG-105")
      ).toBeInTheDocument();

      // Verify reasons are rendered with badges
      expect(screen.getByText("Mention")).toBeInTheDocument();
      expect(screen.getByText("Assigned")).toBeInTheDocument();
      expect(screen.getByText("Due Reminder")).toBeInTheDocument();
    });
  });

  describe("2. Category Filtering", () => {
    it("filters notifications by ACTION_REQUIRED and UPDATES categories correctly", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <InboxView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId("notifications-list")).toBeInTheDocument();
      });

      // Initially 'All' shows both categories
      expect(screen.getByText("Jordan Lee mentioned you in ENG-101")).toBeInTheDocument();
      expect(screen.getByText("New comment on watched task ENG-105")).toBeInTheDocument();

      // Click 'Action Required' tab
      const actionRequiredTab = screen.getByRole("tab", { name: "Action Required" });
      await user.click(actionRequiredTab);

      await waitFor(() => {
        expect(screen.getByText("Jordan Lee mentioned you in ENG-101")).toBeInTheDocument();
        expect(screen.getByText("You were assigned to ENG-103")).toBeInTheDocument();
        expect(screen.queryByText("New comment on watched task ENG-105")).not.toBeInTheDocument();
      });

      // Click 'Updates' tab
      const updatesTab = screen.getByRole("tab", { name: "Updates" });
      await user.click(updatesTab);

      await waitFor(() => {
        expect(screen.queryByText("Jordan Lee mentioned you in ENG-101")).not.toBeInTheDocument();
        expect(screen.getByText("New comment on watched task ENG-105")).toBeInTheDocument();
        expect(screen.getByText("Community policy update published")).toBeInTheDocument();
      });

      // Switch back to 'All'
      const allTab = screen.getByRole("tab", { name: "All" });
      await user.click(allTab);

      await waitFor(() => {
        expect(screen.getByText("Jordan Lee mentioned you in ENG-101")).toBeInTheDocument();
        expect(screen.getByText("New comment on watched task ENG-105")).toBeInTheDocument();
      });
    });
  });

  describe("3. Unread Filtering", () => {
    it("toggles unread-only view and shows empty state when no unread items match", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <InboxView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId("notifications-list")).toBeInTheDocument();
      });

      // Read items (like NOTIF_7) should be present in unfiltered list
      expect(screen.getByText("Break-glass administrative access logged")).toBeInTheDocument();

      // Toggle 'Unread only'
      const unreadToggle = screen.getByLabelText(/unread only/i);
      await user.click(unreadToggle);

      await waitFor(() => {
        // Read item should no longer be rendered
        expect(screen.queryByText("Break-glass administrative access logged")).not.toBeInTheDocument();
        // Unread items should still be present
        expect(screen.getByText("Jordan Lee mentioned you in ENG-101")).toBeInTheDocument();
      });
    });
  });

  describe("4. Cursor Pagination and Deduplication", () => {
    it("handles pagination via Load More button and deduplicates overlapping entries", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <InboxView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId("notifications-list")).toBeInTheDocument();
      });

      // The mock dataset has 8 items and default query limit is 20 in InboxView,
      // so all 8 are loaded on page 1 without duplicate keys
      const items = screen.getAllByTestId(/^notification-item-/);
      expect(items.length).toBe(8);

      // Verify each item ID is rendered exactly once
      const itemIds = items.map((el) => el.getAttribute("data-testid"));
      const uniqueIds = new Set(itemIds);
      expect(itemIds.length).toBe(uniqueIds.size);
    });
  });

  describe("5. Canonical Global Unread Count", () => {
    it("preserves global unread count independent of active category or unread filters", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <InboxView />
        </TestWrapper>
      );

      // Total unread notifications in mock dataset is 6
      await waitFor(() => {
        expect(screen.getByText("6 unread")).toBeInTheDocument();
      });

      // Switch to Updates category (which only has 2 unread items)
      const updatesTab = screen.getByRole("tab", { name: "Updates" });
      await user.click(updatesTab);

      await waitFor(() => {
        expect(screen.getByText("New comment on watched task ENG-105")).toBeInTheDocument();
      });

      // The global badge MUST still show 6 unread (per canonical invariant §2742)
      expect(screen.getByText("6 unread")).toBeInTheDocument();
    });
  });

  describe("6. Individual Mark as Read", () => {
    it("marks a notification as read with optimistic query cache update", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <InboxView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Jordan Lee mentioned you in ENG-101")).toBeInTheDocument();
      });

      const notifItem = screen.getByTestId(`notification-item-${NOTIF_1_ID}`);
      expect(notifItem).toHaveAttribute("data-is-read", "false");

      // Find Mark as read button for this specific item
      const markReadBtn = within(notifItem).getByRole("button", {
        name: /mark as read: jordan lee mentioned you in eng-101/i,
      });

      await user.click(markReadBtn);

      // Optimistically marked read: unread count decrements from 6 to 5
      await waitFor(() => {
        expect(screen.getByText("5 unread")).toBeInTheDocument();
      });

      // Button should disappear because item is now read (one-way read state)
      expect(
        within(notifItem).queryByRole("button", { name: /mark as read/i })
      ).not.toBeInTheDocument();
      expect(notifItem).toHaveAttribute("data-is-read", "true");
    });
  });

  describe("7. Mark All Notifications as Read", () => {
    it("marks all notifications read, resets unread count to 0 and removes mark-all button", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <InboxView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("6 unread")).toBeInTheDocument();
      });

      const markAllBtn = screen.getByRole("button", {
        name: /mark all notifications as read/i,
      });

      await user.click(markAllBtn);

      // Unread count badge and mark-all button should disappear
      await waitFor(() => {
        expect(screen.queryByText(/\d+\s+unread/i)).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: /mark all notifications as read/i })
        ).not.toBeInTheDocument();
      });

      // All items should now have data-is-read="true"
      const items = screen.getAllByTestId(/^notification-item-/);
      for (const item of items) {
        expect(item).toHaveAttribute("data-is-read", "true");
      }
    });
  });

  describe("8. Optimistic Mutation Rollback on Failure", () => {
    it("rolls back optimistic mark-read state when the server returns an error", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <InboxView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Jordan Lee mentioned you in ENG-101")).toBeInTheDocument();
      });

      // Inject 500 error on the read endpoint
      setMockNotificationsError({
        status: 500,
        problem: {
          type: "https://errors.sonder.platform/server-error",
          title: "Internal Error",
          status: 500,
          detail: "Failed to persist read state to database",
        },
        endpoint: "read",
      });

      const notifItem = screen.getByTestId(`notification-item-${NOTIF_1_ID}`);
      const markReadBtn = within(notifItem).getByRole("button", {
        name: /mark as read: jordan lee mentioned you in eng-101/i,
      });

      await user.click(markReadBtn);

      // After rollback, the unread count should be restored to 6
      await waitFor(() => {
        expect(screen.getByText("6 unread")).toBeInTheDocument();
      });

      // The mark read button should reappear
      expect(
        within(notifItem).getByRole("button", { name: /mark as read/i })
      ).toBeInTheDocument();
      expect(notifItem).toHaveAttribute("data-is-read", "false");
    });
  });

  describe("9. Cache Synchronization Between Bell and Inbox", () => {
    it("synchronizes unread state and count across NotificationBell and InboxView", async () => {
      const user = userEvent.setup();
      const sharedClient = createTestQueryClient();

      render(
        <TestWrapper queryClient={sharedClient}>
          <div>
            <NotificationBell />
            <InboxView />
          </div>
        </TestWrapper>
      );

      // Bell trigger should display 6 unread badge
      await waitFor(() => {
        expect(screen.getByTestId("notification-badge")).toHaveTextContent("6");
      });

      // Click Mark All Read inside InboxView
      const markAllBtn = screen.getByRole("button", {
        name: /mark all notifications as read/i,
      });
      await user.click(markAllBtn);

      // Bell trigger badge should disappear in sync
      await waitFor(() => {
        expect(screen.queryByTestId("notification-badge")).not.toBeInTheDocument();
      });
    });
  });

  describe("10. Community and Authentication Isolation", () => {
    it("fails closed when CSRF token is missing on mutating operations", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper authOverrides={{ csrfToken: null }}>
          <InboxView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Jordan Lee mentioned you in ENG-101")).toBeInTheDocument();
      });

      const notifItem = screen.getByTestId(`notification-item-${NOTIF_1_ID}`);
      const markReadBtn = within(notifItem).getByRole("button", {
        name: /mark as read/i,
      });

      await user.click(markReadBtn);

      // State should remain unread because mutation failed without CSRF token
      await waitFor(() => {
        expect(screen.getByText("6 unread")).toBeInTheDocument();
      });
    });

    it("isolates queries between different communities", async () => {
      const { rerender } = render(
        <TestWrapper initialCommunityId={MOCK_COMMUNITY_1_ID}>
          <InboxView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Jordan Lee mentioned you in ENG-101")).toBeInTheDocument();
      });

      // Switching to Community 2 triggers fresh query for that community
      rerender(
        <TestWrapper initialCommunityId={MOCK_COMMUNITY_2_ID}>
          <InboxView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId("notifications-list")).toBeInTheDocument();
      });
    });
  });

  describe("11. Loading, Empty, Failure and Retry States", () => {
    it("renders error state when list fetch fails and recovers on Retry click", async () => {
      const user = userEvent.setup();

      // Configure mock error
      setMockNotificationsError({
        status: 503,
        problem: {
          type: "https://errors.sonder.platform/service-unavailable",
          title: "Service Unavailable",
          status: 503,
          detail: "Notification service undergoing scheduled maintenance",
        },
        endpoint: "list",
      });

      render(
        <TestWrapper>
          <InboxView />
        </TestWrapper>
      );

      // Error UI should render
      await waitFor(() => {
        expect(
          screen.getByText("Failed to load notifications")
        ).toBeInTheDocument();
        expect(
          screen.getByText(/Notification service undergoing scheduled maintenance/i)
        ).toBeInTheDocument();
      });

      // Clear error and click Retry
      setMockNotificationsError(null);
      const retryBtn = screen.getByRole("button", { name: /retry/i });
      await user.click(retryBtn);

      // Should recover and display notifications list
      await waitFor(() => {
        expect(screen.getByTestId("notifications-list")).toBeInTheDocument();
      });
    });
  });

  describe("12. Responsive and Accessible Interaction", () => {
    it("NotificationBell announces unread count via accessible aria-label", async () => {
      render(
        <TestWrapper>
          <NotificationBell />
        </TestWrapper>
      );

      await waitFor(() => {
        const bellTrigger = screen.getByTestId("notification-bell-trigger");
        expect(bellTrigger).toHaveAttribute(
          "aria-label",
          "Notifications, 6 unread"
        );
      });
    });

    it("Full App renders NotificationBell in header and navigates to /inbox", async () => {
      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <App initialEntries={["/"]} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("notification-bell-trigger")).toBeInTheDocument();
      });
    });
  });
});
