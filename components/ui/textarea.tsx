import { forwardRef, type TextareaHTMLAttributes } from "react";
import { controlBase, controlDisabled, focusRing } from "@/lib/ui/classes";
import { cn } from "@/lib/utils/cn";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, rows = 4, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full resize-y border border-transparent bg-[var(--ios-fill)] px-3.5 py-2.5 text-[var(--text-body)] text-[var(--ios-label)] placeholder:text-[var(--ios-tertiary-label)]",
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
