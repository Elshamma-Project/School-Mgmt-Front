"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, FileDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
import { notify } from "@/lib/ui/notify";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError, isAuthFailure } from "@/types/api";

type ViewMode = "mine" | "general";

/**
 * Emploi du temps élève — lecture seule + PDF.
 * Vue « ma classe » et vue générale (toute classe). Pas de demande de modification.
 */
export function StudentTimetableView() {
  const t = useTranslations("studentTimetable");
  const tHub = useTranslations("timetableHub");
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId;
  const studentId = user?.profileType === "STUDENT" ? user.profileId : null;

  const [view, setView] = useState<ViewMode>("mine");
  const [year, setYear] = useState<AcademicYearResponse | null>(null);
  const [classes, setClasses] = useState<SchoolClassResponse[]>([]);
  const [myClassId, setMyClassId] = useState<string | null>(null);
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
    view === "mine" ? myClassId : generalClassId.trim() || null;

  const loadCore = useCallback(async () => {
    if (!studentId) {
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
        setClasses([]);
        setTimetable(null);
        setGrid(null);
        return;
      }
      const [classPage, ttList, grids, enrollments] = await Promise.all([
        listClasses({
          academicYearId: current.id,
          page: 0,
          size: 100,
          active: true,
          schoolId,
        }),
        listTimetables({ academicYearId: current.id, schoolId }),
        listTimeSlotGrids({ academicYearId: current.id, schoolId }),
        listEnrollmentsByStudent(studentId, schoolId),
      ]);
      setClasses(classPage.content);
      const enrollment =
        enrollments.find(
          (e) => e.academicYearId === current.id && e.status === "ENROLLED",
        ) ??
        enrollments.find((e) => e.academicYearId === current.id) ??
        null;
      setMyClassId(enrollment?.classId ?? null);
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
  }, [schoolId, studentId, t]);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

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
      notify.error(t("pdfNeedClass"));
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
      notify.error(t("pdfError"));
    }
  };

  if (!studentId) {
    return (
      <div className="space-y-5 slide-up">
        <PageHeader description={t("description")} />
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
  const waitingMyClass = view === "mine" && !myClassId;

  return (
    <div className="space-y-5 slide-up">
      <PageHeader description={t("description")} />

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
            ? t("hintClass", { className: classLabel })
            : view === "general"
              ? t("hintGeneral")
              : t("hint")
        }
        loading={loading}
        emptyLabel={t("yearEmpty")}
      />

      <HubToolbar
        tabs={[
          { key: "mine", label: t("tabs.mine") },
          { key: "general", label: t("tabs.general") },
        ]}
        activeTab={view}
        onTabChange={(key) => setView(key as ViewMode)}
        tabsAriaLabel={t("tabsAria")}
        searchValue=""
        onSearchChange={() => undefined}
        searchPlaceholder=""
        hideSearch
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
          {view === "general" ? (
            <label className="grid gap-1 text-[12px] text-[var(--ios-secondary-label)]">
              {t("filterClass")}
              <Select
                value={generalClassId}
                onChange={(e) => setGeneralClassId(e.target.value)}
                className="min-w-[200px]"
              >
                <option value="">{t("pickClass")}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={!activeClassId || !timetable}
          onClick={() => void handlePdf()}
        >
          <FileDown className="size-4" /> {t("pdf")}
        </Button>
      </div>

      <p className="text-[12px] text-[var(--ios-secondary-label)]">
        {t("readOnlyNotice")}
      </p>

      {loading || entriesLoading ? (
        <HubLoadingRows />
      ) : !timetable || !grid ? (
        <EmptyState
          title={t("empty.title")}
          description={t("empty.description")}
          icon={<CalendarDays className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : waitingGeneralClass ? (
        <EmptyState
          title={t("emptyGeneralPick.title")}
          description={t("emptyGeneralPick.description")}
          icon={<CalendarDays className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : waitingMyClass ? (
        <EmptyState
          title={t("noEnrollmentTitle")}
          description={t("noEnrollmentDescription")}
          icon={<CalendarDays className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : entries.length === 0 ? (
        <EmptyState
          title={t("emptyClass.title")}
          description={t("emptyClass.description")}
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
