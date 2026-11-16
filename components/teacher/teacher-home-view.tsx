"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { RoleDashboard } from "@/components/workspace/role-dashboard";
import { Link } from "@/i18n/navigation";
import {
  listAcademicYears,
  listTeacherAssignments,
  localizedLabel,
  type TeacherAssignmentResponse,
} from "@/lib/api/academic";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import { formatCoefficient } from "@/lib/grading/marks";
import { useAuthStore } from "@/stores/auth-store";
import { isAuthFailure } from "@/types/api";
import { cn } from "@/lib/utils/cn";

function classInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return (trimmed.split(/\s+/)[0] ?? trimmed).slice(0, 2).toUpperCase();
}

/** Accueil enseignant = tableau de bord + raccourcis vers matières actives. */
export function TeacherHomeView() {
  const t = useTranslations("teacherSpace");
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId;
  const staffProfileId = user?.profileType === "STAFF" ? user.profileId : null;
  const home = getRoleHomePath("TEACHER");

  const [rows, setRows] = useState<TeacherAssignmentResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!staffProfileId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const years = await listAcademicYears({ page: 0, size: 20, schoolId });
      const current =
        years.content.find((y) => y.current) ??
        years.content.find((y) => y.status === "ACTIVE") ??
        years.content[0] ??
        null;
      if (!current) {
        setRows([]);
        return;
      }
      const assignments = await listTeacherAssignments(staffProfileId, {
        schoolId,
        academicYearId: current.id,
      });
      setRows(assignments.filter((a) => a.active).slice(0, 6));
    } catch (error) {
      if (isAuthFailure(error)) return;
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId, staffProfileId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <RoleDashboard />

      {staffProfileId ? (
        <section className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] shadow-[var(--ios-shadow)] slide-up">
          <div className="border-b border-[var(--ios-separator)]/55 px-4 py-3.5 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ios-tertiary-label)]">
              {t("home.quickTitle")}
            </p>
            <h2 className="mt-0.5 text-[17px] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
              {t("home.quickHeadline")}
            </h2>
            <p className="mt-1 text-[13px] text-[var(--ios-secondary-label)]">
              {t("home.quickHint")}
            </p>
          </div>

          <div className="grid divide-y divide-[var(--ios-separator)]/55 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {(
              [
                {
                  href: `${home}/classes`,
                  icon: BookOpen,
                  label: t("home.shortcuts.classes"),
                  hint: t("home.shortcuts.classesHint"),
                },
                {
                  href: `${home}/grades`,
                  icon: ClipboardList,
                  label: t("home.shortcuts.grades"),
                  hint: t("home.shortcuts.gradesHint"),
                },
                {
                  href: `${home}/timetable`,
                  icon: CalendarDays,
                  label: t("home.shortcuts.timetable"),
                  hint: t("home.shortcuts.timetableHint"),
                },
              ] as const
            ).map((item) => (
              <Link
                key={item.href}
                href={item.href as `/${string}`}
                className="pressable flex items-start gap-3 px-4 py-4 transition-colors hover:bg-[color-mix(in_srgb,var(--ios-blue)_6%,transparent)] focus-visible:shadow-[var(--focus-ring)] sm:px-5"
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--ios-blue)_12%,transparent)] text-[var(--ios-blue)]">
                  <item.icon className="size-[18px] stroke-[1.75]" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-[var(--ios-label)]">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-[var(--ios-secondary-label)]">
                    {item.hint}
                  </span>
                </span>
              </Link>
            ))}
          </div>

          {!loading && rows.length > 0 ? (
            <div className="border-t border-[var(--ios-separator)]/55 px-4 py-4 sm:px-5">
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ios-tertiary-label)]">
                {t("home.assignmentsTitle")}
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {rows.map((item) => {
                  const subject = localizedLabel(item.subjectName, locale);
                  return (
                    <li key={item.classSubjectId}>
                      <Link
                        href={
                          `${home}/grades?classSubjectId=${encodeURIComponent(item.classSubjectId)}` as `/${string}`
                        }
                        className={cn(
                          "pressable flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[color-mix(in_srgb,var(--ios-fill)_18%,var(--ios-card))] px-3 py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--ios-blue)_6%,var(--ios-card))] focus-visible:shadow-[var(--focus-ring)]",
                        )}
                      >
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--ios-blue)_12%,var(--ios-fill))] text-[11px] font-semibold text-[var(--ios-blue)]"
                          aria-hidden
                        >
                          {classInitial(item.className)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-[var(--ios-label)]">
                            {item.className}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-[var(--ios-secondary-label)]">
                            {subject} · coef. {formatCoefficient(item.coefficient, locale)}
                          </span>
                        </span>
                        <ChevronRight
                          className="size-4 shrink-0 text-[var(--ios-tertiary-label)]"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
