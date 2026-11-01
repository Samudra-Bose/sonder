import React, { useState } from "react";
import { BrowserRouter, MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, ProtectedRoute, LoginForm, RegisterForm } from "./modules/auth/index.js";

export function AppShell(): React.JSX.Element {
  const { user, communities, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async (): Promise<void> => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Global Application Shell Header */}
      <header
        role="banner"
        className="h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between shadow-xs"
      >
        <div className="flex items-center space-x-3">
          <span className="font-bold text-lg tracking-tight text-blue-600">
            Sonder
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
            Baseline v1.5.0
          </span>
        </div>

        <div className="flex items-center space-x-4 text-sm">
          {user && (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-slate-700">{user.displayName}</span>
                <span className="text-xs text-slate-500">({user.email})</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-label="Sign out"
                className="text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded px-2.5 py-1 font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main
        role="main"
        className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col justify-center items-center text-center"
      >
        <div className="max-w-md bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Community Work Management
          </h1>
          <p className="text-sm text-slate-600 mb-4">
            Sonder application shell and contract type generation harness initialized.
          </p>

          {user && (
            <div className="text-left bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-700 space-y-1">
              <p>
                <strong>Active Community:</strong> {communities[0]?.name ?? "None"}
              </p>
              <p>
                <strong>Status:</strong> {communities[0]?.membershipStatus ?? "UNKNOWN"}
              </p>
              <p>
                <strong>Admin Privileges:</strong>{" "}
                {communities[0]?.isCommunityAdmin ? "Yes" : "No"}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer
        role="contentinfo"
        className="h-10 border-t border-slate-200 bg-white px-4 flex items-center justify-between text-xs text-slate-500"
      >
        <span>Sonder Platform &copy; 2026</span>
        <span>OpenAPI 0.3.20-draft (Unfrozen)</span>
      </footer>
    </div>
  );
}

export interface AppProps {
  initialEntries?: string[];
}

export function App({ initialEntries }: AppProps = {}): React.JSX.Element {
  const Router = initialEntries ? MemoryRouter : BrowserRouter;
  const routerProps = initialEntries ? { initialEntries } : {};

  return (
    <AuthProvider>
      <Router {...routerProps}>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
