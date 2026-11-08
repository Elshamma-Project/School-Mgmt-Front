"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

type LocaleToggleProps = {
  className?: string;
};

/** Bouton unique pour basculer FR ↔ EN (icône Languages). */
export function LocaleToggle({ className }: LocaleToggleProps) {
  const t = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const nextLocale: AppLocale = locale === "fr" ? "en" : "fr";

  return (
    <button
      type="button"
      onClick={() => router.replace(pathname, { locale: nextLocale })}
      aria-label={t("switchLanguage", { locale: nextLocale.toUpperCase() })}
      title={t("switchLanguage", { locale: nextLocale.toUpperCase() })}
      className={cn(
        "pressable inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--ios-fill)] px-2.5 text-[var(--ios-label)] hover:bg-[var(--ios-fill-secondary)] focus-visible:shadow-[var(--focus-ring)]",
        className,
      )}
    >
      <Languages className="size-4 stroke-[1.75]" aria-hidden />
      <span className="text-[12px] font-semibold uppercase tracking-[0.04em]">
        {nextLocale}
      </span>
    </button>
  );
}
