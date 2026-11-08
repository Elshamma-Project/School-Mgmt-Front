import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  Home,
  LayoutDashboard,
  Settings,
  Shield,
  UserRound,
  Users,
} from "lucide-react";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import type { AppRole } from "@/types/auth";

export type NavItemKey =
  | "home"
  | "myClasses"
  | "grades"
  | "timetable"
  | "children"
  | "reportCards"
  | "students"
  | "staff"
  | "academic"
  | "sequences"
  | "reporting"
  | "audit"
  | "adminAccounts"
  | "schools"
  | "platform"
  | "notifications"
  | "settings"
  | "profile";

export type NavHref = `/${string}`;

export type NavItem = {
  href: NavHref;
  key: NavItemKey;
  icon: LucideIcon;
};

function item(href: NavHref, key: NavItemKey, icon: LucideIcon): NavItem {
  return { href, key, icon };
}

/** Navigation par espace de rôle — plus de menu unique partagé. */
export function getNavItemsForRole(role: AppRole | null): NavItem[] {
  if (!role) {
    return [
      item("/settings", "settings", Settings),
      item("/notifications", "notifications", Bell),
    ];
  }

  const home = getRoleHomePath(role);
  const sharedTail: NavItem[] = [
    item("/notifications", "notifications", Bell),
    item("/settings", "settings", Settings),
  ];

  switch (role) {
    case "TEACHER":
      return [
        item(home, "home", Home),
        item(`${home}/classes`, "myClasses", BookOpen),
        item(`${home}/grades`, "grades", ClipboardList),
        item(`${home}/timetable`, "timetable", CalendarDays),
        ...sharedTail,
      ];
    case "PARENT":
      return [
        item(home, "home", Home),
        item(`${home}/children`, "children", Users),
        item(`${home}/grades`, "grades", ClipboardList),
        item(`${home}/report-cards`, "reportCards", FileSpreadsheet),
        item(`${home}/timetable`, "timetable", CalendarDays),
        ...sharedTail,
      ];
    case "STUDENT":
      return [
        item(home, "home", Home),
        item(`${home}/grades`, "grades", ClipboardList),
        item(`${home}/report-cards`, "reportCards", FileSpreadsheet),
        item(`${home}/timetable`, "timetable", CalendarDays),
        ...sharedTail,
      ];
    case "ADMINISTRATION":
      return [
        item(home, "home", LayoutDashboard),
        item(`${home}/students`, "students", GraduationCap),
        item(`${home}/staff`, "staff", Users),
        item(`${home}/academic`, "academic", BookOpen),
        item(`${home}/grades`, "grades", ClipboardList),
        item(`${home}/reporting`, "reporting", FileSpreadsheet),
        item(`${home}/timetable`, "timetable", CalendarDays),
        ...sharedTail,
      ];
    case "DIRECTOR":
      return [
        item(home, "home", LayoutDashboard),
        item(`${home}/students`, "students", GraduationCap),
        item(`${home}/staff`, "staff", Users),
        item(`${home}/academic`, "academic", BookOpen),
        item(`${home}/sequences`, "sequences", Shield),
        item(`${home}/reporting`, "reporting", FileSpreadsheet),
        item(`${home}/admin-accounts`, "adminAccounts", UserRound),
        item(`${home}/timetable`, "timetable", CalendarDays),
        ...sharedTail,
      ];
    case "SUPER_ADMIN":
      return [
        item(home, "home", LayoutDashboard),
        item(`${home}/schools`, "schools", Building2),
        item(`${home}/platform`, "platform", Shield),
        item(`${home}/audit`, "audit", ClipboardList),
        ...sharedTail,
      ];
    default:
      return sharedTail;
  }
}
