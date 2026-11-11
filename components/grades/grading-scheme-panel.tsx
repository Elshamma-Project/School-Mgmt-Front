"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Scale, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { localizedLabel } from "@/lib/api/academic";
import {
  createGradingScheme,
  getGradingScheme,
  updateGradingScheme,
  type GradingSchemeResponse,
} from "@/lib/api/grading";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { ApiError, isAuthFailure } from "@/types/api";

export type SchemePanelMode = "create" | "view" | "edit";

type GradingSchemePanelProps = {
  open: boolean;
  mode: SchemePanelMode;
  schemeId: string | null;
  schoolId?: string | null;
  canManage: boolean;
  onClose: () => void;
  onSaved: (scheme: GradingSchemeResponse) => void;
};

function asInputNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function parseDecimal(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function formatBandRange(
  minInclusive: string | number,
  maxExclusive: string | number | null,
): string {
  const min = String(minInclusive);
  if (maxExclusive === null || maxExclusive === undefined) return `≥ ${min}`;
  return `[${min} ; ${String(maxExclusive)}[`;
}

export function GradingSchemePanel({
  open,
  mode,
  schemeId,
  schoolId,
  canManage,
  onClose,
  onSaved,
}: GradingSchemePanelProps) {
  const t = useTranslations("gradesHub");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scheme, setScheme] = useState<GradingSchemeResponse | null>(null);
  const [panelMode, setPanelMode] = useState<SchemePanelMode>(mode);

  const [code, setCode] = useState("");
  const [nameFr, setNameFr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [maxScore, setMaxScore] = useState("20");
  const [passMark, setPassMark] = useState("10");
  const [classSuccessThreshold, setClassSuccessThreshold] = useState("12");
  const [decimals, setDecimals] = useState("2");
  const [honourRollMinAverage, setHonourRollMinAverage] = useState("12");
  const [honourRollBlockedBySanction, setHonourRollBlockedBySanction] = useState(true);
  const [effortSubjectThreshold, setEffortSubjectThreshold] = useState("8");
  const [reportSheetDeadlineHours, setReportSheetDeadlineHours] = useState("72");
  const [reportSheetDeadlineBlocking, setReportSheetDeadlineBlocking] = useState(false);
  const [reportSheetMaxRowsPerPage, setReportSheetMaxRowsPerPage] = useState("45");
  const [reportSheetAppreciationScaleCode, setReportSheetAppreciationScaleCode] =
    useState("LETTER");
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setPanelMode(mode);
    setFormError(null);

    if (mode === "create") {
      setScheme(null);
      setCode("");
      setNameFr("");
      setNameEn("");
      setMaxScore("20");
      setPassMark("10");
      setClassSuccessThreshold("12");
      setDecimals("2");
      setHonourRollMinAverage("12");
      setHonourRollBlockedBySanction(true);
      setEffortSubjectThreshold("8");
      setReportSheetDeadlineHours("72");
      setReportSheetDeadlineBlocking(false);
      setReportSheetMaxRowsPerPage("45");
      setReportSheetAppreciationScaleCode("LETTER");
      setActive(true);
      return;
    }

    if (!schemeId) return;
    let cancelled = false;
    setLoading(true);
    void getGradingScheme(schemeId, schoolId)
      .then((row) => {
        if (cancelled) return;
        setScheme(row);
        setCode(row.code);
        setNameFr(row.name.fr ?? "");
        setNameEn(row.name.en ?? "");
        setMaxScore(asInputNumber(row.maxScore));
        setPassMark(asInputNumber(row.passMark));
        setClassSuccessThreshold(asInputNumber(row.classSuccessThreshold));
        setDecimals(String(row.decimals));
        setHonourRollMinAverage(asInputNumber(row.honourRollMinAverage));
        setHonourRollBlockedBySanction(row.honourRollBlockedBySanction);
        setEffortSubjectThreshold(asInputNumber(row.effortSubjectThreshold));
        setReportSheetDeadlineHours(String(row.reportSheetDeadlineHours));
        setReportSheetDeadlineBlocking(row.reportSheetDeadlineBlocking);
        setReportSheetMaxRowsPerPage(String(row.reportSheetMaxRowsPerPage));
        setReportSheetAppreciationScaleCode(row.reportSheetAppreciationScaleCode);
        setActive(row.active);
      })
      .catch((error) => {
        if (cancelled || isAuthFailure(error)) return;
        if (error instanceof ApiError) notify.error(error.message);
        else notify.error(t("schemePanel.loadError"));
        onClose();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, onClose, open, schemeId, schoolId, t]);

  const editable = panelMode === "create" || panelMode === "edit";
  const title =
    panelMode === "create"
      ? t("schemePanel.createTitle")
      : panelMode === "edit"
        ? t("schemePanel.editTitle")
        : t("schemePanel.viewTitle");

  const scaleOptions = useMemo(() => {
    const codes = scheme?.appreciationScales.map((s) => s.code) ?? [];
    if (reportSheetAppreciationScaleCode && !codes.includes(reportSheetAppreciationScaleCode)) {
      codes.push(reportSheetAppreciationScaleCode);
    }
    if (codes.length === 0) return ["LETTER"];
    return codes;
  }, [reportSheetAppreciationScaleCode, scheme?.appreciationScales]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage || saving) return;
    setFormError(null);

    const fr = nameFr.trim();
    const en = nameEn.trim();
    if (!fr && !en) {
      setFormError(t("schemePanel.nameRequired"));
      return;
    }

    if (panelMode === "create") {
      const trimmedCode = code.trim().toUpperCase();
      if (!trimmedCode) {
        setFormError(t("schemePanel.codeRequired"));
        return;
      }
      setSaving(true);
      try {
        const created = await createGradingScheme({
          code: trimmedCode,
          name: { fr: fr || en, en: en || fr },
          schoolId,
        });
        notify.success(t("schemePanel.createSuccess"));
        onSaved(created);
        onClose();
      } catch (error) {
        if (isAuthFailure(error)) return;
        if (error instanceof ApiError) setFormError(error.message);
        else setFormError(t("schemePanel.saveError"));
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!schemeId) return;

    const maxScoreN = parseDecimal(maxScore);
    const passMarkN = parseDecimal(passMark);
    const classSuccessN = parseDecimal(classSuccessThreshold);
    const honourN = parseDecimal(honourRollMinAverage);
    const effortRaw = effortSubjectThreshold.trim();
    const effortN = effortRaw ? parseDecimal(effortRaw) : null;
    const decimalsN = Number.parseInt(decimals, 10);
    const deadlineN = Number.parseInt(reportSheetDeadlineHours, 10);
    const rowsN = Number.parseInt(reportSheetMaxRowsPerPage, 10);

    if (
      maxScoreN === null ||
      passMarkN === null ||
      classSuccessN === null ||
      honourN === null ||
      !Number.isFinite(decimalsN) ||
      !Number.isFinite(deadlineN) ||
      !Number.isFinite(rowsN) ||
      (effortRaw && effortN === null)
    ) {
      setFormError(t("schemePanel.invalidNumbers"));
      return;
    }
    if (passMarkN > maxScoreN) {
      setFormError(t("schemePanel.passMarkTooHigh"));
      return;
    }

    setSaving(true);
    try {
      const updated = await updateGradingScheme(schemeId, {
        name: { fr: fr || en, en: en || fr },
        maxScore: maxScoreN,
        passMark: passMarkN,
        classSuccessThreshold: classSuccessN,
        decimals: decimalsN,
        honourRollMinAverage: honourN,
        honourRollBlockedBySanction,
        effortSubjectThreshold: effortN ?? undefined,
        clearEffortSubjectThreshold: !effortRaw,
        reportSheetDeadlineHours: deadlineN,
        reportSheetDeadlineBlocking,
        reportSheetMaxRowsPerPage: rowsN,
        reportSheetAppreciationScaleCode,
        active,
        schoolId,
      });
      notify.success(t("schemePanel.updateSuccess"));
      onSaved(updated);
      setScheme(updated);
      setPanelMode("view");
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) setFormError(error.message);
      else setFormError(t("schemePanel.saveError"));
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label={tCommon("cancel")}
        className="absolute inset-0 cursor-default border-0 bg-[color-mix(in_srgb,var(--ios-label)_22%,transparent)] backdrop-blur-[6px]"
        onClick={() => {
          if (!saving) onClose();
        }}
      />
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="relative z-10 flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-[var(--radius-xl)] bg-[var(--ios-card)] shadow-[var(--ios-shadow-md)] ring-1 ring-[color-mix(in_srgb,var(--ios-separator)_70%,transparent)] slide-up"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--ios-separator)]/55 px-5 pb-4 pt-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ios-warning-soft)] text-[var(--ios-warning)] ring-1 ring-[color-mix(in_srgb,var(--ios-warning)_22%,transparent)]">
              <Scale className="size-4 stroke-[1.75]" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
                {title}
              </h2>
              <p className="mt-0.5 truncate text-[12px] text-[var(--ios-secondary-label)]">
                {panelMode === "create"
                  ? t("schemePanel.createHint")
                  : scheme
                    ? `${scheme.code} · ${localizedLabel(scheme.name, locale)}`
                    : tCommon("loading")}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={tCommon("cancel")}
            disabled={saving}
            onClick={onClose}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--ios-secondary-label)] transition-colors hover:bg-[var(--ios-fill)] hover:text-[var(--ios-label)] disabled:opacity-50"
          >
            <X className="size-4 stroke-[1.75]" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-[13px] text-[var(--ios-secondary-label)]">{tCommon("loading")}</p>
          ) : (
            <>
              {panelMode === "create" ? (
                <Field id="scheme-code" label={t("columns.code")}>
                  <Input
                    id="scheme-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="SECONDAIRE_FR"
                    disabled={saving}
                    autoFocus
                  />
                </Field>
              ) : scheme ? (
                <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[var(--ios-separator)]/55 bg-[color-mix(in_srgb,var(--ios-fill)_28%,var(--ios-card))] px-3.5 py-2.5">
                  <p className="font-mono text-[12px] text-[var(--ios-secondary-label)]">
                    {scheme.code}
                  </p>
                  <Badge tone={active ? "success" : "neutral"}>
                    {active ? t("statusActive") : t("inactive")}
                  </Badge>
                  <span className="text-[11px] text-[var(--ios-tertiary-label)]">
                    {t("schemePanel.rounding", { policy: scheme.roundingPolicy })}
                  </span>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="scheme-name-fr" label={t("schemePanel.nameFr")}>
                  <Input
                    id="scheme-name-fr"
                    value={nameFr}
                    onChange={(e) => setNameFr(e.target.value)}
                    disabled={!editable || saving}
                  />
                </Field>
                <Field id="scheme-name-en" label={t("schemePanel.nameEn")}>
                  <Input
                    id="scheme-name-en"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    disabled={!editable || saving}
                  />
                </Field>
              </div>

              {panelMode !== "create" ? (
                <>
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)]">
                      {t("schemePanel.thresholdsSection")}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field id="scheme-max" label={t("schemePanel.maxScore")}>
                        <Input
                          id="scheme-max"
                          inputMode="decimal"
                          value={maxScore}
                          onChange={(e) => setMaxScore(e.target.value)}
                          disabled={!editable || saving}
                        />
                      </Field>
                      <Field id="scheme-pass" label={t("schemePanel.passMark")}>
                        <Input
                          id="scheme-pass"
                          inputMode="decimal"
                          value={passMark}
                          onChange={(e) => setPassMark(e.target.value)}
                          disabled={!editable || saving}
                        />
                      </Field>
                      <Field id="scheme-success" label={t("schemePanel.classSuccess")}>
                        <Input
                          id="scheme-success"
                          inputMode="decimal"
                          value={classSuccessThreshold}
                          onChange={(e) => setClassSuccessThreshold(e.target.value)}
                          disabled={!editable || saving}
                        />
                      </Field>
                      <Field id="scheme-decimals" label={t("schemePanel.decimals")}>
                        <Input
                          id="scheme-decimals"
                          inputMode="numeric"
                          value={decimals}
                          onChange={(e) => setDecimals(e.target.value)}
                          disabled={!editable || saving}
                        />
                      </Field>
                      <Field id="scheme-honour" label={t("schemePanel.honourRoll")}>
                        <Input
                          id="scheme-honour"
                          inputMode="decimal"
                          value={honourRollMinAverage}
                          onChange={(e) => setHonourRollMinAverage(e.target.value)}
                          disabled={!editable || saving}
                        />
                      </Field>
                      <Field id="scheme-effort" label={t("schemePanel.effortThreshold")}>
                        <Input
                          id="scheme-effort"
                          inputMode="decimal"
                          value={effortSubjectThreshold}
                          onChange={(e) => setEffortSubjectThreshold(e.target.value)}
                          disabled={!editable || saving}
                          placeholder={t("schemePanel.effortEmpty")}
                        />
                      </Field>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)]">
                      {t("schemePanel.reportSheetSection")}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field id="scheme-deadline" label={t("schemePanel.deadlineHours")}>
                        <Input
                          id="scheme-deadline"
                          inputMode="numeric"
                          value={reportSheetDeadlineHours}
                          onChange={(e) => setReportSheetDeadlineHours(e.target.value)}
                          disabled={!editable || saving}
                        />
                      </Field>
                      <Field id="scheme-rows" label={t("schemePanel.maxRows")}>
                        <Input
                          id="scheme-rows"
                          inputMode="numeric"
                          value={reportSheetMaxRowsPerPage}
                          onChange={(e) => setReportSheetMaxRowsPerPage(e.target.value)}
                          disabled={!editable || saving}
                        />
                      </Field>
                      <Field id="scheme-scale" label={t("schemePanel.appreciationScale")}>
                        <Select
                          id="scheme-scale"
                          value={reportSheetAppreciationScaleCode}
                          onChange={(e) => setReportSheetAppreciationScaleCode(e.target.value)}
                          disabled={!editable || saving}
                        >
                          {scaleOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--ios-separator)]/55 px-3.5 py-3">
                    <Switch
                      id="scheme-active"
                      checked={active}
                      onCheckedChange={setActive}
                      disabled={!editable || saving}
                      label={t("schemePanel.active")}
                    />
                    <Switch
                      id="scheme-honour-block"
                      checked={honourRollBlockedBySanction}
                      onCheckedChange={setHonourRollBlockedBySanction}
                      disabled={!editable || saving}
                      label={t("schemePanel.honourBlocked")}
                    />
                    <Switch
                      id="scheme-deadline-block"
                      checked={reportSheetDeadlineBlocking}
                      onCheckedChange={setReportSheetDeadlineBlocking}
                      disabled={!editable || saving}
                      label={t("schemePanel.deadlineBlocking")}
                    />
                  </div>

                  {scheme && scheme.appreciationScales.length > 0 ? (
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)]">
                        {t("schemePanel.scalesSection")}
                      </p>
                      <div className="space-y-2">
                        {scheme.appreciationScales.map((scale) => (
                          <div
                            key={scale.code}
                            className="rounded-[var(--radius-md)] border border-[var(--ios-separator)]/55 px-3 py-2.5"
                          >
                            <p className="text-[12px] font-semibold text-[var(--ios-label)]">
                              {scale.code}
                            </p>
                            <ul className="mt-1.5 space-y-1">
                              {scale.bands.map((band) => (
                                <li
                                  key={`${scale.code}-${band.code}`}
                                  className="flex items-center justify-between gap-2 text-[11px]"
                                >
                                  <span className="font-medium text-[var(--ios-label)]">
                                    {band.code}
                                    {band.label
                                      ? ` · ${localizedLabel(band.label, locale)}`
                                      : ""}
                                  </span>
                                  <span className="tabular-nums text-[var(--ios-secondary-label)]">
                                    {formatBandRange(band.minInclusive, band.maxExclusive)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {scheme && scheme.overallMentionBands.length > 0 ? (
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)]">
                        {t("schemePanel.mentionsSection")}
                      </p>
                      <ul className="space-y-1 rounded-[var(--radius-md)] border border-[var(--ios-separator)]/55 px-3 py-2.5">
                        {scheme.overallMentionBands.map((band) => (
                          <li
                            key={band.code}
                            className="flex items-center justify-between gap-2 text-[11px]"
                          >
                            <span className="font-medium text-[var(--ios-label)]">
                              {band.code}
                              {band.label ? ` · ${localizedLabel(band.label, locale)}` : ""}
                            </span>
                            <span className="tabular-nums text-[var(--ios-secondary-label)]">
                              {formatBandRange(band.minInclusive, band.maxExclusive)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-[12px] leading-relaxed text-[var(--ios-secondary-label)]">
                  {t("schemePanel.createDefaultsHint")}
                </p>
              )}

              {formError ? (
                <p className="text-[12px] text-[var(--ios-danger)]" role="alert">
                  {formError}
                </p>
              ) : null}
            </>
          )}
        </div>

        <div
          className={cn(
            "flex flex-col-reverse gap-2 border-t border-[var(--ios-separator)]/55 bg-[color-mix(in_srgb,var(--ios-fill)_18%,var(--ios-card))] px-5 py-4 sm:flex-row sm:justify-end",
          )}
        >
          <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          {panelMode === "view" && canManage ? (
            <Button
              type="button"
              variant="secondary"
              disabled={loading || saving}
              onClick={() => setPanelMode("edit")}
            >
              {tCommon("edit")}
            </Button>
          ) : null}
          {editable && canManage ? (
            <Button type="submit" disabled={loading || saving}>
              {saving ? tCommon("loading") : tCommon("save")}
            </Button>
          ) : null}
        </div>
      </form>
    </div>,
    document.body,
  );
}
