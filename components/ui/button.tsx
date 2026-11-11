import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { controlBase, controlDisabled, focusRing } from "@/lib/ui/classes";
import { cn } from "@/lib/utils/cn";
import { Spinner } from "@/components/ui/spinner";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "destructive"
  | "ghost"
  | "ghostDestructive"
  | "plain";
type ButtonSize = "md" | "sm" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--ios-blue)] text-white hover:brightness-[1.04] active:bg-[var(--ios-blue-pressed)]",
  secondary:
    "bg-[var(--ios-fill)] text-[var(--ios-label)] hover:bg-[var(--ios-fill-secondary)]",
  destructive:
    "bg-[var(--ios-danger)] text-white hover:brightness-[1.04] active:brightness-95",
  ghost: "bg-transparent text-[var(--ios-blue)] hover:bg-[var(--ios-fill)]",
  ghostDestructive:
    "bg-transparent text-[var(--ios-danger)] hover:bg-[var(--ios-danger-soft)]",
  plain: "bg-transparent text-[var(--ios-label)] hover:bg-[var(--ios-fill)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-[var(--control-height-sm)] px-3 text-[11px]",
  md: "h-[var(--control-height-md)] px-4 text-[12px]",
  lg: "h-[var(--control-height-lg)] px-5 text-[12px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "md",
      type = "button",
      disabled,
      loading = false,
      leadingIcon,
      trailingIcon,
      children,
      ...props
    },
    ref,
  ) {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
        className={cn(
          "pressable inline-flex cursor-pointer items-center justify-center gap-2 font-semibold tracking-[-0.01em]",
          controlBase,
          focusRing,
          controlDisabled,
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
      >
        {loading ? (
          <Spinner
            size="sm"
            tone={
              variant === "ghost" || variant === "ghostDestructive"
                ? "blue"
                : variant === "secondary" || variant === "plain"
                  ? "default"
                  : "inverse"
            }
          />
        ) : (
          leadingIcon
        )}
        {children}
        {!loading ? trailingIcon : null}
      </button>
    );
  },
);
