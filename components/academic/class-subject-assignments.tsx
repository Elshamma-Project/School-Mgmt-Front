"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { BookOpen, ChevronLeft, ChevronRight, Pencil, Plus, Power, PowerOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { GroupedList, GroupedListItem } from "@/components/ui/grouped-list";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { academicDetailPath } from "@/lib/academic/tabs";
import {
  createClassSubject,
  deactivateClassSubject,
  listClassSubjects,
  listSubjectGroups,
  listSubjects,
  localizedLabel,
  reactivateClassSubject,
  updateClassSubject,
  type ClassSubjectResponse,
  type SubjectGroupResponse,
  type SubjectResponse,
} from "@/lib/api/academic";
import { listStaff, type StaffResponse } from "@/lib/api/staff";
import { cn } from "@/lib/utils/cn";
import { notify } from "@/lib/ui/notify";
import { ApiError, isAuthFailure } from "@/types/api";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/** Pistes fixes (pas d’`auto`) pour que chaque colonne reste alignée entre l’en-tête et les lignes. */
const ROW_GRID =
  "grid w-full min-w-0 grid-cols-[minmax(0,1.35fr)_5rem_minmax(0,1fr)_3.5rem_3.5rem_minmax(0,1.05fr)_5.75rem_4.75rem] items-center gap-x-3";

function ColumnHeader({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "block w-full text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]",
        className,
      )}
    >
      {label}
    </span>
  );
}

type ClassSubjectAssignmentsProps = {
  classId: string;
  academicYearId: string;
  schoolId?: string | null;
  workspaceHome: `/${string}`;
  canManage: boolean;
  /** Rafraîchir les stats parent après ajout / édition / activation. */
  onChanged?: () => void;
};

type Draft = {
  id?: string;
  subjectId: string;
  groupId: string;
  coefficient: string;
  teacherId: string;
  weeklyHours: string;
  teachingLanguage: "" | "FR" | "EN";
  displayOrder: string;
  maxScore: string;
  countsInAverage: boolean;
  optional: boolean;
};

const emptyDraft = (): Draft => ({
  subjectId: "",
  groupId: "",
  coefficient: "1",
  teacherId: "",
  weeklyHours: "",
  teachingLanguage: "",
  displayOrder: "0",
  maxScore: "20",
  countsInAverage: true,
  optional: false,
});

