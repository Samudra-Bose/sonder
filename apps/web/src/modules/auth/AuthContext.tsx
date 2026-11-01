import React, { createContext, useCallback, useEffect, useState } from "react";
import type { ApiSchema } from "@sonder/contracts";
import { apiRequest, ApiProblemError } from "../../lib/api-client.js";

export interface AuthContextType {
  user: ApiSchema<"MeContextDto">["user"] | null;
  communities: ApiSchema<"MeContextDto">["communities"];
  csrfToken: string | null;
  status: "loading" | "authenticated" | "unauthenticated";
  error: ApiProblemError | null;
  login: (credentials: ApiSchema<"LoginRequest">) => Promise<void>;
  register: (payload: ApiSchema<"RegisterRequest">) => Promise<ApiSchema<"AuthActionAcceptedDto">>;
  logout: (all?: boolean) => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<ApiSchema<"MeContextDto">["user"] | null>(null);
  const [communities, setCommunities] = useState<ApiSchema<"MeContextDto">["communities"]>([]);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [error, setError] = useState<ApiProblemError | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Fetch or refresh CSRF token (session-bound or pre-auth). Fails closed on error.
  const fetchCsrfToken = useCallback(async (): Promise<string> => {
    try {
      const res = await apiRequest<ApiSchema<"CsrfTokenDto">>("/auth/csrf");
      if (!res.csrfToken || !res.csrfToken.trim()) {
        throw new ApiProblemError(500, {
          type: "https://errors.sonder.platform/csrf-initialization-error",
          title: "Invalid CSRF Token",
          status: 500,
          detail: "Server returned an empty CSRF token. Security session cannot be established.",
          code: "CSRF_INITIALIZATION_FAILED",
        });
      }
      setCsrfToken(res.csrfToken);
      return res.csrfToken;
    } catch (err) {
      setCsrfToken(null);
      const problemErr =
        err instanceof ApiProblemError
          ? err
          : new ApiProblemError(500, {
              type: "https://errors.sonder.platform/csrf-initialization-error",
              title: "Security Initialization Failed",
              status: 500,
              detail: "Security initialization failed. Please refresh or try again.",
              code: "CSRF_INITIALIZATION_FAILED",
            });
      throw problemErr;
    }
  }, []);

