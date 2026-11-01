/* eslint-disable */
/** Generated from ws-protocol.schema.json - DO NOT EDIT MANUALLY */

/**
 * Client/server control frames for subprotocol work-platform.v1. Domain deltas are raw envelopes defined in ws-events.schema.json.
 */
export type WorkManagementRealtimeControlProtocol = ClientControlFrame | ServerControlFrame;
export type ClientControlFrame =
  Authenticate | SubscribeWorkspace | SubscribeUserCommunity | UnsubscribeWorkspace | UnsubscribeUserCommunity | Pong;
export type Uuid = string;
export type ServerControlFrame =
  | ConnectionAck
  | WorkspaceSubscriptionAck
  | UserCommunitySubscriptionAck
  | WorkspaceUnsubscriptionAck
  | UserCommunityUnsubscriptionAck
  | Ping
  | Error
  | WorkspaceAccessRevoked
  | WorkspaceAuthorizationChanged
  | CommunityAccessRevoked;

/**
 * First application frame for ticket-authenticated sockets; must be sent within five seconds of Upgrade.
 */
export interface Authenticate {
  type: "AUTHENTICATE";
  requestId: string;
  ticket: string;
}
/**
 * Requests a workspace stream. sinceSeq is the last contiguous workspaceSeq already applied by this client.
 */
export interface SubscribeWorkspace {
  type: "SUBSCRIBE_WORKSPACE";
  requestId: string;
  communityId: Uuid;
  workspaceId: Uuid;
  sinceSeq: number;
}
/**
 * Requests the authenticated user’s private event stream for one community; userId is never client-supplied.
 */
export interface SubscribeUserCommunity {
  type: "SUBSCRIBE_USER_COMMUNITY";
  requestId: string;
  communityId: Uuid;
  sinceSeq: number;
}
export interface UnsubscribeWorkspace {
  type: "UNSUBSCRIBE_WORKSPACE";
  requestId: string;
  communityId: Uuid;
  workspaceId: Uuid;
}
export interface UnsubscribeUserCommunity {
  type: "UNSUBSCRIBE_USER_COMMUNITY";
  requestId: string;
  communityId: Uuid;
}
export interface Pong {
  type: "PONG";
}
/**
 * Confirms authenticated socket setup. communityId is present for ticket mode and omitted for session-cookie mode.
 */
export interface ConnectionAck {
  type: "CONNECTION_ACK";
  authMode: "SESSION_COOKIE" | "TICKET";
  communityId?: Uuid;
}
export interface WorkspaceSubscriptionAck {
  type: "SUBSCRIPTION_ACK";
  requestId: string;
  stream: "workspace";
  communityId: Uuid;
  workspaceId: Uuid;
  currentSeq: number;
}
export interface UserCommunitySubscriptionAck {
  type: "SUBSCRIPTION_ACK";
  requestId: string;
  stream: "user-community";
  communityId: Uuid;
  currentSeq: number;
}
export interface WorkspaceUnsubscriptionAck {
  type: "UNSUBSCRIPTION_ACK";
  requestId: string;
  stream: "workspace";
  communityId: Uuid;
  workspaceId: Uuid;
}
export interface UserCommunityUnsubscriptionAck {
  type: "UNSUBSCRIPTION_ACK";
  requestId: string;
  stream: "user-community";
  communityId: Uuid;
}
export interface Ping {
  type: "PING";
}
/**
 * Generic error; does not disclose the existence of inaccessible resources or identities.
 */
export interface Error {
  type: "ERROR";
  requestId?: string;
  code:
    | "INVALID_FRAME"
    | "AUTHENTICATION_FAILED"
    | "TICKET_EXPIRED"
    | "TICKET_ALREADY_REDEEMED"
    | "SUBSCRIPTION_DENIED"
    | "RATE_LIMITED"
    | "SERVER_UNAVAILABLE";
}
export interface WorkspaceAccessRevoked {
  type: "WORKSPACE_ACCESS_REVOKED";
  communityId: Uuid;
  workspaceId: Uuid;
}
export interface WorkspaceAuthorizationChanged {
  type: "WORKSPACE_AUTHORIZATION_CHANGED";
  communityId: Uuid;
  workspaceId: Uuid;
}
export interface CommunityAccessRevoked {
  type: "COMMUNITY_ACCESS_REVOKED";
  communityId: Uuid;
}
