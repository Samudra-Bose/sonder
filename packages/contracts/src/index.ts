/**
 * Sonder Platform Shared Contracts & Generated Types
 * 
 * Sources:
 * - OpenAPI: Community-Work-Management-v1.5/docs/contracts/openapi.yaml (0.3.20-draft)
 * - WebSocket Events: Community-Work-Management-v1.5/docs/contracts/ws-events.schema.json
 * - WebSocket Protocol: Community-Work-Management-v1.5/docs/contracts/ws-protocol.schema.json
 */

export type * from "./api-types.js";
export type * from "./ws-events-types.js";
export type * from "./ws-protocol-types.js";

// Disambiguate duplicate Uuid export from both ws-events and ws-protocol
export type { Uuid } from "./ws-events-types.js";

import type { components, operations, paths } from "./api-types.js";

export type { paths, operations, components };
export type ApiSchema<T extends keyof components["schemas"]> = components["schemas"][T];
