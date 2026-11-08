import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[16px] bg-[var(--ios-grouped)] px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 text-[var(--ios-tertiary-label)]">{icon}</div>
      ) : null}
      <h2 className="text-[17px] font-semibold text-[var(--ios-label)]">{title}</h2>
      <p className="mt-1.5 max-w-sm text-[15px] leading-relaxed text-[var(--ios-secondary-label)]">
        {description}
      </p>
    </div>
  );
}
