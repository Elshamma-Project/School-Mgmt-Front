"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type GroupedListProps = {
  header?: string;
  footer?: string;
  children: ReactNode;
  className?: string;
  /** Si vrai, l’en-tête bascule l’affichage du contenu. */
  collapsible?: boolean;
  /** Ouvert au premier rendu (défaut : true si non repliable, false si repliable). */
  defaultOpen?: boolean;
  /** Résumé visible quand la section est repliée. */
  collapsedSummary?: ReactNode;
  expandLabel?: string;
  collapseLabel?: string;
};

export function GroupedList({
  header,
  footer,
  children,
  className,
  collapsible = false,
  defaultOpen,
  collapsedSummary,
  expandLabel = "Expand",
  collapseLabel = "Collapse",
}: GroupedListProps) {
  const panelId = useId();
  const [open, setOpen] = useState(defaultOpen ?? !collapsible);
  const showBody = !collapsible || open;

  return (
    <section className={cn("flex w-full flex-col", className)}>
      {header ? (
        collapsible ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? collapseLabel : expandLabel}
            title={open ? collapseLabel : expandLabel}
            onClick={() => setOpen((v) => !v)}
            className="pressable mb-2 flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] px-4 py-1 text-left transition-colors hover:bg-[var(--ios-fill)]/60 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <h2 className="min-w-0 text-[var(--text-footnote)] font-normal uppercase tracking-[0.02em] text-[var(--ios-secondary-label)]">
              {header}
            </h2>
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 stroke-[1.75] text-[var(--ios-tertiary-label)] transition-transform duration-200",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        ) : (
          <h2 className="mb-2 px-4 text-[var(--text-footnote)] font-normal uppercase tracking-[0.02em] text-[var(--ios-secondary-label)]">
            {header}
          </h2>
        )
      ) : null}

      {showBody ? (
        <div
          id={collapsible ? panelId : undefined}
          className="min-h-0 flex-1 overflow-hidden rounded-[var(--radius-md)] bg-[var(--ios-card)] shadow-[var(--ios-shadow)]"
        >
          {children}
        </div>
      ) : collapsedSummary ? (
        <button
          type="button"
          id={panelId}
          aria-expanded={false}
          aria-label={expandLabel}
          onClick={() => setOpen(true)}
          className="pressable min-h-0 flex-1 overflow-hidden rounded-[var(--radius-md)] border border-dashed border-[var(--ios-separator)]/70 bg-[color-mix(in_srgb,var(--ios-fill)_35%,var(--ios-card))] px-4 py-3 text-left shadow-[var(--ios-shadow)] transition-colors hover:bg-[var(--ios-fill)]/70 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <div className="text-[12px] leading-snug text-[var(--ios-secondary-label)]">
            {collapsedSummary}
          </div>
        </button>
      ) : (
        <div id={panelId} hidden />
      )}

      {footer && showBody ? (
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