export function ClassSubjectAssignments({
  classId,
  academicYearId,
  schoolId,
  workspaceHome,
  canManage,
  onChanged,
}: ClassSubjectAssignmentsProps) {
  const t = useTranslations("academic");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [rows, setRows] = useState<ClassSubjectResponse[]>([]);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [groups, setGroups] = useState<SubjectGroupResponse[]>([]);
  const [teachers, setTeachers] = useState<StaffResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [editorOpen, setEditorOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingToggle, setPendingToggle] = useState<ClassSubjectResponse | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPage(0);
  }, [classId, pageSize]);

  useEffect(() => {
    if (!editorOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) setEditorOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [editorOpen, saving]);

  const subjectById = useMemo(() => {
    const map = new Map<string, SubjectResponse>();
    for (const s of subjects) map.set(s.id, s);
    return map;
  }, [subjects]);

  const groupById = useMemo(() => {
    const map = new Map<string, SubjectGroupResponse>();
    for (const g of groups) map.set(g.id, g);
    return map;
  }, [groups]);

  const teacherById = useMemo(() => {
    const map = new Map<string, StaffResponse>();
    for (const teacher of teachers) map.set(teacher.id, teacher);
    return map;
  }, [teachers]);

  const assignedSubjectIds = useMemo(
    () => new Set(rows.filter((r) => r.active).map((r) => r.subjectId)),
    [rows],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [csPage, subjectsPage, groupsPage, staffPage] = await Promise.all([
        listClassSubjects({ classId, schoolId, size: 100, active: null }),
        listSubjects({ schoolId, size: 200, active: true }),
        listSubjectGroups({ schoolId, size: 100, active: true }),
        listStaff({ schoolId, size: 200, active: true, function: "TEACHER" }),
      ]);
      setRows(
        [...csPage.content].sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id)),
      );
      setSubjects(subjectsPage.content);
      setGroups(groupsPage.content);
      setTeachers(staffPage.content);
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [classId, schoolId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    const firstSubject =
      subjects.find((s) => s.active && !assignedSubjectIds.has(s.id)) ?? subjects[0];
    setDraft({
      ...emptyDraft(),
      subjectId: firstSubject?.id ?? "",
      groupId: groups[0]?.id ?? "",
      displayOrder: String(rows.length),
    });
    setFormError(null);
    setEditorOpen(true);
  }

  function openEdit(row: ClassSubjectResponse) {
    setDraft({
      id: row.id,
      subjectId: row.subjectId,
      groupId: row.groupId,
      coefficient: String(row.coefficient),
      teacherId: row.teacherId ?? "",
      weeklyHours: row.weeklyHours != null ? String(row.weeklyHours) : "",
      teachingLanguage: row.teachingLanguage ?? "",
      displayOrder: String(row.displayOrder),
      maxScore: String(row.maxScore),
      countsInAverage: row.countsInAverage,
      optional: row.optional,
    });
    setFormError(null);
    setEditorOpen(true);
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!draft.subjectId || !draft.groupId) {
      setFormError(t("form.required"));
      return;
    }
    const coefficient = Number.parseFloat(draft.coefficient.replace(",", "."));
    if (!Number.isFinite(coefficient) || coefficient <= 0) {
      setFormError(t("classSubject.invalidCoefficient"));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (draft.id) {
        await updateClassSubject(
          draft.id,
          {
            groupId: draft.groupId,
            coefficient,
            teacherId: draft.teacherId.trim() || null,
            weeklyHours: draft.weeklyHours.trim()
              ? Number.parseInt(draft.weeklyHours, 10)
              : null,
            teachingLanguage: draft.teachingLanguage || null,
            displayOrder: Number.parseInt(draft.displayOrder, 10) || 0,
            maxScore: draft.maxScore.trim() || "20",
            countsInAverage: draft.countsInAverage,
            optional: draft.optional,
          },
          schoolId,
        );
      } else {
        await createClassSubject({
          academicYearId,
          classId,
          subjectId: draft.subjectId,
          groupId: draft.groupId,
          coefficient,
          teacherId: draft.teacherId.trim() || null,
          weeklyHours: draft.weeklyHours.trim()
            ? Number.parseInt(draft.weeklyHours, 10)
            : null,
          teachingLanguage: draft.teachingLanguage || null,
          displayOrder: Number.parseInt(draft.displayOrder, 10) || 0,
          maxScore: draft.maxScore.trim() || "20",
          countsInAverage: draft.countsInAverage,
          optional: draft.optional,
          schoolId,
        });
      }
      setEditorOpen(false);
      notify.success(t("classSubject.saved"));
      await load();
      onChanged?.();
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) setFormError(error.message);
      else setFormError(t("classSubject.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function onToggle() {
    if (!pendingToggle) return;
    try {
      if (pendingToggle.active) {
        await deactivateClassSubject(pendingToggle.id, schoolId);
        notify.success(t("classSubject.deactivated"));
      } else {
        await reactivateClassSubject(pendingToggle.id, schoolId);
        notify.success(t("classSubject.reactivated"));
      }
      setPendingToggle(null);
      await load();
      onChanged?.();
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("actionError"));
    }
  }

  const subjectLabel = (row: ClassSubjectResponse) => {
    const subject = subjectById.get(row.subjectId);
    return subject ? localizedLabel(subject.name, locale) : row.subjectId;
  };

  function RowActions({ row }: { row: ClassSubjectResponse }) {
    if (!canManage) return null;
    return (
      <div className="flex shrink-0 justify-end gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          leadingIcon={<Pencil className="size-3.5" aria-hidden />}
          onClick={() => openEdit(row)}
          aria-label={t("actionEdit")}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          leadingIcon={
            row.active ? (
              <PowerOff className="size-3.5" aria-hidden />
            ) : (
              <Power className="size-3.5" aria-hidden />
            )
          }
          onClick={() => setPendingToggle(row)}
          aria-label={row.active ? t("actionDeactivate") : t("actionReactivate")}
        />
      </div>
    );
  }

  const activeCount = rows.filter((r) => r.active).length;
  const totalElements = rows.length;
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / pageSize);
  const safePage = Math.min(page, Math.max(totalPages - 1, 0));
  const pageRows = rows.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const from = totalElements === 0 ? 0 : safePage * pageSize + 1;
  const to = Math.min(totalElements, (safePage + 1) * pageSize);
  const showPager = totalPages > 1;
  const headerMeta = [
    !loading && totalElements > 0
      ? `${t("statusActive")} · ${activeCount}/${totalElements}`
      : null,
    !loading && totalElements > 0
      ? t("classRoster.range", { from, to, total: totalElements })
      : null,
  ].filter(Boolean);

  return (
    <>
      <GroupedList header={t("detail.subjectsSection")} className="lg:col-span-2">
        <GroupedListItem className="flex-wrap gap-y-2.5 bg-[color-mix(in_srgb,var(--ios-fill)_28%,var(--ios-card))] py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-[var(--ios-info-soft)] text-[var(--ios-blue)]">
              <BookOpen className="size-3.5 stroke-[1.75]" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold tabular-nums text-[var(--ios-label)]">
                {loading
                  ? t("classSubject.loadingCount")
                  : t("classSubject.totalLabel", { count: totalElements })}
              </p>
              {headerMeta.length > 0 ? (
                <p className="text-[11px] text-[var(--ios-secondary-label)]">
                  {headerMeta.join(" · ")}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[12px] text-[var(--ios-secondary-label)]">
              <span className="whitespace-nowrap">{t("classRoster.pageSize")}</span>
              <Select
                value={String(pageSize)}
                onChange={(e) => {
                  const next = Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number];
                  setPageSize(PAGE_SIZE_OPTIONS.includes(next) ? next : 10);
                }}
                aria-label={t("classRoster.pageSize")}
                className="h-8 w-[4.5rem] text-[12px]"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </Select>
            </label>
            {canManage ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                leadingIcon={<Plus className="size-3.5" aria-hidden />}
                onClick={openCreate}
                disabled={loading || subjects.length === 0 || groups.length === 0}
              >
                {t("classSubject.add")}
              </Button>
            ) : null}
          </div>
        </GroupedListItem>

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <GroupedListItem key={i} className="block py-3">
              <div className={cn(ROW_GRID, "hidden md:grid")}>
                <Skeleton className="h-3 w-28" />
                <Skeleton className="mx-auto h-6 w-12 rounded-[var(--radius-sm)]" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mx-auto h-3 w-8" />
                <Skeleton className="mx-auto h-3 w-8" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mx-auto h-6 w-14 rounded-full" />
                {canManage ? <Skeleton className="ml-auto h-8 w-16" /> : <span />}
              </div>
              <div className="space-y-2 md:hidden">
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
            </GroupedListItem>
          ))
        ) : rows.length === 0 ? (
          <GroupedListItem className="block py-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]">
                <BookOpen className="size-5 stroke-[1.5]" aria-hidden />
              </span>
              <div className="space-y-1">
                <p className="text-[14px] font-semibold text-[var(--ios-label)]">
                  {t("classSubject.emptyTitle")}
                </p>
                <p className="mx-auto max-w-sm text-[12px] leading-relaxed text-[var(--ios-secondary-label)]">
                  {t("classSubject.emptyDescription")}
                </p>
              </div>
            </div>
          </GroupedListItem>
        ) : (
          <>
            <GroupedListItem className="hidden bg-[color-mix(in_srgb,var(--ios-fill)_18%,var(--ios-card))] py-2.5 md:block">
              <div className={ROW_GRID} role="row">
                <ColumnHeader label={t("classSubject.columns.subject")} />
                <ColumnHeader
                  label={t("classSubject.columns.code")}
                  className="text-center"
                />
                <ColumnHeader label={t("classSubject.columns.group")} />
                <ColumnHeader
                  label={t("classSubject.columns.coefficient")}
                  className="text-center"
                />
                <ColumnHeader
                  label={t("classSubject.columns.hours")}
                  className="text-center"
                />
                <ColumnHeader label={t("classSubject.columns.teacher")} />
                <ColumnHeader
                  label={t("classSubject.columns.status")}
                  className="text-center"
                />
                {canManage ? (
                  <ColumnHeader
                    label={t("classSubject.columns.actions")}
                    className="text-right"
                  />
                ) : (
                  <span aria-hidden />
                )}
              </div>
            </GroupedListItem>

            {pageRows.map((row) => {
              const subject = subjectById.get(row.subjectId);
              const group = groupById.get(row.groupId);
              const teacher = row.teacherId ? teacherById.get(row.teacherId) : null;
              const teacherLabel =
                teacher?.fullName ??
                (row.teacherId ? t("classSubject.teacherUnknown") : t("classSubject.noTeacher"));
              const flags = (
                <>
                  {row.optional ? <Badge tone="neutral">{t("classSubject.optional")}</Badge> : null}
                  {!row.countsInAverage ? (
                    <Badge tone="neutral">{t("classSubject.notInAverage")}</Badge>
                  ) : null}
                </>
              );

              return (
                <GroupedListItem key={row.id} className="block py-3.5">
                  <div className={cn(ROW_GRID, "hidden md:grid")} role="row">
                    <div className="min-w-0">
                      {subject ? (
                        <Link
                          href={academicDetailPath(
                            workspaceHome,
                            "subjects",
                            localizedLabel(subject.name, "fr"),
                            subject.id,
                          )}
                          className="block truncate text-[13px] font-semibold text-[var(--ios-label)] hover:underline"
                        >
                          {subjectLabel(row)}
                        </Link>
                      ) : (
                        <p className="truncate text-[13px] font-semibold text-[var(--ios-label)]">
                          {subjectLabel(row)}
                        </p>
                      )}
                      {row.optional || !row.countsInAverage ? (
                        <div className="mt-1 flex flex-wrap gap-1.5">{flags}</div>
                      ) : null}
                    </div>
                    <div className="flex justify-center">
                      <span className="inline-flex max-w-full truncate whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--ios-separator)]/70 bg-[color-mix(in_srgb,var(--ios-fill)_35%,var(--ios-card))] px-1.5 py-1 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                        {subject?.code || "—"}
                      </span>
                    </div>
                    <p className="min-w-0 truncate text-[12px] text-[var(--ios-secondary-label)]">
                      {group ? localizedLabel(group.name, locale) : "—"}
                    </p>
                    <p className="text-center text-[12px] font-semibold tabular-nums text-[var(--ios-label)]">
                      ×{row.coefficient}
                    </p>
                    <p className="text-center text-[12px] tabular-nums text-[var(--ios-secondary-label)]">
                      {row.weeklyHours != null ? `${row.weeklyHours}h` : "—"}
                    </p>
                    <p className="min-w-0 truncate text-[12px] text-[var(--ios-secondary-label)]">
                      {teacherLabel}
                    </p>
                    <div className="flex justify-center">
                      <Badge tone={row.active ? "success" : "neutral"}>
                        {row.active ? t("statusActive") : t("inactive")}
                      </Badge>
                    </div>
                    <div className="flex justify-end">
                      <RowActions row={row} />
                    </div>
                  </div>

                  <div className="flex items-start gap-3 md:hidden">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {subject ? (
                          <Link
                            href={academicDetailPath(
                              workspaceHome,
                              "subjects",
                              localizedLabel(subject.name, "fr"),
                              subject.id,
                            )}
                            className="text-[13px] font-semibold text-[var(--ios-label)] hover:underline"
                          >
                            {subjectLabel(row)}
                          </Link>
                        ) : (
                          <p className="text-[13px] font-semibold text-[var(--ios-label)]">
                            {subjectLabel(row)}
                          </p>
                        )}
                        <Badge tone={row.active ? "success" : "neutral"}>
                          {row.active ? t("statusActive") : t("inactive")}
                        </Badge>
                        {flags}
                      </div>
                      <p className="text-[12px] text-[var(--ios-secondary-label)]">
                        {[
                          subject?.code,
                          group ? localizedLabel(group.name, locale) : null,
                          `×${row.coefficient}`,
                          row.weeklyHours != null ? `${row.weeklyHours}h` : null,
                          teacherLabel,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <RowActions row={row} />
                  </div>
                </GroupedListItem>
              );
            })}

            {!loading && totalElements > 0 ? (
              <GroupedListItem className="flex-wrap gap-y-2 bg-[color-mix(in_srgb,var(--ios-fill)_22%,var(--ios-card))] py-2.5">
                <p className="text-[12px] text-[var(--ios-secondary-label)]">
                  {showPager
                    ? t("classRoster.pageOf", { page: safePage + 1, total: totalPages })
                    : t("classRoster.range", { from, to, total: totalElements })}
                </p>
                {showPager ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safePage <= 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      className="pressable inline-flex h-8 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--ios-separator)]/70 bg-[var(--ios-card)] px-2.5 text-[12px] font-medium text-[var(--ios-label)] transition-colors hover:bg-[var(--ios-fill)]/45 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={t("classRoster.previous")}
                    >
                      <ChevronLeft className="size-3.5" aria-hidden />
                      <span className="hidden sm:inline">{t("classRoster.previous")}</span>
                    </button>
                    <button
                      type="button"
                      disabled={safePage >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                      className="pressable inline-flex h-8 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--ios-separator)]/70 bg-[var(--ios-card)] px-2.5 text-[12px] font-medium text-[var(--ios-label)] transition-colors hover:bg-[var(--ios-fill)]/45 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={t("classRoster.next")}
                    >
                      <span className="hidden sm:inline">{t("classRoster.next")}</span>
                      <ChevronRight className="size-3.5" aria-hidden />
                    </button>
                  </div>
                ) : null}
              </GroupedListItem>
            ) : null}
          </>
        )}
      </GroupedList>

      {mounted && editorOpen
        ? createPortal(
            <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center">
              <button
                type="button"
                aria-label={tCommon("cancel")}
                className="absolute inset-0 cursor-default border-0 bg-[color-mix(in_srgb,var(--ios-label)_22%,transparent)] backdrop-blur-[6px]"
                onClick={() => {
                  if (!saving) setEditorOpen(false);
                }}
              />
              <form
                onSubmit={(e) => void onSave(e)}
                className="relative z-10 max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-[var(--radius-xl)] bg-[var(--ios-card)] shadow-[var(--ios-shadow-md)] ring-1 ring-[color-mix(in_srgb,var(--ios-separator)_70%,transparent)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="border-b border-[var(--ios-separator)]/55 px-4 pb-3 pt-4 text-center">
                  <span className="mx-auto mb-2 inline-flex size-10 items-center justify-center rounded-full bg-[var(--ios-info-soft)] text-[var(--ios-blue)] ring-1 ring-[color-mix(in_srgb,var(--ios-blue)_20%,transparent)]">
                    <BookOpen className="size-4 stroke-[1.75]" aria-hidden />
                  </span>
                  <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
                    {draft.id ? t("classSubject.editTitle") : t("classSubject.addTitle")}
                  </h2>
                </div>
                <div className="space-y-2 px-4 py-3 [&_input]:h-[var(--control-height-sm)] [&_select]:h-[var(--control-height-sm)] [&_label]:mb-1">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field id="cs-subject" label={t("tabs.subjects")}>
                      <Select
                        id="cs-subject"
                        value={draft.subjectId}
                        disabled={Boolean(draft.id)}
                        onChange={(e) => setDraft((d) => ({ ...d, subjectId: e.target.value }))}
                      >
                        {subjects
                          .filter((s) => s.active || s.id === draft.subjectId)
                          .filter((s) => !assignedSubjectIds.has(s.id) || s.id === draft.subjectId)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.code} — {localizedLabel(s.name, locale)}
                            </option>
                          ))}
                      </Select>
                    </Field>
                    <Field id="cs-group" label={t("tabs.groups")}>
                      <Select
                        id="cs-group"
                        value={draft.groupId}
                        onChange={(e) => setDraft((d) => ({ ...d, groupId: e.target.value }))}
                      >
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.code} — {localizedLabel(g.name, locale)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field id="cs-coef" label={t("classSubject.coefficient")}>
                      <Input
                        id="cs-coef"
                        inputMode="decimal"
                        value={draft.coefficient}
                        onChange={(e) => setDraft((d) => ({ ...d, coefficient: e.target.value }))}
                      />
                    </Field>
                    <Field id="cs-hours" label={t("classSubject.weeklyHours")}>
                      <Input
                        id="cs-hours"
                        type="number"
                        min={0}
                        value={draft.weeklyHours}
                        onChange={(e) => setDraft((d) => ({ ...d, weeklyHours: e.target.value }))}
                      />
                    </Field>
                  </div>
                  <Field id="cs-teacher" label={t("classSubject.teacher")}>
                    <Select
                      id="cs-teacher"
                      value={draft.teacherId}
                      onChange={(e) => setDraft((d) => ({ ...d, teacherId: e.target.value }))}
                    >
                      <option value="">{t("classSubject.noTeacher")}</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.fullName}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Field id="cs-lang" label={t("fields.teachingLanguage")}>
                      <Select
                        id="cs-lang"
                        value={draft.teachingLanguage}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            teachingLanguage: e.target.value as "" | "FR" | "EN",
                          }))
                        }
                      >
                        <option value="">{t("fields.teachingLanguageAny")}</option>
                        <option value="FR">FR</option>
                        <option value="EN">EN</option>
                      </Select>
                    </Field>
                    <Field id="cs-order" label={t("fields.displayOrder")}>
                      <Input
                        id="cs-order"
                        type="number"
                        value={draft.displayOrder}
                        onChange={(e) => setDraft((d) => ({ ...d, displayOrder: e.target.value }))}
                      />
                    </Field>
                    <Field id="cs-max" label={t("classSubject.maxScore")}>
                      <Input
                        id="cs-max"
                        inputMode="decimal"
                        value={draft.maxScore}
                        onChange={(e) => setDraft((d) => ({ ...d, maxScore: e.target.value }))}
                      />
                    </Field>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-0.5 text-[12.5px] text-[var(--ios-label)]">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={draft.countsInAverage}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, countsInAverage: e.target.checked }))
                        }
                      />
                      {t("classSubject.countsInAverage")}
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={draft.optional}
                        onChange={(e) => setDraft((d) => ({ ...d, optional: e.target.checked }))}
                      />
                      {t("classSubject.optional")}
                    </label>
                  </div>
                  {formError ? (
                    <p className="text-[12px] text-[var(--ios-danger)]" role="alert">
                      {formError}
                    </p>
                  ) : null}
                </div>
                <div className="flex justify-end gap-2 border-t border-[var(--ios-separator)]/55 px-4 py-3">
                  <Button
                    type="button"
                    variant="ghostDestructive"
                    size="sm"
                    onClick={() => setEditorOpen(false)}
                    disabled={saving}
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? tCommon("loading") : tCommon("save")}
                  </Button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}

      <ConfirmDialog
        open={Boolean(pendingToggle)}
        onOpenChange={(open) => {
          if (!open) setPendingToggle(null);
        }}
        title={
          pendingToggle?.active
            ? t("classSubject.deactivateTitle")
            : t("classSubject.reactivateTitle")
        }
        description={
          pendingToggle?.active
            ? t("classSubject.deactivateDescription", {
                name: pendingToggle ? subjectLabel(pendingToggle) : "",
              })
            : t("classSubject.reactivateDescription", {
                name: pendingToggle ? subjectLabel(pendingToggle) : "",
              })
        }
        confirmLabel={
          pendingToggle?.active ? t("actionDeactivate") : t("actionReactivate")
        }
        cancelLabel={tCommon("cancel")}
        tone={pendingToggle?.active ? "destructive" : "default"}
        onConfirm={() => void onToggle()}
      />
    </>
  );
}
