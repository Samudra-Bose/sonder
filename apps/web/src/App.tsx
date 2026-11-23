import React, { Suspense } from "react";
import { BrowserRouter, MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { AuthProvider, ProtectedRoute } from "./modules/auth/index.js";
import { ThemeProvider } from "./lib/theme.js";
import { AppShell } from "./modules/app-shell/index.js";
import { RouteLoadingFallback } from "./components/RouteLoadingFallback.js";

export { AppShell };

// Measured route-level dynamic code splitting (Workstream C)
const DashboardView = React.lazy(() =>
  import("./modules/app-shell/index.js").then((m) => ({ default: m.DashboardView }))
);
const MyWorkView = React.lazy(() =>
  import("./modules/my-work/index.js").then((m) => ({ default: m.MyWorkView }))
);
const InboxView = React.lazy(() =>
  import("./modules/notifications/index.js").then((m) => ({ default: m.InboxView }))
);
const WorkspaceTasksView = React.lazy(() =>
  import("./modules/tasks/index.js").then((m) => ({ default: m.WorkspaceTasksView }))
);
const WorkspaceTrashView = React.lazy(() =>
  import("./modules/tasks/index.js").then((m) => ({ default: m.WorkspaceTrashView }))
);
const WorkspaceSettingsLayout = React.lazy(() =>
  import("./modules/workspace/settings/index.js").then((m) => ({ default: m.WorkspaceSettingsLayout }))
);
const LoginForm = React.lazy(() =>
  import("./modules/auth/index.js").then((m) => ({ default: m.LoginForm }))
);
const RegisterForm = React.lazy(() =>
  import("./modules/auth/index.js").then((m) => ({ default: m.RegisterForm }))
);

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
            <Suspense fallback={<RouteLoadingFallback />}>
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
                  <Route path="inbox" element={<InboxView />} />
                  <Route path="list" element={<WorkspaceTasksView defaultView="list" />} />
                  <Route path="board" element={<WorkspaceTasksView defaultView="board" />} />
                  <Route path="calendar" element={<WorkspaceTasksView defaultView="calendar" />} />
                  <Route path="timeline" element={<WorkspaceTasksView defaultView="timeline" />} />
                  <Route path="workspaces/:workspaceId" element={<Navigate to="list" replace />} />
                  <Route path="workspaces/:workspaceId/list" element={<WorkspaceTasksView defaultView="list" />} />
                  <Route path="workspaces/:workspaceId/board" element={<WorkspaceTasksView defaultView="board" />} />
                  <Route path="workspaces/:workspaceId/calendar" element={<WorkspaceTasksView defaultView="calendar" />} />
                  <Route path="workspaces/:workspaceId/timeline" element={<WorkspaceTasksView defaultView="timeline" />} />
                  <Route path="workspaces/:workspaceId/trash" element={<WorkspaceTrashView />} />
                  <Route path="workspaces/:workspaceId/settings" element={<WorkspaceSettingsLayout />} />
                  <Route path="workspaces/:workspaceId/settings/:category" element={<WorkspaceSettingsLayout />} />
                  <Route path="trash" element={<WorkspaceTrashView />} />
                  <Route path="settings" element={<WorkspaceSettingsLayout />} />
                  <Route path="settings/:category" element={<WorkspaceSettingsLayout />} />
                  <Route path="c/:communityId/w/:workspaceId" element={<Navigate to="list" replace />} />
                  <Route path="c/:communityId/w/:workspaceId/list" element={<WorkspaceTasksView defaultView="list" />} />
                  <Route path="c/:communityId/w/:workspaceId/board" element={<WorkspaceTasksView defaultView="board" />} />
                  <Route path="c/:communityId/w/:workspaceId/calendar" element={<WorkspaceTasksView defaultView="calendar" />} />
                  <Route path="c/:communityId/w/:workspaceId/timeline" element={<WorkspaceTasksView defaultView="timeline" />} />
                  <Route path="c/:communityId/w/:workspaceId/trash" element={<WorkspaceTrashView />} />
                  <Route path="c/:communityId/w/:workspaceId/settings" element={<WorkspaceSettingsLayout />} />
                  <Route path="c/:communityId/w/:workspaceId/settings/:category" element={<WorkspaceSettingsLayout />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </SafeQueryClientProvider>
  );
}
