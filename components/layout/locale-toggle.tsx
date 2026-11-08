"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

type LocaleToggleProps = {
  className?: string;
};

const LOCALE_LABELS: Record<AppLocale, "french" | "english"> = {
  fr: "french",
  en: "english",
};

const LOCALE_FLAGS: Record<AppLocale, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
};

/** Sélecteur de langue : globe + flèche animée, menu FR / EN. */
export function LocaleToggle({ className }: LocaleToggleProps) {
  const t = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

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

  function selectLocale(next: AppLocale) {
    setOpen(false);
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t("language")}
        title={t("language")}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-9 cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--ios-fill)] px-2.5 text-[var(--ios-label)] transition-[background-color,box-shadow] duration-[var(--duration-fast)] hover:bg-[var(--ios-fill-secondary)] focus-visible:shadow-[var(--focus-ring)]",
          open && "bg-[var(--ios-fill-secondary)] shadow-[var(--ios-shadow-sm)]",
        )}
      >
        <Globe className="size-4 shrink-0 stroke-[1.75]" aria-hidden />
        <motion.span
          key={locale}
          initial={reduceMotion ? false : { opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          className="min-w-[1.25rem] text-center text-[12px] font-semibold uppercase tracking-[0.06em]"
        >
          {locale}
        </motion.span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{
            duration: reduceMotion ? 0 : 0.22,
            ease: [0.2, 0.8, 0.2, 1],
          }}
          className="inline-flex"
        >
          <ChevronDown
            className="size-3.5 stroke-[2] text-[var(--ios-secondary-label)]"
            aria-hidden
          />
        </motion.span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={menuId}
            role="listbox"
            aria-label={t("language")}
            initial={
              reduceMotion
                ? { opacity: 1 }
                : { opacity: 0, y: -6, scale: 0.96 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -4, scale: 0.97 }
            }
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute right-0 z-50 mt-1.5 min-w-[160px] origin-top-right overflow-hidden rounded-[var(--radius-md)] bg-[var(--ios-card)] py-1 shadow-[var(--ios-shadow-md)] ring-1 ring-[var(--ios-separator)]"
          >
            {routing.locales.map((code, index) => {
              const selected = code === locale;
              return (
                <motion.button
                  key={code}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  initial={reduceMotion ? false : { opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: reduceMotion ? 0 : 0.04 + index * 0.04,
                    duration: 0.16,
                    ease: [0.2, 0.8, 0.2, 1],
                  }}
                  onClick={() => selectLocale(code)}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-[var(--ios-fill)]",
                    selected && "bg-[var(--ios-blue)]/5",
                  )}
                >
                  <span className="flex items-center gap-2.5 text-[13px] font-medium leading-none text-[var(--ios-label)]">
                    <span className="text-[15px] leading-none" aria-hidden>
                      {LOCALE_FLAGS[code]}
                    </span>
                    {t(LOCALE_LABELS[code])}
                  </span>
                  <AnimatePresence initial={false}>
                    {selected ? (
                      <motion.span
                        key="check"
                        initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{ duration: 0.14 }}
                        className="inline-flex"
                      >
                        <Check
                          className="size-3.5 stroke-[2] text-[var(--ios-blue)]"
                          aria-hidden
                        />
                      </motion.span>
                    ) : (
                      <span className="w-3.5" aria-hidden />
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
