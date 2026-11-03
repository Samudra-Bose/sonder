import React from "react";
import { Search } from "lucide-react";
import { Kbd } from "@/components/ui/KeyboardShortcut";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";
import { isMac } from "@/lib/keyboard";
import { useOmnibar } from "./OmnibarContext";

export interface DesktopOmnibarTriggerProps {
  className?: string;
}

export function DesktopOmnibarTrigger({
  className,
}: DesktopOmnibarTriggerProps): React.JSX.Element {
  const { open } = useOmnibar();
  const mac = isMac();

  return (
    <button
      type="button"
      onClick={(e) => open(e.currentTarget)}
      aria-label={`Open command palette (${mac ? "⌘K" : "Ctrl+K"})`}
      className={cn(
        "w-full flex items-center justify-between h-8 px-2.5 rounded-md",
        "border border-[var(--border-subtle)] bg-[var(--surface-muted)]/60",
        "text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] hover:border-[var(--border-strong)]",
        "transition-colors duration-150 cursor-pointer select-none focus-ring",
        className
      )}
    >
      <span className="flex items-center gap-1.5 truncate">
        <Search className="h-3.5 w-3.5 text-[var(--text-muted)] flex-shrink-0" aria-hidden="true" />
        <span className="truncate">Search or jump to...</span>
      </span>
      <Kbd className="text-[10px] py-0 px-1 font-sans">
        {mac ? "⌘K" : "Ctrl+K"}
      </Kbd>
    </button>
  );
}

export interface MobileOmnibarTriggerProps {
  className?: string;
  variant?: "icon" | "drawer-button";
  onClick?: () => void;
}

export function MobileOmnibarTrigger({
  className,
  variant = "icon",
  onClick,
}: MobileOmnibarTriggerProps): React.JSX.Element {
  const { open } = useOmnibar();
  const mac = isMac();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick();
    }
    open(e.currentTarget);
  };

  if (variant === "drawer-button") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium",
          "min-h-[44px] bg-[var(--surface-muted)]/70 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
          "border border-[var(--border-subtle)] transition-colors focus-ring cursor-pointer",
          className
        )}
      >
        <span className="flex items-center gap-2.5">
          <Search className="h-4 w-4 text-[var(--text-muted)]" />
          <span>Command Palette</span>
        </span>
        <Kbd className="text-[10px]">{mac ? "⌘K" : "Ctrl+K"}</Kbd>
      </button>
    );
  }

  return (
    <IconButton
      icon={<Search className="h-4 w-4" />}
      aria-label={`Open mobile command palette (${mac ? "⌘K" : "Ctrl+K"})`}
      size="sm"
      variant="ghost"
      onClick={handleClick}
      className={cn(
        "min-w-[44px] min-h-[44px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        className
      )}
    />
  );
}
