import React, { useEffect, useState, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  X,
  Sparkles,
  Sun,
  Moon,
  Menu,
  CheckCircle2,
  Inbox,
  LogOut,
} from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Dialog, DrawerContent, DialogClose } from "@/components/ui/Dialog";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { MobileWorkspaceSelector } from "@/modules/workspace";
import { MobileOmnibarTrigger } from "@/modules/omnibar";
import {
  PRIMARY_NAV_ITEMS,
  type NavItem,
} from "./navigation";
import type { AuthUser } from "./AppHeader";

export interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: (triggerEl?: HTMLElement) => void;
  user: AuthUser | null;
  onLogout: () => void;
  isLoggingOut: boolean;
  triggerEl?: HTMLElement | null;
}

export function MobileNavigation({
  isOpen,
  onClose,
  onOpen,
  user,
  onLogout,
  isLoggingOut,
  triggerEl,
}: MobileNavigationProps): React.JSX.Element {
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const isNavigatingRef = useRef(false);

  // Close drawer automatically on route navigation and move focus to destination page
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      setIsNavigating(false);

      const focusDestination = () => {
        const main = document.getElementById("main-content");
        main?.focus();
      };

      if (typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(focusDestination);
      } else {
        setTimeout(focusDestination, 0);
      }
    }
  }, [location.pathname]);

  const handleNavLinkClick = (href: string) => {
    isNavigatingRef.current = true;
    setIsNavigating(true);
    onClose();

    if (location.pathname === href) {
      const focusDestination = () => {
        const main = document.getElementById("main-content");
        main?.focus();
        isNavigatingRef.current = false;
        setIsNavigating(false);
      };

      if (typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(focusDestination);
      } else {
        setTimeout(focusDestination, 0);
      }
    }
  };

  const finalFocusConfig = isNavigating
    ? false
    : triggerEl
    ? { current: triggerEl }
    : true;

  return (
    <>
      {/* Base UI Powered Mobile Drawer Dialog */}
      <Dialog
        open={isOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            onClose();
          }
        }}
      >
        <DrawerContent
          aria-label="Navigation drawer"
          side="left"
          finalFocus={finalFocusConfig}
          className="md:hidden"
        >
          {/* Drawer Header */}
          <div className="h-14 px-4 border-b border-[var(--border-subtle)] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--brand-accent-btn-bg)] flex items-center justify-center text-[var(--brand-accent-btn-text)] shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-bold text-sm tracking-tight text-[var(--brand-accent-text)]">
                Sonder
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] font-medium border border-[var(--border-subtle)]">
                v1.5.0
              </span>
            </div>

            <DialogClose
              render={
                <IconButton
                  icon={<X className="h-4 w-4" />}
                  aria-label="Close navigation menu"
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                  className="min-w-[44px] min-h-[44px]"
                />
              }
            />
          </div>

          {/* Navigation Links with 44px Touch Targets */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Quick Omnibar Entry Point */}
            <div>
              <MobileOmnibarTrigger variant="drawer-button" onClick={onClose} />
            </div>

            <div>
              <h3 className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Navigation
              </h3>
              <nav aria-label="Mobile Navigation Links" className="space-y-1">
                {PRIMARY_NAV_ITEMS.map((item: NavItem) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.id}
                      to={item.href}
                      onClick={() => handleNavLinkClick(item.href)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3 rounded-lg text-sm font-medium min-h-[44px] transition-colors focus-ring",
                          isActive
                            ? "bg-[var(--surface-muted)] text-[var(--brand-accent-text)] font-semibold border-l-3 border-[var(--brand-accent-btn-bg)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                        )
                      }
                      end={item.href === "/"}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Workspaces Section (VS-02C Workspace Switcher) */}
            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <div className="px-2 pb-1.5 flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Workspaces
                </h3>
              </div>
              <MobileWorkspaceSelector onWorkspaceSelected={onClose} />
            </div>
          </div>

          {/* User Profile & Sign Out Footer in Drawer */}
          {user && (
            <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] space-y-3">
              <div className="flex items-center space-x-3">
                <Avatar name={user.displayName} size="md" />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {user.displayName}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-ring rounded px-2 py-1 min-h-[44px]"
                  aria-label={`Toggle theme (currently ${theme})`}
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Moon className="h-4 w-4 text-[var(--text-secondary)]" />
                  )}
                  <span>{theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light"}</span>
                </button>

                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={onLogout}
                  disabled={isLoggingOut}
                  className="text-xs min-h-[44px] px-3"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" />
                  <span>{isLoggingOut ? "Signing out..." : "Sign out"}</span>
                </Button>
              </div>
            </div>
          )}
        </DrawerContent>
      </Dialog>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 h-14 bg-[var(--surface-card)] border-t border-[var(--border-subtle)] z-30 md:hidden flex items-center justify-around px-2 select-none shadow-lg pb-[env(safe-area-inset-bottom,0px)]"
      >
        <NavLink
          to="/my-work"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-md transition-colors focus-ring",
              isActive
                ? "text-[var(--brand-accent-text)] font-semibold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )
          }
          aria-label="My Work"
        >
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">My Work</span>
        </NavLink>

        <NavLink
          to="/inbox"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-md transition-colors focus-ring relative",
              isActive
                ? "text-[var(--brand-accent-text)] font-semibold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )
          }
          aria-label="Inbox"
        >
          <Inbox className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Inbox</span>
        </NavLink>

        <button
          type="button"
          onClick={toggleTheme}
          className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-ring"
          aria-label={`Toggle theme (current: ${theme})`}
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-5 w-5 text-amber-400" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          <span className="text-[10px] mt-0.5">Theme</span>
        </button>

        <button
          type="button"
          onClick={(e) => onOpen(e.currentTarget)}
          className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-ring"
          aria-label="Open menu drawer"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Menu</span>
        </button>
      </nav>
    </>
  );
}
