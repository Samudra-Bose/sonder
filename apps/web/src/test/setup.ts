import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "../mocks/server.js";
import { resetAuthMockState } from "../mocks/handlers/auth.js";

// Establish API mocking before all tests.
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

// Reset any request handlers that may be added during individual tests,
// reset mock authentication state, and clean up React DOM trees.
afterEach(() => {
  server.resetHandlers();
  resetAuthMockState();
  cleanup();
});

// Clean up after the tests are finished.
afterAll(() => {
  server.close();
});
