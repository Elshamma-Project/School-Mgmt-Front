"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose } from "lucide-react";
import { useTranslations } from "next-intl";
import { SidebarNav } from "@/components/layout/app-nav";
import { BrandMark } from "@/components/layout/brand-mark";
import { SidebarAccount } from "@/components/layout/sidebar-account";
import { cn } from "@/lib/utils/cn";
import { useSidebarStore } from "@/stores/sidebar-store";

export function AppSidebar() {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(useSidebarStore.persist.hasHydrated());
    return useSidebarStore.persist.onFinishHydration(() => setReady(true));
  }, []);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-[var(--ios-separator)]",
        "bg-[color-mix(in_srgb,var(--ios-card)_85%,transparent)] backdrop-blur-xl transition-[width] duration-[var(--duration-normal)] ease-[var(--ease-emphasized)] md:flex",
        collapsed ? "w-[72px]" : "w-[220px]",
        !ready && "opacity-0",
      )}
    >
      <div
        className={cn(
          "relative flex h-[var(--app-topbar-height)] shrink-0 items-center border-b border-[var(--ios-separator)]",
          collapsed ? "justify-center px-1" : "gap-2.5 px-3",
        )}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={tNav("expandSidebar")}
            title={tNav("expandSidebar")}
            className="pressable cursor-pointer rounded-[var(--radius-md)] focus-visible:shadow-[var(--focus-ring)]"
          >
            <BrandMark size="sm" />
          </button>
        ) : (
          <>
            <BrandMark size="sm" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ios-secondary-label)]">
                {t("schoolName")}
              </p>
              <p className="truncate text-[12px] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
                {t("appName")}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-pressed={false}
              aria-label={tNav("collapseSidebar")}
              title={tNav("collapseSidebar")}
              className="pressable flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-[var(--ios-secondary-label)] hover:bg-[var(--ios-fill)] hover:text-[var(--ios-label)] focus-visible:shadow-[var(--focus-ring)]"
            >
              <PanelLeftClose className="size-4 stroke-[1.75]" aria-hidden />
            </button>
          </>
        )}
      </div>

      <SidebarNav collapsed={collapsed} />
      <SidebarAccount collapsed={collapsed} />
    </aside>
  );
}
