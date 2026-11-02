import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth.js";
import { ApiProblemError } from "../../lib/api-client.js";
import { Button } from "../../components/ui/Button.js";
import { Feedback } from "../../components/ui/Feedback.js";

export function LoginForm(): React.JSX.Element {
  const { login, status, error: contextError, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to target or home
  useEffect(() => {
    if (status === "authenticated") {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [status, navigate, location.state]);

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    clearError();
    setSubmitError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiProblemError) {
        if (err.code === "EMAIL_VERIFICATION_REQUIRED") {
          setSubmitError("Email verification required. Please check your inbox before signing in.");
        } else if (err.code === "INVALID_CREDENTIALS" || err.status === 401) {
          setSubmitError("Invalid email or password. Please try again.");
        } else if (err.code === "CSRF_INITIALIZATION_FAILED" || err.code === "CSRF_TOKEN_REQUIRED") {
          setSubmitError(err.detail || "Security initialization failed. Please refresh the page and try again.");
        } else {
          setSubmitError(err.detail || err.message || "Sign in failed. Please try again.");
        }
      } else {
        setSubmitError((err as Error).message || "An unexpected error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = submitError || contextError?.detail;

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[var(--surface-canvas)] text-[var(--text-primary)] transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <span className="font-bold text-2xl tracking-tight text-[var(--brand-accent-text)]">Sonder</span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)]">Sign in to your account</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Or{" "}
          <Link
            to="/register"
            className="font-medium text-[var(--brand-accent-text)] hover:underline focus:outline-none focus-ring rounded"
          >
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[var(--surface-card)] py-8 px-6 shadow-sm border border-[var(--border-subtle)] rounded-lg sm:px-10">
          {displayError && (
            <div className="mb-6">
              <Feedback variant="danger">
                <span>{displayError}</span>
              </Feedback>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-[var(--text-secondary)]">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  className={`block w-full px-3 py-2 border rounded-md shadow-xs text-sm bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus-ring transition-colors ${
                    fieldErrors.email ? "border-[var(--feedback-danger-text)]" : "border-[var(--border-control)]"
                  }`}
                  placeholder="name@example.org"
                  disabled={isSubmitting}
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" className="mt-1.5 text-xs text-[var(--feedback-danger-text)] font-medium">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-[var(--text-secondary)]">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  className={`block w-full px-3 py-2 border rounded-md shadow-xs text-sm bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus-ring transition-colors ${
                    fieldErrors.password ? "border-[var(--feedback-danger-text)]" : "border-[var(--border-control)]"
                  }`}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                />
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="mt-1.5 text-xs text-[var(--feedback-danger-text)] font-medium">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div>
              <Button
                type="submit"
                variant="accent"
                fullWidth
                size="md"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                className="w-full"
              >
                Sign in
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border-subtle)]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[var(--surface-card)] px-2 text-[var(--text-muted)]">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <a
                href="/api/v1/auth/oauth/google/start?returnTo=/"
                className="w-full flex justify-center items-center py-2 px-4 border border-[var(--border-control)] rounded-md shadow-xs text-sm font-medium text-[var(--text-primary)] bg-[var(--surface-card)] hover:bg-[var(--surface-muted)] focus:outline-none focus-ring transition-colors"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                Google
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
