/* eslint-disable */
/** Generated from ws-events.schema.json - DO NOT EDIT MANUALLY */

/**
 * Workspace-scoped server-to-client domain delta envelopes plus recipient-only community notification events. Intermediate-container lifecycle events are not part of the product because Workspaces are the primary work container. Control frames are defined separately in ws-protocol.schema.json.
 */
export type WorkManagementRealtimeEventEnvelopes = WorkspaceStreamEvent | UserCommunityStreamEvent;
export type WorkspaceStreamEvent = {
  schemaVersion: 1;
  stream: "workspace";
  communityId: Uuid;
  workspaceId: Uuid;
  workspaceSeq: number;
  eventId: Uuid;
  eventType:
    | "workspace.restored"
    | "task.created"
    | "task.updated"
    | "task.archived"
    | "task.restored"
    | "task.moved"
    | "task.linked"
    | "task.unlinked"
    | "comment.created"
    | "comment.updated"
    | "comment.deleted"
    | "watcher.changed"
    | "workspace.created"
    | "workspace.updated"
    | "workspace.archived"
    | "workspace.settings_updated"
    | "saved_view.created"
    | "saved_view.updated"
    | "saved_view.deleted"
    | "member.added"
    | "member.updated"
    | "member.removed"
    | "milestone.created"
    | "milestone.updated"
    | "milestone.deleted"
    | "task.bulk_updated"
    | "member.invitation_created"
    | "member.invitation_revoked"
    | "member.invitation_expired"
    | "custom_field.schema_changed"
    | "task.custom_fields_updated";
  occurredAt: string;
  actorId: Uuid;
  /**
   * Originating X-Mutation-Id; null for system work without a client-originated mutation.
   */
  mutationId: Uuid | null;
  entityId: Uuid;
  /**
   * Permission-filtered event delta. Custom-field schema/value events contain only identifiers, version and changeType; never field values or option labels.
   */
  payload: {
    transferId?: Uuid;
    side?: "SOURCE" | "TARGET";
    movedTaskCount?: number;
    rootTaskId?: Uuid;
    [k: string]: unknown;
  };
};
export type Uuid = string;
export type UserCommunityStreamEvent = {
  schemaVersion: 1;
  stream: "user-community";
  communityId: Uuid;
  userNotificationSeq: number;
  eventId: Uuid;
  eventType:
    | "notification.created"
    | "notification.read"
    | "notification.read_all"
    | "membership.changed"
    | "workspace.invitation.created"
    | "workspace.invitation.revoked"
    | "security.break_glass_invoked"
    | "community.invitation.created"
    | "community.invitation.revoked"
    | "community.invitation.expired"
    | "workspace.invitation.accepted"
    | "workspace.invitation.expired"
    | "community.invitation.accepted";
  occurredAt: string;
  /**
   * Recipient-only payload. notification.created/read/read_all use the closed CR-10 payload shapes; no userId, email, comment body, mention target list or inaccessible resource identifier is included.
   */
  payload: {
    [k: string]: unknown;
  };
};
