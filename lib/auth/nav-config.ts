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
  Users,
} from "lucide-react";
import {
  ACADEMIC_TABS,
  academicListPath,
  type AcademicTab,
} from "@/lib/academic/tabs";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import {
  GRADES_TABS,
  moduleListPath,
  REPORTING_TABS,
  STUDENT_TABS,
  TIMETABLE_TABS,
  type GradesTab,
  type ReportingTab,
  type StudentTab,
  type TimetableTab,
} from "@/lib/modules/tabs";
import { staffListTabsForRole, type StaffListTab } from "@/lib/staff/functions";
import { staffListPath } from "@/lib/staff/routes";
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
  | "schools"
  | "platform"
  | "notifications"
  | "settings"
  | "profile";

export type NavHref = `/${string}`;

export type NavChildKind =
  | "academic"
  | "staff"
  | "students"
  | "reporting"
  | "grades"
  | "timetable";

/** Sous-entrée (onglets module). */
export type NavChildItem = {
  href: NavHref;
  kind: NavChildKind;
  tab: AcademicTab | StaffListTab | StudentTab | ReportingTab | GradesTab | TimetableTab;
};

export type NavItem = {
  href: NavHref;
  key: NavItemKey;
  icon: LucideIcon;
  children?: NavChildItem[];
};

function item(
  href: NavHref,
  key: NavItemKey,
  icon: LucideIcon,
  children?: NavChildItem[],
): NavItem {
  return { href, key, icon, children };
}

function academicNavChildren(home: `/${string}`): NavChildItem[] {
  return ACADEMIC_TABS.map((tab) => ({
    href: academicListPath(home, tab),
    kind: "academic" as const,
    tab,
  }));
}

function staffNavChildren(home: `/${string}`, role: AppRole): NavChildItem[] {
  return staffListTabsForRole(role).map((tab) => ({
    href: staffListPath(home, tab),
    kind: "staff" as const,
    tab,
  }));
}

function studentsNavChildren(home: `/${string}`): NavChildItem[] {
  return STUDENT_TABS.map((tab) => ({
    href: moduleListPath(home, "students", tab, "all"),
    kind: "students" as const,
    tab,
  }));
}

function reportingNavChildren(home: `/${string}`): NavChildItem[] {
  return REPORTING_TABS.map((tab) => ({
    href: moduleListPath(home, "reporting", tab, "templates"),
    kind: "reporting" as const,
    tab,
  }));
}

function gradesNavChildren(
  home: `/${string}`,
  module: "grades" | "sequences",
): NavChildItem[] {
  return GRADES_TABS.map((tab) => ({
    href: moduleListPath(home, module, tab, "sessions"),
    kind: "grades" as const,
    tab,
  }));
}

function timetableNavChildren(home: `/${string}`): NavChildItem[] {
  return TIMETABLE_TABS.map((tab) => ({
    href: moduleListPath(home, "timetable", tab, "overview"),
    kind: "timetable" as const,
    tab,
  }));
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
        item(`${home}/students`, "students", GraduationCap, studentsNavChildren(home)),
        item(`${home}/staff`, "staff", Users, staffNavChildren(home, role)),
        item(`${home}/academic`, "academic", BookOpen, academicNavChildren(home)),
        item(
          `${home}/grades`,
          "sequences",
          ClipboardList,
          gradesNavChildren(home, "grades"),
        ),
        item(`${home}/reporting`, "reporting", FileSpreadsheet, reportingNavChildren(home)),
        item(`${home}/timetable`, "timetable", CalendarDays, timetableNavChildren(home)),
        ...sharedTail,
      ];
    case "DIRECTOR":
      return [
        item(home, "home", LayoutDashboard),
        item(`${home}/students`, "students", GraduationCap, studentsNavChildren(home)),
        item(`${home}/staff`, "staff", Users, staffNavChildren(home, role)),
        item(`${home}/academic`, "academic", BookOpen, academicNavChildren(home)),
        item(
          `${home}/sequences`,
          "sequences",
          Shield,
          gradesNavChildren(home, "sequences"),
        ),
        item(`${home}/reporting`, "reporting", FileSpreadsheet, reportingNavChildren(home)),
        item(`${home}/timetable`, "timetable", CalendarDays, timetableNavChildren(home)),
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
