"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  updateTimeSlotGrid,
  type DayOfWeek,
  type GridPeriodDto,
  type PeriodKind,
  type TimeSlotGridResponse,
} from "@/lib/api/timetable";
import { WEEKDAYS } from "@/lib/timetable/default-grid";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { ApiError, isAuthFailure } from "@/types/api";

const PERIOD_KINDS: PeriodKind[] = ["LESSON", "BREAK", "CLEANUP", "CLOSING", "ASSEMBLY"];

type DraftPeriod = {
  key: string;
  number: string;
  kind: PeriodKind;
  start: string;
  end: string;
  labelFr: string;
  labelEn: string;
};

function toDraft(periods: GridPeriodDto[]): DraftPeriod[] {
  return periods.map((p, index) => ({
    key: `p-${index}-${p.start}-${p.end}`,
    number: p.number != null ? String(p.number) : "",
    kind: p.kind,
    start: (p.start || "").slice(0, 5),
    end: (p.end || "").slice(0, 5),
    labelFr: p.label?.fr ?? "",
    labelEn: p.label?.en ?? "",
  }));
}

function renumberLessons(rows: DraftPeriod[]): DraftPeriod[] {
  let n = 1;
  return rows.map((row) => {
    if (row.kind !== "LESSON") {
      return { ...row, number: "" };
    }
    const next = { ...row, number: String(n) };
    n += 1;
    return next;
  });
}

type Props = {
  grid: TimeSlotGridResponse;
  canEdit: boolean;
  schoolId?: string | null;
  onSaved: (grid: TimeSlotGridResponse) => void;
};

/** Édition complète de la grille horaire (périodes, pauses, jours, libellés). */
export function TimetableGridEditor({ grid, canEdit, schoolId, onSaved }: Props) {
  const t = useTranslations("timetableHub");
  const [name, setName] = useState(grid.name);
  const [active, setActive] = useState(grid.active);
  const [days, setDays] = useState<DayOfWeek[]>([...grid.days]);
  const [periods, setPeriods] = useState<DraftPeriod[]>(() => toDraft(grid.periods));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(grid.name);
    setActive(grid.active);
    setDays([...grid.days]);
    setPeriods(toDraft(grid.periods));
  }, [grid]);

  const toggleDay = (day: DayOfWeek) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const updateRow = (key: string, patch: Partial<DraftPeriod>) => {
    setPeriods((prev) =>
      renumberLessons(
        prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
      ),
    );
  };

  const addRow = (afterKey?: string) => {
    const blank: DraftPeriod = {
      key: `new-${Date.now()}`,
      number: "",
      kind: "LESSON",
      start: "08:00",
      end: "08:50",
      labelFr: "",
      labelEn: "",
    };
    setPeriods((prev) => {
      if (!afterKey) return renumberLessons([...prev, blank]);
      const idx = prev.findIndex((r) => r.key === afterKey);
      if (idx < 0) return renumberLessons([...prev, blank]);
      const next = [...prev];
      next.splice(idx + 1, 0, blank);
      return renumberLessons(next);
    });
  };

  const removeRow = (key: string) => {
    setPeriods((prev) => renumberLessons(prev.filter((r) => r.key !== key)));
  };

  const onSave = async () => {
    if (!canEdit || saving) return;
    if (!name.trim()) {
      notify.error(t("gridEditor.nameRequired"));
      return;
    }
    if (days.length === 0) {
      notify.error(t("gridEditor.daysRequired"));
      return;
    }
    if (periods.length === 0) {
      notify.error(t("gridEditor.periodsRequired"));
      return;
    }
    const payloadPeriods: GridPeriodDto[] = periods.map((row) => ({
      number: row.kind === "LESSON" ? Number(row.number) || null : null,
      kind: row.kind,
      start: row.start.length === 5 ? `${row.start}:00` : row.start,
      end: row.end.length === 5 ? `${row.end}:00` : row.end,
      label:
        row.labelFr.trim() || row.labelEn.trim()
          ? { fr: row.labelFr.trim() || null, en: row.labelEn.trim() || null }
          : null,
    }));

    setSaving(true);
    try {
      const saved = await updateTimeSlotGrid(grid.id, {
        name: name.trim(),
        days,
        periods: payloadPeriods,
        active,
      }, schoolId);
      onSaved(saved);
      notify.success(t("gridEditor.saved"));
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(error instanceof ApiError && error.message ? error.message : t("actionError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-[12px] leading-relaxed text-[var(--ios-secondary-label)]">
        {t("gridEditor.hint")}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("gridEditor.name")}>
          <Input value={name} disabled={!canEdit} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t("columns.status")}>
          <Select
            value={active ? "active" : "inactive"}
            disabled={!canEdit}
            onChange={(e) => setActive(e.target.value === "active")}
          >
            <option value="active">{t("statusActive")}</option>
            <option value="inactive">{t("inactive")}</option>
          </Select>
        </Field>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ios-tertiary-label)]">
          {t("gridEditor.days")}
        </p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => {
            const on = days.includes(day);
            return (
              <button
                key={day}
                type="button"
                disabled={!canEdit}
                onClick={() => toggleDay(day)}
                className={cn(
                  "pressable min-h-9 rounded-[var(--radius-md)] px-3 text-[12px] font-semibold transition-colors",
                  on
                    ? "bg-[var(--ios-blue)] text-white"
                    : "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]",
                  !canEdit && "cursor-not-allowed opacity-60",
                )}
              >
                {t(`days.${day}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                {t("gridEditor.kind")}
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                #
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                {t("gridEditor.start")}
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                {t("gridEditor.end")}
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                {t("gridEditor.labelFr")}
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                {t("gridEditor.labelEn")}
              </th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {periods.map((row) => (
              <tr key={row.key} className="border-b border-[var(--ios-separator)]/45 last:border-b-0">
                <td className="px-2 py-2">
                  <Select
                    value={row.kind}
                    disabled={!canEdit}
                    onChange={(e) => updateRow(row.key, { kind: e.target.value as PeriodKind })}
                  >
                    {PERIOD_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {t(`gridEditor.kinds.${kind}`)}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-2 py-2">
                  <Input
                    className="w-14"
                    value={row.number}
                    disabled={!canEdit || row.kind !== "LESSON"}
                    readOnly
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    type="time"
                    value={row.start}
                    disabled={!canEdit}
                    onChange={(e) => updateRow(row.key, { start: e.target.value })}
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    type="time"
                    value={row.end}
                    disabled={!canEdit}
                    onChange={(e) => updateRow(row.key, { end: e.target.value })}
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    value={row.labelFr}
                    disabled={!canEdit}
                    onChange={(e) => updateRow(row.key, { labelFr: e.target.value })}
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    value={row.labelEn}
                    disabled={!canEdit}
                    onChange={(e) => updateRow(row.key, { labelEn: e.target.value })}
                  />
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1">
                    {canEdit ? (
                      <>
                        <button
                          type="button"
                          className="pressable inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ios-blue)] hover:bg-[var(--ios-fill)]"
                          title={t("gridEditor.addAfter")}
                          onClick={() => addRow(row.key)}
                        >
                          <Plus className="size-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="pressable inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ios-danger)] hover:bg-[var(--ios-danger-soft)]"
                          title={t("gridEditor.remove")}
                          onClick={() => removeRow(row.key)}
                          disabled={periods.length <= 1}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => addRow()}>
            {t("gridEditor.addPeriod")}
          </Button>
          <Button type="button" onClick={() => void onSave()} disabled={saving}>
            {saving ? t("actions.saving") : t("actions.save")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
