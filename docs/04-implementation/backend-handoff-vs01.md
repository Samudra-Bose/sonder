# Backend Integration Handoff — VS-01: Authentication & Session Spine

- **Milestone:** VS-01 — Authentication & Session Spine
- **Target Backend Branch:** `feat/BE-VS01-auth-session-spine`
- **Frontend Target Branch:** `feat/FE-VS01-auth-session-spine`
- **Contract Baseline:** OpenAPI `0.3.20-draft` (Unfrozen)
- **Specification Authority:** `Community-Work-Management-Master-Specification-v1.5.0.md` & `docs/03-architecture/permission-and-security-model.md`

---

## 1. Executive Summary

This handoff specification outlines the exact API contracts, cookie requirements, cryptographic headers, error shapes, and lifecycle semantics expected by the frontend implementation in `apps/web`.

The frontend adheres strictly to zero-client-storage security invariants: no JWTs, refresh tokens, or session identifiers are stored in `localStorage` or `sessionStorage`. All session persistence relies on host-only cookies and in-memory CSRF tokens.

---

## 2. Endpoint Contracts

### 2.1. GET `/api/v1/auth/csrf`
Fetches a fresh CSRF synchronizer token for pre-authenticated or authenticated requests.

- **Request:**
  - Method: `GET`
  - Headers: Standard fetch headers.
  - Credentials: `include`
- **Response (200 OK):**
  - `Content-Type: application/json`
  - `Cache-Control: private, no-store`
  - `Set-Cookie: __Host-auth-csrf=<opaque-token>; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=600`
  - Body (`CsrfTokenDto`):
    ```json
    {
      "csrfToken": "string (in-memory token matching cookie hash)"
    }
    ```

### 2.2. POST `/api/v1/auth/register`
Submits a user registration request adhering to the strict anti-enumeration invariant.

- **Request:**
  - Method: `POST`
  - Headers:
    - `Content-Type: application/json`
    - `X-CSRF-Token: <pre-auth-csrf-token>` (Required)
    - `X-Mutation-Id: <uuidv7>` (Required)
  - Credentials: `include`
  - Body (`RegisterRequest`):
    ```json
    {
      "displayName": "Alex Morgan",
      "email": "alex.morgan@example.org",
      "password": "strongPassword123!"
    }
    ```
- **Response (202 Accepted):**
  - Status: `202 Accepted`
  - `Content-Type: application/json`
  - `Cache-Control: private, no-store`
  - Body (`AuthActionAcceptedDto`):
    ```json
    {
      "accepted": true,
      "message": "If the request can be completed, instructions will be sent to the supplied address."
    }
    ```
  - *Invariant:* The 202 response must be returned regardless of whether the email address is already registered, preventing account enumeration.
- **Error Responses (RFC 7807 `application/problem+json`):**
  - `400 Bad Request` (`VALIDATION_FAILED`, `CSRF_TOKEN_INVALID`, `MUTATION_ID_REQUIRED`)
  - `422 Unprocessable Content` (`PASSWORD_TOO_WEAK`, `DISPOSABLE_EMAIL_NOT_ALLOWED`)

### 2.3. POST `/api/v1/auth/login`
Validates user credentials, creates a server-side session, and sets the host-only session cookie.

- **Request:**
  - Method: `POST`
  - Headers:
    - `Content-Type: application/json`
    - `X-CSRF-Token: <pre-auth-csrf-token>` (Required)
    - `X-Mutation-Id: <uuidv7>` (Required)
  - Credentials: `include`
  - Body (`LoginRequest`):
    ```json
    {
      "email": "alex.morgan@example.org",
      "password": "correctPassword123!"
    }
    ```
- **Response (200 OK):**
  - Status: `200 OK`
  - `Content-Type: application/json`
  - `Cache-Control: private, no-store`
  - `Set-Cookie: __Host-session=<opaque-session-id>; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=1209600`
  - Body (`SessionDto`):
    ```json
    {
      "userId": "018f98a2-3f12-7890-a123-456789abcdef",
      "expiresAt": "2026-11-15T20:00:00Z",
      "csrfToken": "session-bound-csrf-token-value"
    }
    ```
- **Error Responses:**
  - `401 Unauthorized` (`INVALID_CREDENTIALS`):
    ```json
    {
      "type": "https://errors.sonder.platform/invalid-credentials",
      "title": "Invalid Credentials",
      "status": 401,
      "detail": "Invalid email or password.",
      "code": "INVALID_CREDENTIALS"
    }
    ```
  - `403 Forbidden` (`EMAIL_VERIFICATION_REQUIRED`):
    ```json
    {
      "type": "https://errors.sonder.platform/email-verification-required",
      "title": "Email Verification Required",
      "status": 403,
      "detail": "Please verify your email address before logging in.",
      "code": "EMAIL_VERIFICATION_REQUIRED"
    }
    ```
  - `400 Bad Request` (`CSRF_TOKEN_INVALID`, `MUTATION_ID_REQUIRED`)

### 2.4. GET `/api/v1/me`
Retrieves current session identity and associated community memberships. Used for application bootstrap and session restoration.

- **Request:**
  - Method: `GET`
  - Headers: Standard fetch headers.
  - Credentials: `include`
