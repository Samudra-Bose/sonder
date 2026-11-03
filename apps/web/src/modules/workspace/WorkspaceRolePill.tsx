import React from "react";
import { Badge } from "@/components/ui/Badge";
import type { WorkspaceRole } from "./types";

export interface WorkspaceRolePillProps {
  role?: WorkspaceRole;
  className?: string;
}

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  OWNER: "Owner",
  COORDINATOR: "Coordinator",
  MEMBER: "Member",
  VIEWER: "Viewer",
  CUSTOM: "Custom",
};

export function WorkspaceRolePill({
  role,
  className,
}: WorkspaceRolePillProps): React.JSX.Element | null {
  if (!role) return null;

  const label = ROLE_LABELS[role] ?? role;
  const variant =
    role === "OWNER"
      ? "outline"
      : role === "COORDINATOR"
        ? "secondary"
        : "default";

  return (
    <Badge
      variant={variant}
      size="sm"
      className={className}
    >
      {label}
    </Badge>
  );
}
