"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

type LocaleSwitcherProps = {
  className?: string;
};

export function LocaleSwitcher({ className }: LocaleSwitcherProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(next: AppLocale) {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={cn(
        "inline-flex rounded-[10px] bg-[var(--ios-fill)] p-0.5",
        className,
      )}
    >
      {routing.locales.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => switchLocale(code)}
            aria-pressed={active}
            className={cn(
              "min-w-10 rounded-[8px] px-2.5 py-1.5 text-[13px] font-semibold uppercase transition-colors duration-150",
              active
                ? "bg-[var(--ios-card)] text-[var(--ios-label)] shadow-[var(--ios-shadow-sm)]"
                : "text-[var(--ios-secondary-label)]",
            )}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
