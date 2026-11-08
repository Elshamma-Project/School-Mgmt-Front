import { cn } from "@/lib/utils/cn";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "skeleton-shimmer rounded-[var(--radius-sm)]",
        className,
      )}
    />
  );
}
