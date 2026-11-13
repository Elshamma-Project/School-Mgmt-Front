"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchDashboardSummary,
  type DashboardSummary,
} from "@/lib/api/dashboard";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import { moduleListPath } from "@/lib/modules/tabs";
import { staffListPath } from "@/lib/staff/routes";
import { isAuthFailure } from "@/types/api";
import type { AppRole } from "@/types/auth";

export type DashboardStatKey =
  | "students"
  | "staff"
  | "enrolled"
  | "openSessions"
  | "assignments"
  | "weeklyHours"
  | "unread"
  | "pendingSheets"
  | "pendingCorrections";

export type DashboardStat = {
  key: DashboardStatKey;
  value: number;
  href?: `/${string}`;
};

export type DashboardAttention = {
  id: string;
  kind: "unread" | "sheets" | "corrections" | "sessions" | "yearLocked" | "deadline";
  count?: number;
  href?: `/${string}`;
};

export type SessionBreakdown = {
  open: number;
  closed: number;
  planned: number;
  total: number;
};

export type DashboardData = {
  loading: boolean;
  summary: DashboardSummary | null;
  yearLabel: string | null;
  yearStatus: string | null;
  yearLocked: boolean;
  academicYearId: string | null;
  sessionBreakdown: SessionBreakdown;
  stats: DashboardStat[];
  attention: DashboardAttention[];
};

const EMPTY_BREAKDOWN: SessionBreakdown = {
  open: 0,
  closed: 0,
  planned: 0,
  total: 0,
};

const EMPTY: DashboardData = {
  loading: true,
  summary: null,
  yearLabel: null,
  yearStatus: null,
  yearLocked: false,
  academicYearId: null,
  sessionBreakdown: EMPTY_BREAKDOWN,
  stats: [],
  attention: [],
};

export function useDashboardData(options: {
  role: AppRole | null;
  roles: AppRole[];
  schoolId: string | null | undefined;
  profileId: string | null | undefined;
}): DashboardData {
  const { role, schoolId } = options;
  const [data, setData] = useState<DashboardData>(EMPTY);

  const home = useMemo(
    () => (role ? getRoleHomePath(role) : ("/administration" as const)),
    [role],
  );

  const load = useCallback(async () => {
    if (!role) {
      setData({ ...EMPTY, loading: false });
      return;
    }

    setData((prev) => ({ ...prev, loading: true }));

    try {
      const summary = await fetchDashboardSummary(schoolId);
      const gradesModule = role === "DIRECTOR" ? "sequences" : "grades";
      const counts = summary.counts;
      const sessions = summary.sessions;
      const year = summary.academicYear;

      const sessionBreakdown: SessionBreakdown = sessions
        ? {
            open: sessions.open,
            closed: sessions.closed,
            planned: sessions.planned,
            total: sessions.total,
          }
        : EMPTY_BREAKDOWN;

      const stats: DashboardStat[] = [];
      if (counts.activeStudents != null) {
        stats.push({
          key: "students",
          value: counts.activeStudents,
          href: moduleListPath(home, "students", "all", "all"),
        });
      }
      if (counts.enrolledStudents != null) {
        stats.push({
          key: "enrolled",
          value: counts.enrolledStudents,
          href: moduleListPath(home, "students", "enrollments", "all"),
        });
      }
      if (counts.activeStaff != null) {
        stats.push({
          key: "staff",
          value: counts.activeStaff,
          href: staffListPath(home),
        });
      }
      if (counts.teacherAssignments != null) {
        stats.push({
          key: "assignments",
          value: counts.teacherAssignments,
          href: `${home}/grades` as `/${string}`,
        });
      }
      if (summary.teacherWorkload != null) {
        stats.push({
          key: "weeklyHours",
          value: summary.teacherWorkload.weeklyHours,
          href: `${home}/classes` as `/${string}`,
        });
      }
      if (counts.openSessions != null && role !== "TEACHER") {
        stats.push({
          key: "openSessions",
          value: counts.openSessions,
          href: moduleListPath(home, gradesModule, "sessions", "sessions"),
        });
      }
      if (counts.pendingReportSheets != null) {
        stats.push({
          key: "pendingSheets",
          value: counts.pendingReportSheets,
          href: moduleListPath(home, gradesModule, "reportSheets", "sessions"),
        });
      }
      if (counts.pendingCorrections != null) {
        stats.push({
          key: "pendingCorrections",
          value: counts.pendingCorrections,
          href: moduleListPath(home, gradesModule, "corrections", "sessions"),
        });
      }
      stats.push({
        key: "unread",
        value: counts.unreadNotifications,
        href: `${home}/notifications` as `/${string}`,
      });

      const attention: DashboardAttention[] = [];
      if (year?.locked) {
        attention.push({ id: "year-locked", kind: "yearLocked" });
      }
      const deadlineCount = sessions?.upcomingDeadlines.length ?? 0;
      if (deadlineCount > 0) {
        attention.push({
          id: "deadline",
          kind: "deadline",
          count: deadlineCount,
          href: moduleListPath(home, gradesModule, "sessions", "sessions"),
        });
      }
      if (counts.unreadNotifications > 0) {
        attention.push({
          id: "unread",
          kind: "unread",
          count: counts.unreadNotifications,
          href: `${home}/notifications` as `/${string}`,
        });
      }
      if ((counts.pendingReportSheets ?? 0) > 0) {
        attention.push({
          id: "sheets",
          kind: "sheets",
          count: counts.pendingReportSheets ?? 0,
          href: moduleListPath(home, gradesModule, "reportSheets", "sessions"),
        });
      }
      if ((counts.pendingCorrections ?? 0) > 0) {
        attention.push({
          id: "corrections",
          kind: "corrections",
          count: counts.pendingCorrections ?? 0,
          href: moduleListPath(home, gradesModule, "corrections", "sessions"),
        });
      }
      if ((counts.openSessions ?? 0) > 0) {
        attention.push({
          id: "sessions",
          kind: "sessions",
          count: counts.openSessions ?? 0,
          href:
            role === "TEACHER"
              ? (`${home}/grades` as `/${string}`)
              : moduleListPath(home, gradesModule, "sessions", "sessions"),
        });
      }

      setData({
        loading: false,
        summary,
        yearLabel: year?.label ?? null,
        yearStatus: year?.status ?? null,
        yearLocked: Boolean(year?.locked),
        academicYearId: year?.id ?? null,
        sessionBreakdown,
        stats,
        attention,
      });
    } catch (error) {
      if (isAuthFailure(error)) return;
      setData({ ...EMPTY, loading: false });
    }
  }, [home, role, schoolId]);

  useEffect(() => {
    void load();
  }, [load]);

  return data;
}
