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
    <header className="sticky top-0 z-30 h-[var(--app-topbar-height)] shrink-0 border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-bg)_85%,transparent)] pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="flex h-full items-center gap-3 px-5 md:px-8">
        <h1 className="min-w-0 flex-1 truncate text-[var(--text-title3)] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
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
