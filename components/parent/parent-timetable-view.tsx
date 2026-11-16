"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, FileDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ParentChildSwitcher } from "@/components/parent/parent-child-switcher";
import { TimetableWeekGrid } from "@/components/timetable/timetable-week-grid";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import {
  HubLoadingRows,
  HubToolbar,
  HubYearBanner,
} from "@/components/workspace/hub-chrome";
import {
  listAcademicYears,
  listClasses,
  type AcademicYearResponse,
  type SchoolClassResponse,
} from "@/lib/api/academic";
import { listEnrollmentsByStudent } from "@/lib/api/student";
import {
  downloadTimetableClassPdf,
  listTimeSlotGrids,
  listTimetableEntries,
  listTimetables,
  type TimeSlotGridResponse,
  type TimetableEntryResponse,
  type TimetableResponse,
} from "@/lib/api/timetable";
import { useParentChildren } from "@/lib/parent/use-parent-children";
import { notify } from "@/lib/ui/notify";
import { ApiError, isAuthFailure } from "@/types/api";

type ViewMode = "child" | "general";

/**
 * Emploi du temps parent — lecture seule + PDF.
 * Vue enfant (classe de l’enfant) et vue générale (toute classe).
 * Aucune demande de modification (BR-67 réservé aux enseignants).
 */
