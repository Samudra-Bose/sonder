import React from "react";
import { BrowserRouter, MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { AuthProvider, ProtectedRoute, LoginForm, RegisterForm } from "./modules/auth/index.js";
import { ThemeProvider } from "./lib/theme.js";
import {
  AppShell,
  DashboardView,
  InboxPlaceholderView,
} from "./modules/app-shell/index.js";
import { MyWorkView } from "./modules/my-work/index.js";
import { WorkspaceTasksView } from "./modules/tasks/index.js";

export { AppShell };

const defaultAppQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function SafeQueryClientProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  let hasClient = false;
  try {
    hasClient = !!useQueryClient();
  } catch {
    hasClient = false;
  }
  if (hasClient) {
    return <>{children}</>;
  }
  return (
    <QueryClientProvider client={defaultAppQueryClient}>
      {children}
    </QueryClientProvider>
  );
}

export interface AppProps {
  initialEntries?: string[];
}

export function App({ initialEntries }: AppProps = {}): React.JSX.Element {
  const Router = initialEntries ? MemoryRouter : BrowserRouter;
  const routerProps = initialEntries ? { initialEntries } : {};

  return (
    <SafeQueryClientProvider>
      <ThemeProvider>
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
              >
                <Route index element={<DashboardView />} />
                <Route path="my-work" element={<MyWorkView />} />
                <Route path="inbox" element={<InboxPlaceholderView />} />
                <Route path="list" element={<WorkspaceTasksView defaultView="list" />} />
                <Route path="board" element={<WorkspaceTasksView defaultView="board" />} />
                <Route path="calendar" element={<WorkspaceTasksView defaultView="calendar" />} />
                <Route path="workspaces/:workspaceId" element={<Navigate to="list" replace />} />
                <Route path="workspaces/:workspaceId/list" element={<WorkspaceTasksView defaultView="list" />} />
                <Route path="workspaces/:workspaceId/board" element={<WorkspaceTasksView defaultView="board" />} />
                <Route path="workspaces/:workspaceId/calendar" element={<WorkspaceTasksView defaultView="calendar" />} />
                <Route path="c/:communityId/w/:workspaceId" element={<Navigate to="list" replace />} />
                <Route path="c/:communityId/w/:workspaceId/list" element={<WorkspaceTasksView defaultView="list" />} />
                <Route path="c/:communityId/w/:workspaceId/board" element={<WorkspaceTasksView defaultView="board" />} />
                <Route path="c/:communityId/w/:workspaceId/calendar" element={<WorkspaceTasksView defaultView="calendar" />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </SafeQueryClientProvider>
  );
}
