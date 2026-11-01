import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server.js";
import { setMockSessionActive, resetAuthMockState } from "../../mocks/handlers/auth.js";
import { App } from "../../App.js";

describe("VS-01 Authentication & Session Spine Flows", () => {
  beforeEach(() => {
    resetAuthMockState();
  });

  describe("Protected Route & Session Restoration", () => {
    it("redirects unauthenticated users from protected route to /login", async () => {
      setMockSessionActive(false);

      render(<App initialEntries={["/"]} />);

      // Should show login screen after session check returns 401
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Sign in to your account" })).toBeInTheDocument();
      });

      expect(screen.getByLabelText("Email address")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
    });

    it("restores active session automatically on protected route", async () => {
      setMockSessionActive(true);

      render(<App initialEntries={["/"]} />);

      await waitFor(() => {
        expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
      });

      expect(screen.getByText("Sonder Community")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    });
  });

  describe("Login Flow", () => {
    it("validates empty fields on submission", async () => {
      setMockSessionActive(false);
      const user = userEvent.setup();

      render(<App initialEntries={["/login"]} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Sign in to your account" })).toBeInTheDocument();
      });

      const submitBtn = screen.getByRole("button", { name: "Sign in" });
      await user.click(submitBtn);

      expect(screen.getByText("Email address is required.")).toBeInTheDocument();
      expect(screen.getByText("Password is required.")).toBeInTheDocument();
    });

    it("validates invalid email format", async () => {
      setMockSessionActive(false);
      const user = userEvent.setup();

      render(<App initialEntries={["/login"]} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Sign in to your account" })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText("Email address"), "not-an-email");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.click(screen.getByRole("button", { name: "Sign in" }));

      expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument();
    });

    it("displays error alert on invalid credentials (401)", async () => {
      setMockSessionActive(false);
      const user = userEvent.setup();

      render(<App initialEntries={["/login"]} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Sign in to your account" })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText("Email address"), "alex.morgan@example.org");
      await user.type(screen.getByLabelText("Password"), "wrongpassword");
      await user.click(screen.getByRole("button", { name: "Sign in" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Invalid email or password. Please try again.");
    });

    it("displays error alert when email verification is required (403)", async () => {
      setMockSessionActive(false);
      const user = userEvent.setup();

      render(<App initialEntries={["/login"]} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Sign in to your account" })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText("Email address"), "unverified@example.org");
      await user.type(screen.getByLabelText("Password"), "validPassword123");
      await user.click(screen.getByRole("button", { name: "Sign in" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Email verification required. Please check your inbox before signing in.");
    });

    it("logs in successfully and transitions to application shell", async () => {
      setMockSessionActive(false);
      const user = userEvent.setup();

      render(<App initialEntries={["/login"]} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Sign in to your account" })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText("Email address"), "alex.morgan@example.org");
      await user.type(screen.getByLabelText("Password"), "correctpassword");
      await user.click(screen.getByRole("button", { name: "Sign in" }));

      await waitFor(() => {
        expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
      });

      expect(screen.getByText("(alex.morgan@example.org)")).toBeInTheDocument();
      expect(screen.getByText("Sonder Community")).toBeInTheDocument();
    });
  });

  describe("Registration Flow", () => {
    it("validates required fields and password length", async () => {
      const user = userEvent.setup();

      render(<App initialEntries={["/register"]} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
      });

      const submitBtn = screen.getByRole("button", { name: "Create account" });
      await user.click(submitBtn);

      expect(screen.getByText("Display name is required.")).toBeInTheDocument();
      expect(screen.getByText("Email address is required.")).toBeInTheDocument();
      expect(screen.getByText("Password is required.")).toBeInTheDocument();

      // Test short password
      await user.type(screen.getByLabelText("Display Name"), "Jordan Lee");
      await user.type(screen.getByLabelText("Email address"), "jordan@example.org");
      await user.type(screen.getByLabelText("Password"), "short");
      await user.click(submitBtn);

      expect(screen.getByText("Password must be at least 8 characters long.")).toBeInTheDocument();
    });

    it("completes registration and renders anti-enumeration accepted screen (202)", async () => {
      const user = userEvent.setup();

      render(<App initialEntries={["/register"]} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText("Display Name"), "Jordan Lee");
      await user.type(screen.getByLabelText("Email address"), "jordan.lee@example.org");
      await user.type(screen.getByLabelText("Password"), "strongPassword123!");
      await user.click(screen.getByRole("button", { name: "Create account" }));

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Registration Request Received" })).toBeInTheDocument();
      });

      expect(screen.getByRole("status")).toHaveTextContent(
        "If the request can be completed, instructions will be sent to the supplied address."
      );
      expect(screen.getByRole("link", { name: "Back to Sign in" })).toBeInTheDocument();
    });

    it("displays server validation problem error alert", async () => {
      server.use(
        http.post("/api/v1/auth/register", () => {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/validation-error",
              title: "Email Domain Blocked",
              status: 422,
              detail: "Registrations from disposable email providers are prohibited.",
              code: "DISPOSABLE_EMAIL_NOT_ALLOWED",
            },
            {
              status: 422,
              headers: { "Content-Type": "application/problem+json" },
            }
          );
        })
      );

      const user = userEvent.setup();

      render(<App initialEntries={["/register"]} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText("Display Name"), "Spam Bot");
      await user.type(screen.getByLabelText("Email address"), "bot@disposable.org");
      await user.type(screen.getByLabelText("Password"), "strongPassword123!");
      await user.click(screen.getByRole("button", { name: "Create account" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Registrations from disposable email providers are prohibited.");
    });
  });

  describe("Session Termination (Logout Flow)", () => {
    it("logs out user, clears session, and redirects to /login upon confirmed server invalidation", async () => {
      setMockSessionActive(true);
      const user = userEvent.setup();

      render(<App initialEntries={["/"]} />);

      await waitFor(() => {
        expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
      });

      const signOutBtn = screen.getByRole("button", { name: "Sign out" });
      await user.click(signOutBtn);

      // Should now be on the login screen
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Sign in to your account" })).toBeInTheDocument();
      });

      // User context must no longer be present
      expect(screen.queryByText("Alex Morgan")).not.toBeInTheDocument();
    });

    it("preserves authenticated session and displays retry path upon server rejection (500)", async () => {
      setMockSessionActive(true);
      const user = userEvent.setup();

      // Intercept logout to simulate server error
      let attemptCount = 0;
      server.use(
        http.post("/api/v1/auth/logout", () => {
          attemptCount++;
          if (attemptCount === 1) {
            return HttpResponse.json(
              {
                type: "https://errors.sonder.platform/server-error",
                title: "Server Error",
                status: 500,
                detail: "Database failure during session revocation.",
                code: "SERVER_ERROR",
              },
              {
                status: 500,
                headers: { "Content-Type": "application/problem+json" },
              }
            );
          }
          // Second attempt succeeds
          return new HttpResponse(null, { status: 204 });
        })
      );

      render(<App initialEntries={["/"]} />);

      await waitFor(() => {
        expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
      });

      const signOutBtn = screen.getByRole("button", { name: "Sign out" });
      await user.click(signOutBtn);

      // Verify user is NOT logged out and UI is not misleading
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Sign out failed: Database failure during session revocation.");
      expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
      expect(screen.getByText("Sonder Community")).toBeInTheDocument();

      // Verify retry button exists and works
      const retryBtn = screen.getByRole("button", { name: "Retry" });
      await user.click(retryBtn);

      // Upon successful retry, transition to /login
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Sign in to your account" })).toBeInTheDocument();
      });
      expect(screen.queryByText("Alex Morgan")).not.toBeInTheDocument();
    });

    it("preserves authenticated session and displays retry path upon network failure", async () => {
      setMockSessionActive(true);
      const user = userEvent.setup();

      server.use(
        http.post("/api/v1/auth/logout", () => {
          return HttpResponse.error();
        })
      );

      render(<App initialEntries={["/"]} />);

      await waitFor(() => {
        expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
      });

      const signOutBtn = screen.getByRole("button", { name: "Sign out" });
      await user.click(signOutBtn);

      // Verify user remains authenticated
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Sign out failed:");
      expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    });
  });

  describe("Fail-closed CSRF Protection", () => {
    it("handles CSRF rejection from server gracefully", async () => {
      server.use(
        http.post("/api/v1/auth/login", () => {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/csrf-error",
              title: "CSRF Invalid",
              status: 400,
              detail: "Missing or invalid CSRF token.",
              code: "CSRF_TOKEN_INVALID",
            },
            {
              status: 400,
              headers: { "Content-Type": "application/problem+json" },
            }
          );
        })
      );

      setMockSessionActive(false);
      const user = userEvent.setup();

      render(<App initialEntries={["/login"]} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Sign in to your account" })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText("Email address"), "alex.morgan@example.org");
      await user.type(screen.getByLabelText("Password"), "anyPassword123");
      await user.click(screen.getByRole("button", { name: "Sign in" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Missing or invalid CSRF token.");
    });

    it("blocks login and displays recoverable error when CSRF initialization fails", async () => {
      let loginCalls = 0;
      server.use(
        http.get("/api/v1/auth/csrf", () => {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/server-error",
              title: "Service Unavailable",
              status: 503,
              detail: "CSRF security service unavailable.",
              code: "SERVICE_UNAVAILABLE",
            },
            {
              status: 503,
              headers: { "Content-Type": "application/problem+json" },
            }
          );
        }),
        http.post("/api/v1/auth/login", () => {
          loginCalls++;
          return HttpResponse.json({ userId: "123" });
        })
      );

      setMockSessionActive(false);
      const user = userEvent.setup();

      render(<App initialEntries={["/login"]} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Sign in to your account" })).toBeInTheDocument();
      });

      // The initial fetchCsrfToken error is presented
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("CSRF security service unavailable.");

      // Attempting to submit anyway fails closed without sending the login request
      await user.type(screen.getByLabelText("Email address"), "alex.morgan@example.org");
      await user.type(screen.getByLabelText("Password"), "anyPassword123");
      await user.click(screen.getByRole("button", { name: "Sign in" }));

      expect(loginCalls).toBe(0);
    });

    it("blocks registration and displays recoverable error when CSRF initialization fails", async () => {
      let registerCalls = 0;
      server.use(
        http.get("/api/v1/auth/csrf", () => {
          return HttpResponse.error();
        }),
        http.post("/api/v1/auth/register", () => {
          registerCalls++;
          return HttpResponse.json({ accepted: true });
        })
      );

      const user = userEvent.setup();

      render(<App initialEntries={["/register"]} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText("Display Name"), "Jordan Lee");
      await user.type(screen.getByLabelText("Email address"), "jordan@example.org");
      await user.type(screen.getByLabelText("Password"), "strongPassword123!");
      await user.click(screen.getByRole("button", { name: "Create account" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Security initialization failed");
      expect(registerCalls).toBe(0);
    });

    it("blocks logout, preserves session and displays error when CSRF initialization fails before logout", async () => {
      setMockSessionActive(true);
      let logoutCalls = 0;

      // CSRF token retrieval fails
      server.use(
        http.get("/api/v1/auth/csrf", () => {
          return HttpResponse.error();
        }),
        http.post("/api/v1/auth/logout", () => {
          logoutCalls++;
          return new HttpResponse(null, { status: 204 });
        })
      );

      const user = userEvent.setup();

      render(<App initialEntries={["/"]} />);

      await waitFor(() => {
        expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
      });

      const signOutBtn = screen.getByRole("button", { name: "Sign out" });
      await user.click(signOutBtn);

      // Verify no insecure logout call occurred
      expect(logoutCalls).toBe(0);

      // User remains authenticated and error path is provided
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Sign out failed:");
      expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    });
  });
});
