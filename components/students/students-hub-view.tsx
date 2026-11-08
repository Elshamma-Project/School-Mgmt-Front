"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GraduationCap, UserRound, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import {
  HubLoadingRows,
  HubStatusPill,
  HubTableShell,
  HubToolbar,
  HubYearBanner,
} from "@/components/workspace/hub-chrome";
import { useRouter } from "@/i18n/navigation";
import { listAcademicYears } from "@/lib/api/academic";
import {
  listEnrollments,
  listStudents,
  type EnrollmentResponse,
  type StudentResponse,
} from "@/lib/api/student";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import {
  moduleListPath,
  parseStudentTab,
  STUDENT_TABS,
  type StudentTab,
} from "@/lib/modules/tabs";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError, isAuthFailure } from "@/types/api";
import { primaryRole } from "@/types/auth";

export function StudentsHubView() {
  const t = useTranslations("students");
  const router = useRouter();
  const searchParams = useSearchParams();
  const schoolId = useAuthStore((s) => s.user?.schoolId);
  const role = primaryRole(useAuthStore((s) => s.user));
  const workspaceHome = role ? getRoleHomePath(role) : "/administration";

  const tab = parseStudentTab(searchParams.get("tab"));
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [yearLabel, setYearLabel] = useState<string | null>(null);
  const [yearStatus, setYearStatus] = useState<string | null>(null);
  const [yearId, setYearId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentResponse[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentResponse[]>([]);

  const selectTab = (next: StudentTab) => {
    router.replace(moduleListPath(workspaceHome, "students", next, "all"));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [years, studentsPage] = await Promise.all([
        listAcademicYears({ page: 0, size: 20, schoolId }),
        listStudents({ page: 0, size: 100, schoolId }),
      ]);
      const year =
        years.content.find((y) => y.current) ??
        years.content.find((y) => y.status === "ACTIVE") ??
        years.content[0] ??
        null;
      setYearLabel(year?.label ?? null);
      setYearStatus(year?.status ?? null);
      setYearId(year?.id ?? null);
      setStudents(studentsPage.content);

      if (year) {
        const enrollmentsPage = await listEnrollments({
          page: 0,
          size: 100,
          academicYearId: year.id,
          schoolId,
        });
        setEnrollments(enrollmentsPage.content);
      } else {
        setEnrollments([]);
      }
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("loadError"));
      setStudents([]);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const q = query.trim().toLowerCase();
  const filteredStudents = useMemo(() => {
    let rows = students;
    if (tab === "active") rows = rows.filter((s) => s.active);
    if (tab === "inactive") rows = rows.filter((s) => !s.active);
    if (!q) return rows;
    return rows.filter((s) => {
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.matricule.toLowerCase().includes(q) ||
        (s.contact.email?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [q, students, tab]);

  const filteredEnrollments = useMemo(() => {
    if (!q) return enrollments;
    return enrollments.filter((e) =>
      [e.studentId, e.classId, e.status].join(" ").toLowerCase().includes(q),
    );
  }, [enrollments, q]);

  const stats = useMemo(
    () => ({
      total: students.length,
      active: students.filter((s) => s.active).length,
      inactive: students.filter((s) => !s.active).length,
      enrollments: enrollments.length,
    }),
    [enrollments.length, students],
  );

  const showing = tab === "enrollments" ? filteredEnrollments : filteredStudents;

  return (
    <div className="space-y-5 slide-up">
      <HubYearBanner
        label={t("yearLabel")}
        yearLabel={yearLabel}
        yearStatus={yearStatus}
        yearStatusLabel={
          yearStatus && t.has(`yearStatus.${yearStatus}`)
            ? t(`yearStatus.${yearStatus}`)
            : yearStatus
        }
        hint={t("yearHint")}
        loading={loading}
        emptyLabel={t("yearEmpty")}
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatCard
          label={t("stats.total")}
          value={stats.total}
          loading={loading}
          tone="blue"
          active={tab === "all"}
          onSelect={() => selectTab("all")}
          icon={<Users className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
        <StatCard
          label={t("stats.active")}
          value={stats.active}
          loading={loading}
          tone="green"
          active={tab === "active"}
          onSelect={() => selectTab("active")}
          icon={<UserRound className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
        <StatCard
          label={t("stats.inactive")}
          value={stats.inactive}
          loading={loading}
          tone="slate"
          active={tab === "inactive"}
          onSelect={() => selectTab("inactive")}
          icon={<UserRound className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
        <StatCard
          label={t("stats.enrollments")}
          value={stats.enrollments}
          loading={loading}
          tone="amber"
          active={tab === "enrollments"}
          onSelect={() => selectTab("enrollments")}
          icon={<GraduationCap className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
      </div>

      <HubToolbar
        tabs={STUDENT_TABS.map((key) => ({ key, label: t(`tabs.${key}`) }))}
        activeTab={tab}
        onTabChange={(key) => selectTab(key as StudentTab)}
        tabsAriaLabel={t("tabsNav")}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder={t(`search.${tab}`)}
      />

      {loading ? (
        <HubLoadingRows />
      ) : showing.length === 0 ? (
        <EmptyState
          title={t(`empty.${tab}.title`)}
          description={t(`empty.${tab}.description`)}
          icon={<GraduationCap className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : tab === "enrollments" ? (
        <>
          <ul className="space-y-2.5 md:hidden">
            {filteredEnrollments.map((item) => (
              <li
                key={item.id}
                className="rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-3.5 shadow-[var(--ios-shadow)]"
              >
                <p className="text-[13px] font-semibold text-[var(--ios-label)]">{item.status}</p>
                <p className="mt-1 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                  {item.studentId}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--ios-secondary-label)]">
                  {item.classId}
                </p>
              </li>
            ))}
          </ul>
          <HubTableShell countLabel={t("tableCount", { count: filteredEnrollments.length })}>
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
                  <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.studentId")}
                  </th>
                  <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.classId")}
                  </th>
                  <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.status")}
                  </th>
                  <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.year")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEnrollments.map((item, index) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-b border-[var(--ios-separator)]/55 last:border-b-0",
                      index % 2 === 1 &&
                        "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                    )}
                  >
                    <td className="px-5 py-3.5 font-mono text-[12px] text-[var(--ios-label)]">
                      {item.studentId}
                    </td>
                    <td className="px-3 py-3.5 font-mono text-[12px] text-[var(--ios-secondary-label)]">
                      {item.classId}
                    </td>
                    <td className="px-3 py-3.5 text-[12px] text-[var(--ios-label)]">{item.status}</td>
                    <td className="px-5 py-3.5 text-[12px] text-[var(--ios-secondary-label)]">
                      {yearId === item.academicYearId ? yearLabel : item.academicYearId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HubTableShell>
        </>
      ) : (
        <>
          <ul className="space-y-2.5 md:hidden">
            {filteredStudents.map((item) => (
              <li
                key={item.id}
                className="rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-3.5 shadow-[var(--ios-shadow)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[var(--ios-label)]">
                      {item.fullName}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                      {item.matricule}
                    </p>
                  </div>
                  <HubStatusPill
                    active={item.active}
                    activeLabel={t("statusActive")}
                    inactiveLabel={t("inactive")}
                  />
                </div>
              </li>
            ))}
          </ul>
          <HubTableShell countLabel={t("tableCount", { count: filteredStudents.length })}>
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
                  <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.name")}
                  </th>
                  <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.matricule")}
                  </th>
                  <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.sex")}
                  </th>
                  <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((item, index) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-b border-[var(--ios-separator)]/55 last:border-b-0",
                      index % 2 === 1 &&
                        "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                      !item.active && "opacity-70",
                    )}
                  >
                    <td className="px-5 py-3.5 text-[13px] font-semibold text-[var(--ios-label)]">
                      {item.fullName}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="inline-flex rounded-[var(--radius-sm)] border border-[var(--ios-separator)]/70 px-2 py-1 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                        {item.matricule}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-[12px] text-[var(--ios-label)]">
                      {item.sex ?? "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <HubStatusPill
                        active={item.active}
                        activeLabel={t("statusActive")}
                        inactiveLabel={t("inactive")}
                      />
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
