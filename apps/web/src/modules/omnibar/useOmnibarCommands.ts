import { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CheckCircle2,
  Inbox,
  Lock,
  Layers,
  Building2,
  SunMoon,
  Sun,
  Moon,
  Laptop,
  PanelLeft,
  LogOut,
} from "lucide-react";
import { useWorkspace } from "@/modules/workspace";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/modules/auth";
import type { CommandItem, CommandGroup, CommandCategory } from "./types";

export interface UseOmnibarCommandsOptions {
  onClose: () => void;
  onToggleSidebar?: () => void;
}

export function useOmnibarCommands({
  onClose,
  onToggleSidebar,
}: UseOmnibarCommandsOptions): {
  allCommands: CommandItem[];
  groupedCommands: CommandGroup[];
} {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    personalWorkspace,
    sharedWorkspaces,
    selectWorkspace,
    selectCommunity,
    currentCommunity,
    communities,
    activeWorkspaceId,
  } = useWorkspace();
  const { theme, setTheme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const allCommands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    // --- 1. NAVIGATION COMMANDS ---
    items.push({
      id: "nav-overview",
      title: "Go to Overview",
      description: "Community dashboard and workspace status overview",
      category: "navigation",
      categoryLabel: "Navigation",
      icon: LayoutDashboard,
      isActive: location.pathname === "/",
      keywords: ["dashboard", "home", "overview", "root", "main"],
      onSelect: () => {
        navigate("/");
        onClose();
      },
    });

    items.push({
      id: "nav-my-work",
      title: "Go to My Work",
      description: "Personal triage and cross-workspace assigned work",
      category: "navigation",
      categoryLabel: "Navigation",
      icon: CheckCircle2,
      isActive: location.pathname === "/my-work",
      keywords: ["tasks", "triage", "assigned", "work", "todo"],
      onSelect: () => {
        navigate("/my-work");
        onClose();
      },
    });

    items.push({
      id: "nav-inbox",
      title: "Go to Inbox",
      description: "Notifications, mentions, and updates",
      category: "navigation",
      categoryLabel: "Navigation",
      icon: Inbox,
      isActive: location.pathname === "/inbox",
      keywords: ["notifications", "mentions", "messages", "inbox", "alerts"],
      onSelect: () => {
        navigate("/inbox");
        onClose();
      },
    });

    // --- 2. WORKSPACE CONTEXT COMMANDS ---
    // Privacy: AUDITED_BREAK_GLASS (DEC-OPEN-01) - only personalWorkspace of caller is shown
    if (personalWorkspace) {
      items.push({
        id: `ws-${personalWorkspace.id}`,
        title: `Switch to ${personalWorkspace.name}`,
        description: `Key prefix: ${personalWorkspace.keyPrefix} • Personal Workspace`,
        category: "workspace",
        categoryLabel: "Workspaces",
        icon: Lock,
        badge: personalWorkspace.keyPrefix,
        badgeVariant: "secondary",
        isActive: activeWorkspaceId === personalWorkspace.id,
        keywords: [
          "personal",
          "private",
          personalWorkspace.keyPrefix,
          personalWorkspace.name,
        ],
        onSelect: () => {
          selectWorkspace(personalWorkspace.id);
          onClose();
        },
      });
    }

    sharedWorkspaces.forEach((workspace) => {
      const role =
        workspace.myRole ||
        (workspace.ownerIds?.includes(user?.id ?? "") ? "OWNER" : "MEMBER");

      items.push({
        id: `ws-${workspace.id}`,
        title: `Switch to ${workspace.name}`,
        description: `Key prefix: ${workspace.keyPrefix} • Shared Workspace (${role})`,
        category: "workspace",
        categoryLabel: "Workspaces",
        icon: Layers,
        badge: workspace.keyPrefix,
        badgeVariant: "outline",
        isActive: activeWorkspaceId === workspace.id,
        keywords: [
          "shared",
          workspace.keyPrefix,
          workspace.name,
          role,
        ],
        onSelect: () => {
          selectWorkspace(workspace.id);
          onClose();
        },
      });
    });

    // --- 3. COMMUNITY CONTEXT COMMANDS ---
    if (communities.length > 1) {
      communities.forEach((community) => {
        const communityRole = community.isCommunityAdmin
          ? "Admin"
          : community.isDefaultCoordinator
          ? "Coordinator"
          : "Member";

        items.push({
          id: `comm-${community.communityId}`,
          title: `Switch to community: ${community.name}`,
          description: `Role: ${communityRole}`,
          category: "community",
          categoryLabel: "Communities",
          icon: Building2,
          isActive: currentCommunity?.communityId === community.communityId,
          keywords: ["community", community.name, communityRole],
          onSelect: async () => {
            onClose();
            await selectCommunity(community.communityId);
          },
        });
      });
    }

    // --- 4. APPLICATION ACTIONS & PREFERENCES ---
    items.push({
      id: "action-toggle-theme",
      title: "Toggle Theme",
      description: "Switch between light and dark appearance",
      category: "action",
      categoryLabel: "Actions",
      icon: SunMoon,
      keywords: ["theme", "dark", "light", "mode", "toggle", "appearance"],
      onSelect: () => {
        toggleTheme();
        onClose();
      },
    });

    items.push({
      id: "action-set-light-theme",
      title: "Use Light Theme",
      description: "Set interface appearance to light mode",
      category: "action",
      categoryLabel: "Actions",
      icon: Sun,
      isActive: theme === "light",
      keywords: ["light", "theme", "mode", "white", "day"],
      onSelect: () => {
        setTheme("light");
        onClose();
      },
    });

    items.push({
      id: "action-set-dark-theme",
      title: "Use Dark Theme",
      description: "Set interface appearance to dark mode",
      category: "action",
      categoryLabel: "Actions",
      icon: Moon,
      isActive: theme === "dark",
      keywords: ["dark", "theme", "mode", "night", "black"],
      onSelect: () => {
        setTheme("dark");
        onClose();
      },
    });

    items.push({
      id: "action-set-system-theme",
      title: "Use System Theme",
      description: "Sync interface appearance with device operating system",
      category: "action",
      categoryLabel: "Actions",
      icon: Laptop,
      isActive: theme === "system",
      keywords: ["system", "auto", "theme", "mode", "os"],
      onSelect: () => {
        setTheme("system");
        onClose();
      },
    });

    if (onToggleSidebar) {
      items.push({
        id: "action-toggle-sidebar",
        title: "Toggle Sidebar Rail",
        description: "Expand or collapse navigation sidebar (Cmd/Ctrl+B)",
        category: "action",
        categoryLabel: "Actions",
        icon: PanelLeft,
        shortcut: "Mod+B",
        keywords: ["sidebar", "collapse", "expand", "rail", "menu"],
        onSelect: () => {
          onToggleSidebar();
          onClose();
        },
      });
    }

    items.push({
      id: "action-sign-out",
      title: "Sign Out",
      description: user ? `Sign out of ${user.displayName} (${user.email})` : "End authenticated session",
      category: "action",
      categoryLabel: "Actions",
      icon: LogOut,
      keywords: ["logout", "signout", "exit", "disconnect", "leave"],
      onSelect: async () => {
        onClose();
        await logout();
      },
    });

    return items;
  }, [
    navigate,
    location.pathname,
    onClose,
    personalWorkspace,
    sharedWorkspaces,
    activeWorkspaceId,
    selectWorkspace,
    communities,
    currentCommunity,
    selectCommunity,
    toggleTheme,
    setTheme,
    theme,
    onToggleSidebar,
    user,
    logout,
  ]);

  const groupedCommands = useMemo<CommandGroup[]>(() => {
    const groups: Record<CommandCategory, CommandGroup> = {
      navigation: { category: "navigation", label: "Navigation", items: [] },
      workspace: { category: "workspace", label: "Workspaces", items: [] },
      community: { category: "community", label: "Communities", items: [] },
      action: { category: "action", label: "Actions & Preferences", items: [] },
    };

    allCommands.forEach((cmd) => {
      const group = groups[cmd.category];
      if (group) {
        group.items.push(cmd);
      }
    });

    return Object.values(groups).filter((g) => g.items.length > 0);
  }, [allCommands]);

  return { allCommands, groupedCommands };
}
