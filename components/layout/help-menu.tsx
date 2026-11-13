"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CircleHelp, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { pickLocalized, resolveHelpArticle } from "@/lib/help/resolve-help";
import { cn } from "@/lib/utils/cn";

type HelpMenuProps = {
  className?: string;
};

type PanelPos = {
  top: number;
  right: number;
};

/** Aide contextuelle : article `docs/rag` résolu selon la route courante. */
export function HelpMenu({ className }: HelpMenuProps) {
  const t = useTranslations("help");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelPos, setPanelPos] = useState<PanelPos>({ top: 0, right: 16 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const article = useMemo(
    () => resolveHelpArticle({ pathname, searchParams }),
    [pathname, searchParams],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!open) return;

    function updatePos() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPanelPos({
        top: rect.bottom + 8,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    updatePos();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open]);

  const title = pickLocalized(article.title, locale);

  const layer =
    mounted &&
    createPortal(
      <AnimatePresence>
        {open ? (
          <div key="help-layer" className="fixed inset-0 z-[200]">
            <motion.button
              type="button"
              aria-label={t("closeOverlay")}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 cursor-default border-0 bg-[color-mix(in_srgb,var(--ios-label)_22%,transparent)] backdrop-blur-[6px]"
              onClick={() => setOpen(false)}
            />

            <motion.div
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              initial={
                reduceMotion
                  ? { opacity: 1 }
                  : { opacity: 0, y: -8, scale: 0.97 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: -6, scale: 0.98 }
              }
              transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
              style={{ top: panelPos.top, right: panelPos.right }}
              className="absolute z-10 flex max-h-[min(72dvh,460px)] w-[min(92vw,380px)] origin-top-right flex-col overflow-hidden rounded-[var(--radius-lg)] bg-[var(--ios-card)] shadow-[var(--ios-shadow-md)] ring-1 ring-[color-mix(in_srgb,var(--ios-separator)_70%,transparent)]"
            >
              <div className="relative overflow-hidden border-b border-[var(--ios-separator)]/50 px-3 py-2.5">
                <div
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,color-mix(in_srgb,var(--ios-blue)_12%,transparent),transparent_55%)]"
                  aria-hidden
                />
                <div className="relative flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--ios-info-soft)] text-[var(--ios-blue)] ring-1 ring-[color-mix(in_srgb,var(--ios-blue)_20%,transparent)]">
                    <CircleHelp className="size-3.5 stroke-[1.75]" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="inline-flex rounded-full bg-[color-mix(in_srgb,var(--ios-blue)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-blue)]">
                      {t("badge")}
                    </span>
                    <h2 className="truncate text-[14px] font-semibold leading-snug tracking-[-0.02em] text-[var(--ios-label)]">
                      {title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    aria-label={t("close")}
                    title={t("close")}
                    onClick={() => setOpen(false)}
                    className="pressable -mr-0.5 -mt-0.5 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-[var(--ios-danger)] transition-colors hover:bg-[var(--ios-danger-soft)] hover:text-[var(--ios-danger)] focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <X className="size-4 stroke-[1.75]" aria-hidden />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
                {article.sections.map((section, index) => (
                  <section
                    key={`${article.id}-${index}`}
                    className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--ios-separator)]/45 bg-[var(--ios-card)] shadow-[var(--ios-shadow-sm)]"
                  >
                    <div className="border-b border-[var(--ios-separator)]/40 bg-[color-mix(in_srgb,var(--ios-fill)_40%,transparent)] px-3.5 py-2">
                      <h3 className="flex items-center gap-2 text-[12px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
                        <span
                          className="size-1.5 shrink-0 rounded-full bg-[var(--ios-blue)]"
                          aria-hidden
                        />
                        {pickLocalized(section.heading, locale)}
                      </h3>
                    </div>
                    <div className="space-y-2 px-3.5 py-2.5">
                      {section.paragraphs.map((p, pi) => (
                        <p
                          key={pi}
                          className="text-[12.5px] leading-relaxed text-[var(--ios-secondary-label)]"
                        >
                          {pickLocalized(p, locale)}
                        </p>
                      ))}
                      {section.bullets?.length ? (
                        <ul className="space-y-1.5 border-t border-[var(--ios-separator)]/35 pt-2">
                          {section.bullets.map((b, bi) => (
                            <li
                              key={bi}
                              className="flex gap-2.5 text-[12.5px] leading-relaxed text-[var(--ios-secondary-label)]"
                            >
                              <span
                                className="mt-[7px] size-1 shrink-0 rounded-full bg-[color-mix(in_srgb,var(--ios-blue)_70%,transparent)]"
                                aria-hidden
                              />
                              <span>{pickLocalized(b, locale)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </section>
                ))}
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>,
      document.body,
    );

  return (
    <>
      <div className={cn("relative shrink-0", className)}>
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={t("open")}
          title={t("open")}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "pressable relative inline-flex size-9 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] bg-[var(--ios-fill)] text-[var(--ios-label)] transition-[background-color,box-shadow] duration-150 hover:bg-[var(--ios-fill-secondary)] focus-visible:shadow-[var(--focus-ring)]",
            open
              ? "z-[210] bg-[var(--ios-fill-secondary)] shadow-[var(--ios-shadow-sm)]"
              : "z-10",
          )}
        >
          <CircleHelp className="size-4 stroke-[1.75]" aria-hidden />
        </button>
      </div>
      {layer}
    </>
  );
}
