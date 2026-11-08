import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  GraduationCap,
  Home,
  Settings,
  Users,
} from "lucide-react";
import type { AppRole } from "@/types/auth";

export type NavItemKey = "home" | "staff" | "students" | "academic" | "settings";

export type NavItem = {
  href: "/" | "/staff" | "/students" | "/academic" | "/settings";
  key: NavItemKey;
  icon: LucideIcon;
};

const ALL_ITEMS: NavItem[] = [
  { href: "/", key: "home", icon: Home },
  { href: "/staff", key: "staff", icon: Users },
  { href: "/students", key: "students", icon: GraduationCap },
  { href: "/academic", key: "academic", icon: BookOpen },
  { href: "/settings", key: "settings", icon: Settings },
];

/** Modules visibles par rôle (mock UI — à affiner avec les droits API). */
const ROLE_NAV: Record<AppRole, NavItemKey[]> = {
  super_admin: ["home", "staff", "students", "academic", "settings"],
  staff: ["home", "staff", "students", "academic", "settings"],
  teacher: ["home", "students", "academic", "settings"],
  guardian: ["home", "students", "academic", "settings"],
};

export function getNavItemsForRole(role: AppRole | null): NavItem[] {
  if (!role) return ALL_ITEMS.filter((item) => item.key === "home" || item.key === "settings");
  const allowed = new Set(ROLE_NAV[role]);
  return ALL_ITEMS.filter((item) => allowed.has(item.key));
}
