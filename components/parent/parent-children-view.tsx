"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { ParentChildSwitcher } from "@/components/parent/parent-child-switcher";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { HubLoadingRows } from "@/components/workspace/hub-chrome";
import { Link } from "@/i18n/navigation";
import {
  listAcademicYears,
  listClasses,
  type AcademicYearResponse,
  type SchoolClassResponse,
} from "@/lib/api/academic";
import {
  listEnrollmentsByStudent,
  type EnrollmentResponse,
} from "@/lib/api/student";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import {
  childInitials,
  guardianLinkForMe,
  useParentChildren,
} from "@/lib/parent/use-parent-children";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { ApiError, isAuthFailure } from "@/types/api";

/** Accueil famille — liste des enfants liés + raccourcis. */
export function ParentChildrenView() {
  const t = useTranslations("parentSpace");
  const tCommon = useTranslations("common");
  const home = getRoleHomePath("PARENT");

  const {
    schoolId,
    guardianId,
    loading,
    error,
    children,
    selected,
    selectedId,
    setSelectedId,
  } = useParentChildren();

  const [year, setYear] = useState<AcademicYearResponse | null>(null);
  const [classes, setClasses] = useState<SchoolClassResponse[]>([]);
  const [enrollment, setEnrollment] = useState<EnrollmentResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadYear = useCallback(async () => {
    try {
      const years = await listAcademicYears({ page: 0, size: 20, schoolId });
      const current =
        years.content.find((y) => y.current) ??
        years.content.find((y) => y.status === "ACTIVE") ??
        years.content[0] ??
        null;
      setYear(current);
      if (!current) {
        setClasses([]);
        return;
      }
      const classPage = await listClasses({
        academicYearId: current.id,
        page: 0,
        size: 100,
        active: true,
        schoolId,
      });
      setClasses(classPage.content);
    } catch (err) {
      if (isAuthFailure(err)) return;
      setYear(null);
      setClasses([]);
    }
  }, [schoolId]);

  useEffect(() => {
    void loadYear();
  }, [loadYear]);

  useEffect(() => {
    if (!selected || !year) {
      setEnrollment(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void (async () => {
      try {
        const rows = await listEnrollmentsByStudent(selected.id, schoolId);
        if (cancelled) return;
        const current =
          rows.find(
            (e) => e.academicYearId === year.id && e.status === "ENROLLED",
          ) ??
          rows.find((e) => e.academicYearId === year.id) ??
          rows[0] ??
          null;
        setEnrollment(current);
      } catch (err) {
        if (isAuthFailure(err)) return;
        if (!cancelled) {
          setEnrollment(null);
          notify.error(
            err instanceof ApiError && err.message ? err.message : t("loadError"),
          );
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, year, schoolId, t]);

  useEffect(() => {
    if (error === "LOAD") notify.error(t("loadError"));
  }, [error, t]);

  if (!guardianId) {
    return (
      <div className="space-y-5 slide-up">
        <PageHeader description={t("children.description")} />
        <EmptyState
          title={t("noProfileTitle")}
          description={t("noProfileDescription")}
          icon={<Users className="size-9 stroke-[1.5]" aria-hidden />}
        />
      </div>
    );
  }

  const className =
    enrollment && classes.find((c) => c.id === enrollment.classId)?.name;

  return (
    <div className="space-y-5 slide-up">
      <PageHeader description={t("children.description")} />

      {loading ? (
        <HubLoadingRows />
      ) : children.length === 0 ? (
        <EmptyState
          title={t("children.emptyTitle")}
          description={t("children.emptyDescription")}
          icon={<Users className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : (
        <>
          <ParentChildSwitcher
            childrenList={children}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {children.map((child) => {
              const active = child.id === selectedId;
              const link = guardianLinkForMe(child, guardianId);
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setSelectedId(child.id)}
                  className={cn(
                    "pressable flex items-start gap-3 rounded-[var(--radius-xl)] border px-4 py-4 text-left transition-colors duration-[var(--duration-fast)] focus-visible:shadow-[var(--focus-ring)]",
                    active
                      ? "border-[color-mix(in_srgb,var(--ios-blue)_40%,var(--ios-separator))] bg-[color-mix(in_srgb,var(--ios-blue)_6%,var(--ios-card))] shadow-[var(--ios-shadow)]"
                      : "border-[var(--ios-separator)]/55 bg-[var(--ios-card)] shadow-[var(--ios-shadow)] hover:bg-[color-mix(in_srgb,var(--ios-fill)_35%,var(--ios-card))]",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold",
                      active
                        ? "bg-[var(--ios-blue)] text-white"
                        : "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]",
                    )}
                    aria-hidden
                  >
                    {childInitials(child)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[15px] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
                        {child.fullName}
                      </p>
                      {link?.primary ? (
                        <Badge tone="blue">{t("primaryContact")}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[12px] text-[var(--ios-secondary-label)]">
                      {t("matricule", { value: child.matricule })}
                    </p>
                    <p className="mt-2 text-[11px] text-[var(--ios-tertiary-label)]">
                      {link
                        ? t(`relationship.${link.relationship}`)
                        : t("relationship.OTHER")}
                    </p>
                  </div>
                  <ChevronRight
                    className="mt-1 size-4 shrink-0 text-[var(--ios-tertiary-label)]"
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>

          {selected ? (
            <section className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
              <div className="border-b border-[var(--ios-separator)]/55 px-4 py-3.5 sm:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ios-tertiary-label)]">
                  {t("selectedChild")}
                </p>
                <h2 className="mt-0.5 text-[17px] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
                  {selected.fullName}
                </h2>
                <p className="mt-1 text-[13px] text-[var(--ios-secondary-label)]">
                  {detailLoading
                    ? tCommon("loading")
                    : className
                      ? t("enrolledIn", {
                          className,
                          year: year?.label ?? "—",
                        })
                      : t("noEnrollment")}
                </p>
              </div>
              <div className="grid divide-y divide-[var(--ios-separator)]/55 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {(
                  [
                    {
                      href: `${home}/grades`,
                      icon: ClipboardList,
                      label: t("shortcuts.grades"),
                      hint: t("shortcuts.gradesHint"),
                    },
                    {
                      href: `${home}/report-cards`,
                      icon: FileSpreadsheet,
                      label: t("shortcuts.reportCards"),
                      hint: t("shortcuts.reportCardsHint"),
                    },
                    {
                      href: `${home}/timetable`,
                      icon: CalendarDays,
                      label: t("shortcuts.timetable"),
                      hint: t("shortcuts.timetableHint"),
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
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
