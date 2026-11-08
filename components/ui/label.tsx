import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-[var(--text-footnote)] font-medium text-[var(--ios-secondary-label)]",
        className,
      )}
      {...props}
    />
  );
}
