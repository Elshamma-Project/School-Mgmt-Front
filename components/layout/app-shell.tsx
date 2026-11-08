"use client";

import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { SidebarNav } from "@/components/layout/sidebar-nav";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const t = useTranslations("common");

  return (
    <div className="min-h-dvh bg-[var(--ios-bg)] text-[var(--ios-label)]">
      <div className="mx-auto flex min-h-dvh max-w-6xl">
        <aside className="sticky top-0 hidden h-dvh shrink-0 border-r border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-card)_70%,transparent)] backdrop-blur-xl md:flex md:flex-col">
          <div className="border-b border-[var(--ios-separator)] px-4 py-4">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--ios-secondary-label)]">
              {t("schoolName")}
            </p>
            <p className="mt-0.5 text-[20px] font-bold tracking-[-0.02em]">{t("appName")}</p>
          </div>
          <SidebarNav />
          <div className="mt-auto border-t border-[var(--ios-separator)] p-3">
            <LocaleSwitcher />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-bg)_85%,transparent)] px-4 py-3 backdrop-blur-xl md:hidden">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ios-secondary-label)]">
                {t("schoolName")}
              </p>
              <p className="text-[17px] font-bold tracking-[-0.01em]">{t("appName")}</p>
            </div>
            <LocaleSwitcher />
          </header>

          <main className="flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-8 md:pt-8">{children}</main>
          <MobileTabBar />
        </div>
      </div>
    </div>
  );
}