  // Check current session via GET /me
  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      const me = await apiRequest<ApiSchema<"MeContextDto">>("/me");
      setUser(me.user);
      setCommunities(me.communities);
      setStatus("authenticated");
    } catch (err) {
      setUser(null);
      setCommunities([]);
      setStatus("unauthenticated");
      if (err instanceof ApiProblemError && err.status !== 401) {
        setError(err);
      }
    }
  }, []);

  // Bootstrap session and CSRF token on startup
  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      try {
        await fetchCsrfToken();
      } catch (err) {
        if (mounted) {
          const initError =
            err instanceof ApiProblemError
              ? err
              : new ApiProblemError(500, {
                  type: "https://errors.sonder.platform/csrf-initialization-error",
                  title: "Security Initialization Failed",
                  status: 500,
                  detail: "Security initialization failed. State-changing operations are blocked until a secure token is established.",
                  code: "CSRF_INITIALIZATION_FAILED",
                });
          setError(initError);
        }
      }
      if (mounted) {
        await refreshSession();
      }
    }
    bootstrap();
    return () => {
      mounted = false;
    };
  }, [fetchCsrfToken, refreshSession]);

  const login = useCallback(
    async (credentials: ApiSchema<"LoginRequest">): Promise<void> => {
      setError(null);
      let token = csrfToken;
      if (!token) {
        try {
          token = await fetchCsrfToken();
        } catch (err) {
          const initErr =
            err instanceof ApiProblemError
              ? err
              : new ApiProblemError(500, {
                  type: "https://errors.sonder.platform/csrf-initialization-error",
                  title: "Security Initialization Failed",
                  status: 500,
                  detail: "CSRF initialization failed. Cannot send login request.",
                  code: "CSRF_INITIALIZATION_FAILED",
                });
          setError(initErr);
          throw initErr;
        }
      }

      if (!token || !token.trim()) {
        const missingErr = new ApiProblemError(400, {
          type: "https://errors.sonder.platform/csrf-error",
          title: "CSRF Token Required",
          status: 400,
          detail: "A valid CSRF token is required for login.",
          code: "CSRF_TOKEN_REQUIRED",
        });
        setError(missingErr);
        throw missingErr;
      }

      try {
        const session = await apiRequest<ApiSchema<"SessionDto">>("/auth/login", {
          method: "POST",
          body: JSON.stringify(credentials),
          csrfToken: token,
        });

        // Store session-bound CSRF token in memory
        setCsrfToken(session.csrfToken);

        // Fetch fresh user and community context
        await refreshSession();
      } catch (err) {
        if (err instanceof ApiProblemError) {
          setError(err);
        } else {
          setError(
            new ApiProblemError(500, {
              type: "https://errors.sonder.platform/network-error",
              title: "Network Error",
              status: 500,
              detail: (err as Error).message || "An unexpected error occurred during login.",
            })
          );
        }
        throw err;
      }
    },
    [csrfToken, fetchCsrfToken, refreshSession]
  );

  const register = useCallback(
    async (payload: ApiSchema<"RegisterRequest">): Promise<ApiSchema<"AuthActionAcceptedDto">> => {
      setError(null);
      let token = csrfToken;
      if (!token) {
        try {
          token = await fetchCsrfToken();
        } catch (err) {
          const initErr =
            err instanceof ApiProblemError
              ? err
              : new ApiProblemError(500, {
                  type: "https://errors.sonder.platform/csrf-initialization-error",
                  title: "Security Initialization Failed",
                  status: 500,
                  detail: "CSRF initialization failed. Cannot send registration request.",
                  code: "CSRF_INITIALIZATION_FAILED",
                });
          setError(initErr);
          throw initErr;
        }
      }

      if (!token || !token.trim()) {
        const missingErr = new ApiProblemError(400, {
          type: "https://errors.sonder.platform/csrf-error",
          title: "CSRF Token Required",
          status: 400,
          detail: "A valid CSRF token is required for registration.",
          code: "CSRF_TOKEN_REQUIRED",
        });
        setError(missingErr);
        throw missingErr;
      }

      try {
        return await apiRequest<ApiSchema<"AuthActionAcceptedDto">>("/auth/register", {
          method: "POST",
          body: JSON.stringify(payload),
          csrfToken: token,
        });
      } catch (err) {
        if (err instanceof ApiProblemError) {
          setError(err);
        } else {
          setError(
            new ApiProblemError(500, {
              type: "https://errors.sonder.platform/network-error",
              title: "Network Error",
              status: 500,
              detail: (err as Error).message || "An unexpected error occurred during registration.",
            })
          );
        }
        throw err;
      }
    },
    [csrfToken, fetchCsrfToken]
  );

  const logout = useCallback(
    async (all: boolean = false): Promise<void> => {
      setError(null);
      let token = csrfToken;
      if (!token) {
        try {
          token = await fetchCsrfToken();
        } catch (err) {
          const initErr =
            err instanceof ApiProblemError
              ? err
              : new ApiProblemError(500, {
                  type: "https://errors.sonder.platform/csrf-initialization-error",
                  title: "Security Initialization Failed",
                  status: 500,
                  detail: "CSRF initialization failed. Cannot safely send logout request.",
                  code: "CSRF_INITIALIZATION_FAILED",
                });
          setError(initErr);
          throw initErr;
        }
      }

      if (!token || !token.trim()) {
        const missingErr = new ApiProblemError(400, {
          type: "https://errors.sonder.platform/csrf-error",
          title: "CSRF Token Required",
          status: 400,
          detail: "A valid CSRF token is required for logout.",
          code: "CSRF_TOKEN_REQUIRED",
        });
        setError(missingErr);
        throw missingErr;
      }

      try {
        await apiRequest<void>(`/auth/logout${all ? "?all=true" : ""}`, {
          method: "POST",
          csrfToken: token,
        });

        // ONLY clear local authentication state upon confirmed server invalidation
        setUser(null);
        setCommunities([]);
        setStatus("unauthenticated");
        setCsrfToken(null);

        // Fetch fresh pre-auth CSRF token for subsequent sign-in (best effort)
        try {
          await fetchCsrfToken();
        } catch {
          // Re-attempted upon next authentication action
        }
      } catch (err) {
        // DO NOT clear user/session state on server rejection or network failure
        const logoutErr =
          err instanceof ApiProblemError
            ? err
            : new ApiProblemError(500, {
                type: "https://errors.sonder.platform/logout-error",
                title: "Logout Failed",
                status: 500,
                detail: (err as Error).message || "Failed to confirm session termination with server.",
                code: "LOGOUT_FAILED",
              });
        setError(logoutErr);
        throw logoutErr;
      }
    },
    [csrfToken, fetchCsrfToken]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        communities,
        csrfToken,
        status,
        error,
        login,
        register,
        logout,
        refreshSession,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
