"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Menu, PanelLeftOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { getNavKeyFromPathname } from "@/lib/navigation/page-meta";
import { useAuthStore } from "@/stores/auth-store";
import { usePageHeadingStore } from "@/stores/page-heading-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { cn } from "@/lib/utils/cn";
import { primaryRole } from "@/types/auth";

export function AppHeader() {
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const role = primaryRole(useAuthStore((s) => s.user));
  const crumbs = usePageHeadingStore((s) => s.crumbs);
  const backHref = usePageHeadingStore((s) => s.backHref);
  const title = tNav(getNavKeyFromPathname(pathname, role));
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const finish = () => setReady(true);
    if (useSidebarStore.persist.hasHydrated()) {
      finish();
      return;
    }
    return useSidebarStore.persist.onFinishHydration(finish);
  }, []);

  // Ferme le drawer à chaque navigation (sécurité si Link hors drawer).
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const showExpand = ready && collapsed;

  return (
    <>
      <header className="sticky top-0 z-30 h-[var(--app-topbar-height)] shrink-0 border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-bg)_85%,transparent)] pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="flex h-full items-center gap-2.5 px-4 md:gap-3 md:px-8">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={tNav("openMenu")}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-drawer"
            className="pressable inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] bg-[var(--ios-fill)] text-[var(--ios-label)] hover:bg-[var(--ios-fill-secondary)] focus-visible:shadow-[var(--focus-ring)] md:hidden"
          >
            <Menu className="size-4 stroke-[1.75]" aria-hidden />
          </button>

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

          {backHref ? (
            <button
              type="button"
              onClick={() => router.push(backHref as `/${string}`)}
              aria-label={tCommon("back")}
              title={tCommon("back")}
              className="pressable inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] bg-[var(--ios-fill)] text-[var(--ios-label)] hover:bg-[var(--ios-fill-secondary)] focus-visible:shadow-[var(--focus-ring)]"
            >
              <ArrowLeft className="size-4 stroke-[1.75]" aria-hidden />
            </button>
          ) : null}

          <h1 className="min-w-0 flex-1 truncate text-[var(--text-title3)] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
            {crumbs && crumbs.length > 0 ? (
              <span className="inline-flex max-w-full items-center gap-1.5">
                {crumbs.map((crumb, index) => {
                  const isLast = index === crumbs.length - 1;
                  const clickable = Boolean(crumb.href) && !isLast;
                  return (
                    <span
                      key={`${crumb.label}-${index}`}
                      className="inline-flex min-w-0 items-center gap-1.5"
                    >
                      {index > 0 ? (
                        <span
                          className="shrink-0 font-medium text-[var(--ios-tertiary-label,var(--ios-secondary-label))]"
                          aria-hidden
                        >
                          ›
                        </span>
                      ) : null}
                      {clickable ? (
                        <Link
                          href={crumb.href as `/${string}`}
                          className="shrink-0 rounded-[var(--radius-sm)] text-[var(--ios-secondary-label)] transition-colors hover:text-[var(--ios-blue)] focus-visible:shadow-[var(--focus-ring)]"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span
                          className={cn(
                            isLast
                              ? "truncate text-[var(--ios-label)]"
                              : "shrink-0 text-[var(--ios-secondary-label)]",
                          )}
                        >
                          {crumb.label}
                        </span>
                      )}
                    </span>
                  );
                })}
              </span>
            ) : (
              title
            )}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <LocaleToggle />
          </div>
        </div>
      </header>

      <MobileNavDrawer open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
