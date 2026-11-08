import { cn } from "@/lib/utils/cn";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-[var(--radius-sm)] bg-[var(--ios-fill)]",
        className,
      )}
    />
  );
}
