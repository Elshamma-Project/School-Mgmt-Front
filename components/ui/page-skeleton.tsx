import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

type PageSkeletonProps = {
  variant?: "home" | "module" | "form" | "settings";
  className?: string;
};

function CardBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "flex min-h-11 items-center gap-3 px-4 py-2.5",
            index > 0 && "border-t border-[var(--ios-separator)]",
          )}
        >
          <Skeleton className="size-8 shrink-0 rounded-[var(--radius-sm)]" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-[42%]" />
            <Skeleton className="h-2.5 w-[68%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Squelette de page — variantes home / module / formulaire / réglages. */
export function PageSkeleton({ variant = "home", className }: PageSkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("space-y-6 fade-in", className)}
    >
      <span className="sr-only">Loading</span>

      {variant === "home" ? (
        <>
          <div className="space-y-2">
            <Skeleton className="h-5 w-[46%]" />
            <Skeleton className="h-3 w-[72%] max-w-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="ml-4 h-2.5 w-20" />
            <CardBlock rows={3} />
          </div>
          <div className="space-y-2">
            <Skeleton className="ml-4 h-2.5 w-24" />
            <CardBlock rows={4} />
          </div>
          <div className="space-y-2">
            <Skeleton className="ml-4 h-2.5 w-28" />
            <CardBlock rows={3} />
          </div>
        </>
      ) : null}

      {variant === "module" ? (
        <>
          <Skeleton className="h-3 w-[58%] max-w-lg" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
          <div className="flex flex-col items-center rounded-[var(--radius-xl)] bg-[var(--ios-card)] px-6 py-14 shadow-[var(--ios-shadow)]">
            <Skeleton className="mb-4 size-16 rounded-full" />
            <Skeleton className="mb-2 h-3.5 w-36" />
            <Skeleton className="h-2.5 w-56 max-w-full" />
          </div>
        </>
      ) : null}

      {variant === "form" ? (
        <div className="mx-auto max-w-[560px] space-y-6">
          <div className="flex flex-col items-center">
            <Skeleton className="size-20 rounded-full" />
            <Skeleton className="mt-4 h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-52" />
          </div>
          <div className="space-y-2">
            <Skeleton className="ml-4 h-2.5 w-32" />
            <div className="space-y-4 rounded-[var(--radius-md)] bg-[var(--ios-card)] p-4 shadow-[var(--ios-shadow)]">
              <Skeleton className="h-[var(--control-height-md)] w-full rounded-[var(--radius-md)]" />
              <Skeleton className="h-[var(--control-height-md)] w-full rounded-[var(--radius-md)]" />
              <Skeleton className="h-[var(--control-height-md)] w-full rounded-[var(--radius-md)]" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="ml-4 h-2.5 w-28" />
            <div className="space-y-4 rounded-[var(--radius-md)] bg-[var(--ios-card)] p-4 shadow-[var(--ios-shadow)]">
              <Skeleton className="h-[var(--control-height-md)] w-full rounded-[var(--radius-md)]" />
              <Skeleton className="h-[var(--control-height-md)] w-full rounded-[var(--radius-md)]" />
            </div>
          </div>
        </div>
      ) : null}

      {variant === "settings" ? (
        <>
          <Skeleton className="h-3 w-[55%] max-w-md" />
          <div className="space-y-2">
            <Skeleton className="ml-4 h-2.5 w-28" />
            <CardBlock rows={1} />
          </div>
          <div className="space-y-2">
            <Skeleton className="ml-4 h-2.5 w-20" />
            <CardBlock rows={1} />
          </div>
          <div className="space-y-2">
            <Skeleton className="ml-4 h-2.5 w-36" />
            <CardBlock rows={5} />
          </div>
        </>
      ) : null}
    </div>
  );
}
