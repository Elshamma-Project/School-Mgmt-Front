"use client";

import {
  BookOpen,
  GraduationCap,
  Home,
  Settings,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";

const items = [
  { href: "/", key: "home", icon: Home },
  { href: "/staff", key: "staff", icon: Users },
  { href: "/students", key: "students", icon: GraduationCap },
  { href: "/academic", key: "academic", icon: BookOpen },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

export function MobileTabBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("main")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-card)_82%,transparent)] px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ href, key, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium",
                  active ? "text-[var(--ios-blue)]" : "text-[var(--ios-secondary-label)]",
                )}
              >
                <Icon className="size-5 stroke-[1.75]" aria-hidden />
                <span>{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
