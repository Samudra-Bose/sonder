# Architecture & Integration Rules

- Layer Ownership: Antigravity owns frontend (`apps/web`) and shared contract types (`packages/contracts`).
- Contracts: OpenAPI 0.3.20-draft and WebSocket schemas are authoritative. Generated types (`src/api-types.ts`, `src/ws-*-types.ts`) must never be edited manually.
- Package Isolation: Shared contracts (`packages/contracts`) must never import from `apps/web`. UI primitives must not import feature modules.
- Deterministic Mocks: Use MSW browser and node handlers matching OpenAPI schemas. Never invent unapproved endpoints.
