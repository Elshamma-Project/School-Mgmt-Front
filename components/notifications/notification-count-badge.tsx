"use client";

import { cn } from "@/lib/utils/cn";

type Props = {
  count: number;
  className?: string;
};

/** Pastille rouge de compteur non-lus (nav / cloche). */
export function NotificationCountBadge({ count, className }: Props) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[var(--ios-danger)] px-1 text-[9px] font-bold text-white",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
