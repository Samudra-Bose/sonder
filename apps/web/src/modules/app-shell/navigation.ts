import React from "react";
import { CheckCircle2, Inbox } from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  description?: string;
  isExternal?: boolean;
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    id: "my-work",
    label: "My Work",
    href: "/my-work",
    icon: CheckCircle2,
    badge: "3",
    description: "Personal triage and assigned work",
  },
  {
    id: "inbox",
    label: "Inbox",
    href: "/inbox",
    icon: Inbox,
    badge: "1",
    description: "Notifications, mentions, and updates",
  },
];

export interface WorkspacePreview {
  id: string;
  name: string;
  prefix: string;
  isPersonal: boolean;
  template: "GENERAL_PURPOSE" | "EVENT_PLANNING" | "TEAM_OPERATIONS" | "PERSONAL";
}

export const CANONICAL_WORKSPACE_PREVIEWS: WorkspacePreview[] = [
  {
    id: "ws-eng",
    name: "Engineering Platform",
    prefix: "ENG",
    isPersonal: false,
    template: "GENERAL_PURPOSE",
  },
  {
    id: "ws-gala",
    name: "Spring Community Gala 2027",
    prefix: "EVENT",
    isPersonal: false,
    template: "EVENT_PLANNING",
  },
  {
    id: "ws-personal",
    name: "Alex's Personal",
    prefix: "ALEX",
    isPersonal: true,
    template: "PERSONAL",
  },
];
