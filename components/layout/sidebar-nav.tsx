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

export function SidebarNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("main")} className="hidden md:flex md:w-[220px] md:flex-col md:gap-1 md:p-3">
      {items.map(({ href, key, icon: Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[15px] font-medium transition-colors duration-150",
              active
                ? "bg-[var(--ios-blue)]/10 text-[var(--ios-blue)]"
                : "text-[var(--ios-label)] hover:bg-[var(--ios-fill)]",
            )}
          >
            <Icon className="size-[18px] stroke-[1.75]" aria-hidden />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
