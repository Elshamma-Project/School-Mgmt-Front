"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  DoorOpen,
  FileDown,
  FilePenLine,
  Grid3x3,
  Link2,
  Plus,
  RefreshCw,
  Wand2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  TimetableEntryDialog,
  type EntryDialogSeed,
} from "@/components/timetable/timetable-entry-dialog";
import { TimetableChangesPanel } from "@/components/timetable/timetable-changes-panel";
import { TimetableExamsPanel } from "@/components/timetable/timetable-exams-panel";
import { TimetableGridEditor } from "@/components/timetable/timetable-grid-editor";
import { TimetableWeekGrid } from "@/components/timetable/timetable-week-grid";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import {
  HubLoadingRows,
  HubStatusPill,
  HubTableShell,
  HubToolbar,
  HubYearBanner,
} from "@/components/workspace/hub-chrome";
import { useRouter } from "@/i18n/navigation";
import {
  listAcademicYears,
  listClasses,
  listClassSubjects,
  listRooms,
  listSubjects,
  type AcademicYearResponse,
  type ClassSubjectResponse,
  type RoomResponse,
  type SchoolClassResponse,
  type SubjectResponse,
} from "@/lib/api/academic";
import { listStaff, type StaffResponse } from "@/lib/api/staff";
import {
  createTimeSlotGrid,
  createTimetableDraft,
  deleteTimetableEntry,
  downloadTimetableClassPdf,
  getTimetableConflicts,
  linkSessionGroup,
  listTimeSlotGrids,
  listTimetableEntries,
  listTimetables,
  publishTimetable,
  reviseTimetable,
  unlinkSessionGroup,
  updateTimetableEntry,
  upsertTimetableEntry,
  type DayOfWeek,
  type TimeSlotGridResponse,
  type TimetableConflictsResponse,
  type TimetableEntryResponse,
  type TimetableIssueDto,
  type TimetableResponse,
  type UpsertTimetableEntryRequest,
} from "@/lib/api/timetable";
import { userHasCapability } from "@/lib/auth/permissions";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import {
  moduleListPath,
  parseTimetableTab,
  TIMETABLE_TABS,
  type TimetableTab,
} from "@/lib/modules/tabs";
import { buildDefaultGridRequest } from "@/lib/timetable/default-grid";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError, isAuthFailure } from "@/types/api";
import { primaryRole } from "@/types/auth";

