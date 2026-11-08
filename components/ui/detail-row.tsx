import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type DetailRowProps = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  /** Valeur longue : libellé au-dessus, valeur en dessous. */
  stacked?: boolean;
  className?: string;
};

/**
 * Ligne lecture seule style iOS Settings — pas de champ grisé désactivé.
 */
export function DetailRow({ label, value, icon, stacked = false, className }: DetailRowProps) {
  const display =
    value === null || value === undefined || value === "" ? "—" : value;

  if (stacked) {
    return (
      <div className={cn("flex w-full gap-3", className)}>
        {icon ? (
          <span
            className="mt-0.5 inline-flex shrink-0 text-[var(--ios-secondary-label)]"
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-[var(--text-footnote)] text-[var(--ios-secondary-label)]">{label}</p>
          <p className="mt-0.5 break-words text-[var(--text-body)] font-medium leading-snug text-[var(--ios-label)]">
            {display}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex w-full min-w-0 items-center gap-3", className)}>
      {icon ? (
        <span className="inline-flex shrink-0 text-[var(--ios-secondary-label)]" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className="shrink-0 text-[var(--text-body)] text-[var(--ios-label)]">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right text-[var(--text-body)] text-[var(--ios-secondary-label)]">
        {display}
      </span>
    </div>
  );
}
