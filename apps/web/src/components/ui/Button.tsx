import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "accent" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
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

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-10 px-5 text-base gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    variant = "primary",
    size = "md",
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled = false,
    type = "button",
    ...props
  },
  ref
) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading ? "true" : undefined}
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-md transition-colors select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-canvas)]",
        "active:scale-[0.98] transition-transform duration-75",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100",
        // 44x44px touch bounding box target standard on mobile via centered hit area expansion
        "relative touch-manipulation after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:min-w-[44px] after:min-h-[44px] after:w-full after:h-full sm:after:hidden",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
      ) : (
        leftIcon && <span className="shrink-0 inline-flex items-center" aria-hidden="true">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && (
        <span className="shrink-0 inline-flex items-center" aria-hidden="true">{rightIcon}</span>
      )}
    </button>
  );
});

Button.displayName = "Button";
