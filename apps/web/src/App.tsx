import React from "react";
import { BrowserRouter, MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, ProtectedRoute, LoginForm, RegisterForm } from "./modules/auth/index.js";
import { ThemeProvider } from "./lib/theme.js";
import {
  AppShell,
  DashboardView,
  MyWorkPlaceholderView,
  InboxPlaceholderView,
} from "./modules/app-shell/index.js";

export { AppShell };

export interface AppProps {
  initialEntries?: string[];
}

export function App({ initialEntries }: AppProps = {}): React.JSX.Element {
  const Router = initialEntries ? MemoryRouter : BrowserRouter;
  const routerProps = initialEntries ? { initialEntries } : {};

  return (
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
              <Route path="my-work" element={<MyWorkPlaceholderView />} />
              <Route path="inbox" element={<InboxPlaceholderView />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
