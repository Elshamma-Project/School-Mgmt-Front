import { forwardRef, type InputHTMLAttributes } from "react";
import { controlBase, controlDisabled, focusRing } from "@/lib/ui/classes";
import { cn } from "@/lib/utils/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, type = "text", invalid, ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-[var(--control-height-md)] w-full border border-transparent bg-[var(--ios-fill)] px-3.5 text-[var(--text-body)] text-[var(--ios-label)] placeholder:text-[var(--ios-tertiary-label)]",
          controlBase,
          focusRing,
          controlDisabled,
          "focus:bg-[var(--ios-card)] focus:shadow-[var(--focus-ring)]",
          invalid && "shadow-[0_0_0_3px_color-mix(in_srgb,var(--ios-danger)_28%,transparent)]",
          className,
        )}
        {...props}
      />
    );
  },
);
