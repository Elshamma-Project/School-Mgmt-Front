"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, FileDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  TimetableEntryDialog,
  type EntryDialogSeed,
} from "@/components/timetable/timetable-entry-dialog";
import { TimetableWeekGrid } from "@/components/timetable/timetable-week-grid";
import { TimetableChangeDialog } from "@/components/teacher/timetable-change-dialog";
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
  listSubjects,
  type AcademicYearResponse,
  type SchoolClassResponse,
  type SubjectResponse,
} from "@/lib/api/academic";
import {
  downloadTimetableClassPdf,
  listTimeSlotGrids,
  listTimetableEntries,
  listTimetables,
  type DayOfWeek,
  type TimeSlotGridResponse,
  type TimetableEntryResponse,
  type TimetableResponse,
} from "@/lib/api/timetable";
import { notify } from "@/lib/ui/notify";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError, isAuthFailure } from "@/types/api";

type ViewMode = "mine" | "general";

/** Emploi du temps enseignant — mes cours + EDT général par classe (PUBLISHED). */
export function TeacherTimetableView() {
  const t = useTranslations("teacherTimetable");
  const tHub = useTranslations("timetableHub");
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId;
  const staffProfileId = user?.profileType === "STAFF" ? user.profileId : null;

  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [view, setView] = useState<ViewMode>("mine");
  const [year, setYear] = useState<AcademicYearResponse | null>(null);
  const [timetable, setTimetable] = useState<TimetableResponse | null>(null);
  const [grid, setGrid] = useState<TimeSlotGridResponse | null>(null);
  const [entries, setEntries] = useState<TimetableEntryResponse[]>([]);
  const [classes, setClasses] = useState<SchoolClassResponse[]>([]);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [filterClassId, setFilterClassId] = useState<string>("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSeed, setDetailSeed] = useState<EntryDialogSeed | null>(null);
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeEntry, setChangeEntry] = useState<TimetableEntryResponse | null>(null);

  const loadCore = useCallback(async () => {
    if (!staffProfileId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [years, subjectsPage] = await Promise.all([
        listAcademicYears({ page: 0, size: 20, schoolId }),
        listSubjects({ page: 0, size: 200, active: true, schoolId }),
      ]);
      setSubjects(subjectsPage.content);
      const current =
        years.content.find((y) => y.current) ??
        years.content.find((y) => y.status === "ACTIVE") ??
        years.content[0] ??
        null;
      setYear(current);
      if (!current) {
        setTimetable(null);
        setGrid(null);
        setEntries([]);
        setClasses([]);
        return;
      }

      const [ttList, classesPage, grids] = await Promise.all([
        listTimetables({ academicYearId: current.id, schoolId }),
        listClasses({
          academicYearId: current.id,
          page: 0,
          size: 100,
          active: true,
          schoolId,
        }),
        listTimeSlotGrids({ academicYearId: current.id, schoolId }),
      ]);
      setClasses(classesPage.content);

      const published = ttList.find((x) => x.status === "PUBLISHED") ?? null;
      setTimetable(published);
      if (!published) {
        setGrid(null);
        setEntries([]);
        return;
      }

      const matchedGrid =
        grids.find((g) => g.id === published.gridId) ?? grids[0] ?? null;
      setGrid(matchedGrid);
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(
        error instanceof ApiError && error.message ? error.message : t("loadError"),
      );
      setTimetable(null);
      setGrid(null);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId, staffProfileId, t]);

  const loadEntries = useCallback(async () => {
    if (!staffProfileId || !timetable) {
      setEntries([]);
      return;
    }
    if (view === "general" && !filterClassId) {
      setEntries([]);
      return;
    }
    setEntriesLoading(true);
    try {
      // Mes cours : tout charger puis filtrer côté client.
      // Général : une classe → toutes les cases.
      const entryList = await listTimetableEntries({
        timetableId: timetable.id,
        schoolId,
        ...(view === "mine"
          ? { teacherId: staffProfileId }
          : { classId: filterClassId }),
      });
      setEntries(entryList);
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(
        error instanceof ApiError && error.message ? error.message : t("loadError"),
      );
      setEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  }, [staffProfileId, timetable, view, filterClassId, schoolId, t]);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    setFilterClassId("");
  }, [view]);

  const classNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of classes) map[c.id] = c.name;
    return map;
  }, [classes]);

  const mineClassOptions = useMemo(() => {
    const ids = new Set(entries.map((e) => e.classId));
    return classes.filter((c) => ids.has(c.id));
  }, [entries, classes]);

  const classOptions = view === "mine" ? mineClassOptions : classes;

  const visibleEntries = useMemo(() => {
    if (view !== "mine" || !filterClassId) return entries;
    return entries.filter((e) => e.classId === filterClassId);
  }, [view, filterClassId, entries]);

  const periodTotal = useMemo(
    () => visibleEntries.reduce((sum, e) => sum + Math.max(1, e.periodCount), 0),
    [visibleEntries],
  );

  const openDetail = (args: {
    day: DayOfWeek;
    startPeriod: number | null;
    entries: TimetableEntryResponse[];
  }) => {
    const primary = args.entries[0];
    if (!primary) return;
    setDetailSeed({
      day: args.day,
      startPeriod: args.startPeriod,
      classId: primary.classId,
      entry: primary,
    });
    setDetailOpen(true);
  };

  const canRequestChange = (entry: TimetableEntryResponse | null | undefined) =>
    Boolean(entry && staffProfileId && entry.teacherId === staffProfileId);

  const handlePdf = async () => {
    if (!timetable || !filterClassId) {
      notify.error(t("pdfNeedClass"));
      return;
    }
    try {
      const blob = await downloadTimetableClassPdf(timetable.id, filterClassId, {
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

  if (!staffProfileId) {
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

  const showGrid = Boolean(timetable && grid);
  const waitingGeneralClass = view === "general" && !filterClassId;
  const emptyMine = view === "mine" && !entriesLoading && visibleEntries.length === 0;
  const emptyGeneral =
    view === "general" && filterClassId && !entriesLoading && entries.length === 0;

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
          timetable?.status === "PUBLISHED"
            ? view === "mine"
              ? t("hintPublishedMine", { revision: timetable.revision })
              : t("hintPublishedGeneral", { revision: timetable.revision })
            : timetable?.status === "DRAFT"
              ? t("hintDraft")
              : t("hintEmpty")
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

      <p className="text-[12px] text-[var(--ios-secondary-label)]">{t("changeHint")}</p>

      {loading ? (
        <HubLoadingRows />
      ) : !showGrid ? (
        <EmptyState
          title={t("empty.title")}
          description={t("empty.description")}
          icon={<CalendarDays className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid gap-1 text-[12px] text-[var(--ios-secondary-label)]">
                {t("filterClass")}
                <Select
                  value={filterClassId}
                  onChange={(e) => setFilterClassId(e.target.value)}
                  className="min-w-[180px]"
                >
                  <option value="">
                    {view === "mine" ? t("allMyClasses") : t("pickClass")}
                  </option>
                  {classOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </label>
              {!waitingGeneralClass ? (
                <p className="pb-2 text-[12px] text-[var(--ios-secondary-label)]">
                  {t("periodCount", { count: periodTotal })}
                </p>
              ) : null}
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={!filterClassId}
              onClick={() => void handlePdf()}
            >
              <FileDown className="size-4" /> {t("pdf")}
            </Button>
          </div>

          {entriesLoading ? (
            <HubLoadingRows />
          ) : waitingGeneralClass ? (
            <EmptyState
              title={t("emptyGeneralPick.title")}
              description={t("emptyGeneralPick.description")}
              icon={<CalendarDays className="size-9 stroke-[1.5]" aria-hidden />}
            />
          ) : emptyMine ? (
            <EmptyState
              title={t("emptyMine.title")}
              description={t("emptyMine.description")}
              icon={<CalendarDays className="size-9 stroke-[1.5]" aria-hidden />}
            />
          ) : emptyGeneral ? (
            <EmptyState
              title={t("emptyGeneral.title")}
              description={t("emptyGeneral.description")}
              icon={<CalendarDays className="size-9 stroke-[1.5]" aria-hidden />}
            />
          ) : (
            <TimetableWeekGrid
              grid={grid!}
              entries={visibleEntries}
              canEdit={false}
              classNameById={classNameById}
              onCellClick={openDetail}
            />
          )}
        </>
      )}

      <TimetableEntryDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        seed={detailSeed}
        canEdit={false}
        classes={classes}
        classSubjects={[]}
        subjects={subjects}
        teachers={[]}
        rooms={[]}
        saving={false}
        onSave={async () => undefined}
        onRequestChange={
          canRequestChange(detailSeed?.entry)
            ? (entry) => {
                setChangeEntry(entry);
                setDetailOpen(false);
                setChangeOpen(true);
              }
            : undefined
        }
      />

      {timetable ? (
        <TimetableChangeDialog
          open={changeOpen}
          onOpenChange={setChangeOpen}
          schoolId={schoolId}
          timetableId={timetable.id}
          entry={changeEntry}
          classLabel={
            changeEntry ? classNameById[changeEntry.classId] ?? null : null
          }
        />
      ) : null}
    </div>
  );
}
