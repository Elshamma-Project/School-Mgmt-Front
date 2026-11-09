"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useRouter } from "@/i18n/navigation";
import {
  academicListPath,
  type AcademicTab,
} from "@/lib/academic/tabs";
import {
  createLevel,
  createRoom,
  createSchoolClass,
  createSubject,
  createSubjectGroup,
  listAcademicYears,
  listLevels,
  listRooms,
  type CycleCode,
  type RoomTypeCode,
  type SectionCode,
} from "@/lib/api/academic";
import { userHasCapability } from "@/lib/auth/permissions";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import { notify } from "@/lib/ui/notify";
import { useAuthStore } from "@/stores/auth-store";
import { usePageHeadingStore } from "@/stores/page-heading-store";
import { ApiError, isAuthFailure } from "@/types/api";
import { primaryRole } from "@/types/auth";

type AcademicCreateViewProps = {
  tab: AcademicTab;
};

const CYCLES: CycleCode[] = [
  "MATERNELLE",
  "PRIMAIRE",
  "SECONDAIRE_1ER_CYCLE",
  "SECONDAIRE_2ND_CYCLE",
];

const SECTIONS: SectionCode[] = ["FRANCOPHONE", "ANGLOPHONE", "BILINGUAL"];

const ROOM_TYPES: RoomTypeCode[] = [
  "CLASSROOM",
  "LABORATORY",
  "COMPUTER_LAB",
  "SPORTS",
  "WORKSHOP",
  "HALL",
  "OTHER",
];

/**
 * Formulaires de création académique (niveaux, classes, matières, groupes, salles).
 * Branchés sur les POST déjà exposés par l’API.
 */
