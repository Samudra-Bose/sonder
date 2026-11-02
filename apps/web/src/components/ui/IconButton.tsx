import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ButtonVariant, ButtonSize } from "./Button";

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /**
   * Required accessible label for screen readers.
   */
  "aria-label": string;
  icon: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  // Uses authoritative semantic tokens from research §7.3 & §7.6
  primary:
    "bg-[var(--brand-primary)] text-[var(--text-inverted)] hover:opacity-90 active:opacity-100 shadow-xs",
  accent:
    "bg-[var(--brand-accent-btn-bg)] text-[var(--brand-accent-btn-text)] hover:bg-[var(--brand-accent-hover)] shadow-xs",
  secondary:
    "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border-strong)]/30 active:bg-[var(--border-strong)]/50",
  outline:
    "border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] active:bg-[var(--surface-muted)]/80 bg-transparent",
  ghost:
    "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] active:bg-[var(--surface-muted)]/80 bg-transparent",
  danger:
    "bg-[var(--feedback-danger-text)] text-[var(--text-inverted)] hover:opacity-90 active:opacity-100 shadow-xs",
};

const sizeStyles: Record<ButtonSize, { button: string; icon: string }> = {
  sm: { button: "w-8 h-8", icon: "w-4 h-4" },
  md: { button: "w-9 h-9", icon: "w-4 h-4" },
  lg: { button: "w-10 h-10", icon: "w-5 h-5" },
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon,
    className,
    variant = "ghost",
    size = "md",
    isLoading = false,
    disabled = false,
    type = "button",
    "aria-label": ariaLabel,
    ...props
  },
  ref
) {
  const isDisabled = disabled || isLoading;
  const currentSize = sizeStyles[size];

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-busy={isLoading ? "true" : undefined}
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-md transition-colors select-none shrink-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-canvas)]",
        "active:scale-[0.98] transition-transform duration-75",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100",
        // 44x44px touch bounding box target standard on mobile via centered hit area expansion
        "relative touch-manipulation after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:min-w-[44px] after:min-h-[44px] after:w-full after:h-full sm:after:hidden",
        variantStyles[variant],
        currentSize.button,
        className
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2 className={cn("animate-spin shrink-0", currentSize.icon)} aria-hidden="true" />
      ) : (
        <span className={cn("inline-flex items-center justify-center", currentSize.icon)} aria-hidden="true">
          {icon}
        </span>
      )}
    </button>
  );
});

IconButton.displayName = "IconButton";
