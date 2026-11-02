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
  primary:
    "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 dark:active:bg-slate-300 shadow-xs",
  accent:
    "bg-sky-700 text-white hover:bg-sky-800 active:bg-sky-900 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300 dark:active:bg-sky-200 shadow-xs",
  secondary:
    "bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:active:bg-slate-600",
  outline:
    "border border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700 bg-transparent",
  ghost:
    "text-slate-700 hover:bg-slate-100 active:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 dark:active:bg-slate-700 bg-transparent",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 dark:bg-red-600 dark:text-white dark:hover:bg-red-500 dark:active:bg-red-700 shadow-xs",
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
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900",
        "active:scale-[0.98] transition-transform duration-75",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100",
        // 44x44px touch bounding box target standard on mobile
        "relative touch-manipulation after:content-[''] after:absolute after:inset-y-0 after:left-1/2 after:-translate-x-1/2 after:min-w-[44px] after:min-h-[44px] sm:after:hidden",
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
