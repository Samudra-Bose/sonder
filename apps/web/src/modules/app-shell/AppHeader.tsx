import React from "react";
import {
  PanelLeft,
  Menu,
  Search,
  Sun,
  Moon,
  Laptop,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Avatar } from "@/components/ui/Avatar";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import { useTheme } from "@/lib/theme";
import type { ApiSchema } from "@sonder/contracts";

export type AuthUser = ApiSchema<"MeContextDto">["user"];

export interface AppHeaderProps {
  user: AuthUser | null;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileNav: (triggerEl?: HTMLElement) => void;
  onLogout: () => void;
  isLoggingOut: boolean;
  menuTriggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export function AppHeader({
  user,
  isSidebarCollapsed,
  onToggleSidebar,
  onOpenMobileNav,
  onLogout,
  isLoggingOut,
  menuTriggerRef,
}: AppHeaderProps): React.JSX.Element {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  return (
    <header
      role="banner"
      className="h-12 border-b border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 md:px-4 flex items-center justify-between z-20 flex-shrink-0 select-none transition-colors duration-150"
    >
      {/* Left: Mobile Menu Trigger / Desktop Sidebar Toggle + Breadcrumb */}
      <div className="flex items-center space-x-2 md:space-x-3">
        {/* Mobile Hamburger Button */}
        <IconButton
          ref={menuTriggerRef}
          icon={<Menu className="h-5 w-5" />}
          aria-label="Open navigation menu"
          size="sm"
          variant="ghost"
          onClick={(e) => onOpenMobileNav(e.currentTarget)}
          className="md:hidden min-w-[44px] min-h-[44px]"
        />

        {/* Desktop Sidebar Toggle */}
        <Tooltip
          content={isSidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          side="bottom"
        >
          <IconButton
            icon={<PanelLeft className="h-4 w-4" />}
            aria-label={isSidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
            size="sm"
            variant="ghost"
            onClick={onToggleSidebar}
            className="hidden md:inline-flex text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          />
        </Tooltip>

        {/* Mobile View Title */}
        <div className="flex items-center space-x-2 md:hidden">
          <span className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-[180px]">
            Overview
          </span>
        </div>

        {/* Desktop Breadcrumb Context */}
        <nav aria-label="Breadcrumbs" className="hidden md:flex items-center space-x-1.5 text-xs">
          <span className="font-semibold text-[var(--text-primary)]">
            Overview
          </span>
        </nav>
      </div>

      {/* Center: Omnibar Planned Extension Point */}
      <div className="flex-1 max-w-xs md:max-w-sm mx-2 md:mx-4 hidden sm:flex justify-center">
        <button
          type="button"
          disabled
          aria-disabled="true"
          aria-label="Search (Omnibar — planned for VS-02D)"
          className="w-full flex items-center justify-between h-8 px-2.5 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-muted)]/60 text-xs text-[var(--text-muted)] cursor-not-allowed select-none opacity-80"
          title="Omnibar search will be available in VS-02D"
        >
          <span className="flex items-center gap-1.5 truncate">
            <Search className="h-3.5 w-3.5 text-[var(--text-muted)] flex-shrink-0" aria-hidden="true" />
            <span className="truncate">Search (Coming in VS-02D)</span>
          </span>
        </button>
      </div>

      {/* Right: Actions, Theme Toggle, User Profile & Sign Out */}
      <div className="flex items-center space-x-2 md:space-x-3">

        {/* Theme Toggle Button */}
        <Tooltip
          content={`Current theme: ${theme}. Click to toggle.`}
          side="bottom"
        >
          <IconButton
            icon={
              resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-[var(--text-secondary)]" />
              )
            }
            aria-label={`Current theme: ${theme}. Toggle theme`}
            size="sm"
            variant="ghost"
            onClick={toggleTheme}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          />
        </Tooltip>

        {/* User Identity & Direct Sign Out */}
        {user && (
          <div className="flex items-center space-x-2 pl-1 border-l border-[var(--border-subtle)]">
            <div className="hidden lg:flex flex-col text-right pr-1">
              <span className="text-xs font-medium text-[var(--text-primary)] leading-tight">
                {user.displayName}
              </span>
              <span className="text-[11px] text-[var(--text-muted)] leading-tight">
                ({user.email})
              </span>
            </div>

            {/* Persistent, Directly Accessible Sign Out Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onLogout}
              disabled={isLoggingOut}
              aria-label="Sign out"
              className="text-xs h-7 px-2.5 font-medium"
            >
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </Button>

            {/* User Profile Menu with Avatar Trigger */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="rounded-full focus-ring p-0.5 cursor-pointer"
                aria-label="Open user menu"
              >
                <Avatar
                  name={user.displayName}
                  size="sm"
                  className="border border-[var(--border-subtle)]"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={6} className="w-56">
                <DropdownMenuLabel>
                  <p className="font-semibold text-xs text-[var(--text-primary)] truncate">
                    {user.displayName}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                    {user.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Theme Selector */}
                <DropdownMenuLabel className="text-[10px] text-[var(--text-muted)]">
                  Appearance Theme
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="h-3.5 w-3.5 text-amber-500 mr-1.5" />
                  <span>Light Mode</span>
                  {theme === "light" && <span className="ml-auto text-[10px] text-[var(--brand-accent-text)]">Active</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="h-3.5 w-3.5 text-sky-400 mr-1.5" />
                  <span>Dark Mode</span>
                  {theme === "dark" && <span className="ml-auto text-[10px] text-[var(--brand-accent-text)]">Active</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Laptop className="h-3.5 w-3.5 text-[var(--text-muted)] mr-1.5" />
                  <span>System Preference</span>
                  {theme === "system" && <span className="ml-auto text-[10px] text-[var(--brand-accent-text)]">Active</span>}
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} destructive disabled={isLoggingOut}>
                  <LogOut className="h-3.5 w-3.5 mr-1.5" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}
