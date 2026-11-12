"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, ClipboardList } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  HubLoadingRows,
  HubTableShell,
  HubYearBanner,
} from "@/components/workspace/hub-chrome";
import { Link } from "@/i18n/navigation";
import {
  listAcademicYears,
  listTeacherAssignments,
  localizedLabel,
  type AcademicYearResponse,
  type TeacherAssignmentResponse,
} from "@/lib/api/academic";
import { formatCoefficient } from "@/lib/grading/marks";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError, isAuthFailure } from "@/types/api";

const th =
  "px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]";

/** Liste simple des classes / matières affectées à l’enseignant connecté. */
export function TeacherClassesView() {
  const t = useTranslations("teacherClasses");
  const tHub = useTranslations("gradesHub");
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId;
  const staffProfileId = user?.profileType === "STAFF" ? user.profileId : null;
  const gradesHref = `${getRoleHomePath("TEACHER")}/grades`;

  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYearResponse | null>(null);
  const [rows, setRows] = useState<TeacherAssignmentResponse[]>([]);

  const load = useCallback(async () => {
    if (!staffProfileId) {
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
      setYear(current);
      if (!current) {
        setRows([]);
        return;
      }
      const assignments = await listTeacherAssignments(staffProfileId, {
        schoolId,
        academicYearId: current.id,
      });
      setRows(
        [...assignments].sort(
          (a, b) =>
            a.className.localeCompare(b.className, locale) ||
            localizedLabel(a.subjectName, locale).localeCompare(
              localizedLabel(b.subjectName, locale),
              locale,
            ),
        ),
      );
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(error instanceof ApiError && error.message ? error.message : t("loadError"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [locale, schoolId, staffProfileId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const yearStatus = year?.status ?? null;
  const yearStatusText = useMemo(
    () =>
      yearStatus && tHub.has(`yearStatus.${yearStatus}`) ? tHub(`yearStatus.${yearStatus}`) : yearStatus,
    [tHub, yearStatus],
  );

  if (!staffProfileId) {
    return (
      <div className="space-y-5 slide-up">
        <PageHeader description={t("description")} />
        <EmptyState
          title={t("noStaffProfileTitle")}
          description={t("noStaffProfileDescription")}
          icon={<BookOpen className="size-9 stroke-[1.5]" aria-hidden />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 slide-up">
      <PageHeader description={t("description")} />

      <HubYearBanner
        label={t("yearLabel")}
        yearLabel={year?.label ?? null}
        yearStatus={yearStatus}
        yearStatusLabel={yearStatusText}
        yearLocked={Boolean(year?.locked)}
        lockedLabel={year?.locked ? tHub("yearLockedBadge") : null}
        loading={loading}
        emptyLabel={t("yearEmpty")}
      />

      {loading ? (
        <HubLoadingRows rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          icon={<BookOpen className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : (
        <>
          <ul className="space-y-2.5 md:hidden">
            {rows.map((item) => (
              <li
                key={item.classSubjectId}
                className="rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-3.5 shadow-[var(--ios-shadow)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[var(--ios-label)]">
                      {item.className}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--ios-secondary-label)]">
                      {localizedLabel(item.subjectName, locale)}
                    </p>
                  </div>
                  <Badge tone="blue">
                    {t("coefficient", { coef: formatCoefficient(item.coefficient, locale) })}
                  </Badge>
                </div>
                {item.weeklyHours ? (
                  <p className="mt-1.5 text-[11px] text-[var(--ios-secondary-label)]">
                    {t("weeklyHours", { hours: item.weeklyHours })}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          <HubTableShell countLabel={t("tableCount", { count: rows.length })}>
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
                  <th className={th}>{t("columns.class")}</th>
                  <th className={cn(th, "px-3")}>{t("columns.subject")}</th>
                  <th className={cn(th, "px-3")}>{t("columns.coefficient")}</th>
                  <th className={cn(th, "px-3")}>{t("columns.hours")}</th>
                  <th className={cn(th, "text-right")}>
                    <span className="sr-only">{t("openGrades")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item, index) => (
                  <tr
                    key={item.classSubjectId}
                    className={cn(
                      "border-b border-[var(--ios-separator)]/55 last:border-b-0",
                      index % 2 === 1 && "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                    )}
                  >
                    <td className="px-5 py-3.5 text-[13px] font-semibold text-[var(--ios-label)]">
                      {item.className}
                    </td>
                    <td className="px-3 py-3.5 text-[13px] text-[var(--ios-label)]">
                      {localizedLabel(item.subjectName, locale)}
                      <span className="ml-2 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                        {item.subjectCode}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-[12px] tabular-nums text-[var(--ios-label)]">
                      {formatCoefficient(item.coefficient, locale)}
                    </td>
                    <td className="px-3 py-3.5 text-[12px] tabular-nums text-[var(--ios-secondary-label)]">
                      {item.weeklyHours ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={gradesHref}
                        className="pressable inline-flex h-[var(--control-height-sm)] items-center gap-2 rounded-[var(--radius-md)] px-3 text-[11px] font-semibold text-[var(--ios-blue)] hover:bg-[var(--ios-fill)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                      >
                        <ClipboardList className="size-3.5" aria-hidden />
                        {t("openGrades")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HubTableShell>
        </>
      )}
    </div>
  );
}
