"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CircleHelp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { pickLocalized, resolveHelpArticle } from "@/lib/help/resolve-help";
import { cn } from "@/lib/utils/cn";

type HelpMenuProps = {
  className?: string;
};

/** Aide contextuelle : article `docs/rag` résolu selon la route courante. */
export function HelpMenu({ className }: HelpMenuProps) {
  const t = useTranslations("help");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const article = useMemo(
    () => resolveHelpArticle({ pathname, searchParams }),
    [pathname, searchParams],
  );

  useEffect(() => {
    setOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const title = pickLocalized(article.title, locale);

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t("open")}
        title={t("open")}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "pressable inline-flex size-9 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] bg-[var(--ios-fill)] text-[var(--ios-label)] transition-[background-color,box-shadow] duration-[var(--duration-fast)] hover:bg-[var(--ios-fill-secondary)] focus-visible:shadow-[var(--focus-ring)]",
          open && "bg-[var(--ios-fill-secondary)] shadow-[var(--ios-shadow-sm)]",
        )}
      >
        <CircleHelp className="size-4 stroke-[1.75]" aria-hidden />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={panelId}
            role="dialog"
            aria-label={title}
            initial={
              reduceMotion ? { opacity: 1 } : { opacity: 0, y: -6, scale: 0.96 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.97 }
            }
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute right-0 z-50 mt-1.5 flex max-h-[min(70dvh,420px)] w-[min(92vw,360px)] origin-top-right flex-col overflow-hidden rounded-[var(--radius-md)] bg-[var(--ios-card)] shadow-[var(--ios-shadow-md)] ring-1 ring-[var(--ios-separator)]"
          >
            <div className="border-b border-[var(--ios-separator)]/60 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                {t("badge")}
              </p>
              <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
                {title}
              </h2>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
              {article.sections.map((section, index) => (
                <section key={`${article.id}-${index}`}>
                  <h3 className="text-[12px] font-semibold text-[var(--ios-label)]">
                    {pickLocalized(section.heading, locale)}
                  </h3>
                  <div className="mt-1.5 space-y-1.5">
                    {section.paragraphs.map((p, pi) => (
                      <p
                        key={pi}
                        className="text-[12px] leading-snug text-[var(--ios-secondary-label)]"
                      >
                        {pickLocalized(p, locale)}
                      </p>
                    ))}
                    {section.bullets?.length ? (
                      <ul className="list-disc space-y-1 pl-4 text-[12px] leading-snug text-[var(--ios-secondary-label)]">
                        {section.bullets.map((b, bi) => (
                          <li key={bi}>{pickLocalized(b, locale)}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </section>
              ))}
            </div>

            <p className="border-t border-[var(--ios-separator)]/60 px-4 py-2 text-[10px] text-[var(--ios-tertiary-label,var(--ios-secondary-label))]">
              {t("sourceHint")}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
