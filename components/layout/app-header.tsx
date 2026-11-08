"use client";

import { useEffect, useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { usePathname } from "@/i18n/navigation";
import { getNavKeyFromPathname } from "@/lib/navigation/page-meta";
import { useAuthStore } from "@/stores/auth-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { primaryRole } from "@/types/auth";

export function AppHeader() {
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const role = primaryRole(useAuthStore((s) => s.user));
  const title = tNav(getNavKeyFromPathname(pathname, role));
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const finish = () => setReady(true);
    if (useSidebarStore.persist.hasHydrated()) {
      finish();
      return;
    }
    return useSidebarStore.persist.onFinishHydration(finish);
  }, []);

  const showExpand = ready && collapsed;

  return (
    <header className="sticky top-0 z-30 h-[var(--app-topbar-height)] shrink-0 border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-bg)_85%,transparent)] pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="flex h-full items-center gap-3 px-5 md:px-8">
        {showExpand ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={tNav("expandSidebar")}
            title={tNav("expandSidebar")}
            className="pressable hidden size-9 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] bg-[var(--ios-fill)] text-[var(--ios-label)] hover:bg-[var(--ios-fill-secondary)] focus-visible:shadow-[var(--focus-ring)] md:inline-flex"
          >
            <PanelLeftOpen className="size-4 stroke-[1.75]" aria-hidden />
          </button>
        ) : null}

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
