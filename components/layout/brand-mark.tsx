import { cn } from "@/lib/utils/cn";

type BrandMarkProps = {
  className?: string;
  size?: "sm" | "md";
};

/** Emplacement logo école — monogramme SMELS en attendant le fichier officiel. */
export function BrandMark({ className, size = "md" }: BrandMarkProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[12px] bg-[var(--ios-blue)] font-bold tracking-[-0.04em] text-white shadow-[var(--ios-shadow-sm)]",
        size === "md" ? "size-10 text-[13px]" : "size-8 text-[11px]",
        className,
      )}
    >
      ES
    </div>
  );
}
