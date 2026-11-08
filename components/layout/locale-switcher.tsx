"use client";

import { useLocale, useTranslations } from "next-intl";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

type LocaleSwitcherProps = {
  className?: string;
};

export function LocaleSwitcher({ className }: LocaleSwitcherProps) {
  const t = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();

  return (
    <SegmentedControl
      className={cn("w-full", className)}
      ariaLabel={t("language")}
      value={locale}
      options={routing.locales.map((code) => ({
        value: code,
        label: code.toUpperCase(),
      }))}
      onChange={(next) => {
        if (next === locale) return;
        router.replace(pathname, { locale: next });
      }}
    />
  );
}
