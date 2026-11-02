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
      "bg-[var(--feedback-success-bg)] text-[var(--feedback-success-text)] border-[var(--feedback-success-border)]",
    icon: <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  warning: {
    container:
      "bg-[var(--feedback-warning-bg)] text-[var(--feedback-warning-text)] border-[var(--feedback-warning-border)]",
    icon: <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  danger: {
    container:
      "bg-[var(--feedback-danger-bg)] text-[var(--feedback-danger-text)] border-[var(--feedback-danger-border)]",
    icon: <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  info: {
    container:
      "bg-[var(--feedback-info-bg)] text-[var(--feedback-info-text)] border-[var(--feedback-info-border)]",
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
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
              // 44x44px mobile touch bounding box
              "relative touch-manipulation after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-11 after:h-11 sm:after:hidden"
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
