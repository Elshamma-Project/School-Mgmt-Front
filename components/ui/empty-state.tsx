import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "fade-in flex flex-col items-center justify-center rounded-[var(--radius-xl)] bg-[var(--ios-card)] px-6 py-14 text-center shadow-[var(--ios-shadow)]",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 text-[var(--ios-tertiary-label)]">{icon}</div>
      ) : null}
      <h2 className="text-[var(--text-body)] font-semibold text-[var(--ios-label)]">
        {title}
      </h2>
      <p className="mt-1.5 max-w-sm text-[var(--text-subhead)] leading-relaxed text-[var(--ios-secondary-label)]">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
