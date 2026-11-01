import React from "react";
import { useQuery } from "@tanstack/react-query";
import type { ApiSchema } from "@sonder/contracts";

async function fetchMe(): Promise<ApiSchema<"MeContextDto">> {
  const res = await fetch("/api/v1/me");
  if (!res.ok) {
    throw new Error(`Failed to fetch current user context: ${res.statusText}`);
  }
  return res.json() as Promise<ApiSchema<"MeContextDto">>;
}

export function App(): React.JSX.Element {
  const { data: me, isLoading, error } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
    retry: false,
  });

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
          {isLoading && (
            <span className="text-slate-400 animate-pulse">Loading context...</span>
          )}
          {error && (
            <span className="text-amber-700 text-xs bg-amber-50 px-2 py-1 rounded">
              Mock session offline
            </span>
          )}
          {me && (
            <div className="flex items-center space-x-2">
              <span className="font-medium text-slate-700">{me.user.displayName}</span>
              <span className="text-xs text-slate-500">({me.user.email})</span>
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

          {me && (
            <div className="text-left bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-700 space-y-1">
              <p>
                <strong>Active Community:</strong> {me.communities[0]?.name ?? "None"}
              </p>
              <p>
                <strong>Status:</strong> {me.communities[0]?.membershipStatus ?? "UNKNOWN"}
              </p>
              <p>
                <strong>Admin Privileges:</strong>{" "}
                {me.communities[0]?.isCommunityAdmin ? "Yes" : "No"}
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
