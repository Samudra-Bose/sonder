import React from "react";

export type CommandCategory = "navigation" | "workspace" | "community" | "action";

export interface CommandItem {
  id: string;
  title: string;
  description?: string;
  category: CommandCategory;
  categoryLabel: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  keywords?: string[];
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline" | "accent";
  isActive?: boolean;
  onSelect: () => void | Promise<void>;
}

export interface CommandGroup {
  category: CommandCategory;
  label: string;
  items: CommandItem[];
}

export interface OmnibarContextValue {
  isOpen: boolean;
  open: (invoker?: HTMLElement | null) => void;
  close: () => void;
  toggle: (invoker?: HTMLElement | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}
