"use client";

import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { usePathname } from "@/i18n/navigation";
import { getNavKeyFromPathname } from "@/lib/navigation/page-meta";

export function AppHeader() {
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const title = tNav(getNavKeyFromPathname(pathname));

  return (
    <header className="sticky top-0 z-30 h-[var(--app-topbar-height)] shrink-0 border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-bg)_88%,transparent)] backdrop-blur-xl">
      <div className="flex h-full items-center justify-between gap-3 px-4 md:px-8">
        <h1 className="truncate text-[17px] font-semibold tracking-[-0.01em] text-[var(--ios-label)] md:text-[20px] md:font-bold">
          {title}
        </h1>
        <div className="shrink-0 md:hidden">
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
