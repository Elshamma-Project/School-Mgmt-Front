"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronRight, Clock3 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  HubLoadingRows,
  HubTableShell,
  HubYearBanner,
} from "@/components/workspace/hub-chrome";
import { useRouter } from "@/i18n/navigation";
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

function classInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const token = trimmed.split(/\s+/)[0] ?? trimmed;
  return token.slice(0, 2).toUpperCase();
}

/** Liste des classes / matières affectées à l’enseignant — ligne entière cliquable vers Notes. */
export function TeacherClassesView() {
  const t = useTranslations("teacherClasses");
  const tHub = useTranslations("gradesHub");
  const locale = useLocale();
  const router = useRouter();
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
            Number(b.active) - Number(a.active) ||
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

  const openGrades = (item: TeacherAssignmentResponse) => {
    if (!item.active) return;
    router.push(`${gradesHref}?classSubjectId=${encodeURIComponent(item.classSubjectId)}`);
  };

  if (!staffProfileId) {
    return (
      <div className="space-y-5 slide-up">
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
            {rows.map((item) => {
              const subject = localizedLabel(item.subjectName, locale);
              return (
                <li key={item.classSubjectId}>
                  <button
                    type="button"
                    disabled={!item.active}
                    onClick={() => openGrades(item)}
                    className={cn(
                      "pressable flex w-full items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-3.5 text-left shadow-[var(--ios-shadow)] transition-colors",
                      item.active
                        ? "cursor-pointer hover:bg-[color-mix(in_srgb,var(--ios-blue)_6%,var(--ios-card))] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                        : "cursor-not-allowed opacity-65",
                    )}
                  >
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--ios-blue)_12%,var(--ios-fill))] text-[12px] font-semibold tracking-[-0.02em] text-[var(--ios-blue)]"
                      aria-hidden
                    >
                      {classInitial(item.className)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-[14px] font-semibold tracking-[-0.015em] text-[var(--ios-label)]">
                          {item.className}
                        </p>
                        {!item.active ? <Badge tone="neutral">{t("inactive")}</Badge> : null}
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-[var(--ios-secondary-label)]">
                        {subject}
                        <span className="ml-1.5 font-mono text-[11px] text-[var(--ios-tertiary-label)]">
                          {item.subjectCode}
                        </span>
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge tone="blue">
                          {t("coefficient", { coef: formatCoefficient(item.coefficient, locale) })}
                        </Badge>
                        {item.weeklyHours != null ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--ios-secondary-label)]">
                            <Clock3 className="size-3" aria-hidden />
                            {t("weeklyHours", { hours: item.weeklyHours })}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {item.active ? (
                      <ChevronRight
                        className="size-4 shrink-0 text-[var(--ios-tertiary-label)]"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          <HubTableShell countLabel={t("tableCount", { count: rows.length })}>
            <table className="w-full min-w-[680px] border-collapse text-left">
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
                {rows.map((item, index) => {
                  const subject = localizedLabel(item.subjectName, locale);
                  return (
                    <tr
                      key={item.classSubjectId}
                      tabIndex={item.active ? 0 : -1}
                      role={item.active ? "link" : undefined}
                      aria-disabled={!item.active}
                      aria-label={
                        item.active
                          ? `${item.className} · ${subject} — ${t("openGrades")}`
                          : `${item.className} · ${subject} — ${t("inactive")}`
                      }
                      onClick={() => openGrades(item)}
                      onKeyDown={(event) => {
                        if (!item.active) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openGrades(item);
                        }
                      }}
                      className={cn(
                        "group border-b border-[var(--ios-separator)]/55 last:border-b-0 transition-colors duration-[var(--duration-fast)]",
                        index % 2 === 1 && "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                        item.active
                          ? "cursor-pointer hover:bg-[color-mix(in_srgb,var(--ios-blue)_6%,var(--ios-card))] focus-visible:bg-[color-mix(in_srgb,var(--ios-blue)_8%,var(--ios-card))] focus-visible:outline-none"
                          : "opacity-65",
                      )}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex min-w-[180px] items-center gap-3">
                          <span
                            className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--ios-blue)_12%,var(--ios-fill))] text-[11px] font-semibold tracking-[-0.02em] text-[var(--ios-blue)]"
                            aria-hidden
                          >
                            {classInitial(item.className)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold tracking-[-0.015em] text-[var(--ios-label)] group-hover:text-[var(--ios-blue)]">
                              {item.className}
                            </p>
                            {!item.active ? (
                              <p className="mt-0.5 text-[11px] text-[var(--ios-secondary-label)]">
                                {t("inactive")}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="text-[13px] text-[var(--ios-label)]">{subject}</p>
                        <span className="mt-1 inline-flex rounded-[var(--radius-sm)] border border-[var(--ios-separator)]/70 bg-[var(--ios-card)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ios-secondary-label)]">
                          {item.subjectCode}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge tone="blue">
                          {formatCoefficient(item.coefficient, locale)}
                        </Badge>
                      </td>
                      <td className="px-3 py-3.5 text-[12px] tabular-nums text-[var(--ios-secondary-label)]">
                        {item.weeklyHours != null ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="size-3.5 opacity-70" aria-hidden />
                            {item.weeklyHours}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {item.active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--ios-blue)] opacity-80 transition-opacity group-hover:opacity-100">
                            {t("openGrades")}
                            <ChevronRight className="size-3.5" aria-hidden />
                          </span>
                        ) : (
                          <Badge tone="neutral">{t("inactive")}</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </HubTableShell>
        </>
      )}
    </div>
  );
}
