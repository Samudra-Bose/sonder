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
    description: "Personal triage and assigned work",
  },
  {
    id: "inbox",
    label: "Inbox",
    href: "/inbox",
    icon: Inbox,
    description: "Notifications, mentions, and updates",
  },
];
