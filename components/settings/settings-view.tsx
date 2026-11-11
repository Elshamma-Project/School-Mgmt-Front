"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Building2,
  CalendarRange,
  Check,
  ImagePlus,
  Plus,
  ScrollText,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { BrandMark } from "@/components/layout/brand-mark";
import { DocumentHeaderPreview } from "@/components/settings/document-header-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { GroupedList, GroupedListItem } from "@/components/ui/grouped-list";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  buildDefaultTerms,
  createAcademicYear,
  listAcademicYears,
  type AcademicYearResponse,
} from "@/lib/api/academic";
import {
  deleteSchoolLogo,
  setCurrentAcademicYear,
  updateSchool,
  uploadSchoolLogo,
  type OfficialHeaderDto,
  type SchoolResponse,
} from "@/lib/api/school";
import { Switch } from "@/components/ui/switch";
import { userHasCapability } from "@/lib/auth/permissions";
import { createMockLogin, listMockRoles } from "@/lib/auth/mock-users";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import { useRouter } from "@/i18n/navigation";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { useSchoolBrandStore } from "@/stores/school-brand-store";
import { ApiError, isAuthFailure } from "@/types/api";
import { primaryRole, type AppRole } from "@/types/auth";

/** Unités sélectionnables : le secondaire (1er + 2nd) = une seule entité d’en-tête. */
const CYCLE_GROUPS = [
  { id: "MATERNELLE", cycles: ["MATERNELLE"] },
  { id: "PRIMAIRE", cycles: ["PRIMAIRE"] },
  {
    id: "SECONDAIRE",
    cycles: ["SECONDAIRE_1ER_CYCLE", "SECONDAIRE_2ND_CYCLE"],
  },
] as const;

const SECONDARY_CYCLES = ["SECONDAIRE_1ER_CYCLE", "SECONDAIRE_2ND_CYCLE"] as const;

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);

function normalizeHeaderCycles(cycles: string[]): string[] {
  const set = new Set(cycles);
  const hasSecondary = SECONDARY_CYCLES.some((c) => set.has(c));
  if (hasSecondary) {
    SECONDARY_CYCLES.forEach((c) => set.add(c));
  }
  return [...set];
}

function headerHasGroup(cycles: string[], groupCycles: readonly string[]): boolean {
  return groupCycles.every((c) => cycles.includes(c));
}

type SchoolForm = {
  nameFr: string;
  nameEn: string;
  shortName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalBox: string;
  timezone: string;
  signaturePlace: string;
  headTitleFr: string;
  headTitleEn: string;
  noticeFr: string;
  noticeEn: string;
  disclaimerFr: string;
  disclaimerEn: string;
  headers: OfficialHeaderDto[];
};

function emptyHeader(): OfficialHeaderDto {
  return {
    cycles: [...SECONDARY_CYCLES],
    republic: { fr: "", en: "" },
    motto: { fr: "", en: "" },
    ministry: { fr: "", en: "" },
    regionalDelegation: { fr: "", en: "" },
    divisionalDelegation: { fr: "", en: "" },
  };
}

function schoolToForm(school: SchoolResponse): SchoolForm {
  return {
    nameFr: school.name.fr ?? "",
    nameEn: school.name.en ?? "",
    shortName: school.shortName ?? "",
    email: school.contact.email ?? "",
    phone: school.contact.phones.join("/") || "",
    address: school.contact.address ?? "",
    city: school.contact.city ?? "",
    postalBox: school.postalBox ?? "",
    timezone: school.timezone || "Africa/Douala",
    signaturePlace: school.signaturePlace ?? "",
    headTitleFr: school.headTitle?.fr ?? "",
    headTitleEn: school.headTitle?.en ?? "",
    noticeFr: school.reportCardNotice?.fr ?? "",
    noticeEn: school.reportCardNotice?.en ?? "",
    disclaimerFr: school.reportCardDisclaimer?.fr ?? "",
    disclaimerEn: school.reportCardDisclaimer?.en ?? "",
    headers:
      school.officialHeaders.length > 0
        ? school.officialHeaders.map((h) => ({
            cycles: normalizeHeaderCycles([...h.cycles]),
            republic: { fr: h.republic.fr ?? "", en: h.republic.en ?? "" },
            motto: { fr: h.motto.fr ?? "", en: h.motto.en ?? "" },
            ministry: { fr: h.ministry.fr ?? "", en: h.ministry.en ?? "" },
            regionalDelegation: h.regionalDelegation
              ? {
                  fr: h.regionalDelegation.fr ?? "",
                  en: h.regionalDelegation.en ?? "",
                }
              : { fr: "", en: "" },
            divisionalDelegation: h.divisionalDelegation
              ? {
                  fr: h.divisionalDelegation.fr ?? "",
                  en: h.divisionalDelegation.en ?? "",
                }
              : { fr: "", en: "" },
          }))
        : [emptyHeader()],
  };
}

