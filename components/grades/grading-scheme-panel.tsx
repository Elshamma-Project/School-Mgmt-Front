"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Award,
  CircleAlert,
  Gauge,
  Hash,
  Plus,
  Scale,
  Sigma,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogCloseButton } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { localizedLabel } from "@/lib/api/academic";
import {
  createGradingScheme,
  getGradingScheme,
  updateGradingScheme,
  type AppreciationScaleDto,
  type GradingSchemeResponse,
  type ScoreBandDto,
  type ScoreBandWritePayload,
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

type BandDraft = {
  key: string;
  code: string;
  labelFr: string;
  labelEn: string;
  minInclusive: string;
  maxExclusive: string;
};

type ScaleDraft = {
  key: string;
  code: string;
  bands: BandDraft[];
};

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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

function emptyBand(partial?: Partial<BandDraft>): BandDraft {
  return {
    key: newKey(),
    code: "",
    labelFr: "",
    labelEn: "",
    minInclusive: "0",
    maxExclusive: "",
    ...partial,
  };
}

function toBandDraft(band: ScoreBandDto): BandDraft {
  return emptyBand({
    code: band.code,
    labelFr: band.label?.fr ?? "",
    labelEn: band.label?.en ?? "",
    minInclusive: asInputNumber(band.minInclusive),
    maxExclusive: band.maxExclusive == null ? "" : asInputNumber(band.maxExclusive),
  });
}

function toScaleDraft(scale: AppreciationScaleDto): ScaleDraft {
  return {
    key: newKey(),
    code: scale.code,
    bands: scale.bands.length > 0 ? scale.bands.map(toBandDraft) : [emptyBand()],
  };
}

function parseBandDrafts(drafts: BandDraft[]): ScoreBandWritePayload[] | "invalid" {
  const out: ScoreBandWritePayload[] = [];
  for (const draft of drafts) {
    const code = draft.code.trim();
    if (!code) return "invalid";
    const min = parseDecimal(draft.minInclusive);
    if (min === null) return "invalid";
    const maxRaw = draft.maxExclusive.trim();
    const max = maxRaw ? parseDecimal(maxRaw) : null;
    if (maxRaw && max === null) return "invalid";
    if (max !== null && max <= min) return "invalid";
    out.push({
      code,
      label: {
        fr: draft.labelFr.trim() || null,
        en: draft.labelEn.trim() || null,
      },
      minInclusive: min,
      maxExclusive: max,
    });
  }
  return out;
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
  const [scalesDraft, setScalesDraft] = useState<ScaleDraft[]>([]);
  const [mentionsDraft, setMentionsDraft] = useState<BandDraft[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const defaultScalesDraft = (): ScaleDraft[] => [
    {
      key: newKey(),
      code: "LETTER",
      bands: [
        emptyBand({ code: "A", labelFr: "A", labelEn: "A", minInclusive: "16", maxExclusive: "" }),
        emptyBand({
          code: "B+",
          labelFr: "B+",
          labelEn: "B+",
          minInclusive: "14",
          maxExclusive: "16",
        }),
        emptyBand({
          code: "B",
          labelFr: "B",
          labelEn: "B",
          minInclusive: "12",
          maxExclusive: "14",
        }),
        emptyBand({
          code: "C",
          labelFr: "C",
          labelEn: "C",
          minInclusive: "0",
          maxExclusive: "12",
        }),
      ],
    },
  ];

  const defaultMentionsDraft = (): BandDraft[] => [
    emptyBand({
      code: "TB",
      labelFr: "TRÈS BIEN",
      labelEn: "VERY GOOD",
      minInclusive: "16",
      maxExclusive: "",
    }),
    emptyBand({
      code: "B",
      labelFr: "BIEN",
      labelEn: "GOOD",
      minInclusive: "14",
      maxExclusive: "16",
    }),
    emptyBand({
      code: "AB",
      labelFr: "ASSEZ BIEN",
      labelEn: "FAIRLY GOOD",
      minInclusive: "12",
      maxExclusive: "14",
    }),
    emptyBand({
      code: "PASSABLE",
      labelFr: "PASSABLE",
      labelEn: "PASSABLE",
      minInclusive: "10",
      maxExclusive: "12",
    }),
    emptyBand({
      code: "INSUFFISANT",
      labelFr: "TRAVAIL INSUFFISANT",
      labelEn: "WEAK",
      minInclusive: "0",
      maxExclusive: "10",
    }),
  ];

  const hydrateBands = (row: GradingSchemeResponse) => {
    setScalesDraft(
      row.appreciationScales.length > 0
        ? row.appreciationScales.map(toScaleDraft)
        : defaultScalesDraft(),
    );
    setMentionsDraft(
      row.overallMentionBands.length > 0
        ? row.overallMentionBands.map(toBandDraft)
        : defaultMentionsDraft(),
    );
  };

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
      setScalesDraft(defaultScalesDraft());
      setMentionsDraft(defaultMentionsDraft());
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
        hydrateBands(row);
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
    const codes = editable
      ? scalesDraft.map((s) => s.code.trim().toUpperCase()).filter(Boolean)
      : (scheme?.appreciationScales.map((s) => s.code) ?? []);
    if (reportSheetAppreciationScaleCode && !codes.includes(reportSheetAppreciationScaleCode)) {
      codes.push(reportSheetAppreciationScaleCode);
    }
    if (codes.length === 0) return ["LETTER"];
    return codes;
  }, [
    editable,
    reportSheetAppreciationScaleCode,
    scalesDraft,
    scheme?.appreciationScales,
  ]);

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

    const trimmedCode = code.trim().toUpperCase();
    if (panelMode === "create" && !trimmedCode) {
      setFormError(t("schemePanel.codeRequired"));
      return;
    }

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

    if (scalesDraft.length === 0) {
      setFormError(t("schemePanel.scaleRequired"));
      return;
    }
    const appreciationScales = [];
    for (const scale of scalesDraft) {
      const scaleCode = scale.code.trim().toUpperCase();
      if (!scaleCode) {
        setFormError(t("schemePanel.scaleCodeRequired"));
        return;
      }
      const bands = parseBandDrafts(scale.bands);
      if (bands === "invalid" || bands.length === 0) {
        setFormError(t("schemePanel.bandsInvalid"));
        return;
      }
      appreciationScales.push({ code: scaleCode, bands });
    }
    const overallMentionBands = parseBandDrafts(mentionsDraft);
    if (overallMentionBands === "invalid") {
      setFormError(t("schemePanel.bandsInvalid"));
      return;
    }

    const sharedFields = {
      name: { fr: fr || en, en: en || fr },
      maxScore: maxScoreN,
      passMark: passMarkN,
      classSuccessThreshold: classSuccessN,
      decimals: decimalsN,
      honourRollMinAverage: honourN,
      honourRollBlockedBySanction,
      effortSubjectThreshold: effortN,
      reportSheetDeadlineHours: deadlineN,
      reportSheetDeadlineBlocking,
      reportSheetMaxRowsPerPage: rowsN,
      reportSheetAppreciationScaleCode,
      appreciationScales,
      overallMentionBands,
      active,
      schoolId,
    };

    setSaving(true);
    try {
      if (panelMode === "create") {
        const created = await createGradingScheme({
          code: trimmedCode,
          ...sharedFields,
        });
        notify.success(t("schemePanel.createSuccess"));
        onSaved(created);
        onClose();
      } else {
        if (!schemeId) return;
        const updated = await updateGradingScheme(schemeId, {
          ...sharedFields,
          clearEffortSubjectThreshold: !effortRaw,
        });
        notify.success(t("schemePanel.updateSuccess"));
        onSaved(updated);
        setScheme(updated);
        hydrateBands(updated);
        setPanelMode("view");
      }
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
          <DialogCloseButton
            aria-label={tCommon("cancel")}
            disabled={saving}
            onClick={onClose}
          />
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
                <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
                  <div className="flex items-center gap-3.5 px-4 py-3.5">
                    <div
                      className={cn(
                        "flex size-14 shrink-0 items-center justify-center rounded-[var(--radius-md)] ring-1",
                        active
                          ? "bg-[var(--ios-warning-soft)] text-[var(--ios-warning)] ring-[color-mix(in_srgb,var(--ios-warning)_22%,transparent)]"
                          : "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)] ring-[color-mix(in_srgb,var(--ios-separator)_70%,transparent)]",
                      )}
                      aria-hidden
                    >
                      <Scale className="size-5 stroke-[1.75]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[13px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
                        {scheme.code}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-[var(--ios-secondary-label)]">
                        {localizedLabel(scheme.name, locale)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge tone={active ? "success" : "neutral"}>
                          {active ? t("statusActive") : t("inactive")}
                        </Badge>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--ios-fill)_55%,transparent)] px-2 py-0.5 text-[10px] font-medium text-[var(--ios-secondary-label)]">
                          <Sigma className="size-3 stroke-[1.75]" aria-hidden />
                          {scheme.roundingPolicy}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 border-t border-[var(--ios-separator)]/55 bg-[color-mix(in_srgb,var(--ios-fill)_20%,var(--ios-card))]">
                    <div className="border-r border-[var(--ios-separator)]/55 px-4 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--ios-tertiary-label)]">
                        {t("schemePanel.passMark")}
                      </p>
                      <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-[var(--ios-label)]">
                        {String(scheme.passMark)}
                        <span className="text-[11px] font-medium text-[var(--ios-tertiary-label)]">
                          {" "}
                          / {String(scheme.maxScore)}
                        </span>
                      </p>
                    </div>
                    <div className="px-4 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--ios-tertiary-label)]">
                        {t("schemePanel.roundingLabel")}
                      </p>
                      <p className="mt-0.5 text-[13px] font-semibold text-[var(--ios-label)]">
                        {scheme.roundingPolicy}
                      </p>
                    </div>
                  </div>
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

              <>
                  <div>
                    <div className="mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)]">
                        {t("schemePanel.thresholdsSection")}
                      </p>
                      <p className="mt-1 text-[11px] leading-snug text-[var(--ios-tertiary-label)]">
                        {t("schemePanel.thresholdsHint")}
                      </p>
                    </div>

                    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
                      <div className="border-b border-[var(--ios-separator)]/55 bg-[color-mix(in_srgb,var(--ios-fill)_18%,var(--ios-card))] px-3.5 py-2">
                        <p className="text-[11px] font-semibold tracking-[-0.01em] text-[var(--ios-secondary-label)]">
                          {t("schemePanel.scoringGroup")}
                        </p>
                      </div>
                      <div className="grid gap-0 sm:grid-cols-2">
                        <ThresholdField
                          id="scheme-max"
                          label={t("schemePanel.maxScore")}
                          hint={t("schemePanel.maxScoreHint")}
                          icon={<Gauge className="size-3.5 stroke-[1.75]" aria-hidden />}
                          tone="blue"
                          value={maxScore}
                          onChange={setMaxScore}
                          disabled={!editable || saving}
                          inputMode="decimal"
                          borderRight
                        />
                        <ThresholdField
                          id="scheme-pass"
                          label={t("schemePanel.passMark")}
                          hint={t("schemePanel.passMarkHint")}
                          icon={<Target className="size-3.5 stroke-[1.75]" aria-hidden />}
                          tone="green"
                          value={passMark}
                          onChange={setPassMark}
                          disabled={!editable || saving}
                          inputMode="decimal"
                        />
                      </div>

                      <div className="border-t border-[var(--ios-separator)]/55 bg-[color-mix(in_srgb,var(--ios-fill)_18%,var(--ios-card))] px-3.5 py-2">
                        <p className="text-[11px] font-semibold tracking-[-0.01em] text-[var(--ios-secondary-label)]">
                          {t("schemePanel.classGroup")}
                        </p>
                      </div>
                      <div className="grid gap-0 sm:grid-cols-2">
                        <ThresholdField
                          id="scheme-success"
                          label={t("schemePanel.classSuccess")}
                          hint={t("schemePanel.classSuccessHint")}
                          icon={<TrendingUp className="size-3.5 stroke-[1.75]" aria-hidden />}
                          tone="amber"
                          value={classSuccessThreshold}
                          onChange={setClassSuccessThreshold}
                          disabled={!editable || saving}
                          inputMode="decimal"
                          borderRight
                          borderBottom
                        />
                        <ThresholdField
                          id="scheme-decimals"
                          label={t("schemePanel.decimals")}
                          hint={t("schemePanel.decimalsHint")}
                          icon={<Hash className="size-3.5 stroke-[1.75]" aria-hidden />}
                          tone="slate"
                          value={decimals}
                          onChange={setDecimals}
                          disabled={!editable || saving}
                          inputMode="numeric"
                          borderBottom
                        />
                        <ThresholdField
                          id="scheme-honour"
                          label={t("schemePanel.honourRoll")}
                          hint={t("schemePanel.honourRollHint")}
                          icon={<Award className="size-3.5 stroke-[1.75]" aria-hidden />}
                          tone="warning"
                          value={honourRollMinAverage}
                          onChange={setHonourRollMinAverage}
                          disabled={!editable || saving}
                          inputMode="decimal"
                          borderRight
                        />
                        <ThresholdField
                          id="scheme-effort"
                          label={t("schemePanel.effortThreshold")}
                          hint={t("schemePanel.effortThresholdHint")}
                          icon={<CircleAlert className="size-3.5 stroke-[1.75]" aria-hidden />}
                          tone="danger"
                          value={effortSubjectThreshold}
                          onChange={setEffortSubjectThreshold}
                          disabled={!editable || saving}
                          inputMode="decimal"
                          placeholder={t("schemePanel.effortEmpty")}
                        />
                      </div>
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

                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)]">
                      {t("schemePanel.optionsSection")}
                    </p>
                    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--ios-separator)]/55 bg-[color-mix(in_srgb,var(--ios-fill)_22%,var(--ios-card))]">
                      {(
                        [
                          {
                            id: "scheme-active",
                            checked: active,
                            onChange: setActive,
                            title: t("schemePanel.active"),
                            hint: t("schemePanel.activeHint"),
                          },
                          {
                            id: "scheme-honour-block",
                            checked: honourRollBlockedBySanction,
                            onChange: setHonourRollBlockedBySanction,
                            title: t("schemePanel.honourBlocked"),
                            hint: t("schemePanel.honourBlockedHint"),
                          },
                          {
                            id: "scheme-deadline-block",
                            checked: reportSheetDeadlineBlocking,
                            onChange: setReportSheetDeadlineBlocking,
                            title: t("schemePanel.deadlineBlocking"),
                            hint: t("schemePanel.deadlineBlockingHint"),
                          },
                        ] as const
                      ).map((option, index, list) => (
                        <div
                          key={option.id}
                          className={cn(
                            "flex items-center justify-between gap-4 px-3.5 py-3",
                            index < list.length - 1 &&
                              "border-b border-[var(--ios-separator)]/55",
                          )}
                        >
                          <label
                            htmlFor={option.id}
                            className={cn(
                              "min-w-0 flex-1",
                              editable && !saving ? "cursor-pointer" : "opacity-70",
                            )}
                          >
                            <p className="text-[13px] font-medium tracking-[-0.01em] text-[var(--ios-label)]">
                              {option.title}
                            </p>
                            <p className="mt-0.5 text-[11px] leading-snug text-[var(--ios-secondary-label)]">
                              {option.hint}
                            </p>
                          </label>
                          <Switch
                            id={option.id}
                            checked={option.checked}
                            onCheckedChange={option.onChange}
                            disabled={!editable || saving}
                            className="shrink-0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)]">
                        {t("schemePanel.scalesSection")}
                      </p>
                      {editable ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          leadingIcon={<Plus className="size-3.5" aria-hidden />}
                          disabled={saving}
                          onClick={() =>
                            setScalesDraft((prev) => [
                              ...prev,
                              {
                                key: newKey(),
                                code: "",
                                bands: [emptyBand()],
                              },
                            ])
                          }
                        >
                          {t("schemePanel.addScale")}
                        </Button>
                      ) : null}
                    </div>
                    <p className="mb-2 text-[11px] leading-snug text-[var(--ios-secondary-label)]">
                      {t("schemePanel.bandsHint")}
                    </p>
                    {editable ? (
                      <div className="space-y-3">
                        {scalesDraft.map((scale, scaleIndex) => (
                          <div
                            key={scale.key}
                            className="rounded-[var(--radius-md)] border border-[var(--ios-separator)]/55 px-3 py-3"
                          >
                            <div className="mb-2 flex items-end gap-2">
                              <Field
                                id={`scale-code-${scale.key}`}
                                label={t("schemePanel.scaleCode")}
                                className="flex-1"
                              >
                                <Input
                                  id={`scale-code-${scale.key}`}
                                  value={scale.code}
                                  onChange={(e) =>
                                    setScalesDraft((prev) =>
                                      prev.map((row, i) =>
                                        i === scaleIndex
                                          ? { ...row, code: e.target.value.toUpperCase() }
                                          : row,
                                      ),
                                    )
                                  }
                                  disabled={saving}
                                  placeholder="LETTER"
                                />
                              </Field>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                aria-label={t("schemePanel.removeScale")}
                                disabled={saving || scalesDraft.length <= 1}
                                leadingIcon={<Trash2 className="size-3.5" aria-hidden />}
                                onClick={() =>
                                  setScalesDraft((prev) =>
                                    prev.filter((_, i) => i !== scaleIndex),
                                  )
                                }
                              />
                            </div>
                            <BandDraftEditor
                              bands={scale.bands}
                              disabled={saving}
                              onChange={(bands) =>
                                setScalesDraft((prev) =>
                                  prev.map((row, i) =>
                                    i === scaleIndex ? { ...row, bands } : row,
                                  ),
                                )
                              }
                              labels={{
                                code: t("schemePanel.bandCode"),
                                labelFr: t("schemePanel.bandLabelFr"),
                                labelEn: t("schemePanel.bandLabelEn"),
                                min: t("schemePanel.bandMin"),
                                max: t("schemePanel.bandMax"),
                                add: t("schemePanel.addBand"),
                                remove: t("schemePanel.removeBand"),
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : scheme && scheme.appreciationScales.length > 0 ? (
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
                    ) : (
                      <p className="text-[12px] text-[var(--ios-secondary-label)]">
                        {t("schemePanel.noScales")}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)]">
                        {t("schemePanel.mentionsSection")}
                      </p>
                    </div>
                    <p className="mb-2 text-[11px] leading-snug text-[var(--ios-secondary-label)]">
                      {t("schemePanel.mentionsHint")}
                    </p>
                    {editable ? (
                      <div className="rounded-[var(--radius-md)] border border-[var(--ios-separator)]/55 px-3 py-3">
                        <BandDraftEditor
                          bands={mentionsDraft}
                          disabled={saving}
                          onChange={setMentionsDraft}
                          labels={{
                            code: t("schemePanel.bandCode"),
                            labelFr: t("schemePanel.bandLabelFr"),
                            labelEn: t("schemePanel.bandLabelEn"),
                            min: t("schemePanel.bandMin"),
                            max: t("schemePanel.bandMax"),
                            add: t("schemePanel.addBand"),
                            remove: t("schemePanel.removeBand"),
                          }}
                        />
                      </div>
                    ) : scheme && scheme.overallMentionBands.length > 0 ? (
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
                    ) : (
                      <p className="text-[12px] text-[var(--ios-secondary-label)]">
                        {t("schemePanel.noMentions")}
                      </p>
                    )}
                  </div>
              </>

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
          <Button
            type="button"
            variant="ghostDestructive"
            className="!text-[var(--ios-danger)] hover:!bg-[var(--ios-danger-soft)]"
            disabled={saving}
            onClick={onClose}
          >
            {tCommon("cancel")}
          </Button>
          {panelMode === "view" && canManage ? (
            <Button
              type="button"
              variant="secondary"
              disabled={loading || saving}
              onClick={() => {
                if (scheme) hydrateBands(scheme);
                setPanelMode("edit");
              }}
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

function ThresholdField({
  id,
  label,
  hint,
  icon,
  tone,
  value,
  onChange,
  disabled,
  inputMode,
  placeholder,
  borderRight,
  borderBottom,
}: {
  id: string;
  label: string;
  hint: string;
  icon: ReactNode;
  tone: "blue" | "green" | "amber" | "slate" | "warning" | "danger";
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  inputMode?: "decimal" | "numeric";
  placeholder?: string;
  borderRight?: boolean;
  borderBottom?: boolean;
}) {
  const toneClass =
    tone === "blue"
      ? "bg-[var(--ios-info-soft)] text-[var(--ios-blue)]"
      : tone === "green"
        ? "bg-[var(--ios-success-soft)] text-[var(--ios-success)]"
        : tone === "amber" || tone === "warning"
          ? "bg-[var(--ios-warning-soft)] text-[var(--ios-warning)]"
          : tone === "danger"
            ? "bg-[var(--ios-danger-soft)] text-[var(--ios-danger)]"
            : "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]";

  return (
    <div
      className={cn(
        "px-3.5 py-3",
        borderRight && "sm:border-r sm:border-[var(--ios-separator)]/55",
        borderBottom && "border-b border-[var(--ios-separator)]/55",
      )}
    >
      <div className="mb-2 flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full",
            toneClass,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <label
            htmlFor={id}
            className="block text-[12px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]"
          >
            {label}
          </label>
          <p className="mt-0.5 text-[10px] leading-snug text-[var(--ios-tertiary-label)]">
            {hint}
          </p>
        </div>
      </div>
      <Input
        id={id}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="h-[var(--control-height-sm)] tabular-nums"
      />
    </div>
  );
}

function BandDraftEditor({
  bands,
  disabled,
  onChange,
  labels,
}: {
  bands: BandDraft[];
  disabled?: boolean;
  onChange: (bands: BandDraft[]) => void;
  labels: {
    code: string;
    labelFr: string;
    labelEn: string;
    min: string;
    max: string;
    add: string;
    remove: string;
  };
}) {
  return (
    <div className="space-y-2.5">
      {bands.map((band, index) => (
        <div
          key={band.key}
          className="rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--ios-fill)_35%,transparent)] px-2.5 py-2.5"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label={labels.code}>
              <Input
                value={band.code}
                disabled={disabled}
                onChange={(e) =>
                  onChange(
                    bands.map((row, i) =>
                      i === index ? { ...row, code: e.target.value.toUpperCase() } : row,
                    ),
                  )
                }
              />
            </Field>
            <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <Field label={labels.min}>
                <Input
                  inputMode="decimal"
                  value={band.minInclusive}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange(
                      bands.map((row, i) =>
                        i === index ? { ...row, minInclusive: e.target.value } : row,
                      ),
                    )
                  }
                />
              </Field>
              <Field label={labels.max}>
                <Input
                  inputMode="decimal"
                  value={band.maxExclusive}
                  disabled={disabled}
                  placeholder="∞"
                  onChange={(e) =>
                    onChange(
                      bands.map((row, i) =>
                        i === index ? { ...row, maxExclusive: e.target.value } : row,
                      ),
                    )
                  }
                />
              </Field>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={labels.remove}
                disabled={disabled || bands.length <= 1}
                leadingIcon={<Trash2 className="size-3.5" aria-hidden />}
                onClick={() => onChange(bands.filter((_, i) => i !== index))}
              />
            </div>
            <Field label={labels.labelFr}>
              <Input
                value={band.labelFr}
                disabled={disabled}
                onChange={(e) =>
                  onChange(
                    bands.map((row, i) =>
                      i === index ? { ...row, labelFr: e.target.value } : row,
                    ),
                  )
                }
              />
            </Field>
            <Field label={labels.labelEn}>
              <Input
                value={band.labelEn}
                disabled={disabled}
                onChange={(e) =>
                  onChange(
                    bands.map((row, i) =>
                      i === index ? { ...row, labelEn: e.target.value } : row,
                    ),
                  )
                }
              />
            </Field>
          </div>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled}
        leadingIcon={<Plus className="size-3.5" aria-hidden />}
        onClick={() => onChange([...bands, emptyBand()])}
      >
        {labels.add}
      </Button>
    </div>
  );
}
