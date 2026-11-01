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

  // Fetch or refresh CSRF token (session-bound or pre-auth)
  const fetchCsrfToken = useCallback(async (): Promise<string> => {
    try {
      const res = await apiRequest<ApiSchema<"CsrfTokenDto">>("/auth/csrf");
      setCsrfToken(res.csrfToken);
      return res.csrfToken;
    } catch (err) {
      console.warn("Failed to fetch CSRF token:", err);
      return "";
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
      await fetchCsrfToken();
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
        token = await fetchCsrfToken();
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
        token = await fetchCsrfToken();
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
      try {
        await apiRequest<void>(`/auth/logout${all ? "?all=true" : ""}`, {
          method: "POST",
          csrfToken,
        });
      } catch (err) {
        console.warn("Logout request failed:", err);
      } finally {
        setUser(null);
        setCommunities([]);
        setStatus("unauthenticated");
        // Get fresh pre-auth CSRF token for next sign-in
        await fetchCsrfToken();
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
