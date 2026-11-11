"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  Users,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { GroupedList, GroupedListItem } from "@/components/ui/grouped-list";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createEnrollment,
  listEnrollments,
  listStudents,
  updateEnrollment,
  type EnrollmentResponse,
  type StudentResponse,
} from "@/lib/api/student";
import { cn } from "@/lib/utils/cn";
import { notify } from "@/lib/ui/notify";
import { ApiError, isAuthFailure } from "@/types/api";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs, value]);
  return debounced;
}

function compareNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function alphabeticalRoll(fullName: string, existingNames: string[]): number {
  const names = [...existingNames, fullName].sort(compareNames);
  return names.indexOf(fullName) + 1;
}

const ROW_GRID =
  "grid w-full min-w-0 grid-cols-[2.5rem_minmax(0,1.4fr)_minmax(7rem,0.8fr)_2.75rem_auto_minmax(6rem,0.75fr)_auto] items-center gap-x-3";

type ClassRosterProps = {
  classId: string;
  academicYearId: string;
  levelId: string;
  schoolId?: string | null;
  /** Capacité de la classe (places), pour contextualiser l’effectif. */
  capacity?: number | null;
  canManage?: boolean;
  /** Rafraîchir les stats parent après inscription / retrait. */
  onChanged?: () => void;
};

type EditorDraft = {
  mode: "create" | "edit";
  id?: string;
  studentId: string;
  name: string;
  classId: string;
  levelId: string;
  rollNumber: string;
  repeater: boolean;
  newStudent: boolean;
  status: string;
  enrolledOn: string | null;
  leftOn: string | null;
  previousSchool: string | null;
};

function studentInitials(fullName: string | null | undefined): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function statusTone(status: string): "success" | "neutral" | "warning" {
  if (status === "ENROLLED") return "success";
  if (status === "TRANSFERRED_OUT" || status === "WITHDRAWN" || status === "EXCLUDED") {
    return "warning";
  }
  return "neutral";
}

function StudentAvatar({ name, enrolled }: { name: string; enrolled: boolean }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tracking-[-0.02em]",
        enrolled
          ? "bg-[var(--ios-info-soft)] text-[var(--ios-blue)] ring-1 ring-[color-mix(in_srgb,var(--ios-blue)_16%,transparent)]"
          : "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]",
      )}
      aria-hidden
    >
      {studentInitials(name)}
    </span>
  );
}

function RollBadge({ value }: { value: number | null }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-8 shrink-0 items-center justify-center rounded-full px-2 py-1 text-[11px] font-semibold tabular-nums",
        value != null
          ? "bg-[color-mix(in_srgb,var(--ios-fill)_80%,var(--ios-card))] text-[var(--ios-label)] ring-1 ring-[var(--ios-separator)]/60"
          : "bg-[var(--ios-fill)] text-[var(--ios-tertiary-label)]",
      )}
    >
      {value ?? "—"}
    </span>
  );
}

