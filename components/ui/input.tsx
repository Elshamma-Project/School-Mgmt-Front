import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, type = "text", ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "h-11 w-full rounded-[12px] border border-transparent bg-[var(--ios-fill)] px-3.5 text-[17px] text-[var(--ios-label)] placeholder:text-[var(--ios-tertiary-label)] transition-[box-shadow,background-color] duration-150 focus:bg-[var(--ios-card)] focus:outline-none focus:ring-2 focus:ring-[var(--ios-blue)]/35 disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
