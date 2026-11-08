import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type GroupedListProps = {
  header?: string;
  footer?: string;
  children: ReactNode;
  className?: string;
};

export function GroupedList({ header, footer, children, className }: GroupedListProps) {
  return (
    <section className={cn("w-full", className)}>
      {header ? (
        <h2 className="mb-2 px-4 text-[var(--text-footnote)] font-normal uppercase tracking-[0.02em] text-[var(--ios-secondary-label)]">
          {header}
        </h2>
      ) : null}
      <div className="overflow-hidden rounded-[var(--radius-md)] bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
        {children}
      </div>
      {footer ? (
        <p className="mt-2 px-4 text-[var(--text-footnote)] leading-snug text-[var(--ios-secondary-label)]">
          {footer}
        </p>
      ) : null}
    </section>
  );
}

type GroupedListItemProps = {
  children: ReactNode;
  className?: string;
};

export function GroupedListItem({ children, className }: GroupedListItemProps) {
  return (
    <div
      className={cn(
        "flex min-h-11 items-center justify-between gap-3 border-b border-[var(--ios-separator)] px-4 py-2.5 last:border-b-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
