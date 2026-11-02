import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type FeedbackVariant = "success" | "warning" | "danger" | "info";

export interface FeedbackProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: FeedbackVariant;
  title?: string;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

const variantConfig: Record<
  FeedbackVariant,
  { container: string; icon: React.ReactElement }
> = {
  success: {
    container:
      "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0] dark:bg-[#052E16] dark:text-[#86EFAC] dark:border-[#166534]",
    icon: <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  warning: {
    container:
      "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A] dark:bg-[#451A03] dark:text-[#FCD34D] dark:border-[#78350F]",
    icon: <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  danger: {
    container:
      "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA] dark:bg-[#450A0A] dark:text-[#FCA5A5] dark:border-[#7F1D1D]",
    icon: <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  info: {
    container:
      "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE] dark:bg-[#172554] dark:text-[#93C5FD] dark:border-[#1E40AF]",
    icon: <Info className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
};

export const Feedback = React.forwardRef<HTMLDivElement, FeedbackProps>(
  function Feedback(
    {
      variant = "info",
      title,
      children,
      onDismiss,
      icon,
      className,
      ...props
    },
    ref
  ) {
    const config = variantConfig[variant];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "relative flex items-start gap-3 rounded-lg border p-4 text-xs select-none",
          config.container,
          className
        )}
        {...props}
      >
        <span className="mt-0.5 inline-flex items-center">
          {icon || config.icon}
        </span>
        <div className="flex-1 space-y-1">
          {title && <p className="font-semibold leading-none">{title}</p>}
          {children && <div className="leading-relaxed opacity-90">{children}</div>}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss alert"
            className={cn(
              "rounded-sm p-1 opacity-70 hover:opacity-100 transition-opacity",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current",
              // Mobile touch target
              "relative touch-manipulation after:content-[''] after:absolute after:-inset-2 sm:after:hidden"
            )}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }
);

Feedback.displayName = "Feedback";
export const Alert = Feedback;
