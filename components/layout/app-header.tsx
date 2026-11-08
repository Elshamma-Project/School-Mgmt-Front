"use client";

import { useTranslations } from "next-intl";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { usePathname } from "@/i18n/navigation";
import { getNavKeyFromPathname } from "@/lib/navigation/page-meta";
import { useAuthStore } from "@/stores/auth-store";
import { primaryRole } from "@/types/auth";

export function AppHeader() {
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const role = primaryRole(useAuthStore((s) => s.user));
  const title = tNav(getNavKeyFromPathname(pathname, role));

  return (
    <header className="sticky top-0 z-30 h-[var(--app-topbar-height)] shrink-0 border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-bg)_88%,transparent)] backdrop-blur-xl">
      <div className="flex h-full items-center gap-3 px-6 md:px-12">
        <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-[-0.01em] text-[var(--ios-label)] md:text-[20px] md:font-bold">
          {title}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <LocaleToggle />
        </div>
      </div>
    </header>
  );
}
