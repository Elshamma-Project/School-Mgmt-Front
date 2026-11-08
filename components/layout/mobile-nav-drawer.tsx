"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/layout/brand-mark";
import { Link, usePathname } from "@/i18n/navigation";
import { getNavItemsForRole } from "@/lib/auth/nav-config";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { primaryRole } from "@/types/auth";

type MobileNavDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Menu navigation mobile (drawer) — remplace la tab bar trop dense.
 */
export function MobileNavDrawer({ open, onOpenChange }: MobileNavDrawerProps) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const items = getNavItemsForRole(primaryRole(user));
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onOpenChange, open]);

  if (typeof document === "undefined" || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 md:hidden" role="presentation">
      <button
        type="button"
        aria-label={t("closeMenu")}
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-y-0 left-0 flex w-[min(320px,88vw)] flex-col bg-[var(--ios-card)] shadow-[var(--ios-shadow-lg)] slide-up"
      >
        <div className="flex h-[var(--app-topbar-height)] shrink-0 items-center gap-2.5 border-b border-[var(--ios-separator)] px-3 pt-[env(safe-area-inset-top)]">
          <BrandMark size="sm" />
          <div className="min-w-0 flex-1 leading-tight">
            <p
              id={titleId}
              className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ios-secondary-label)]"
            >
              {tCommon("schoolName")}
            </p>
            <p className="truncate text-[12px] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
              {tCommon("appName")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={t("closeMenu")}
            className="pressable flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-[var(--ios-secondary-label)] hover:bg-[var(--ios-fill)] hover:text-[var(--ios-label)] focus-visible:shadow-[var(--focus-ring)]"
          >
            <X className="size-4 stroke-[1.75]" aria-hidden />
          </button>
        </div>

        <nav
          aria-label={t("main")}
          className="flex-1 overflow-y-auto overscroll-contain px-2 py-3"
        >
          <ul className="flex flex-col gap-0.5">
            {items.map(({ href, key, icon: Icon }) => {
              const active =
                key === "home"
                  ? pathname === href
                  : pathname === href || pathname.startsWith(`${href}/`);
              const label = t(key);

              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      "pressable flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-[var(--text-subhead)] font-medium transition-colors focus-visible:shadow-[var(--focus-ring)]",
                      active
                        ? "bg-[var(--ios-blue)]/10 text-[var(--ios-blue)]"
                        : "text-[var(--ios-label)] hover:bg-[var(--ios-fill)]",
                    )}
                  >
                    <Icon className="size-4 shrink-0 stroke-[1.75]" aria-hidden />
                    <span className="truncate">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-[var(--ios-separator)] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <Link
            href="/profile"
            onClick={() => onOpenChange(false)}
            className="pressable flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-[var(--text-subhead)] font-medium text-[var(--ios-label)] hover:bg-[var(--ios-fill)] focus-visible:shadow-[var(--focus-ring)]"
          >
            <span className="truncate">{t("profile")}</span>
          </Link>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
