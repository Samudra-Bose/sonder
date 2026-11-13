import React, { useState, useCallback, useRef } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/modules/auth";
import { ApiProblemError } from "@/lib/api-client";
import { useKeyboardShortcut } from "@/lib/keyboard";
import { WorkspaceProvider } from "@/modules/workspace";
import { OmnibarProvider, OmnibarModal } from "@/modules/omnibar";
import {
  TaskPeekDrawer,
  QuickTaskComposerProvider,
  QuickTaskComposer,
  useQuickTaskComposer,
  TaskUndoProvider,
  TaskUndoToast,
  TaskCloneProvider,
  TaskCloneToast,
} from "@/modules/tasks";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { MobileNavigation } from "./MobileNavigation";
import { MainContent } from "./MainContent";

const SIDEBAR_STORAGE_KEY = "sonder-sidebar-collapsed";

export interface AppShellProps {
  children?: React.ReactNode;
}

function AppShellContent({ children }: AppShellProps): React.JSX.Element {
  const { user, logout, clearError } = useAuth();
  const { open: openQuickComposer } = useQuickTaskComposer();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const [openTriggerEl, setOpenTriggerEl] = useState<HTMLElement | null>(null);

  // Responsive sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Mobile navigation drawer state
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const handleOpenMobileNav = useCallback((trigger?: HTMLElement) => {
    setOpenTriggerEl(trigger || null);
    setIsMobileNavOpen(true);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors in restricted sandbox
      }
      return next;
    });
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+B to toggle sidebar
  useKeyboardShortcut(
    {
      key: "b",
      mod: true,
      preventDefault: true,
    },
    toggleSidebar
  );

  const handleLogout = async (): Promise<void> => {
    setIsLoggingOut(true);
    setLogoutError(null);
    clearError();
    try {
      await logout();
    } catch (err) {
      const msg =
        err instanceof ApiProblemError
          ? err.detail || err.message
          : (err as Error).message || "Failed to confirm sign out with server. Please try again.";
      setLogoutError(msg);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-canvas)] text-[var(--text-primary)] transition-colors duration-150 pb-14 md:pb-0">
      {/* Top Application Header */}
      <AppHeader
        user={user}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        onOpenMobileNav={handleOpenMobileNav}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        menuTriggerRef={menuTriggerRef}
      />

      {/* Accessible Sign Out Error Alert with Retry Path */}
      {logoutError && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-[var(--feedback-danger-bg)] border-b border-[var(--border-strong)] px-4 py-2 text-xs text-[var(--feedback-danger-text)] flex items-center justify-between z-30"
        >
          <div className="flex items-center space-x-2">
            <span className="font-semibold">Sign out failed: </span>
            <span>{logoutError}</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="font-medium underline hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] rounded cursor-pointer"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => setLogoutError(null)}
              aria-label="Dismiss sign out error"
              className="text-[var(--feedback-danger-text)] hover:opacity-80 focus:outline-none font-bold text-sm cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Main Structural Body: Sidebar + Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Left Rail Sidebar */}
        <AppSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />

        {/* Dynamic Main Content Canvas */}
        <MainContent>
          {children ?? <Outlet />}
        </MainContent>

        {/* Task Peek Drawer (Desktop right-docked panel / Mobile bottom sheet) */}
        <TaskPeekDrawer />
      </div>

      {/* Mobile Navigation Drawer & Bottom Bar */}
      <MobileNavigation
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        onOpen={handleOpenMobileNav}
        user={user}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        triggerEl={openTriggerEl}
      />

      {/* Global Omnibar Command Palette Modal */}
      <OmnibarModal
        onToggleSidebar={toggleSidebar}
        onOpenQuickComposer={() => openQuickComposer()}
      />

      {/* Quick Task Composer Modal */}
      <QuickTaskComposer />

      {/* Task Undo Toast Spine */}
      <TaskUndoToast />

      {/* Task Clone Toast Spine */}
      <TaskCloneToast />

      {/* Semantic Footer (Visible on desktop/tablet) */}
      <footer
        role="contentinfo"
        className="h-8 border-t border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 hidden md:flex items-center justify-between text-xs text-[var(--text-muted)] select-none"
      >
        <span>Sonder Platform &copy; 2026</span>
        <span>Community Edition</span>
      </footer>
    </div>
  );
}

export function AppShell({ children }: AppShellProps): React.JSX.Element {
  return (
    <WorkspaceProvider>
      <OmnibarProvider>
        <QuickTaskComposerProvider>
          <TaskUndoProvider>
            <TaskCloneProvider>
              <AppShellContent>{children}</AppShellContent>
            </TaskCloneProvider>
          </TaskUndoProvider>
        </QuickTaskComposerProvider>
      </OmnibarProvider>
    </WorkspaceProvider>
  );
}