- **Response (200 OK):**
  - Status: `200 OK`
  - `Content-Type: application/json`
  - `Cache-Control: private, no-store`
  - Body (`MeContextDto`):
    ```json
    {
      "user": {
        "id": "018f98a2-3f12-7890-a123-456789abcdef",
        "displayName": "Alex Morgan",
        "email": "alex.morgan@example.org",
        "avatarUrl": null
      },
      "communities": [
        {
          "communityId": "018f98a2-3f12-7890-b123-456789abcdef",
          "name": "Sonder Community",
          "membershipStatus": "ACTIVE",
          "isCommunityAdmin": true,
          "isDefaultCoordinator": false
        }
      ]
    }
    ```
- **Error Responses:**
  - `401 Unauthorized` (`UNAUTHENTICATED`):
    ```json
    {
      "type": "https://errors.sonder.platform/unauthenticated",
      "title": "Authentication Required",
      "status": 401,
      "detail": "Active session required.",
      "code": "UNAUTHENTICATED"
    }
    ```

### 2.5. POST `/api/v1/auth/logout`
Terminates the active session and invalidates the session cookie.

- **Request:**
  - Method: `POST`
  - Query Param (optional): `?all=true` (revokes all active sessions for the user)
  - Headers:
    - `X-CSRF-Token: <session-bound-csrf-token>` (Required)
    - `X-Mutation-Id: <uuidv7>` (Required)
  - Credentials: `include`
- **Response (204 No Content):**
  - Status: `204 No Content`
  - `Cache-Control: private, no-store`
  - `Set-Cookie: __Host-session=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`

---

## 3. Cookie & Security Specifications

1. **`__Host-session` Cookie:**
   - **Prefix:** `__Host-` is required to ensure the cookie cannot be overwritten by subdomains and must be sent over HTTPS.
   - **Path:** Must be `/`.
   - **Flags:** `HttpOnly`, `Secure`, `SameSite=Lax`.
   - **Payload:** Opaque cryptographically random identifier (never raw JWT or readable user identity).
2. **`__Host-auth-csrf` Cookie:**
   - **Prefix:** `__Host-`
   - **Flags:** `HttpOnly`, `Secure`, `SameSite=Lax`.
   - **Validation:** Double-submit cookie or encrypted hash bound to the `X-CSRF-Token` header.
3. **Idempotency & Replay Protection:**
   - The frontend generates and sends an RFC 9562 UUIDv7 in the `X-Mutation-Id` header for every mutating request (`POST`, `PUT`, `PATCH`, `DELETE`).
   - The backend must track seen mutation IDs within an idempotency cache window and return `409 AUTH_RESULT_NOT_REPLAYABLE` for duplicate auth mutation attempts.

---

## 4. Test Vectors & Backend Acceptance Criteria

| ID | Test Scenario | Expected Status | Required Backend Behavior |
|----|---------------|-----------------|---------------------------|
| **TC-BE-01** | `GET /api/v1/auth/csrf` (Pre-auth) | `200 OK` | Issues pre-auth CSRF token and sets `__Host-auth-csrf` cookie. |
| **TC-BE-02** | `POST /api/v1/auth/register` (New email) | `202 Accepted` | Persists registration intent, queues verification email. Indistinguishable response. |
| **TC-BE-03** | `POST /api/v1/auth/register` (Duplicate email) | `202 Accepted` | Does not expose account existence. May send password reset / notice email internally. |
| **TC-BE-04** | `POST /api/v1/auth/register` (Password < 8 chars) | `422 Unprocessable` | Returns `PASSWORD_TOO_WEAK` Problem details. |
| **TC-BE-05** | `POST /api/v1/auth/login` (Valid credentials) | `200 OK` | Sets `__Host-session`, returns `SessionDto` with fresh session CSRF token. |
| **TC-BE-06** | `POST /api/v1/auth/login` (Invalid credentials) | `401 Unauthorized` | Returns `INVALID_CREDENTIALS` Problem details. |
| **TC-BE-07** | `POST /api/v1/auth/login` (Unverified email) | `403 Forbidden` | Returns `EMAIL_VERIFICATION_REQUIRED` Problem details. |
| **TC-BE-08** | `POST /api/v1/auth/login` (Missing CSRF token) | `400 Bad Request` | Returns `CSRF_TOKEN_INVALID` Problem details. |
| **TC-BE-09** | `POST /api/v1/auth/login` (Missing Mutation-Id) | `400 Bad Request` | Returns `MUTATION_ID_REQUIRED` Problem details. |
| **TC-BE-10** | `GET /api/v1/me` (Active session cookie) | `200 OK` | Returns `MeContextDto` with user details and communities. |
| **TC-BE-11** | `GET /api/v1/me` (No cookie or expired session) | `401 Unauthorized` | Returns `UNAUTHENTICATED` Problem details. |
| **TC-BE-12** | `POST /api/v1/auth/logout` | `204 No Content` | Destroys server session, clears `__Host-session` with `Max-Age=0`. |

---

## 5. Verification Commands

The backend team can verify contract compatibility against the MSW mock definitions located at [`apps/web/src/mocks/handlers/auth.ts`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/mocks/handlers/auth.ts) and the Vitest test suite at [`apps/web/src/modules/auth/AuthFlow.test.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/auth/AuthFlow.test.tsx).
