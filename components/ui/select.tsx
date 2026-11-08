import { forwardRef, type SelectHTMLAttributes } from "react";
import { controlBase, controlDisabled, focusRing } from "@/lib/ui/classes";
import { cn } from "@/lib/utils/cn";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, invalid, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-[var(--control-height-md)] w-full appearance-none border border-transparent bg-[var(--ios-fill)] bg-[length:12px] bg-[right_12px_center] bg-no-repeat px-3.5 pr-9 text-[var(--text-body)] text-[var(--ios-label)]",
          controlBase,
          focusRing,
          controlDisabled,
          "focus:bg-[var(--ios-card)] focus:shadow-[var(--focus-ring)]",
          invalid && "shadow-[0_0_0_3px_color-mix(in_srgb,var(--ios-danger)_28%,transparent)]",
          className,
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%238E8E93' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        }}
        {...props}
      >
        {children}
      </select>
    );
  },
);
