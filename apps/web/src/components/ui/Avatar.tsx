import React from "react";
import { Avatar as BaseAvatar } from "@base-ui/react";
import { cn } from "@/lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
  fallbackClassName?: string;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string }> = {
  xs: { container: "w-5 h-5", text: "text-[10px]" },
  sm: { container: "w-6 h-6", text: "text-xs" },
  md: { container: "w-8 h-8", text: "text-xs" },
  lg: { container: "w-10 h-10", text: "text-sm" },
  xl: { container: "w-12 h-12", text: "text-base" },
};

function getInitials(name?: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "";
  if (parts.length === 1) {
    return first.slice(0, 2).toUpperCase();
  }
  const last = parts[parts.length - 1];
  const firstChar = first[0] || "";
  const lastChar = last?.[0] || "";
  return (firstChar + lastChar).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name,
  size = "md",
  className,
  fallbackClassName,
}) => {
  const initials = getInitials(name);
  const currentSize = sizeStyles[size];

  return (
    <BaseAvatar.Root
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden select-none",
        "bg-[var(--surface-muted)] border border-[var(--border-subtle)]",
        currentSize.container,
        className
      )}
    >
      {src && (
        <BaseAvatar.Image
          src={src}
          alt={alt || name || "Avatar"}
          className="h-full w-full object-cover rounded-full"
        />
      )}
      <BaseAvatar.Fallback
        className={cn(
          "flex h-full w-full items-center justify-center font-medium text-[var(--text-secondary)] uppercase",
          currentSize.text,
          fallbackClassName
        )}
      >
        {initials || (
          <span className="text-[var(--text-muted)]" aria-hidden="true">
            ?
          </span>
        )}
      </BaseAvatar.Fallback>
    </BaseAvatar.Root>
  );
};

Avatar.displayName = "Avatar";
