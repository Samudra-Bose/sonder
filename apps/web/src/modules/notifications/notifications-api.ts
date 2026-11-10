import { apiRequest } from "@/lib/api-client.js";
import type {
  NotificationListDto,
  ListNotificationsParams,
} from "./types.js";

/**
 * REST API client for Sonder Notification Center operations.
 * Strictly consumes candidate OpenAPI 0.3.20-draft notification endpoints.
 */

export async function listNotificationsApi(
  communityId: string,
  params: ListNotificationsParams = {}
): Promise<NotificationListDto> {
  const searchParams = new URLSearchParams();

  if (params.cursor) {
    searchParams.set("cursor", params.cursor);
  }
  if (params.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.category) {
    searchParams.set("category", params.category);
  }
  if (params.unreadOnly !== undefined) {
    searchParams.set("unreadOnly", String(params.unreadOnly));
  }

  const query = searchParams.toString();
  const endpoint = `/communities/${communityId}/notifications${query ? `?${query}` : ""}`;

  return apiRequest<NotificationListDto>(endpoint, {
    method: "GET",
  });
}

export async function markNotificationReadApi(
  communityId: string,
  notificationId: string,
  csrfToken: string,
  mutationId?: string
): Promise<void> {
  const endpoint = `/communities/${communityId}/notifications/${notificationId}/read`;
  return apiRequest<void>(endpoint, {
    method: "POST",
    csrfToken,
    mutationId,
  });
}

export async function markAllNotificationsReadApi(
  communityId: string,
  csrfToken: string,
  mutationId?: string
): Promise<void> {
  const endpoint = `/communities/${communityId}/notifications/read-all`;
  return apiRequest<void>(endpoint, {
    method: "POST",
    csrfToken,
    mutationId,
  });
}