function ColumnHeader({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function ClassRoster({
  classId,
  academicYearId,
  levelId,
  schoolId,
  capacity = null,
  canManage = false,
  onChanged,
}: ClassRosterProps) {
  const t = useTranslations("academic");
  const tCommon = useTranslations("common");

  const [rows, setRows] = useState<EnrollmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  /** Effectif réel de la classe (inscrits), indépendant de la page affichée. */
  const [classTotal, setClassTotal] = useState(0);
  const [suggestions, setSuggestions] = useState<StudentResponse[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [enrolledYearIds, setEnrolledYearIds] = useState<Set<string>>(new Set());
  const [classEnrolledNames, setClassEnrolledNames] = useState<string[]>([]);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const debouncedStudentQuery = useDebounced(studentQuery, 280);

  const [mounted, setMounted] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<EditorDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingToggle, setPendingToggle] = useState<EnrollmentResponse | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!suggestionsOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!searchWrapRef.current?.contains(event.target as Node)) {
        setSuggestionsOpen(false);
      }
    }
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [suggestionsOpen]);

  const loadClassTotal = useCallback(async () => {
    try {
      const result = await listEnrollments({
        page: 0,
        size: 1,
        classId,
        academicYearId,
        status: "ENROLLED",
        schoolId,
      });
      setClassTotal(result.totalElements);
    } catch (error) {
      if (isAuthFailure(error)) return;
      setClassTotal(0);
    }
  }, [academicYearId, classId, schoolId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listEnrollments({
        page,
        size: pageSize,
        classId,
        academicYearId,
        schoolId,
      });
      setRows(result.content);
      setTotalElements(result.totalElements);
      setTotalPages(result.totalPages);
    } catch (error) {
      if (isAuthFailure(error)) return;
      setRows([]);
      setTotalElements(0);
      setTotalPages(0);
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [academicYearId, classId, page, pageSize, schoolId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadClassTotal();
  }, [loadClassTotal]);

  useEffect(() => {
    setPage(0);
  }, [classId, academicYearId, pageSize]);

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

  const from = totalElements === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(totalElements, (page + 1) * pageSize);
  const showPager = totalPages > 1;
  const headerMeta = [
    capacity != null && capacity > 0 ? t("classRoster.capacityHint", { capacity }) : null,
    !loading && totalElements > 0
      ? t("classRoster.range", { from, to, total: totalElements })
      : null,
  ].filter(Boolean);

  const statusLabel = (status: string) =>
    t.has(`classRoster.status.${status}`) ? t(`classRoster.status.${status}`) : status;

  const previewRoll = useMemo(() => {
    if (!draft || draft.mode !== "create" || !draft.name.trim()) return null;
    return alphabeticalRoll(draft.name.trim(), classEnrolledNames);
  }, [classEnrolledNames, draft]);

  async function listAllClassEnrolled(): Promise<EnrollmentResponse[]> {
    const all: EnrollmentResponse[] = [];
    let pageIndex = 0;
    let pages = 1;
    while (pageIndex < pages) {
      const result = await listEnrollments({
        page: pageIndex,
        size: 100,
        classId,
        academicYearId,
        status: "ENROLLED",
        schoolId,
      });
      all.push(...result.content);
      pages = Math.max(result.totalPages, 1);
      pageIndex += 1;
      if (result.content.length === 0) break;
    }
    return all;
  }

  async function renumberClassAlphabetically() {
    const enrolled = await listAllClassEnrolled();
    const sorted = [...enrolled].sort((a, b) =>
      compareNames(a.studentFullName || a.studentId, b.studentFullName || b.studentId),
    );
    for (let i = 0; i < sorted.length; i++) {
      const row = sorted[i]!;
      const nextRoll = i + 1;
      if (row.rollNumber === nextRoll) continue;
      await updateEnrollment(
        row.id,
        {
          classId: row.classId,
          levelId: row.levelId,
          rollNumber: nextRoll,
          repeater: row.repeater,
          newStudent: row.newStudent,
          status: row.status,
          enrolledOn: row.enrolledOn,
          leftOn: row.leftOn,
          previousSchool: row.previousSchool,
        },
        schoolId,
      );
    }
  }

  async function openCreate() {
    setFormError(null);
    setStudentQuery("");
    setSuggestions([]);
    setSuggestionsOpen(false);
    setDraft({
      mode: "create",
      studentId: "",
      name: "",
      classId,
      levelId,
      rollNumber: "",
      repeater: false,
      newStudent: true,
      status: "ENROLLED",
      enrolledOn: null,
      leftOn: null,
      previousSchool: null,
    });
    setEditorOpen(true);
    try {
      const [yearEnrollments, classEnrolled] = await Promise.all([
        listEnrollments({ page: 0, size: 100, academicYearId, schoolId }),
        listAllClassEnrolled(),
      ]);
      setEnrolledYearIds(new Set(yearEnrollments.content.map((e) => e.studentId)));
      setClassEnrolledNames(
        classEnrolled
          .map((e) => e.studentFullName?.trim())
          .filter((name): name is string => Boolean(name)),
      );
    } catch (error) {
      if (isAuthFailure(error)) return;
      setEnrolledYearIds(new Set());
      setClassEnrolledNames([]);
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("loadError"));
    }
  }

  function openEdit(row: EnrollmentResponse) {
    setSuggestions([]);
    setStudentQuery("");
    setSuggestionsOpen(false);
    setDraft({
      mode: "edit",
      id: row.id,
      studentId: row.studentId,
      name: row.studentFullName || t("classRoster.unknownStudent"),
      classId: row.classId,
      levelId: row.levelId,
      rollNumber: row.rollNumber != null ? String(row.rollNumber) : "",
      repeater: row.repeater,
      newStudent: row.newStudent,
      status: row.status,
      enrolledOn: row.enrolledOn,
      leftOn: row.leftOn,
      previousSchool: row.previousSchool,
    });
    setFormError(null);
    setEditorOpen(true);
  }

  function selectStudent(student: StudentResponse) {
    setDraft((d) =>
      d
        ? {
            ...d,
            studentId: student.id,
            name: student.fullName,
            rollNumber: String(alphabeticalRoll(student.fullName, classEnrolledNames)),
          }
        : d,
    );
    setStudentQuery(student.fullName);
    setSuggestionsOpen(false);
    setFormError(null);
  }

  function clearSelectedStudent() {
    setDraft((d) => (d ? { ...d, studentId: "", name: "", rollNumber: "" } : d));
    setStudentQuery("");
    setSuggestions([]);
    setSuggestionsOpen(false);
  }

  useEffect(() => {
    if (!editorOpen || draft?.mode !== "create") return;
    const q = debouncedStudentQuery.trim();
    if (q.length < 1) {
      setSuggestions([]);
      setLoadingStudents(false);
      return;
    }
    // Ne pas relancer la recherche si un élève est déjà sélectionné avec ce libellé.
    if (draft.studentId && draft.name === q) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setLoadingStudents(true);
    void (async () => {
      try {
        const result = await listStudents({
          page: 0,
          size: 20,
          active: true,
          q,
          schoolId,
        });
        if (cancelled) return;
        setSuggestions(
          result.content
            .filter((s) => s.active && !enrolledYearIds.has(s.id))
            .sort((a, b) => compareNames(a.fullName, b.fullName)),
        );
        setSuggestionsOpen(true);
      } catch (error) {
        if (cancelled || isAuthFailure(error)) return;
        setSuggestions([]);
        if (error instanceof ApiError) notify.error(error.message);
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    debouncedStudentQuery,
    draft?.mode,
    draft?.name,
    draft?.studentId,
    editorOpen,
    enrolledYearIds,
    schoolId,
  ]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    if (draft.mode === "create" && !draft.studentId) {
      setFormError(t("classRoster.studentRequired"));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (draft.mode === "create") {
        await createEnrollment({
          studentId: draft.studentId,
          academicYearId,
          classId,
          levelId,
          rollNumber: previewRoll,
          repeater: draft.repeater,
          newStudent: draft.newStudent,
          schoolId: schoolId ?? null,
        });
        await renumberClassAlphabetically();
        notify.success(t("classRoster.created"));
      } else if (draft.id) {
        await updateEnrollment(
          draft.id,
          {
            classId: draft.classId,
            levelId: draft.levelId,
            rollNumber: draft.rollNumber.trim() ? Number(draft.rollNumber) : null,
            repeater: draft.repeater,
            newStudent: draft.newStudent,
            status: draft.status,
            enrolledOn: draft.enrolledOn,
            leftOn: draft.leftOn,
            previousSchool: draft.previousSchool,
          },
          schoolId,
        );
        notify.success(t("classRoster.updated"));
      }
      setEditorOpen(false);
      setDraft(null);
      setStudentQuery("");
      await Promise.all([load(), loadClassTotal()]);
      onChanged?.();
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) setFormError(error.message);
      else setFormError(draft.mode === "create" ? t("classRoster.createError") : t("actionError"));
    } finally {
      setSaving(false);
    }
  }

  async function onToggle() {
    if (!pendingToggle) return;
    const nextStatus = pendingToggle.status === "ENROLLED" ? "WITHDRAWN" : "ENROLLED";
    try {
      await updateEnrollment(
        pendingToggle.id,
        {
          classId: pendingToggle.classId,
          levelId: pendingToggle.levelId,
          rollNumber: pendingToggle.rollNumber,
          repeater: pendingToggle.repeater,
          newStudent: pendingToggle.newStudent,
          status: nextStatus,
          enrolledOn: pendingToggle.enrolledOn,
          leftOn: pendingToggle.leftOn,
          previousSchool: pendingToggle.previousSchool,
        },
        schoolId,
      );
      await renumberClassAlphabetically();
      notify.success(
        nextStatus === "WITHDRAWN" ? t("classRoster.withdrawn") : t("classRoster.reactivated"),
      );
      setPendingToggle(null);
      await Promise.all([load(), loadClassTotal()]);
      onChanged?.();
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("actionError"));
    }
  }

  function RowActions({ row }: { row: EnrollmentResponse }) {
    if (!canManage) return null;
    const enrolled = row.status === "ENROLLED";
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
            enrolled ? (
              <PowerOff className="size-3.5" aria-hidden />
            ) : (
              <Power className="size-3.5" aria-hidden />
            )
          }
          onClick={() => setPendingToggle(row)}
          aria-label={enrolled ? t("actionDeactivate") : t("actionReactivate")}
        />
      </div>
    );
  }

  return (
    <>
      <GroupedList header={t("classRoster.title")} className="lg:col-span-2">
        <GroupedListItem className="flex-wrap gap-y-2.5 bg-[color-mix(in_srgb,var(--ios-fill)_28%,var(--ios-card))] py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-[var(--ios-info-soft)] text-[var(--ios-blue)]">
              <Users className="size-3.5 stroke-[1.75]" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold tabular-nums text-[var(--ios-label)]">
                {loading
                  ? t("classRoster.loadingCount")
                  : t("classRoster.totalLabel", { count: classTotal })}
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
                onClick={() => void openCreate()}
                disabled={loading}
              >
                {t("classRoster.add")}
              </Button>
            ) : null}
          </div>
        </GroupedListItem>

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <GroupedListItem key={i} className="block py-3">
              <div className={cn(ROW_GRID, "hidden md:grid")}>
                <Skeleton className="h-7 w-8 rounded-full" />
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-9 rounded-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-24 rounded-[var(--radius-sm)]" />
                <Skeleton className="h-5 w-6" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                {canManage ? <Skeleton className="ml-auto h-8 w-16" /> : null}
              </div>
              <div className="flex items-center gap-3 md:hidden">
                <Skeleton className="size-9 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-2/5" />
                  <Skeleton className="h-2.5 w-1/4" />
                </div>
              </div>
            </GroupedListItem>
          ))
        ) : rows.length === 0 ? (
          <GroupedListItem className="block py-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]">
                <Users className="size-5 stroke-[1.5]" aria-hidden />
              </span>
              <div className="space-y-1">
                <p className="text-[14px] font-semibold text-[var(--ios-label)]">
                  {t("classRoster.emptyTitle")}
                </p>
                <p className="mx-auto max-w-sm text-[12px] leading-relaxed text-[var(--ios-secondary-label)]">
                  {t("classRoster.emptyDescription")}
                </p>
              </div>
            </div>
          </GroupedListItem>
        ) : (
          <>
            <GroupedListItem className="hidden bg-[color-mix(in_srgb,var(--ios-fill)_18%,var(--ios-card))] py-2.5 md:flex">
              <div className={ROW_GRID} role="row">
                <ColumnHeader label={t("classRoster.columns.roll")} />
                <ColumnHeader label={t("classRoster.columns.name")} />
                <ColumnHeader label={t("classRoster.columns.matricule")} />
                <ColumnHeader label={t("classRoster.columns.sex")} />
                <ColumnHeader label={t("classRoster.columns.status")} />
                <ColumnHeader label={t("classRoster.columns.flags")} />
                {canManage ? (
                  <ColumnHeader
                    label={t("classRoster.columns.actions")}
                    className="text-right"
                  />
                ) : (
                  <span />
                )}
              </div>
            </GroupedListItem>

            {rows.map((row) => {
              const name = row.studentFullName || t("classRoster.unknownStudent");
              const enrolled = row.status === "ENROLLED";
              const sexLabel =
                row.studentSex === "M" || row.studentSex === "F"
                  ? t(`classRoster.sex.${row.studentSex}`)
                  : "—";
              const flags = (
                <>
                  {row.repeater ? (
                    <Badge tone="warning">{t("classRoster.repeater")}</Badge>
                  ) : null}
                  {row.newStudent ? (
                    <Badge tone="blue">{t("classRoster.newStudent")}</Badge>
                  ) : null}
                  {!row.repeater && !row.newStudent ? (
                    <span className="text-[12px] text-[var(--ios-tertiary-label)]">—</span>
                  ) : null}
                </>
              );

              return (
                <GroupedListItem key={row.id} className="block py-3.5">
                  <div className={cn(ROW_GRID, "hidden md:grid")} role="row">
                    <div className="flex justify-start">
                      <RollBadge value={row.rollNumber} />
                    </div>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <StudentAvatar name={name} enrolled={enrolled} />
                      <p className="truncate text-[13px] font-semibold text-[var(--ios-label)]">
                        {name}
                      </p>
                    </div>
                    <div>
                      <span className="inline-flex max-w-full whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--ios-separator)]/70 bg-[color-mix(in_srgb,var(--ios-fill)_35%,var(--ios-card))] px-2 py-1 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                        {row.studentMatricule || "—"}
                      </span>
                    </div>
                    <div className="text-[12px] font-medium tabular-nums text-[var(--ios-secondary-label)]">
                      {sexLabel}
                    </div>
                    <div>
                      <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">{flags}</div>
                    <RowActions row={row} />
                  </div>

                  <div className="flex items-start gap-3 md:hidden">
                    <RollBadge value={row.rollNumber} />
                    <StudentAvatar name={name} enrolled={enrolled} />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="truncate text-[13px] font-semibold text-[var(--ios-label)]">
                        {name}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--ios-separator)]/70 bg-[color-mix(in_srgb,var(--ios-fill)_35%,var(--ios-card))] px-2 py-0.5 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                          {row.studentMatricule || "—"}
                        </span>
                        <Badge tone="neutral">{sexLabel}</Badge>
                        <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
                        {flags}
                      </div>
                    </div>
                    <RowActions row={row} />
                  </div>
                </GroupedListItem>
              );
            })}
          </>
        )}

        {!loading && totalElements > 0 ? (
          <GroupedListItem className="flex-wrap gap-y-2 bg-[color-mix(in_srgb,var(--ios-fill)_22%,var(--ios-card))] py-2.5">
            <p className="text-[12px] text-[var(--ios-secondary-label)]">
              {showPager
                ? t("classRoster.pageOf", { page: page + 1, total: totalPages })
                : t("classRoster.range", { from, to, total: totalElements })}
            </p>
            {showPager ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="pressable inline-flex h-8 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--ios-separator)]/70 bg-[var(--ios-card)] px-2.5 text-[12px] font-medium text-[var(--ios-label)] transition-colors hover:bg-[var(--ios-fill)]/45 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={t("classRoster.previous")}
                >
                  <ChevronLeft className="size-3.5" aria-hidden />
                  <span className="hidden sm:inline">{t("classRoster.previous")}</span>
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
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
      </GroupedList>

      {mounted && editorOpen && draft
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
                    <GraduationCap className="size-4 stroke-[1.75]" aria-hidden />
                  </span>
                  <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
                    {draft.mode === "create" ? t("classRoster.addTitle") : t("classRoster.editTitle")}
                  </h2>
                  {draft.mode === "edit" ? (
                    <p className="mt-1 text-[12px] text-[var(--ios-secondary-label)]">{draft.name}</p>
                  ) : null}
                  <p className="mt-0.5 text-[11px] text-[var(--ios-tertiary-label)]">
                    {draft.mode === "create" ? t("classRoster.addHint") : t("classRoster.editHint")}
                  </p>
                </div>
                <div className="space-y-2 px-4 py-3 [&_input]:h-[var(--control-height-sm)] [&_select]:h-[var(--control-height-sm)] [&_label]:mb-1">
                  {draft.mode === "create" ? (
                    <Field id="enr-student" label={t("classRoster.student")}>
                      <div ref={searchWrapRef} className="relative">
                        <div className="relative">
                          <Search
                            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--ios-tertiary-label)]"
                            aria-hidden
                          />
                          <Input
                            id="enr-student"
                            value={studentQuery}
                            autoComplete="off"
                            disabled={saving}
                            placeholder={t("classRoster.studentSearchPlaceholder")}
                            className="pl-9 pr-9"
                            onFocus={() => {
                              if (suggestions.length > 0) setSuggestionsOpen(true);
                            }}
                            onChange={(e) => {
                              const value = e.target.value;
                              setStudentQuery(value);
                              if (draft.studentId) {
                                setDraft((d) =>
                                  d ? { ...d, studentId: "", name: "", rollNumber: "" } : d,
                                );
                              }
                              setSuggestionsOpen(true);
                            }}
                          />
                          {studentQuery || draft.studentId ? (
                            <button
                              type="button"
                              aria-label={t("classRoster.clearStudent")}
                              className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ios-secondary-label)] hover:bg-[var(--ios-fill)]"
                              onClick={clearSelectedStudent}
                            >
                              <X className="size-3.5" aria-hidden />
                            </button>
                          ) : null}
                        </div>

                        {draft.studentId ? (
                          <p className="mt-1.5 text-[11px] font-medium text-[var(--ios-success)]">
                            {t("classRoster.studentSelected")} · {draft.name}
                          </p>
                        ) : (
                          <p className="mt-1 text-[11px] text-[var(--ios-secondary-label)]">
                            {t("classRoster.studentSearchHint")}
                          </p>
                        )}

                        {suggestionsOpen && !draft.studentId ? (
                          <ul
                            role="listbox"
                            className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-[var(--radius-md)] border border-[var(--ios-separator)]/60 bg-[var(--ios-card)] py-1 shadow-[var(--ios-shadow-md)]"
                          >
                            {loadingStudents ? (
                              <li className="px-3 py-2 text-[12px] text-[var(--ios-secondary-label)]">
                                {tCommon("loading")}
                              </li>
                            ) : suggestions.length === 0 ? (
                              <li className="px-3 py-2 text-[12px] text-[var(--ios-secondary-label)]">
                                {t("classRoster.noSearchResults")}
                              </li>
                            ) : (
                              suggestions.map((student) => (
                                <li key={student.id}>
                                  <button
                                    type="button"
                                    role="option"
                                    className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--ios-fill)]/55"
                                    onClick={() => selectStudent(student)}
                                  >
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-[13px] font-medium text-[var(--ios-label)]">
                                        {student.fullName}
                                      </span>
                                      <span className="mt-0.5 block font-mono text-[11px] text-[var(--ios-secondary-label)]">
                                        {student.matricule || "—"}
                                        {student.sex ? ` · ${student.sex}` : ""}
                                      </span>
                                    </span>
                                  </button>
                                </li>
                              ))
                            )}
                          </ul>
                        ) : null}
                      </div>
                    </Field>
                  ) : null}
                  <Field id="enr-roll" label={t("classRoster.columns.roll")}>
                    <Input
                      id="enr-roll"
                      readOnly
                      value={
                        draft.mode === "create"
                          ? previewRoll != null
                            ? t("classRoster.rollPreview", { n: previewRoll })
                            : t("classRoster.rollAuto")
                          : draft.rollNumber || "—"
                      }
                      className="bg-[color-mix(in_srgb,var(--ios-fill)_35%,var(--ios-card))] text-[var(--ios-secondary-label)]"
                    />
                    <p className="mt-1 text-[11px] text-[var(--ios-secondary-label)]">
                      {t("classRoster.rollAutoHint")}
                    </p>
                  </Field>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-0.5 text-[12.5px] text-[var(--ios-label)]">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={draft.repeater}
                        onChange={(e) =>
                          setDraft((d) => (d ? { ...d, repeater: e.target.checked } : d))
                        }
                      />
                      {t("classRoster.repeater")}
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={draft.newStudent}
                        onChange={(e) =>
                          setDraft((d) => (d ? { ...d, newStudent: e.target.checked } : d))
                        }
                      />
                      {t("classRoster.newStudent")}
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
                  <Button
                    type="submit"
                    size="sm"
                    disabled={saving || (draft.mode === "create" && !draft.studentId)}
                  >
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
          pendingToggle?.status === "ENROLLED"
            ? t("classRoster.withdrawTitle")
            : t("classRoster.reactivateTitle")
        }
        description={
          pendingToggle?.status === "ENROLLED"
            ? t("classRoster.withdrawDescription")
            : t("classRoster.reactivateDescription")
        }
        confirmLabel={
          pendingToggle?.status === "ENROLLED" ? t("actionDeactivate") : t("actionReactivate")
        }
        cancelLabel={tCommon("cancel")}
        tone={pendingToggle?.status === "ENROLLED" ? "destructive" : "default"}
        onConfirm={() => void onToggle()}
      />
    </>
  );
}
