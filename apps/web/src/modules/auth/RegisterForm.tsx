import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "./useAuth.js";
import { ApiProblemError } from "../../lib/api-client.js";
import { Button } from "../../components/ui/Button.js";
import { Feedback } from "../../components/ui/Feedback.js";
import type { ApiSchema } from "@sonder/contracts";

export function RegisterForm(): React.JSX.Element {
  const { register, error: contextError } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ displayName?: string; email?: string; password?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedResponse, setAcceptedResponse] = useState<ApiSchema<"AuthActionAcceptedDto"> | null>(null);

  const validate = (): boolean => {
    const errors: { displayName?: string; email?: string; password?: string } = {};

    if (!displayName.trim()) {
      errors.displayName = "Display name is required.";
    }

    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters long.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
      });
      setAcceptedResponse(res);
    } catch (err) {
      if (err instanceof ApiProblemError) {
        if (err.code === "CSRF_INITIALIZATION_FAILED" || err.code === "CSRF_TOKEN_REQUIRED") {
          setSubmitError(err.detail || "Security initialization failed. Please refresh the page and try again.");
        } else {
          setSubmitError(err.detail || err.message || "Registration failed. Please try again.");
        }
      } else {
        setSubmitError((err as Error).message || "An unexpected error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = submitError || contextError?.detail;

  // If successfully registered, show anti-enumeration confirmation screen
  if (acceptedResponse) {
    return (
      <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[var(--surface-canvas)] text-[var(--text-primary)] transition-colors">
        <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
          <div className="bg-[var(--surface-card)] py-8 px-6 shadow-sm border border-[var(--border-subtle)] rounded-lg sm:px-10 text-center text-[var(--text-primary)]">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-[var(--feedback-success-bg)] border border-[var(--feedback-success-border)] text-[var(--feedback-success-text)] mb-4">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] mb-2">Registration Request Received</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4" role="status">
              {acceptedResponse.message}
            </p>
            <p className="text-xs text-[var(--text-muted)] mb-6">
              Please check your email inbox to verify your account before signing in.
            </p>
            <Link
              to="/login"
              className="inline-flex justify-center items-center w-full py-2 px-4 rounded-md shadow-xs text-sm font-medium text-[var(--brand-accent-btn-text)] bg-[var(--brand-accent-btn-bg)] hover:bg-[var(--brand-accent-hover)] focus:outline-none focus-ring transition-colors"
            >
              Back to Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[var(--surface-canvas)] text-[var(--text-primary)] transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <span className="font-bold text-2xl tracking-tight text-[var(--brand-accent-text)]">Sonder</span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)]">Create your account</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-[var(--brand-accent-text)] hover:underline focus:outline-none focus-ring rounded"
          >
            Sign in
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
              <label htmlFor="register-displayName" className="block text-sm font-medium text-[var(--text-secondary)]">
                Display Name
              </label>
              <div className="mt-1">
                <input
                  id="register-displayName"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  required
                  aria-invalid={!!fieldErrors.displayName}
                  aria-describedby={fieldErrors.displayName ? "displayName-error" : undefined}
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (fieldErrors.displayName) {
                      setFieldErrors((prev) => ({ ...prev, displayName: undefined }));
                    }
                  }}
                  className={`block w-full px-3 py-2 border rounded-md shadow-xs text-sm bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus-ring transition-colors ${
                    fieldErrors.displayName ? "border-[var(--feedback-danger-text)]" : "border-[var(--border-control)]"
                  }`}
                  placeholder="Alex Morgan"
                  disabled={isSubmitting}
                />
              </div>
              {fieldErrors.displayName && (
                <p id="displayName-error" className="mt-1.5 text-xs text-[var(--feedback-danger-text)] font-medium">
                  {fieldErrors.displayName}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-[var(--text-secondary)]">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="register-email"
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
              <label htmlFor="register-password" className="block text-sm font-medium text-[var(--text-secondary)]">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="register-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
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
                  placeholder="At least 8 characters"
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
                Create account
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
