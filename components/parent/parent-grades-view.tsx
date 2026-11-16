"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ParentChildSwitcher } from "@/components/parent/parent-child-switcher";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import {
  HubLoadingRows,
  HubTableShell,
  HubYearBanner,
} from "@/components/workspace/hub-chrome";
import {
  listAcademicYears,
  listClassSubjects,
  listSubjects,
  localizedLabel,
  type AcademicYearResponse,
  type SubjectResponse,
} from "@/lib/api/academic";
import {
  listStudentSequenceMarks,
  type SequenceMarkSummaryDto,
} from "@/lib/api/grading";
import { formatMark, markCellText } from "@/lib/grading/marks";
import { useParentChildren } from "@/lib/parent/use-parent-children";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { ApiError, isAuthFailure } from "@/types/api";

type Row = {
  classSubjectId: string;
  subjectLabel: string;
  bySession: Record<number, SequenceMarkSummaryDto | undefined>;
};

/** Notes de séquence des enfants liés (`canViewGrades`). */
export function ParentGradesView() {
  const t = useTranslations("parentSpace");
  const tHub = useTranslations("gradesHub");
  const locale = useLocale();

  const {
    schoolId,
    guardianId,
    loading: childrenLoading,
    children,
    selected,
    selectedId,
    setSelectedId,
    canViewGrades,
  } = useParentChildren();

  const [year, setYear] = useState<AcademicYearResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [marks, setMarks] = useState<SequenceMarkSummaryDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [subjectByClassSubject, setSubjectByClassSubject] = useState<
    Record<string, string>
  >({});
  const [termFilter, setTermFilter] = useState<string>("");

  const loadYear = useCallback(async () => {
    const years = await listAcademicYears({ page: 0, size: 20, schoolId });
    return (
      years.content.find((y) => y.current) ??
      years.content.find((y) => y.status === "ACTIVE") ??
      years.content[0] ??
      null
    );
  }, [schoolId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [y, subjectsPage] = await Promise.all([
          loadYear(),
          listSubjects({ page: 0, size: 200, active: true, schoolId }),
        ]);
        if (cancelled) return;
        setYear(y);
        setSubjects(subjectsPage.content);
      } catch (err) {
        if (isAuthFailure(err)) return;
        if (!cancelled) setYear(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadYear, schoolId]);

  useEffect(() => {
    if (!selected || !year || !canViewGrades) {
      setMarks([]);
      setSubjectByClassSubject({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const markRows = await listStudentSequenceMarks({
          studentId: selected.id,
          academicYearId: year.id,
          schoolId,
        });
        if (cancelled) return;
        setMarks(markRows);

        const classIds = [...new Set(markRows.map((m) => m.classId))];
        const subjectMap: Record<string, string> = {};
        const subjectById = new Map(subjects.map((s) => [s.id, s]));
        await Promise.all(
          classIds.map(async (classId) => {
            try {
              const page = await listClassSubjects({
                classId,
                page: 0,
                size: 100,
                active: true,
                schoolId,
              });
              for (const cs of page.content) {
                const subj = subjectById.get(cs.subjectId);
                subjectMap[cs.id] = subj
                  ? localizedLabel(subj.name, locale)
                  : cs.subjectId;
              }
            } catch {
              /* libellés optionnels */
            }
          }),
        );
        if (!cancelled) setSubjectByClassSubject(subjectMap);
      } catch (err) {
        if (isAuthFailure(err)) return;
        if (!cancelled) {
          setMarks([]);
          notify.error(
            err instanceof ApiError && err.message ? err.message : t("loadError"),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, year, schoolId, canViewGrades, subjects, locale, t]);

  const sessions = useMemo(() => {
    const set = new Set(marks.map((m) => m.sessionNumber));
    return [...set].sort((a, b) => a - b);
  }, [marks]);

  const filteredMarks = useMemo(() => {
    if (!termFilter) return marks;
    const term = Number(termFilter);
    return marks.filter((m) => m.termNumber === term);
  }, [marks, termFilter]);

  const rows = useMemo(() => {
    const map = new Map<string, Row>();
    for (const mark of filteredMarks) {
      let row = map.get(mark.classSubjectId);
      if (!row) {
        row = {
          classSubjectId: mark.classSubjectId,
          subjectLabel:
            subjectByClassSubject[mark.classSubjectId] ||
            t("grades.unknownSubject"),
          bySession: {},
        };
        map.set(mark.classSubjectId, row);
      }
      row.bySession[mark.sessionNumber] = mark;
    }
    return [...map.values()].sort((a, b) =>
      a.subjectLabel.localeCompare(b.subjectLabel, locale),
    );
  }, [filteredMarks, subjectByClassSubject, locale, t]);

  const terms = useMemo(() => {
    const set = new Set(marks.map((m) => m.termNumber));
    return [...set].sort((a, b) => a - b);
  }, [marks]);

  if (!guardianId) {
    return (
      <div className="space-y-5 slide-up">
        <PageHeader description={t("grades.description")} />
        <EmptyState
          title={t("noProfileTitle")}
          description={t("noProfileDescription")}
          icon={<ClipboardList className="size-9 stroke-[1.5]" aria-hidden />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 slide-up">
      <PageHeader description={t("grades.description")} />

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
        lockedLabel={year?.locked ? t("yearLocked") : null}
        hint={t("grades.hint")}
        loading={childrenLoading}
        emptyLabel={t("yearEmpty")}
      />

      {childrenLoading ? (
        <HubLoadingRows />
      ) : children.length === 0 ? (
        <EmptyState
          title={t("children.emptyTitle")}
          description={t("children.emptyDescription")}
          icon={<ClipboardList className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : (
        <>
          <ParentChildSwitcher
            childrenList={children}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {!canViewGrades ? (
            <Alert
              tone="warning"
              title={t("grades.forbiddenTitle")}
              description={t("grades.forbiddenBody")}
            />
          ) : loading ? (
            <HubLoadingRows />
          ) : rows.length === 0 ? (
            <EmptyState
              title={t("grades.emptyTitle")}
              description={t("grades.emptyDescription")}
              icon={<ClipboardList className="size-9 stroke-[1.5]" aria-hidden />}
            />
          ) : (
            <>
              {terms.length > 1 ? (
                <label className="grid max-w-[200px] gap-1 text-[12px] text-[var(--ios-secondary-label)]">
                  {t("grades.termFilter")}
                  <Select
                    value={termFilter}
                    onChange={(e) => setTermFilter(e.target.value)}
                  >
                    <option value="">{t("grades.allTerms")}</option>
                    {terms.map((term) => (
                      <option key={term} value={String(term)}>
                        {t("grades.termOption", { number: term })}
                      </option>
                    ))}
                  </Select>
                </label>
              ) : null}

              <HubTableShell
                countLabel={t("grades.tableCount", { count: rows.length })}
              >
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
                      <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                        {t("grades.columns.subject")}
                      </th>
                      {sessions.map((n) => (
                        <th
                          key={n}
                          className="px-3 py-3.5 text-center text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]"
                        >
                          {t("grades.columns.session", { number: n })}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr
                        key={row.classSubjectId}
                        className={cn(
                          "border-b border-[var(--ios-separator)]/55 last:border-b-0",
                          index % 2 === 1 &&
                            "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                        )}
                      >
                        <td className="px-5 py-3.5 text-[13px] font-medium text-[var(--ios-label)]">
                          {row.subjectLabel}
                        </td>
                        {sessions.map((n) => {
                          const mark = row.bySession[n];
                          const label = mark
                            ? mark.status === "SCORED"
                              ? formatMark(mark.value, locale) || "—"
                              : markCellText(null, mark.status, locale, {
                                  absent: "ABS",
                                  exempted: "DISP",
                                }) || mark.status
                            : "—";
                          return (
                            <td
                              key={n}
                              className="px-3 py-3.5 text-center tabular-nums text-[13px] text-[var(--ios-label)]"
                            >
                              {label}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </HubTableShell>
            </>
          )}

          {!canViewGrades && selected ? (
            <p className="flex items-center gap-2 text-[12px] text-[var(--ios-secondary-label)]">
              <Lock className="size-3.5" aria-hidden />
              {selected.fullName}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
