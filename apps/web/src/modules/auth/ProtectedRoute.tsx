import React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "./useAuth.js";

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

/**
 * Route guard that requires an active session.
 * - Shows an accessible loading indicator while validating session context via GET /me
 * - Redirects unauthenticated users to /login preserving the requested location
 * - Renders child routes once authenticated
 */
export function ProtectedRoute({ children }: ProtectedRouteProps): React.JSX.Element {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600"
      >
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
