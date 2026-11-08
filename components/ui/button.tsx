import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost";
type ButtonSize = "md" | "sm" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--ios-blue)] text-white hover:brightness-105 active:brightness-95",
  secondary:
    "bg-[var(--ios-fill)] text-[var(--ios-label)] hover:bg-[var(--ios-fill-secondary)]",
  destructive:
    "bg-[var(--ios-danger)] text-white hover:brightness-105 active:brightness-95",
  ghost:
    "bg-transparent text-[var(--ios-blue)] hover:bg-[var(--ios-fill)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-[15px]",
  md: "h-11 px-4 text-[17px]",
  lg: "h-12 px-5 text-[17px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", size = "md", type = "button", disabled, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-[12px] font-semibold tracking-[-0.01em] transition-[filter,background-color,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ios-blue)]/40 disabled:pointer-events-none disabled:opacity-45",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
