import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeTone = "neutral" | "blue" | "success" | "warning" | "danger";

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]",
  blue: "bg-[var(--ios-info-soft)] text-[var(--ios-blue)]",
  success: "bg-[var(--ios-success-soft)] text-[var(--ios-success)]",
  warning: "bg-[var(--ios-warning-soft)] text-[var(--ios-warning)]",
  danger: "bg-[var(--ios-danger-soft)] text-[var(--ios-danger)]",
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 text-[var(--text-caption)] font-semibold tracking-[0.01em]",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