function localizedTextOrNull(fr: string, en: string) {
  const f = fr.trim();
  const e = en.trim();
  if (!f && !e) return null;
  return { fr: f || e, en: e || f };
}

export function SettingsView() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tRoles = useTranslations("roles");
  const tAcademic = useTranslations("academic");
  const locale = useLocale();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isMock = useAuthStore((s) => s.isMock);
  const setSession = useAuthStore((s) => s.setSession);
  const currentRole = primaryRole(user);
  const canEdit = userHasCapability(user?.roles, "manageSchoolSettings");

  const school = useSchoolBrandStore((s) => s.school);
  const setSchool = useSchoolBrandStore((s) => s.setSchool);
  const refreshLogo = useSchoolBrandStore((s) => s.refreshLogo);
  const hydrate = useSchoolBrandStore((s) => s.hydrate);
  const brandLoading = useSchoolBrandStore((s) => s.loading);

  const [years, setYears] = useState<AcademicYearResponse[]>([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [yearsLoading, setYearsLoading] = useState(false);
  const [yearSaving, setYearSaving] = useState(false);
  const [showCreateYear, setShowCreateYear] = useState(false);
  const [newYearLabel, setNewYearLabel] = useState("");
  const [newYearStart, setNewYearStart] = useState("");
  const [newYearEnd, setNewYearEnd] = useState("");
  const [newYearAsCurrent, setNewYearAsCurrent] = useState(false);
  const [yearCreating, setYearCreating] = useState(false);
  const [form, setForm] = useState<SchoolForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function suggestNextYearDefaults(list: AcademicYearResponse[]) {
    const latest = [...list].sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
    if (latest) {
      const startY = Number.parseInt(latest.endDate.slice(0, 4), 10);
      if (Number.isFinite(startY)) {
        setNewYearLabel(`${startY}-${startY + 1}`);
        setNewYearStart(`${startY}-09-01`);
        setNewYearEnd(`${startY + 1}-06-30`);
        return;
      }
    }
    const y = new Date().getFullYear();
    setNewYearLabel(`${y}-${y + 1}`);
    setNewYearStart(`${y}-09-01`);
    setNewYearEnd(`${y + 1}-06-30`);
  }

  const currentYear = useMemo(
    () => years.find((y) => y.current) ?? null,
    [years],
  );
  const selectedYear = useMemo(
    () => years.find((y) => y.id === selectedYearId) ?? null,
    [selectedYearId, years],
  );

  useEffect(() => {
    if (user?.schoolId || user) {
      void hydrate(user?.schoolId ?? null, locale);
    }
  }, [hydrate, locale, user]);

  useEffect(() => {
    if (school) setForm(schoolToForm(school));
  }, [school]);

  useEffect(() => {
    let cancelled = false;
    setYearsLoading(true);
    void listAcademicYears({ size: 50, schoolId: user?.schoolId })
      .then((page) => {
        if (cancelled) return;
        setYears(page.content);
        const current = page.content.find((y) => y.current);
        setSelectedYearId(current?.id ?? page.content[0]?.id ?? "");
      })
      .catch((error) => {
        if (cancelled || isAuthFailure(error)) return;
        notify.error(t("yearLoadError"));
      })
      .finally(() => {
        if (!cancelled) setYearsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t, user?.schoolId]);

  function switchRole(role: AppRole) {
    const response = createMockLogin(role);
    setSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      sessionId: response.sessionId,
      user: response.user,
      mustChangePassword: false,
      isMock: true,
    });
    router.replace(getRoleHomePath(role));
  }

  async function reloadYears() {
    const page = await listAcademicYears({ size: 50, schoolId: user?.schoolId });
    setYears(page.content);
    const current = page.content.find((y) => y.current);
    setSelectedYearId(current?.id ?? page.content[0]?.id ?? "");
    return page.content;
  }

  async function onSetCurrentYear() {
    if (!canEdit || !selectedYearId || yearSaving) return;
    setYearSaving(true);
    try {
      await setCurrentAcademicYear(selectedYearId, user?.schoolId);
      await reloadYears();
      notify.success(t("yearSetSuccess"));
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("yearSetError"));
    } finally {
      setYearSaving(false);
    }
  }

  async function onCreateYear() {
    if (!canEdit || yearCreating) return;
    const label = newYearLabel.trim();
    if (!label || !newYearStart || !newYearEnd) {
      notify.error(t("yearCreateRequired"));
      return;
    }
    if (newYearEnd <= newYearStart) {
      notify.error(t("yearCreateDatesInvalid"));
      return;
    }
    const terms = buildDefaultTerms(newYearStart, newYearEnd);
    if (!terms) {
      notify.error(t("yearCreateDatesInvalid"));
      return;
    }
    setYearCreating(true);
    try {
      const created = await createAcademicYear({
        label,
        startDate: newYearStart,
        endDate: newYearEnd,
        current: newYearAsCurrent,
        status: newYearAsCurrent ? "ACTIVE" : "PLANNED",
        terms,
        schoolId: user?.schoolId,
      });
      await reloadYears();
      setSelectedYearId(created.id);
      setShowCreateYear(false);
      setNewYearAsCurrent(false);
      notify.success(t("yearCreateSuccess"));
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("yearCreateError"));
    } finally {
      setYearCreating(false);
    }
  }

  async function onSaveSchool() {
    if (!canEdit || !school || !form || saving) return;
    if (!form.nameFr.trim() && !form.nameEn.trim()) {
      notify.error(t("nameRequired"));
      return;
    }
    setSaving(true);
    try {
      const updated = await updateSchool(school.id, {
        name: {
          fr: form.nameFr.trim() || form.nameEn.trim(),
          en: form.nameEn.trim() || form.nameFr.trim(),
        },
        shortName: form.shortName.trim() || null,
        contact: {
          phones: form.phone
            .split(/[/;,]+/)
            .map((p) => p.trim())
            .filter(Boolean),
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
        },
        postalBox: form.postalBox.trim() || null,
        signaturePlace: form.signaturePlace.trim() || null,
        headTitle: localizedTextOrNull(form.headTitleFr, form.headTitleEn),
        reportCardNotice: localizedTextOrNull(form.noticeFr, form.noticeEn),
        reportCardDisclaimer: localizedTextOrNull(form.disclaimerFr, form.disclaimerEn),
        timezone: form.timezone.trim() || "Africa/Douala",
        officialHeaders: form.headers
          .filter((h) => h.cycles.length > 0)
          .map((h) => ({
            cycles: normalizeHeaderCycles(h.cycles),
            republic: {
              fr: h.republic.fr?.trim() || h.republic.en?.trim() || "",
              en: h.republic.en?.trim() || h.republic.fr?.trim() || "",
            },
            motto: {
              fr: h.motto.fr?.trim() || h.motto.en?.trim() || "",
              en: h.motto.en?.trim() || h.motto.fr?.trim() || "",
            },
            ministry: {
              fr: h.ministry.fr?.trim() || h.ministry.en?.trim() || "",
              en: h.ministry.en?.trim() || h.ministry.fr?.trim() || "",
            },
            regionalDelegation: localizedTextOrNull(
              h.regionalDelegation?.fr ?? "",
              h.regionalDelegation?.en ?? "",
            ),
            divisionalDelegation: localizedTextOrNull(
              h.divisionalDelegation?.fr ?? "",
              h.divisionalDelegation?.en ?? "",
            ),
          })),
        active: school.active,
        headOfSchoolStaffId: school.headOfSchoolStaffId,
      });
      setSchool(updated);
      setForm(schoolToForm(updated));
      notify.success(t("schoolSaved"));
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("schoolSaveError"));
    } finally {
      setSaving(false);
    }
  }

  async function onLogoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !school || !canEdit) return;
    if (!LOGO_TYPES.has(file.type)) {
      notify.error(t("logoBadType"));
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      notify.error(t("logoTooLarge"));
      return;
    }
    setLogoBusy(true);
    try {
      const updated = await uploadSchoolLogo(school.id, file);
      setSchool(updated);
      await refreshLogo();
      notify.success(t("logoSaved"));
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("logoSaveError"));
    } finally {
      setLogoBusy(false);
    }
  }

  async function onDeleteLogo() {
    if (!school || !canEdit || logoBusy) return;
    setLogoBusy(true);
    try {
      const updated = await deleteSchoolLogo(school.id);
      setSchool(updated);
      await refreshLogo();
      notify.success(t("logoRemoved"));
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("logoSaveError"));
    } finally {
      setLogoBusy(false);
    }
  }

  function patchForm(patch: Partial<SchoolForm>) {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function patchHeader(index: number, patch: Partial<OfficialHeaderDto>) {
    setForm((prev) => {
      if (!prev) return prev;
      const headers = prev.headers.map((h, i) => (i === index ? { ...h, ...patch } : h));
      return { ...prev, headers };
    });
  }

  function toggleHeaderGroup(index: number, groupCycles: readonly string[]) {
    setForm((prev) => {
      if (!prev) return prev;
      const headers = prev.headers.map((h, i) => {
        if (i !== index) return h;
        const active = headerHasGroup(h.cycles, groupCycles);
        let next = active
          ? h.cycles.filter((c) => !groupCycles.includes(c))
          : normalizeHeaderCycles([...h.cycles, ...groupCycles]);
        if (next.length === 0) next = h.cycles;
        return { ...h, cycles: next };
      });
      return { ...prev, headers };
    });
  }

  function cycleGroupLabel(groupId: string): string {
    if (groupId === "SECONDAIRE") return t("cycleGroupSecondary");
    return tAcademic.has(`cycles.${groupId}`)
      ? tAcademic(`cycles.${groupId}`)
      : groupId;
  }

  function previewCycleLabels(cycles: string[]): string[] {
    const labels: string[] = [];
    if (cycles.includes("MATERNELLE")) {
      labels.push(tAcademic("cycles.MATERNELLE"));
    }
    if (cycles.includes("PRIMAIRE")) {
      labels.push(tAcademic("cycles.PRIMAIRE"));
    }
    if (SECONDARY_CYCLES.some((c) => cycles.includes(c))) {
      labels.push(t("cycleGroupSecondary"));
    }
    return labels;
  }

  const readOnly = !canEdit;

  return (
    <div className="space-y-6 slide-up">
      {!canEdit ? (
        <p className="rounded-[var(--radius-md)] bg-[var(--ios-info-soft)] px-3.5 py-2.5 text-[12px] leading-relaxed text-[var(--ios-blue)]">
          {t("readOnlyHint")}
        </p>
      ) : null}

      <GroupedList header={t("yearSection")}>
        <GroupedListItem className="flex-col items-stretch gap-3 py-3 sm:flex-row sm:items-end">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--ios-info-soft)] text-[var(--ios-blue)]">
              <CalendarRange className="size-4 stroke-[1.75]" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold text-[var(--ios-label)]">
                  {t("yearCurrentLabel")}
                </p>
                {currentYear ? (
                  <Badge tone={currentYear.locked ? "warning" : "success"}>
                    {currentYear.label}
                  </Badge>
                ) : (
                  <Badge tone="neutral">{t("yearNone")}</Badge>
                )}
                {currentYear?.locked ? (
                  <Badge tone="warning">{t("yearLockedBadge")}</Badge>
                ) : null}
              </div>
              <p className="text-[11px] leading-relaxed text-[var(--ios-secondary-label)]">
                {t("yearHint")}
              </p>
              <Field id="settings-year" label={t("yearSelect")}>
                <Select
                  id="settings-year"
                  value={selectedYearId}
                  disabled={yearsLoading || readOnly || yearSaving || years.length === 0}
                  onChange={(e) => setSelectedYearId(e.target.value)}
                >
                  {years.length === 0 ? (
                    <option value="">{t("yearEmpty")}</option>
                  ) : (
                    years.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.label}
                        {year.current ? ` · ${t("yearBadgeCurrent")}` : ""}
                        {year.locked ? ` · ${t("yearBadgeLocked")}` : ""}
                      </option>
                    ))
                  )}
                </Select>
              </Field>
              {selectedYear?.locked ? (
                <p className="text-[11px] leading-relaxed text-[var(--ios-warning)]">
                  {t("yearLockedHint")}
                </p>
              ) : null}
            </div>
          </div>
          {canEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              {selectedYearId && selectedYearId === currentYear?.id ? (
                <Badge tone="success">{t("yearAlreadyCurrent")}</Badge>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={yearSaving || yearsLoading || !selectedYearId || years.length === 0}
                  onClick={() => void onSetCurrentYear()}
                >
                  {yearSaving ? tCommon("loading") : t("yearSetAction")}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                leadingIcon={<Plus className="size-3.5" aria-hidden />}
                disabled={yearsLoading || yearCreating}
                onClick={() => {
                  const next = !showCreateYear;
                  setShowCreateYear(next);
                  if (next) suggestNextYearDefaults(years);
                }}
              >
                {t("yearCreateAction")}
              </Button>
            </div>
          ) : null}
        </GroupedListItem>
        {canEdit && showCreateYear ? (
          <GroupedListItem className="block space-y-3 py-3">
            <p className="text-[12px] leading-snug text-[var(--ios-secondary-label)]">
              {t("yearCreateHint")}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field id="new-year-label" label={t("fields.yearLabel")}>
                <Input
                  id="new-year-label"
                  value={newYearLabel}
                  disabled={yearCreating}
                  placeholder="2026-2027"
                  onChange={(e) => setNewYearLabel(e.target.value)}
                />
              </Field>
              <Field id="new-year-start" label={t("fields.yearStart")}>
                <Input
                  id="new-year-start"
                  type="date"
                  value={newYearStart}
                  disabled={yearCreating}
                  onChange={(e) => setNewYearStart(e.target.value)}
                />
              </Field>
              <Field id="new-year-end" label={t("fields.yearEnd")}>
                <Input
                  id="new-year-end"
                  type="date"
                  value={newYearEnd}
                  disabled={yearCreating}
                  onChange={(e) => setNewYearEnd(e.target.value)}
                />
              </Field>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label
                htmlFor="new-year-current"
                className="flex cursor-pointer items-center justify-between gap-3 sm:justify-start"
              >
                <div>
                  <p className="text-[13px] font-medium text-[var(--ios-label)]">
                    {t("yearCreateAsCurrent")}
                  </p>
                  <p className="text-[11px] text-[var(--ios-secondary-label)]">
                    {t("yearCreateAsCurrentHint")}
                  </p>
                </div>
                <Switch
                  id="new-year-current"
                  checked={newYearAsCurrent}
                  disabled={yearCreating}
                  onCheckedChange={setNewYearAsCurrent}
                />
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghostDestructive"
                  disabled={yearCreating}
                  onClick={() => setShowCreateYear(false)}
                >
                  {tCommon("cancel")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={yearCreating}
                  onClick={() => void onCreateYear()}
                >
                  {yearCreating ? tCommon("loading") : t("yearCreateConfirm")}
                </Button>
              </div>
            </div>
          </GroupedListItem>
        ) : null}
      </GroupedList>

      <GroupedList header={t("logoSection")}>
        <GroupedListItem className="flex-col items-stretch gap-3 py-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <BrandMark size="lg" alt={school?.shortName ?? tCommon("schoolName")} />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[var(--ios-label)]">
                {t("logoTitle")}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--ios-secondary-label)]">
                {school?.hasLogo ? t("logoDefined") : t("logoFallback")}
              </p>
            </div>
          </div>
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => void onLogoSelected(e)}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                leadingIcon={<ImagePlus className="size-3.5" aria-hidden />}
                disabled={logoBusy || brandLoading || !school}
                onClick={() => fileRef.current?.click()}
              >
                {logoBusy ? tCommon("loading") : t("logoUpload")}
              </Button>
              {school?.hasLogo ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghostDestructive"
                  leadingIcon={<Trash2 className="size-3.5" aria-hidden />}
                  disabled={logoBusy}
                  onClick={() => void onDeleteLogo()}
                >
                  {t("logoRemove")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </GroupedListItem>
      </GroupedList>

      {form && school ? (
        <>
          <GroupedList header={t("identitySection")}>
            <GroupedListItem className="block space-y-3 py-3">
              <div className="mb-1 flex items-center gap-2 text-[var(--ios-secondary-label)]">
                <Building2 className="size-3.5 stroke-[1.75]" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-[0.04em]">
                  {school.code}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="sch-name-fr" label={t("fields.nameFr")}>
                  <Input
                    id="sch-name-fr"
                    value={form.nameFr}
                    disabled={readOnly || saving}
                    onChange={(e) => patchForm({ nameFr: e.target.value })}
                  />
                </Field>
                <Field id="sch-name-en" label={t("fields.nameEn")}>
                  <Input
                    id="sch-name-en"
                    value={form.nameEn}
                    disabled={readOnly || saving}
                    onChange={(e) => patchForm({ nameEn: e.target.value })}
                  />
                </Field>
                <Field id="sch-short" label={t("fields.shortName")}>
                  <Input
                    id="sch-short"
                    value={form.shortName}
                    disabled={readOnly || saving}
                    onChange={(e) => patchForm({ shortName: e.target.value })}
                  />
                </Field>
                <Field id="sch-tz" label={t("fields.timezone")}>
                  <Input
                    id="sch-tz"
                    value={form.timezone}
                    disabled={readOnly || saving}
                    onChange={(e) => patchForm({ timezone: e.target.value })}
                  />
                </Field>
                <Field id="sch-email" label={t("fields.email")}>
                  <Input
                    id="sch-email"
                    type="email"
                    value={form.email}
                    disabled={readOnly || saving}
                    onChange={(e) => patchForm({ email: e.target.value })}
                  />
                </Field>
                <Field id="sch-phone" label={t("fields.phone")}>
                  <Input
                    id="sch-phone"
                    value={form.phone}
                    disabled={readOnly || saving}
                    onChange={(e) => patchForm({ phone: e.target.value })}
                  />
                </Field>
                <Field id="sch-address" label={t("fields.address")}>
                  <Input
                    id="sch-address"
                    value={form.address}
                    disabled={readOnly || saving}
                    onChange={(e) => patchForm({ address: e.target.value })}
                  />
                </Field>
                <Field id="sch-city" label={t("fields.city")}>
                  <Input
                    id="sch-city"
                    value={form.city}
                    disabled={readOnly || saving}
                    onChange={(e) => patchForm({ city: e.target.value })}
                  />
                </Field>
                <Field id="sch-bp" label={t("fields.postalBox")}>
                  <Input
                    id="sch-bp"
                    value={form.postalBox}
                    disabled={readOnly || saving}
                    onChange={(e) => patchForm({ postalBox: e.target.value })}
                  />
                </Field>
              </div>
            </GroupedListItem>
          </GroupedList>

          <GroupedList header={t("documentsSection")}>
            <GroupedListItem className="block space-y-3 py-3">
              <div className="mb-1 flex items-center gap-2 text-[var(--ios-secondary-label)]">
                <ScrollText className="size-3.5 stroke-[1.75]" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-[0.04em]">
                  {t("documentsSubhead")}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="sch-sign-place" label={t("fields.signaturePlace")}>
                  <Input
                    id="sch-sign-place"
                    value={form.signaturePlace}
                    disabled={readOnly || saving}
                    onChange={(e) => patchForm({ signaturePlace: e.target.value })}
                  />
                </Field>
                <div className="hidden sm:block" />
                <Field id="sch-head-fr" label={t("fields.headTitleFr")}>
                  <Input
                    id="sch-head-fr"
                    value={form.headTitleFr}
                    disabled={readOnly || saving}
                    onChange={(e) => patchForm({ headTitleFr: e.target.value })}
                  />
                </Field>
                <Field id="sch-head-en" label={t("fields.headTitleEn")}>
                  <Input
                    id="sch-head-en"
                    value={form.headTitleEn}
                    disabled={readOnly || saving}
                    onChange={(e) => patchForm({ headTitleEn: e.target.value })}
                  />
                </Field>
                <Field id="sch-notice-fr" label={t("fields.noticeFr")}>
                  <Textarea
                    id="sch-notice-fr"
                    rows={2}
                    value={form.noticeFr}
                    disabled={readOnly || saving}
                    onChange={(e) => patchForm({ noticeFr: e.target.value })}
                  />
                </Field>
                <Field id="sch-notice-en" label={t("fields.noticeEn")}>
                  <Textarea
                    id="sch-notice-en"
                    rows={2}
                    value={form.noticeEn}
                    disabled={readOnly || saving}
                    onChange={(e) => patchForm({ noticeEn: e.target.value })}
                  />
                </Field>
                <Field id="sch-disc-fr" label={t("fields.disclaimerFr")}>
                  <Textarea
                    id="sch-disc-fr"
                    rows={2}
                    value={form.disclaimerFr}
                    disabled={readOnly || saving}
                    onChange={(e) => patchForm({ disclaimerFr: e.target.value })}
                  />
                </Field>
                <Field id="sch-disc-en" label={t("fields.disclaimerEn")}>
                  <Textarea
                    id="sch-disc-en"
                    rows={2}
                    value={form.disclaimerEn}
                    disabled={readOnly || saving}
                    onChange={(e) => patchForm({ disclaimerEn: e.target.value })}
                  />
                </Field>
              </div>
            </GroupedListItem>

            {form.headers.map((header, index) => (
              <GroupedListItem key={`hdr-${index}`} className="block space-y-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold text-[var(--ios-label)]">
                    {t("headerBlock", { n: index + 1 })}
                  </p>
                  {canEdit && form.headers.length > 1 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghostDestructive"
                      onClick={() =>
                        patchForm({
                          headers: form.headers.filter((_, i) => i !== index),
                        })
                      }
                    >
                      {t("headerRemove")}
                    </Button>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {CYCLE_GROUPS.map((group) => {
                    const active = headerHasGroup(header.cycles, group.cycles);
                    return (
                      <button
                        key={group.id}
                        type="button"
                        disabled={readOnly || saving}
                        onClick={() => toggleHeaderGroup(index, group.cycles)}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                          active
                            ? "bg-[var(--ios-blue)] text-white"
                            : "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]",
                          (readOnly || saving) && "opacity-60",
                        )}
                      >
                        {cycleGroupLabel(group.id)}
                      </button>
                    );
                  })}
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--ios-secondary-label)]">
                    {t("headerPreview")}
                  </p>
                  <DocumentHeaderPreview
                    header={header}
                    schoolNameFr={form.nameFr}
                    schoolNameEn={form.nameEn}
                    postalBox={form.postalBox}
                    phones={form.phone
                      .split(/[/;,]+/)
                      .map((p) => p.trim())
                      .filter(Boolean)}
                    cycleLabels={previewCycleLabels(header.cycles)}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    id={`hdr-rep-fr-${index}`}
                    label={t("fields.republicFr")}
                  >
                    <Input
                      id={`hdr-rep-fr-${index}`}
                      value={header.republic.fr ?? ""}
                      disabled={readOnly || saving}
                      onChange={(e) =>
                        patchHeader(index, {
                          republic: { ...header.republic, fr: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field
                    id={`hdr-rep-en-${index}`}
                    label={t("fields.republicEn")}
                  >
                    <Input
                      id={`hdr-rep-en-${index}`}
                      value={header.republic.en ?? ""}
                      disabled={readOnly || saving}
                      onChange={(e) =>
                        patchHeader(index, {
                          republic: { ...header.republic, en: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field id={`hdr-motto-fr-${index}`} label={t("fields.mottoFr")}>
                    <Input
                      id={`hdr-motto-fr-${index}`}
                      value={header.motto.fr ?? ""}
                      disabled={readOnly || saving}
                      onChange={(e) =>
                        patchHeader(index, {
                          motto: { ...header.motto, fr: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field id={`hdr-motto-en-${index}`} label={t("fields.mottoEn")}>
                    <Input
                      id={`hdr-motto-en-${index}`}
                      value={header.motto.en ?? ""}
                      disabled={readOnly || saving}
                      onChange={(e) =>
                        patchHeader(index, {
                          motto: { ...header.motto, en: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field id={`hdr-min-fr-${index}`} label={t("fields.ministryFr")}>
                    <Input
                      id={`hdr-min-fr-${index}`}
                      value={header.ministry.fr ?? ""}
                      disabled={readOnly || saving}
                      onChange={(e) =>
                        patchHeader(index, {
                          ministry: { ...header.ministry, fr: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field id={`hdr-min-en-${index}`} label={t("fields.ministryEn")}>
                    <Input
                      id={`hdr-min-en-${index}`}
                      value={header.ministry.en ?? ""}
                      disabled={readOnly || saving}
                      onChange={(e) =>
                        patchHeader(index, {
                          ministry: { ...header.ministry, en: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field
                    id={`hdr-reg-fr-${index}`}
                    label={t("fields.regionalFr")}
                  >
                    <Input
                      id={`hdr-reg-fr-${index}`}
                      value={header.regionalDelegation?.fr ?? ""}
                      disabled={readOnly || saving}
                      onChange={(e) =>
                        patchHeader(index, {
                          regionalDelegation: {
                            fr: e.target.value,
                            en: header.regionalDelegation?.en ?? "",
                          },
                        })
                      }
                    />
                  </Field>
                  <Field
                    id={`hdr-reg-en-${index}`}
                    label={t("fields.regionalEn")}
                  >
                    <Input
                      id={`hdr-reg-en-${index}`}
                      value={header.regionalDelegation?.en ?? ""}
                      disabled={readOnly || saving}
                      onChange={(e) =>
                        patchHeader(index, {
                          regionalDelegation: {
                            fr: header.regionalDelegation?.fr ?? "",
                            en: e.target.value,
                          },
                        })
                      }
                    />
                  </Field>
                  <Field
                    id={`hdr-div-fr-${index}`}
                    label={t("fields.divisionalFr")}
                  >
                    <Input
                      id={`hdr-div-fr-${index}`}
                      value={header.divisionalDelegation?.fr ?? ""}
                      disabled={readOnly || saving}
                      onChange={(e) =>
                        patchHeader(index, {
                          divisionalDelegation: {
                            fr: e.target.value,
                            en: header.divisionalDelegation?.en ?? "",
                          },
                        })
                      }
                    />
                  </Field>
                  <Field
                    id={`hdr-div-en-${index}`}
                    label={t("fields.divisionalEn")}
                  >
                    <Input
                      id={`hdr-div-en-${index}`}
                      value={header.divisionalDelegation?.en ?? ""}
                      disabled={readOnly || saving}
                      onChange={(e) =>
                        patchHeader(index, {
                          divisionalDelegation: {
                            fr: header.divisionalDelegation?.fr ?? "",
                            en: e.target.value,
                          },
                        })
                      }
                    />
                  </Field>
                </div>
              </GroupedListItem>
            ))}

            {canEdit ? (
              <GroupedListItem className="justify-between gap-2 py-3">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={saving}
                  onClick={() =>
                    patchForm({ headers: [...form.headers, emptyHeader()] })
                  }
                >
                  {t("headerAdd")}
                </Button>
                <Button
                  type="button"
                  disabled={saving || brandLoading}
                  onClick={() => void onSaveSchool()}
                >
                  {saving ? tCommon("loading") : tCommon("save")}
                </Button>
              </GroupedListItem>
            ) : null}
          </GroupedList>
        </>
      ) : brandLoading ? (
        <p className="text-[13px] text-[var(--ios-secondary-label)]">{tCommon("loading")}</p>
      ) : null}

      {isMock ? (
        <GroupedList header={t("switchRoleSection")}>
          {listMockRoles().map((role) => {
            const active = role === currentRole;
            return (
              <GroupedListItem key={role} className="p-0">
                <button
                  type="button"
                  onClick={() => switchRole(role)}
                  className={cn(
                    "pressable flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-left focus-visible:shadow-[var(--focus-ring)]",
                    active && "bg-[var(--ios-blue)]/10",
                  )}
                >
                  <span>
                    <span className="block text-[var(--text-body)] text-[var(--ios-label)]">
                      {tRoles(`${role}.label`)}
                    </span>
                    <span className="text-[var(--text-footnote)] text-[var(--ios-secondary-label)]">
                      {tRoles(`${role}.hint`)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                      active
                        ? "border-[var(--ios-blue)] bg-[var(--ios-blue)] text-white"
                        : "border-[var(--ios-fill-secondary)] bg-transparent text-transparent",
                    )}
                    aria-hidden
                  >
                    <Check className="size-3.5 stroke-[2.5]" />
                  </span>
                </button>
              </GroupedListItem>
            );
          })}
        </GroupedList>
      ) : null}
    </div>
  );
}
