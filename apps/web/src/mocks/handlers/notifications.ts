import { http, HttpResponse } from "msw";
import type { ApiSchema } from "@sonder/contracts";
import {
  getMockNotifications,
  markMockNotificationRead,
  markAllMockNotificationsRead,
  type NotificationCategory,
} from "../data/notifications.js";

export interface MockNotificationsErrorOverride {
  status: number;
  problem: ApiSchema<"Problem">;
  endpoint?: "list" | "read" | "read-all" | "ALL";
}

let notificationsErrorOverride: MockNotificationsErrorOverride | null = null;

export function setMockNotificationsError(error: MockNotificationsErrorOverride | null): void {
  notificationsErrorOverride = error;
}

export const notificationHandlers = [
  // 1. List user notifications
  http.get("/api/v1/communities/:communityId/notifications", async ({ request }) => {
    if (
      notificationsErrorOverride &&
      (!notificationsErrorOverride.endpoint ||
        notificationsErrorOverride.endpoint === "list" ||
        notificationsErrorOverride.endpoint === "ALL")
    ) {
      return HttpResponse.json(notificationsErrorOverride.problem, {
        status: notificationsErrorOverride.status,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const limitParam = url.searchParams.get("limit");
    const category = url.searchParams.get("category") as NotificationCategory | null;
    const unreadOnly = url.searchParams.get("unreadOnly") === "true";
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : 10;

    const allNotifications = getMockNotifications();

    // Canonical invariant: unreadCount is calculated across the full inbox
    // for this community, independent of category or unreadOnly filters
    const unreadCount = allNotifications.filter((n) => !n.isRead).length;

    // Filter by category and unreadOnly
    let filtered = [...allNotifications];
    if (category) {
      filtered = filtered.filter((n) => n.category === category);
    }
    if (unreadOnly) {
      filtered = filtered.filter((n) => !n.isRead);
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Cursor pagination (cursor corresponds to the notification ID of the previous page boundary)
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = filtered.findIndex((n) => n.id === cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const pageItems = filtered.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < filtered.length;
    const nextCursor = hasMore && pageItems.length > 0 ? pageItems[pageItems.length - 1]!.id : null;

    return HttpResponse.json(
      {
        items: pageItems,
        nextCursor,
        unreadCount,
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
        },
      }
    );
  }),

  // 2. Mark single notification as read
  http.post(
    "/api/v1/communities/:communityId/notifications/:notificationId/read",
    async ({ params, request }) => {
      const { notificationId } = params as { notificationId: string };

      if (
        notificationsErrorOverride &&
        (!notificationsErrorOverride.endpoint ||
          notificationsErrorOverride.endpoint === "read" ||
          notificationsErrorOverride.endpoint === "ALL")
      ) {
        return HttpResponse.json(notificationsErrorOverride.problem, {
          status: notificationsErrorOverride.status,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      const csrfToken = request.headers.get("X-CSRF-Token");
      const mutationId = request.headers.get("X-Mutation-Id");

      if (!csrfToken) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/csrf-error",
            title: "CSRF Token Required",
            status: 400,
            detail: "A valid CSRF synchronizer token is required for mutating requests.",
            code: "CSRF_TOKEN_REQUIRED",
          },
          { status: 400, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      if (!mutationId) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/validation-error",
            title: "Mutation ID Required",
            status: 400,
            detail: "Missing required X-Mutation-Id header",
            code: "MUTATION_ID_REQUIRED",
          },
          { status: 400, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      const updated = markMockNotificationRead(notificationId);
      if (!updated) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/not-found",
            title: "Notification Not Found",
            status: 404,
            detail: `Notification '${notificationId}' was not found.`,
            code: "NOTIFICATION_NOT_FOUND",
          },
          { status: 404, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      return new HttpResponse(null, {
        status: 204,
        headers: {
          "Cache-Control": "private, no-store",
          "X-Idempotent-Replayed": "false",
        },
      });
    }
  ),

  // 3. Mark all notifications as read
  http.post("/api/v1/communities/:communityId/notifications/read-all", async ({ request }) => {
    if (
      notificationsErrorOverride &&
      (!notificationsErrorOverride.endpoint ||
        notificationsErrorOverride.endpoint === "read-all" ||
        notificationsErrorOverride.endpoint === "ALL")
    ) {
      return HttpResponse.json(notificationsErrorOverride.problem, {
        status: notificationsErrorOverride.status,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    const csrfToken = request.headers.get("X-CSRF-Token");
    const mutationId = request.headers.get("X-Mutation-Id");

    if (!csrfToken) {
      return HttpResponse.json(
        {
          type: "https://errors.sonder.platform/csrf-error",
          title: "CSRF Token Required",
          status: 400,
          detail: "A valid CSRF synchronizer token is required for mutating requests.",
          code: "CSRF_TOKEN_REQUIRED",
        },
        { status: 400, headers: { "Content-Type": "application/problem+json" } }
      );
    }

    if (!mutationId) {
      return HttpResponse.json(
        {
          type: "https://errors.sonder.platform/validation-error",
          title: "Mutation ID Required",
          status: 400,
          detail: "Missing required X-Mutation-Id header",
          code: "MUTATION_ID_REQUIRED",
        },
        { status: 400, headers: { "Content-Type": "application/problem+json" } }
      );
    }

    markAllMockNotificationsRead();

    return new HttpResponse(null, {
      status: 204,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  }),
];