export function AcademicCreateView({ tab }: AcademicCreateViewProps) {
  const t = useTranslations("academic");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId;
  const role = primaryRole(user);
  const workspaceHome = role ? getRoleHomePath(role) : "/administration";
  const canManage = userHasCapability(
    user?.roles ?? (role ? [role] : []),
    "manageSchoolStructure",
  );
  const setCrumbs = usePageHeadingStore((s) => s.setCrumbs);
  const setBackHref = usePageHeadingStore((s) => s.setBackHref);
  const clearOverride = usePageHeadingStore((s) => s.clearOverride);

  const listHref = academicListPath(workspaceHome, tab);

  useEffect(() => {
    if (!canManage) router.replace(listHref);
  }, [canManage, listHref, router]);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingRefs, setLoadingRefs] = useState(tab === "classes");

  // Shared bilingual fields
  const [code, setCode] = useState("");
  const [nameFr, setNameFr] = useState("");
  const [nameEn, setNameEn] = useState("");

  // Level
  const [cycle, setCycle] = useState<CycleCode>("SECONDAIRE_1ER_CYCLE");
  const [section, setSection] = useState<SectionCode>("FRANCOPHONE");
  const [order, setOrder] = useState("1");
  const [nextLevelCode, setNextLevelCode] = useState("");

  // Class
  const [yearId, setYearId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [className, setClassName] = useState("");
  const [trackCode, setTrackCode] = useState("");
  const [capacity, setCapacity] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState<"FR" | "EN">("FR");
  const [homeRoomId, setHomeRoomId] = useState("");
  const [years, setYears] = useState<Array<{ id: string; label: string }>>([]);
  const [levels, setLevels] = useState<Array<{ id: string; label: string }>>([]);
  const [rooms, setRooms] = useState<Array<{ id: string; label: string }>>([]);

  // Subject
  const [subjectKind, setSubjectKind] = useState<"ACADEMIC" | "ACTIVITY">("ACADEMIC");
  const [shortFr, setShortFr] = useState("");
  const [shortEn, setShortEn] = useState("");

  // Group
  const [displayOrder, setDisplayOrder] = useState("0");

  // Room
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState<RoomTypeCode>("CLASSROOM");
  const [roomCapacity, setRoomCapacity] = useState("");

  useEffect(() => {
    setBackHref(listHref);
    setCrumbs([
      { label: tNav("academic"), href: academicListPath(workspaceHome) },
      { label: t(`tabs.${tab}`), href: listHref },
      { label: t(`add.${tab}`) },
    ]);
    return () => clearOverride();
  }, [clearOverride, listHref, setBackHref, setCrumbs, t, tNav, tab, workspaceHome]);

  useEffect(() => {
    if (tab !== "classes") {
      setLoadingRefs(false);
      return;
    }
    let cancelled = false;
    setLoadingRefs(true);
    void (async () => {
      try {
        const [yearsPage, levelsPage, roomsPage] = await Promise.all([
          listAcademicYears({ page: 0, size: 20, schoolId }),
          listLevels({ page: 0, size: 100, active: true, schoolId }),
          listRooms({ page: 0, size: 100, active: true, schoolId }),
        ]);
        if (cancelled) return;
        const yearRows = yearsPage.content.map((y) => ({ id: y.id, label: y.label }));
        setYears(yearRows);
        const current =
          yearsPage.content.find((y) => y.current) ??
          yearsPage.content.find((y) => y.status === "ACTIVE") ??
          yearsPage.content[0];
        setYearId(current?.id ?? "");
        setLevels(
          levelsPage.content.map((l) => ({
            id: l.id,
            label: `${l.code} — ${l.name.fr || l.name.en || l.code}`,
          })),
        );
        setLevelId(levelsPage.content[0]?.id ?? "");
        setRooms(roomsPage.content.map((r) => ({ id: r.id, label: r.name })));
      } catch (error) {
        if (isAuthFailure(error)) return;
        if (!cancelled) {
          if (error instanceof ApiError) setFormError(error.message);
          else setFormError(t("loadError"));
        }
      } finally {
        if (!cancelled) setLoadingRefs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, t, tab]);

  const title = useMemo(() => t(`add.${tab}`), [t, tab]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      switch (tab) {
        case "levels": {
          if (!code.trim() || !nameFr.trim()) {
            setFormError(t("form.required"));
            return;
          }
          await createLevel({
            code: code.trim().toUpperCase(),
            name: { fr: nameFr.trim(), en: nameEn.trim() || nameFr.trim() },
            cycle,
            section,
            order: Math.max(1, Number.parseInt(order, 10) || 1),
            nextLevelCode: nextLevelCode.trim() || null,
            schoolId,
          });
          break;
        }
        case "classes": {
          if (!yearId || !levelId || !className.trim()) {
            setFormError(t("form.required"));
            return;
          }
          await createSchoolClass({
            academicYearId: yearId,
            levelId,
            name: className.trim(),
            trackCode: trackCode.trim() || null,
            capacity: capacity.trim() ? Number.parseInt(capacity, 10) : null,
            defaultLanguage,
            availableLanguages: ["FR", "EN"],
            homeRoomId: homeRoomId || null,
            schoolId,
          });
          break;
        }
        case "subjects": {
          if (!code.trim() || !nameFr.trim()) {
            setFormError(t("form.required"));
            return;
          }
          await createSubject({
            code: code.trim().toUpperCase(),
            name: { fr: nameFr.trim(), en: nameEn.trim() || nameFr.trim() },
            shortName:
              shortFr.trim() || shortEn.trim()
                ? { fr: shortFr.trim() || null, en: shortEn.trim() || null }
                : null,
            kind: subjectKind,
            schoolId,
          });
          break;
        }
        case "groups": {
          if (!code.trim() || !nameFr.trim()) {
            setFormError(t("form.required"));
            return;
          }
          await createSubjectGroup({
            code: code.trim().toUpperCase(),
            name: { fr: nameFr.trim(), en: nameEn.trim() || nameFr.trim() },
            displayOrder: Number.parseInt(displayOrder, 10) || 0,
            schoolId,
          });
          break;
        }
        case "rooms": {
          if (!roomName.trim()) {
            setFormError(t("form.required"));
            return;
          }
          await createRoom({
            name: roomName.trim(),
            type: roomType,
            capacity: roomCapacity.trim() ? Number.parseInt(roomCapacity, 10) : null,
            schoolId,
          });
          break;
        }
      }
      notify.success(t("created"));
      router.replace(listHref);
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) setFormError(error.message);
      else setFormError(t("createError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 slide-up">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
          {title}
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ios-secondary-label)]">
          {t(`createHints.${tab}`)}
        </p>
      </div>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]"
      >
        <div className="space-y-4 px-5 py-5 sm:px-6">
          {tab === "levels" ? (
            <>
              <Field id="ac-level-code" label={t("fields.code")} error={formError ?? undefined}>
                <Input
                  id="ac-level-code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="6EME"
                  autoFocus
                  invalid={Boolean(formError)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="ac-level-fr" label={t("fields.nameFr")}>
                  <Input
                    id="ac-level-fr"
                    value={nameFr}
                    onChange={(e) => setNameFr(e.target.value)}
                    placeholder="6ème"
                  />
                </Field>
                <Field id="ac-level-en" label={t("fields.nameEn")}>
                  <Input
                    id="ac-level-en"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="Form 1"
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="ac-level-cycle" label={t("fields.cycle")}>
                  <Select
                    id="ac-level-cycle"
                    value={cycle}
                    onChange={(e) => setCycle(e.target.value as CycleCode)}
                  >
                    {CYCLES.map((value) => (
                      <option key={value} value={value}>
                        {t(`cycles.${value}`)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field id="ac-level-section" label={t("fields.section")}>
                  <Select
                    id="ac-level-section"
                    value={section}
                    onChange={(e) => setSection(e.target.value as SectionCode)}
                  >
                    {SECTIONS.map((value) => (
                      <option key={value} value={value}>
                        {t(`sections.${value}`)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="ac-level-order" label={t("fields.order")}>
                  <Input
                    id="ac-level-order"
                    type="number"
                    min={1}
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                  />
                </Field>
                <Field id="ac-level-next" label={t("fields.nextLevelCode")}>
                  <Input
                    id="ac-level-next"
                    value={nextLevelCode}
                    onChange={(e) => setNextLevelCode(e.target.value)}
                    placeholder="5EME"
                  />
                </Field>
              </div>
            </>
          ) : null}

          {tab === "classes" ? (
            loadingRefs ? (
              <p className="text-[13px] text-[var(--ios-secondary-label)]">{tCommon("loading")}</p>
            ) : (
              <>
                <Field id="ac-class-year" label={t("fields.year")}>
                  <Select
                    id="ac-class-year"
                    value={yearId}
                    onChange={(e) => setYearId(e.target.value)}
                    disabled={years.length === 0}
                  >
                    {years.length === 0 ? (
                      <option value="">{t("yearEmpty")}</option>
                    ) : (
                      years.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.label}
                        </option>
                      ))
                    )}
                  </Select>
                </Field>
                <Field id="ac-class-level" label={t("fields.level")}>
                  <Select
                    id="ac-class-level"
                    value={levelId}
                    onChange={(e) => setLevelId(e.target.value)}
                    disabled={levels.length === 0}
                  >
                    {levels.length === 0 ? (
                      <option value="">{t("empty.levels.title")}</option>
                    ) : (
                      levels.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.label}
                        </option>
                      ))
                    )}
                  </Select>
                </Field>
                <Field id="ac-class-name" label={t("fields.className")} error={formError ?? undefined}>
                  <Input
                    id="ac-class-name"
                    value={className}
                    onChange={(e) => {
                      setClassName(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="6ème A"
                    autoFocus
                    invalid={Boolean(formError)}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="ac-class-track" label={t("fields.trackCode")}>
                    <Input
                      id="ac-class-track"
                      value={trackCode}
                      onChange={(e) => setTrackCode(e.target.value)}
                      placeholder="A"
                    />
                  </Field>
                  <Field id="ac-class-cap" label={t("fields.capacity")}>
                    <Input
                      id="ac-class-cap"
                      type="number"
                      min={1}
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                    />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="ac-class-lang" label={t("fields.defaultLanguage")}>
                    <Select
                      id="ac-class-lang"
                      value={defaultLanguage}
                      onChange={(e) => setDefaultLanguage(e.target.value as "FR" | "EN")}
                    >
                      <option value="FR">FR</option>
                      <option value="EN">EN</option>
                    </Select>
                  </Field>
                  <Field id="ac-class-room" label={t("fields.homeRoom")}>
                    <Select
                      id="ac-class-room"
                      value={homeRoomId}
                      onChange={(e) => setHomeRoomId(e.target.value)}
                    >
                      <option value="">{t("fields.homeRoomNone")}</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </>
            )
          ) : null}

          {tab === "subjects" ? (
            <>
              <Field id="ac-sub-code" label={t("fields.code")} error={formError ?? undefined}>
                <Input
                  id="ac-sub-code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="MATH"
                  autoFocus
                  invalid={Boolean(formError)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="ac-sub-fr" label={t("fields.nameFr")}>
                  <Input
                    id="ac-sub-fr"
                    value={nameFr}
                    onChange={(e) => setNameFr(e.target.value)}
                    placeholder="Mathématiques"
                  />
                </Field>
                <Field id="ac-sub-en" label={t("fields.nameEn")}>
                  <Input
                    id="ac-sub-en"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="Mathematics"
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="ac-sub-short-fr" label={t("fields.shortFr")}>
                  <Input
                    id="ac-sub-short-fr"
                    value={shortFr}
                    onChange={(e) => setShortFr(e.target.value)}
                    placeholder="Maths"
                  />
                </Field>
                <Field id="ac-sub-short-en" label={t("fields.shortEn")}>
                  <Input
                    id="ac-sub-short-en"
                    value={shortEn}
                    onChange={(e) => setShortEn(e.target.value)}
                    placeholder="Maths"
                  />
                </Field>
              </div>
              <Field id="ac-sub-kind" label={t("fields.kind")}>
                <Select
                  id="ac-sub-kind"
                  value={subjectKind}
                  onChange={(e) => setSubjectKind(e.target.value as "ACADEMIC" | "ACTIVITY")}
                >
                  <option value="ACADEMIC">{t("subjectKind.ACADEMIC")}</option>
                  <option value="ACTIVITY">{t("subjectKind.ACTIVITY")}</option>
                </Select>
              </Field>
            </>
          ) : null}

          {tab === "groups" ? (
            <>
              <Field id="ac-grp-code" label={t("fields.code")} error={formError ?? undefined}>
                <Input
                  id="ac-grp-code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="LANG_LIT"
                  autoFocus
                  invalid={Boolean(formError)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="ac-grp-fr" label={t("fields.nameFr")}>
                  <Input
                    id="ac-grp-fr"
                    value={nameFr}
                    onChange={(e) => setNameFr(e.target.value)}
                    placeholder="Langues et littératures"
                  />
                </Field>
                <Field id="ac-grp-en" label={t("fields.nameEn")}>
                  <Input
                    id="ac-grp-en"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="Languages and literature"
                  />
                </Field>
              </div>
              <Field id="ac-grp-order" label={t("fields.displayOrder")}>
                <Input
                  id="ac-grp-order"
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                />
              </Field>
            </>
          ) : null}

          {tab === "rooms" ? (
            <>
              <Field id="ac-room-name" label={t("fields.roomName")} error={formError ?? undefined}>
                <Input
                  id="ac-room-name"
                  value={roomName}
                  onChange={(e) => {
                    setRoomName(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Salle 1"
                  autoFocus
                  invalid={Boolean(formError)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="ac-room-type" label={t("fields.roomType")}>
                  <Select
                    id="ac-room-type"
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value as RoomTypeCode)}
                  >
                    {ROOM_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {t(`roomTypes.${value}`)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field id="ac-room-cap" label={t("fields.capacity")}>
                  <Input
                    id="ac-room-cap"
                    type="number"
                    min={1}
                    value={roomCapacity}
                    onChange={(e) => setRoomCapacity(e.target.value)}
                  />
                </Field>
              </div>
            </>
          ) : null}

          {formError ? (
            <p className="text-[12px] text-[var(--ios-danger)]" role="alert">
              {formError}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--ios-separator)]/55 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="secondary" onClick={() => router.push(listHref)}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={saving || (tab === "classes" && loadingRefs)}>
            {saving ? tCommon("loading") : tCommon("save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