export function ParentTimetableView() {
  const t = useTranslations("parentSpace");
  const tHub = useTranslations("timetableHub");
  const locale = useLocale();

  const {
    schoolId,
    guardianId,
    loading: childrenLoading,
    children,
    selected,
    selectedId,
    setSelectedId,
  } = useParentChildren();

  const [view, setView] = useState<ViewMode>("child");
  const [year, setYear] = useState<AcademicYearResponse | null>(null);
  const [classes, setClasses] = useState<SchoolClassResponse[]>([]);
  const [childClassId, setChildClassId] = useState<string | null>(null);
  const [generalClassId, setGeneralClassId] = useState<string>("");
  const [timetable, setTimetable] = useState<TimetableResponse | null>(null);
  const [grid, setGrid] = useState<TimeSlotGridResponse | null>(null);
  const [entries, setEntries] = useState<TimetableEntryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);

  const classNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of classes) map[c.id] = c.name;
    return map;
  }, [classes]);

  const activeClassId =
    view === "child" ? childClassId : generalClassId.trim() || null;

  const loadCore = useCallback(async () => {
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
        setClasses([]);
        setTimetable(null);
        setGrid(null);
        return;
      }
      const [classPage, ttList, grids] = await Promise.all([
        listClasses({
          academicYearId: current.id,
          page: 0,
          size: 100,
          active: true,
          schoolId,
        }),
        listTimetables({ academicYearId: current.id, schoolId }),
        listTimeSlotGrids({ academicYearId: current.id, schoolId }),
      ]);
      setClasses(classPage.content);
      const published = ttList.find((x) => x.status === "PUBLISHED") ?? null;
      setTimetable(published);
      if (!published) {
        setGrid(null);
        return;
      }
      setGrid(grids.find((g) => g.id === published.gridId) ?? grids[0] ?? null);
    } catch (err) {
      if (isAuthFailure(err)) return;
      notify.error(
        err instanceof ApiError && err.message ? err.message : t("loadError"),
      );
      setTimetable(null);
      setGrid(null);
    } finally {
      setLoading(false);
    }
  }, [schoolId, t]);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  useEffect(() => {
    if (childrenLoading) return;
    if (children.length === 0 && view === "child") {
      setView("general");
    }
  }, [childrenLoading, children.length, view]);

  useEffect(() => {
    if (!selected || !year) {
      setChildClassId(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const enrollments = await listEnrollmentsByStudent(selected.id, schoolId);
        if (cancelled) return;
        const current =
          enrollments.find(
            (e) => e.academicYearId === year.id && e.status === "ENROLLED",
          ) ??
          enrollments.find((e) => e.academicYearId === year.id) ??
          null;
        setChildClassId(current?.classId ?? null);
      } catch (err) {
        if (isAuthFailure(err)) return;
        if (!cancelled) setChildClassId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, year, schoolId]);

  useEffect(() => {
    if (!timetable || !activeClassId) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    setEntriesLoading(true);
    void (async () => {
      try {
        const list = await listTimetableEntries({
          timetableId: timetable.id,
          classId: activeClassId,
          schoolId,
        });
        if (!cancelled) setEntries(list);
      } catch (err) {
        if (isAuthFailure(err)) return;
        if (!cancelled) {
          setEntries([]);
          notify.error(
            err instanceof ApiError && err.message ? err.message : t("loadError"),
          );
        }
      } finally {
        if (!cancelled) setEntriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [timetable, activeClassId, schoolId, t]);

  const handlePdf = async () => {
    if (!timetable || !activeClassId) {
      notify.error(t("timetable.pdfNeedClass"));
      return;
    }
    try {
      const blob = await downloadTimetableClassPdf(timetable.id, activeClassId, {
        schoolId,
        language: locale.startsWith("en") ? "EN" : "FR",
      });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      notify.error(t("timetable.pdfError"));
    }
  };

  if (!guardianId) {
    return (
      <div className="space-y-5 slide-up">
        <PageHeader description={t("timetable.description")} />
        <EmptyState
          title={t("noProfileTitle")}
          description={t("noProfileDescription")}
          icon={<CalendarDays className="size-9 stroke-[1.5]" aria-hidden />}
        />
      </div>
    );
  }

  const classLabel = activeClassId ? classNameById[activeClassId] : null;
  const waitingGeneralClass = view === "general" && !generalClassId;
  const waitingChildClass = view === "child" && !childClassId && Boolean(selected);

  return (
    <div className="space-y-5 slide-up">
      <PageHeader description={t("timetable.description")} />

      <HubYearBanner
        label={t("yearLabel")}
        yearLabel={year?.label ?? null}
        yearStatus={year?.status ?? null}
        yearStatusLabel={
          year?.status && tHub.has(`yearStatus.${year.status}`)
            ? tHub(`yearStatus.${year.status}`)
            : year?.status
        }
        yearLocked={Boolean(year?.locked)}
        lockedLabel={null}
        hint={
          classLabel
            ? t("timetable.hintClass", { className: classLabel })
            : view === "general"
              ? t("timetable.hintGeneral")
              : t("timetable.hint")
        }
        loading={childrenLoading || loading}
        emptyLabel={t("yearEmpty")}
      />

      <HubToolbar
        tabs={[
          { key: "child", label: t("timetable.tabs.child") },
          { key: "general", label: t("timetable.tabs.general") },
        ]}
        activeTab={view}
        onTabChange={(key) => setView(key as ViewMode)}
        tabsAriaLabel={t("timetable.tabsAria")}
        searchValue=""
        onSearchChange={() => undefined}
        searchPlaceholder=""
        hideSearch
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
          {view === "child" ? (
            childrenLoading ? null : children.length > 0 ? (
              <ParentChildSwitcher
                childrenList={children}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            ) : null
          ) : (
            <label className="grid gap-1 text-[12px] text-[var(--ios-secondary-label)]">
              {t("timetable.filterClass")}
              <Select
                value={generalClassId}
                onChange={(e) => setGeneralClassId(e.target.value)}
                className="min-w-[200px]"
              >
                <option value="">{t("timetable.pickClass")}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </label>
          )}
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={!activeClassId || !timetable}
          onClick={() => void handlePdf()}
        >
          <FileDown className="size-4" /> {t("timetable.pdf")}
        </Button>
      </div>

      <p className="text-[12px] text-[var(--ios-secondary-label)]">
        {t("timetable.readOnlyNotice")}
      </p>

      {childrenLoading || loading || entriesLoading ? (
        <HubLoadingRows />
      ) : view === "child" && children.length === 0 ? (
        <EmptyState
          title={t("children.emptyTitle")}
          description={t("children.emptyDescription")}
          icon={<CalendarDays className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : !timetable || !grid ? (
        <EmptyState
          title={t("timetable.emptyTitle")}
          description={t("timetable.emptyDescription")}
          icon={<CalendarDays className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : waitingGeneralClass ? (
        <EmptyState
          title={t("timetable.pickClassTitle")}
          description={t("timetable.pickClassDescription")}
          icon={<CalendarDays className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : waitingChildClass || (view === "child" && !childClassId) ? (
        <EmptyState
          title={t("timetable.noEnrollmentTitle")}
          description={t("timetable.noEnrollmentDescription")}
          icon={<CalendarDays className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : entries.length === 0 ? (
        <EmptyState
          title={t("timetable.emptyClassTitle")}
          description={t("timetable.emptyClassDescription")}
          icon={<CalendarDays className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : (
        <TimetableWeekGrid
          grid={grid}
          entries={entries}
          canEdit={false}
          classNameById={classNameById}
        />
      )}
    </div>
  );
}