export function TimetableHubView() {
  const t = useTranslations("timetableHub");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const schoolId = useAuthStore((s) => s.user?.schoolId);
  const roles = useAuthStore((s) => s.user?.roles);
  const role = primaryRole(useAuthStore((s) => s.user));
  const workspaceHome = role ? getRoleHomePath(role) : "/administration";
  const canManage = userHasCapability(roles, "manageTimetable");

  const tab = parseTimetableTab(searchParams.get("tab"));
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYearResponse | null>(null);
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [classes, setClasses] = useState<SchoolClassResponse[]>([]);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [teachers, setTeachers] = useState<StaffResponse[]>([]);
  const [grids, setGrids] = useState<TimeSlotGridResponse[]>([]);
  const [timetables, setTimetables] = useState<TimetableResponse[]>([]);
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>("");
  const [selectedGridId, setSelectedGridId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [entries, setEntries] = useState<TimetableEntryResponse[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubjectResponse[]>([]);
  const [conflicts, setConflicts] = useState<TimetableConflictsResponse | null>(null);
  const [allEntries, setAllEntries] = useState<TimetableEntryResponse[]>([]);
  const [busy, setBusy] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entrySeed, setEntrySeed] = useState<EntryDialogSeed | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkSelection, setLinkSelection] = useState<string[]>([]);

  const entriesById = useMemo(
    () => new Map(allEntries.map((e) => [e.id, e])),
    [allEntries],
  );
  const classNameById = useMemo(
    () => new Map(classes.map((c) => [c.id, c.name])),
    [classes],
  );
  const teacherNameById = useMemo(
    () => new Map(teachers.map((s) => [s.id, s.fullName || s.lastName || s.id])),
    [teachers],
  );

  const teacherOverlapCount = useMemo(
    () =>
      conflicts?.blocking.filter(
        (i) =>
          i.code === "TEACHER_OVERLAP" &&
          i.entryId &&
          i.otherEntryId &&
          i.entryId !== i.otherEntryId,
      ).length ?? 0,
    [conflicts],
  );

  const selectedTimetable = useMemo(
    () => timetables.find((x) => x.id === selectedTimetableId) ?? null,
    [timetables, selectedTimetableId],
  );
  const selectedGrid = useMemo(() => {
    if (selectedGridId) {
      return grids.find((g) => g.id === selectedGridId) ?? grids[0] ?? null;
    }
    if (!selectedTimetable) return grids[0] ?? null;
    return grids.find((g) => g.id === selectedTimetable.gridId) ?? grids[0] ?? null;
  }, [grids, selectedGridId, selectedTimetable]);
  const draft = useMemo(
    () => timetables.find((x) => x.status === "DRAFT") ?? null,
    [timetables],
  );
  const published = useMemo(
    () => timetables.find((x) => x.status === "PUBLISHED") ?? null,
    [timetables],
  );
  const yearLocked = Boolean(year?.locked);
  const canEdit =
    canManage && !yearLocked && selectedTimetable?.status === "DRAFT";

  const selectTab = (next: TimetableTab) => {
    router.replace(moduleListPath(workspaceHome, "timetable", next, "overview"));
  };

  const loadCore = useCallback(async () => {
    setLoading(true);
    try {
      const [years, roomsPage, subjectsPage, staffPage] = await Promise.all([
        listAcademicYears({ page: 0, size: 20, schoolId }),
        listRooms({ page: 0, size: 100, schoolId }),
        listSubjects({ page: 0, size: 200, active: true, schoolId }),
        listStaff({ page: 0, size: 200, active: true, schoolId }),
      ]);
      const currentYear =
        years.content.find((y) => y.current) ??
        years.content.find((y) => y.status === "ACTIVE") ??
        years.content[0] ??
        null;
      setYear(currentYear);
      setRooms(roomsPage.content);
      setSubjects(subjectsPage.content);
      setTeachers(staffPage.content);

      if (!currentYear) {
        setClasses([]);
        setGrids([]);
        setTimetables([]);
        return;
      }

      const [classesPage, gridList, ttList] = await Promise.all([
        listClasses({
          academicYearId: currentYear.id,
          page: 0,
          size: 100,
          active: true,
          schoolId,
        }),
        listTimeSlotGrids({ academicYearId: currentYear.id, schoolId }),
        listTimetables({ academicYearId: currentYear.id, schoolId }),
      ]);
      setClasses(classesPage.content);
      setGrids(gridList);
      setSelectedGridId((prev) =>
        prev && gridList.some((g) => g.id === prev) ? prev : gridList[0]?.id || "",
      );
      setTimetables(ttList);
      const deepClassId = searchParams.get("classId")?.trim() || "";
      const deepClassExists = Boolean(
        deepClassId && classesPage.content.some((c) => c.id === deepClassId),
      );
      setSelectedClassId((prev) => {
        if (deepClassExists) return deepClassId;
        return prev || classesPage.content[0]?.id || "";
      });
      const preferred =
        ttList.find((x) => x.status === "DRAFT") ??
        ttList.find((x) => x.status === "PUBLISHED") ??
        ttList[0];
      setSelectedTimetableId((prev) =>
        prev && ttList.some((x) => x.id === prev) ? prev : preferred?.id || "",
      );
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [schoolId, searchParams, t]);

  const loadEntries = useCallback(async () => {
    if (!selectedTimetableId || !selectedClassId) {
      setEntries([]);
      return;
    }
    try {
      const [entryList, csPage] = await Promise.all([
        listTimetableEntries({
          timetableId: selectedTimetableId,
          classId: selectedClassId,
          schoolId,
        }),
        listClassSubjects({
          classId: selectedClassId,
          page: 0,
          size: 100,
          active: true,
          schoolId,
        }),
      ]);
      setEntries(entryList);
      setClassSubjects(csPage.content);
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("loadError"));
    }
  }, [selectedTimetableId, selectedClassId, schoolId, t]);

  const loadConflicts = useCallback(async () => {
    if (!selectedTimetableId) {
      setConflicts(null);
      setAllEntries([]);
      return;
    }
    try {
      const [conflictData, entryList] = await Promise.all([
        getTimetableConflicts(selectedTimetableId, schoolId),
        listTimetableEntries({ timetableId: selectedTimetableId, schoolId }),
      ]);
      setConflicts(conflictData);
      setAllEntries(entryList);
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
    }
  }, [selectedTimetableId, schoolId]);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  useEffect(() => {
    if (tab === "editor") void loadEntries();
  }, [tab, loadEntries]);

  useEffect(() => {
    if (tab === "conflicts" || tab === "overview") void loadConflicts();
  }, [tab, loadConflicts]);

  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter(
      (r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q),
    );
  }, [query, rooms]);

  const run = async (fn: () => Promise<void>, successKey: string) => {
    setBusy(true);
    try {
      await fn();
      notify.success(t(successKey));
      await loadCore();
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("actionError"));
    } finally {
      setBusy(false);
    }
  };

  const handleCreateGrid = () => {
    if (!year) return;
    void run(async () => {
      await createTimeSlotGrid(buildDefaultGridRequest(year.id, schoolId));
    }, "toast.gridCreated");
  };

  const handleCreateDraft = () => {
    if (!year || !grids[0]) {
      notify.error(t("needGrid"));
      return;
    }
    void run(async () => {
      await createTimetableDraft({
        academicYearId: year.id,
        gridId: grids[0].id,
        schoolId,
      });
    }, "toast.draftCreated");
  };

  const handlePublish = () => {
    if (!draft) return;
    void run(async () => {
      await publishTimetable(draft.id, schoolId);
    }, "toast.published");
  };

  const handleRevise = () => {
    if (!published) return;
    void run(async () => {
      await reviseTimetable(published.id, schoolId);
    }, "toast.revised");
  };

  const handlePdf = async () => {
    if (!selectedTimetableId || !selectedClassId) return;
    try {
      const blob = await downloadTimetableClassPdf(selectedTimetableId, selectedClassId, {
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

  const openCell = (args: {
    day: DayOfWeek;
    startPeriod: number | null;
    entries: TimetableEntryResponse[];
  }) => {
    if (linkMode && args.entries[0]) {
      setLinkSelection((prev) => {
        const id = args.entries[0].id;
        return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      });
      return;
    }
    const primary = args.entries[0] ?? null;
    setEntrySeed({
      day: args.day,
      startPeriod: args.startPeriod,
      classId: selectedClassId,
      entry: primary,
    });
    setEntryDialogOpen(true);
  };

  const saveEntry = async (payload: UpsertTimetableEntryRequest, entryId?: string) => {
    if (!selectedTimetableId) return;
    setBusy(true);
    try {
      const result = entryId
        ? await updateTimetableEntry(entryId, { ...payload, schoolId }, schoolId)
        : await upsertTimetableEntry(selectedTimetableId, { ...payload, schoolId });
      for (const warning of result.warnings) {
        notify.warning(`${warning.code}: ${warning.message}`);
      }
      notify.success(t("toast.entrySaved"));
      setEntryDialogOpen(false);
      await loadEntries();
      await loadConflicts();
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("actionError"));
    } finally {
      setBusy(false);
    }
  };

  const removeEntry = async (entryId: string) => {
    setBusy(true);
    try {
      await deleteTimetableEntry(entryId, schoolId);
      notify.success(t("toast.entryDeleted"));
      setEntryDialogOpen(false);
      await loadEntries();
      await loadConflicts();
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("actionError"));
    } finally {
      setBusy(false);
    }
  };

  const handleLinkSession = () => {
    if (!selectedTimetableId || linkSelection.length < 2) {
      notify.error(t("linkNeedTwo"));
      return;
    }
    void run(async () => {
      await linkSessionGroup(selectedTimetableId, {
        entryIds: linkSelection,
        schoolId,
      });
      setLinkSelection([]);
      setLinkMode(false);
      await loadEntries();
    }, "toast.linked");
  };

  const handleUnlink = (sessionGroupId: string) => {
    if (!selectedTimetableId) return;
    void run(async () => {
      await unlinkSessionGroup(selectedTimetableId, sessionGroupId, [], schoolId);
      await loadEntries();
    }, "toast.unlinked");
  };

  const openIssueInEditor = (issue: TimetableIssueDto) => {
    const primary =
      (issue.entryId ? entriesById.get(issue.entryId) : undefined) ??
      (issue.otherEntryId ? entriesById.get(issue.otherEntryId) : undefined) ??
      (issue.classSubjectId
        ? allEntries.find((e) => e.classSubjectIds.includes(issue.classSubjectId!))
        : undefined);
    const classId = primary?.classId ?? issue.classId ?? null;
    if (!classId) {
      notify.error(t("conflicts.navigateMissing"));
      return;
    }
    setSelectedClassId(classId);
    selectTab("editor");
    if (primary) {
      setEntrySeed({
        day: primary.day,
        startPeriod: primary.startPeriod,
        classId: primary.classId,
        entry: primary,
      });
      setEntryDialogOpen(true);
    }
  };

  const linkTeacherOverlapPair = (issue: TimetableIssueDto) => {
    if (!selectedTimetableId || !canEdit) return;
    const a = issue.entryId;
    const b = issue.otherEntryId;
    if (!a || !b || a === b) {
      notify.error(t("conflicts.linkMissing"));
      return;
    }
    void run(async () => {
      await linkSessionGroup(selectedTimetableId, {
        entryIds: [a, b],
        schoolId,
      });
      await loadConflicts();
      if (tab === "editor") await loadEntries();
    }, "toast.linked");
  };

  const autoLinkAllTeacherOverlaps = () => {
    if (!selectedTimetableId || !canEdit || !conflicts) return;
    const pairs = conflicts.blocking.filter(
      (i) =>
        i.code === "TEACHER_OVERLAP" &&
        i.entryId &&
        i.otherEntryId &&
        i.entryId !== i.otherEntryId,
    );
    if (pairs.length === 0) {
      notify.error(t("conflicts.autoLinkEmpty"));
      return;
    }

    const parent = new Map<string, string>();
    const find = (id: string): string => {
      const p = parent.get(id) ?? id;
      if (p !== id) {
        const root = find(p);
        parent.set(id, root);
        return root;
      }
      return id;
    };
    const union = (a: string, b: string) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent.set(ra, rb);
    };
    for (const issue of pairs) {
      parent.set(issue.entryId!, issue.entryId!);
      parent.set(issue.otherEntryId!, issue.otherEntryId!);
      union(issue.entryId!, issue.otherEntryId!);
    }
    const groups = new Map<string, string[]>();
    for (const id of parent.keys()) {
      const root = find(id);
      const list = groups.get(root) ?? [];
      list.push(id);
      groups.set(root, list);
    }
    const components = [...groups.values()].filter((g) => g.length >= 2);
    if (components.length === 0) {
      notify.error(t("conflicts.autoLinkEmpty"));
      return;
    }

    void run(async () => {
      for (const entryIds of components) {
        await linkSessionGroup(selectedTimetableId, { entryIds, schoolId });
      }
      await loadConflicts();
      if (tab === "editor") await loadEntries();
    }, "conflicts.autoLinkDone");
  };

  const issueContextLabel = (issue: TimetableIssueDto): string => {
    const parts: string[] = [];
    if (issue.teacherId) {
      parts.push(teacherNameById.get(issue.teacherId) ?? issue.teacherId);
    }
    const a = issue.entryId ? entriesById.get(issue.entryId) : undefined;
    const b = issue.otherEntryId ? entriesById.get(issue.otherEntryId) : undefined;
    if (a) {
      parts.push(
        `${classNameById.get(a.classId) ?? a.classId} · ${t(`days.${a.day}`)}${
          a.startPeriod != null ? ` P${a.startPeriod}` : ""
        }`,
      );
    }
    if (b) {
      parts.push(classNameById.get(b.classId) ?? b.classId);
    }
    if (!a && issue.classId) {
      parts.push(classNameById.get(issue.classId) ?? issue.classId);
    }
    return parts.filter(Boolean).join(" → ");
  };

  return (
    <div className="space-y-5 slide-up">
      <HubYearBanner
        label={t("yearLabel")}
        yearLabel={year?.label ?? null}
        yearStatus={year?.status ?? null}
        yearStatusLabel={
          year?.status && t.has(`yearStatus.${year.status}`)
            ? t(`yearStatus.${year.status}`)
            : year?.status
        }
        yearLocked={yearLocked}
        lockedLabel={yearLocked ? t("yearLockedBadge") : null}
        hint={yearLocked ? t("yearLockedHint") : t("yearHint")}
        loading={loading}
        emptyLabel={t("yearEmpty")}
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-7 sm:gap-3">
        {(
          [
            ["overview", CalendarDays, "blue", timetables.length],
            ["editor", Grid3x3, "slate", entries.length],
            ["grid", RefreshCw, "slate", grids.length],
            ["exams", CalendarDays, "amber", 0],
            ["conflicts", AlertTriangle, "amber", conflicts?.blocking.length ?? 0],
            ["changes", FilePenLine, "amber", 0],
            ["rooms", DoorOpen, "green", rooms.filter((r) => r.active).length],
          ] as const
        ).map(([key, Icon, tone, value]) => (
          <StatCard
            key={key}
            label={t(`stats.${key}`)}
            value={value}
            loading={loading}
            tone={tone}
            active={tab === key}
            onSelect={() => selectTab(key)}
            icon={<Icon className="size-[18px] stroke-[1.75]" aria-hidden />}
          />
        ))}
      </div>

      <HubToolbar
        tabs={TIMETABLE_TABS.map((key) => ({ key, label: t(`tabs.${key}`) }))}
        activeTab={tab}
        onTabChange={(key) => selectTab(key as TimetableTab)}
        tabsAriaLabel={t("tabsNav")}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder={t(`search.${tab}`)}
      />

      {loading ? (
        <HubLoadingRows />
      ) : tab === "overview" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {canManage && !yearLocked ? (
              <>
                <Button size="sm" disabled={busy || !year} onClick={handleCreateGrid}>
                  <Plus className="size-4" /> {t("actions.createGrid")}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy || !grids.length || Boolean(draft)}
                  onClick={handleCreateDraft}
                >
                  {t("actions.createDraft")}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy || !draft}
                  onClick={handlePublish}
                >
                  {t("actions.publish")}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy || !published || Boolean(draft)}
                  onClick={handleRevise}
                >
                  {t("actions.revise")}
                </Button>
              </>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              disabled={!selectedTimetableId || !selectedClassId}
              onClick={() => void handlePdf()}
            >
              <FileDown className="size-4" /> {t("actions.pdf")}
            </Button>
          </div>

          {timetables.length === 0 ? (
            <EmptyState
              title={t("empty.overview.title")}
              description={t("empty.overview.description")}
              icon={<CalendarDays className="size-9 stroke-[1.5]" aria-hidden />}
            />
          ) : (
            <HubTableShell countLabel={t("ttCount", { count: timetables.length })}>
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
                    <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                      {t("columns.revision")}
                    </th>
                    <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                      {t("columns.status")}
                    </th>
                    <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                      {t("columns.publishedAt")}
                    </th>
                    <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                      {t("columns.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {timetables.map((item, index) => {
                    const openRevision = () => {
                      setSelectedTimetableId(item.id);
                      selectTab("editor");
                    };
                    return (
                      <tr
                        key={item.id}
                        role="link"
                        tabIndex={0}
                        aria-label={t("actions.openEditor")}
                        onClick={openRevision}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openRevision();
                          }
                        }}
                        className={cn(
                          "pressable cursor-pointer border-b border-[var(--ios-separator)]/55 last:border-b-0 transition-colors hover:bg-[color-mix(in_srgb,var(--ios-blue)_6%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--ios-blue)_8%,transparent)] focus-visible:outline-none",
                          index % 2 === 1 &&
                            "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                          selectedTimetableId === item.id &&
                            "bg-[color-mix(in_srgb,var(--ios-blue)_8%,transparent)]",
                        )}
                      >
                        <td className="px-5 py-3.5 text-[13px] font-semibold text-[var(--ios-label)]">
                          r{item.revision}
                        </td>
                        <td className="px-3 py-3.5">
                          <HubStatusPill
                            active={item.status === "PUBLISHED"}
                            activeLabel={t(`status.${item.status}`)}
                            inactiveLabel={t(`status.${item.status}`)}
                          />
                        </td>
                        <td className="px-3 py-3.5 text-[12px] text-[var(--ios-secondary-label)]">
                          {item.publishedAt
                            ? new Date(item.publishedAt).toLocaleString(locale)
                            : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              openRevision();
                            }}
                          >
                            {t("actions.openEditor")}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </HubTableShell>
          )}

          {conflicts && conflicts.blocking.length > 0 ? (
            <div className="rounded-2xl border border-[color-mix(in_srgb,var(--ios-orange)_35%,var(--ios-separator))] bg-[color-mix(in_srgb,var(--ios-orange)_8%,var(--ios-card))] px-4 py-3 text-[13px] text-[var(--ios-label)]">
              {t("conflicts.banner", { count: conflicts.blocking.length })}
            </div>
          ) : null}
        </div>
      ) : tab === "editor" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-[12px] text-[var(--ios-secondary-label)]">
              {t("editor.timetable")}
              <Select
                value={selectedTimetableId}
                onChange={(e) => setSelectedTimetableId(e.target.value)}
                className="min-w-[180px]"
              >
                {timetables.map((tt) => (
                  <option key={tt.id} value={tt.id}>
                    r{tt.revision} — {t(`status.${tt.status}`)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-1 text-[12px] text-[var(--ios-secondary-label)]">
              {t("editor.class")}
              <Select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="min-w-[180px]"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </label>
            {canEdit ? (
              <>
                <Button
                  size="sm"
                  variant={linkMode ? "default" : "secondary"}
                  onClick={() => {
                    setLinkMode((v) => !v);
                    setLinkSelection([]);
                  }}
                >
                  <Link2 className="size-4" /> {t("actions.linkMode")}
                </Button>
                {linkMode ? (
                  <Button
                    size="sm"
                    disabled={linkSelection.length < 2 || busy}
                    onClick={handleLinkSession}
                  >
                    {t("actions.linkSelected", { count: linkSelection.length })}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEntrySeed({
                      day: "SATURDAY",
                      startPeriod: null,
                      classId: selectedClassId,
                      entry: null,
                    });
                    setEntryDialogOpen(true);
                  }}
                >
                  {t("actions.addOffGrid")}
                </Button>
              </>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              disabled={!selectedTimetableId || !selectedClassId}
              onClick={() => void handlePdf()}
            >
              <FileDown className="size-4" /> {t("actions.pdf")}
            </Button>
          </div>

          {!selectedGrid || !selectedTimetableId || !selectedClassId ? (
            <EmptyState
              title={t("empty.editor.title")}
              description={t("empty.editor.description")}
              icon={<Grid3x3 className="size-9 stroke-[1.5]" aria-hidden />}
            />
          ) : (
            <TimetableWeekGrid
              grid={selectedGrid}
              entries={entries}
              canEdit={canEdit || linkMode}
              onCellClick={openCell}
            />
          )}

          {entries.some((e) => e.sessionGroupId) ? (
            <div className="rounded-2xl border border-[var(--ios-separator)] bg-[var(--ios-card)] p-4">
              <p className="mb-2 text-[12px] font-semibold text-[var(--ios-label)]">
                {t("editor.sessionGroups")}
              </p>
              <div className="flex flex-wrap gap-2">
                {[...new Set(entries.map((e) => e.sessionGroupId).filter(Boolean))].map((sg) => (
                  <div
                    key={sg!}
                    className="flex items-center gap-2 rounded-full bg-[var(--ios-fill)] px-3 py-1.5 text-[11px]"
                  >
                    <span className="font-mono text-[var(--ios-secondary-label)]">
                      {sg!.slice(0, 8)}…
                    </span>
                    {canEdit ? (
                      <button
                        type="button"
                        className="text-[var(--ios-danger)]"
                        onClick={() => handleUnlink(sg!)}
                      >
                        {t("actions.unlink")}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : tab === "grid" ? (
        grids.length === 0 ? (
          <EmptyState
            title={t("empty.grid.title")}
            description={t("empty.grid.description")}
            icon={<RefreshCw className="size-9 stroke-[1.5]" aria-hidden />}
            action={
              canManage && !yearLocked ? (
                <Button onClick={handleCreateGrid}>{t("actions.createGrid")}</Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid min-w-[220px] flex-1 gap-1 text-[12px] text-[var(--ios-secondary-label)]">
                {t("gridEditor.select")}
                <Select
                  value={selectedGrid?.id ?? ""}
                  onChange={(e) => setSelectedGridId(e.target.value)}
                >
                  {grids.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} · {g.periods.filter((p) => p.kind === "LESSON").length}{" "}
                      {t("grid.lessons")}
                    </option>
                  ))}
                </Select>
              </label>
              {canManage && !yearLocked ? (
                <Button type="button" variant="secondary" onClick={handleCreateGrid}>
                  {t("actions.createGrid")}
                </Button>
              ) : null}
            </div>
            {selectedGrid ? (
              <TimetableGridEditor
                grid={selectedGrid}
                canEdit={canManage && !yearLocked}
                schoolId={schoolId}
                onSaved={(saved) => {
                  setGrids((prev) => prev.map((g) => (g.id === saved.id ? saved : g)));
                  setSelectedGridId(saved.id);
                }}
              />
            ) : null}
          </div>
        )
      ) : tab === "exams" ? (
        year ? (
          <TimetableExamsPanel
            academicYearId={year.id}
            schoolId={schoolId}
            canEdit={canManage && !yearLocked}
            sequencesHref={
              `${workspaceHome}/${role === "DIRECTOR" ? "sequences" : "grades"}?tab=sessions` as `/${string}`
            }
          />
        ) : (
          <EmptyState
            title={t("yearEmpty")}
            description={t("yearHint")}
            icon={<CalendarDays className="size-9 stroke-[1.5]" aria-hidden />}
          />
        )
      ) : tab === "conflicts" ? (
        !conflicts ? (
          <EmptyState
            title={t("empty.conflicts.title")}
            description={t("empty.conflicts.description")}
            icon={<AlertTriangle className="size-9 stroke-[1.5]" aria-hidden />}
          />
        ) : conflicts.blocking.length === 0 && conflicts.warnings.length === 0 ? (
          <EmptyState
            title={t("conflicts.noneTitle")}
            description={t("conflicts.noneDescription")}
            icon={<AlertTriangle className="size-9 stroke-[1.5]" aria-hidden />}
          />
        ) : (
          <div className="space-y-3">
            {canEdit && teacherOverlapCount > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--ios-blue)_28%,var(--ios-separator))] bg-[color-mix(in_srgb,var(--ios-blue)_6%,var(--ios-card))] px-4 py-3">
                <p className="min-w-0 text-[13px] text-[var(--ios-label)]">
                  {t("conflicts.autoLinkHint", { count: teacherOverlapCount })}
                </p>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={autoLinkAllTeacherOverlaps}
                >
                  <Wand2 className="size-4" />
                  {t("conflicts.autoLinkAction")}
                </Button>
              </div>
            ) : null}
            {[...conflicts.blocking, ...conflicts.warnings].map((issue, i) => {
              const context = issueContextLabel(issue);
              const canLinkPair =
                canEdit &&
                issue.code === "TEACHER_OVERLAP" &&
                Boolean(issue.entryId && issue.otherEntryId);
              const canOpen =
                Boolean(issue.entryId || issue.otherEntryId || issue.classId) ||
                Boolean(issue.classSubjectId);
              return (
                <div
                  key={`${issue.code}-${issue.entryId ?? "x"}-${issue.otherEntryId ?? "y"}-${i}`}
                  className={cn(
                    "rounded-2xl border px-4 py-3",
                    issue.severity === "BLOCKING"
                      ? "border-[color-mix(in_srgb,var(--ios-danger)_30%,var(--ios-separator))] bg-[color-mix(in_srgb,var(--ios-danger)_6%,var(--ios-card))]"
                      : "border-[var(--ios-separator)] bg-[var(--ios-card)]",
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-3 text-left",
                      canOpen
                        ? "pressable cursor-pointer"
                        : "cursor-default",
                    )}
                    onClick={() => {
                      if (canOpen) openIssueInEditor(issue);
                    }}
                    disabled={!canOpen}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)]">
                        {issue.severity} · {issue.code}
                      </div>
                      <div className="mt-1 text-[13px] text-[var(--ios-label)]">
                        {issue.code === "TEACHER_OVERLAP" ||
                        issue.code === "CLASS_OVERLAP" ||
                        issue.code === "ROOM_OVERLAP" ||
                        issue.code === "HOURS_MISMATCH" ||
                        issue.code === "TEACHER_MISMATCH"
                          ? t(`conflicts.codes.${issue.code}`)
                          : issue.message}
                      </div>
                      {context ? (
                        <div className="mt-1 text-[12px] text-[var(--ios-secondary-label)]">
                          {context}
                        </div>
                      ) : null}
                      {canOpen ? (
                        <div className="mt-1.5 text-[11px] font-medium text-[var(--ios-blue)]">
                          {t("conflicts.openEditor")}
                        </div>
                      ) : null}
                    </div>
                    {canOpen ? (
                      <ChevronRight
                        className="mt-0.5 size-4 shrink-0 text-[var(--ios-tertiary-label)]"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                  {canLinkPair ? (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--ios-separator)]/50 pt-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          linkTeacherOverlapPair(issue);
                        }}
                      >
                        <Link2 className="size-4" />
                        {t("conflicts.linkPair")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )
      ) : tab === "changes" ? (
        <TimetableChangesPanel schoolId={schoolId} query={query} />
      ) : filteredRooms.length === 0 ? (
        <EmptyState
          title={t("empty.rooms.title")}
          description={t("empty.rooms.description")}
          icon={<DoorOpen className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : (
        <HubTableShell countLabel={t("tableCount", { count: filteredRooms.length })}>
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
                <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                  {t("columns.name")}
                </th>
                <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                  {t("columns.type")}
                </th>
                <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                  {t("columns.capacity")}
                </th>
                <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                  {t("columns.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((item, index) => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b border-[var(--ios-separator)]/55 last:border-b-0",
                    index % 2 === 1 &&
                      "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                  )}
                >
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-[var(--ios-label)]">
                    {item.name}
                  </td>
                  <td className="px-3 py-3.5 text-[12px] text-[var(--ios-label)]">{item.type}</td>
                  <td className="px-3 py-3.5 text-[12px] tabular-nums text-[var(--ios-label)]">
                    {item.capacity ?? "—"}
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
      )}

      <TimetableEntryDialog
        open={entryDialogOpen}
        onOpenChange={setEntryDialogOpen}
        seed={entrySeed}
        canEdit={canEdit}
        classes={classes}
        classSubjects={classSubjects}
        subjects={subjects}
        teachers={teachers}
        rooms={rooms}
        saving={busy}
        onSave={saveEntry}
        onDelete={canEdit ? removeEntry : undefined}
      />
    </div>
  );
}
