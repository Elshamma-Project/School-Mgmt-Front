"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  BookOpen,
  DoorOpen,
  Hash,
  Languages,
  Layers3,
  LayoutGrid,
  Pencil,
  Power,
  PowerOff,
  School,
  Shapes,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DetailRow } from "@/components/ui/detail-row";
import { Field } from "@/components/ui/field";
import { GroupedList, GroupedListItem } from "@/components/ui/grouped-list";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useRouter } from "@/i18n/navigation";
import {
  academicDetailPath,
  academicListPath,
  parseAcademicEntityId,
  type AcademicTab,
} from "@/lib/academic/tabs";
import {
  deactivateLevel,
  deactivateRoom,
  deactivateSchoolClass,
  deactivateSubject,
  deactivateSubjectGroup,
  getLevel,
  getRoom,
  getSchoolClass,
  getSubject,
  getSubjectGroup,
  listAcademicYears,
  listClasses,
  listClassSubjects,
  listSubjectGroups,
  listSubjects,
  localizedLabel,
  reactivateLevel,
  reactivateRoom,
  reactivateSchoolClass,
  reactivateSubject,
  reactivateSubjectGroup,
  updateLevel,
  updateRoom,
  updateSchoolClass,
  updateSubject,
  updateSubjectGroup,
  type ClassSubjectResponse,
  type CycleCode,
  type LevelResponse,
  type RoomResponse,
  type RoomTypeCode,
  type SchoolClassResponse,
  type SectionCode,
  type SubjectGroupResponse,
  type SubjectResponse,
} from "@/lib/api/academic";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { usePageHeadingStore } from "@/stores/page-heading-store";
import { ApiError, isAuthFailure } from "@/types/api";
import { primaryRole } from "@/types/auth";

type AcademicDetailViewProps = {
  tab: AcademicTab;
  slug: string;
};

type Entity =
  | { kind: "levels"; data: LevelResponse }
  | { kind: "classes"; data: SchoolClassResponse }
  | { kind: "subjects"; data: SubjectResponse }
  | { kind: "groups"; data: SubjectGroupResponse }
  | { kind: "rooms"; data: RoomResponse };

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

function codeInitials(codeOrName: string): string {
  const clean = codeOrName.trim();
  if (!clean) return "?";
  if (clean.length <= 3) return clean.toUpperCase();
  const parts = clean.split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return clean.slice(0, 3).toUpperCase();
}

function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function AcademicDetailView({ tab, slug }: AcademicDetailViewProps) {
  const t = useTranslations("academic");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const schoolId = useAuthStore((s) => s.user?.schoolId);
  const role = primaryRole(useAuthStore((s) => s.user));
  const workspaceHome = role ? getRoleHomePath(role) : "/administration";
  const setCrumbs = usePageHeadingStore((s) => s.setCrumbs);
  const setBackHref = usePageHeadingStore((s) => s.setBackHref);
  const clearOverride = usePageHeadingStore((s) => s.clearOverride);

  const id = parseAcademicEntityId(slug);
  const listHref = academicListPath(workspaceHome, tab);

  const [entity, setEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [relatedClasses, setRelatedClasses] = useState<SchoolClassResponse[]>([]);
  const [relatedSubjects, setRelatedSubjects] = useState<SubjectResponse[]>([]);
  const [relatedGroups, setRelatedGroups] = useState<SubjectGroupResponse[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubjectResponse[]>([]);
  const [homeRoom, setHomeRoom] = useState<RoomResponse | null>(null);
  const [yearLabel, setYearLabel] = useState<string | null>(null);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const [nameFr, setNameFr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [shortFr, setShortFr] = useState("");
  const [shortEn, setShortEn] = useState("");
  const [plainName, setPlainName] = useState("");
  const [cycle, setCycle] = useState<CycleCode>("SECONDAIRE_1ER_CYCLE");
  const [section, setSection] = useState<SectionCode>("FRANCOPHONE");
  const [order, setOrder] = useState("1");
  const [nextLevelCode, setNextLevelCode] = useState("");
  const [trackCode, setTrackCode] = useState("");
  const [capacity, setCapacity] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState<"FR" | "EN">("FR");
  const [subjectKind, setSubjectKind] = useState<"ACADEMIC" | "ACTIVITY">("ACADEMIC");
  const [teachingLanguage, setTeachingLanguage] = useState<"" | "FR" | "EN">("");
  const [timetableAlias, setTimetableAlias] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [roomType, setRoomType] = useState<RoomTypeCode>("CLASSROOM");

  const titleLabel = useMemo(() => {
    if (!entity) return t(`tabs.${tab}`);
    if (entity.kind === "classes" || entity.kind === "rooms") return entity.data.name;
    return localizedLabel(entity.data.name, locale);
  }, [entity, locale, t, tab]);

  const subtitle = useMemo(() => {
    if (!entity) return "";
    switch (entity.kind) {
      case "levels":
        return `${entity.data.code} · ${t(`cycles.${entity.data.cycle}` as "cycles.PRIMAIRE")}`;
      case "classes":
        return `${entity.data.levelCode}${entity.data.trackCode ? ` · ${entity.data.trackCode}` : ""}`;
      case "subjects":
        return entity.data.code;
      case "groups":
        return entity.data.code;
      case "rooms":
        return t.has(`roomTypes.${entity.data.type}`)
          ? t(`roomTypes.${entity.data.type}` as "roomTypes.CLASSROOM")
          : entity.data.type;
    }
  }, [entity, t]);

  const heroIcon = useMemo((): ReactNode => {
    const cls = "size-8 stroke-[1.5]";
    switch (tab) {
      case "levels":
        return <Layers3 className={cls} aria-hidden />;
      case "classes":
        return <School className={cls} aria-hidden />;
      case "subjects":
        return <BookOpen className={cls} aria-hidden />;
      case "groups":
        return <Shapes className={cls} aria-hidden />;
      case "rooms":
        return <DoorOpen className={cls} aria-hidden />;
    }
  }, [tab]);

  const hydrateForm = useCallback((next: Entity) => {
    switch (next.kind) {
      case "levels":
        setNameFr(next.data.name.fr ?? "");
        setNameEn(next.data.name.en ?? "");
        setCycle(next.data.cycle as CycleCode);
        setSection(next.data.section as SectionCode);
        setOrder(String(next.data.order));
        setNextLevelCode(next.data.nextLevelCode ?? "");
        break;
      case "classes":
        setPlainName(next.data.name);
        setTrackCode(next.data.trackCode ?? "");
        setCapacity(next.data.capacity != null ? String(next.data.capacity) : "");
        setDefaultLanguage(next.data.defaultLanguage);
        break;
      case "subjects":
        setNameFr(next.data.name.fr ?? "");
        setNameEn(next.data.name.en ?? "");
        setShortFr(next.data.shortName?.fr ?? "");
        setShortEn(next.data.shortName?.en ?? "");
        setSubjectKind(next.data.kind);
        setTeachingLanguage(next.data.teachingLanguage ?? "");
        setTimetableAlias(next.data.timetableAlias ?? "");
        break;
      case "groups":
        setNameFr(next.data.name.fr ?? "");
        setNameEn(next.data.name.en ?? "");
        setDisplayOrder(String(next.data.displayOrder));
        break;
      case "rooms":
        setPlainName(next.data.name);
        setRoomType(next.data.type as RoomTypeCode);
        setCapacity(next.data.capacity != null ? String(next.data.capacity) : "");
        break;
    }
  }, []);

  const loadRelated = useCallback(
    async (next: Entity) => {
      setRelatedLoading(true);
      setRelatedClasses([]);
      setRelatedSubjects([]);
      setRelatedGroups([]);
      setClassSubjects([]);
      setHomeRoom(null);
      setYearLabel(null);
      try {
        const years = await listAcademicYears({ schoolId, size: 20 });
        const current =
          years.content.find((y) => y.current) ?? years.content.find((y) => y.status === "ACTIVE");
        if (current) setYearLabel(current.label);

        if (next.kind === "levels" && current) {
          const classes = await listClasses({
            academicYearId: current.id,
            schoolId,
            size: 100,
          });
          setRelatedClasses(classes.content.filter((c) => c.levelId === next.data.id));
        }

        if (next.kind === "rooms" && current) {
          const classes = await listClasses({
            academicYearId: current.id,
            schoolId,
            size: 100,
          });
          setRelatedClasses(classes.content.filter((c) => c.homeRoomId === next.data.id));
        }

        if (next.kind === "classes") {
          if (next.data.homeRoomId) {
            try {
              setHomeRoom(await getRoom(next.data.homeRoomId, schoolId));
            } catch {
              setHomeRoom(null);
            }
          }
          const [csPage, subjectsPage, groupsPage] = await Promise.all([
            listClassSubjects({ classId: next.data.id, schoolId, size: 100 }),
            listSubjects({ schoolId, size: 200 }),
            listSubjectGroups({ schoolId, size: 100 }),
          ]);
          setClassSubjects(csPage.content.filter((row) => row.active));
          setRelatedSubjects(subjectsPage.content);
          setRelatedGroups(groupsPage.content);
          if (current && current.id !== next.data.academicYearId) {
            const match = years.content.find((y) => y.id === next.data.academicYearId);
            if (match) setYearLabel(match.label);
          }
        }

      } catch (error) {
        if (!isAuthFailure(error)) {
          console.warn("[academic] related load failed", error);
        }
      } finally {
        setRelatedLoading(false);
      }
    },
    [schoolId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let next: Entity;
      switch (tab) {
        case "levels":
          next = { kind: "levels", data: await getLevel(id, schoolId) };
          break;
        case "classes":
          next = { kind: "classes", data: await getSchoolClass(id, schoolId) };
          break;
        case "subjects":
          next = { kind: "subjects", data: await getSubject(id, schoolId) };
          break;
        case "groups":
          next = { kind: "groups", data: await getSubjectGroup(id, schoolId) };
          break;
        case "rooms":
          next = { kind: "rooms", data: await getRoom(id, schoolId) };
          break;
      }
      setEntity(next);
      hydrateForm(next);
      void loadRelated(next);
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("loadError"));
      setEntity(null);
    } finally {
      setLoading(false);
    }
  }, [hydrateForm, id, loadRelated, schoolId, t, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setBackHref(listHref);
    setCrumbs([
      { label: tNav("academic"), href: academicListPath(workspaceHome) },
      { label: t(`tabs.${tab}`), href: listHref },
      { label: titleLabel },
    ]);
    return () => clearOverride();
  }, [
    clearOverride,
    listHref,
    setBackHref,
    setCrumbs,
    t,
    tNav,
    tab,
    titleLabel,
    workspaceHome,
  ]);

  const active = entity?.data.active ?? false;

  const subjectById = useMemo(() => {
    const map = new Map<string, SubjectResponse>();
    for (const s of relatedSubjects) map.set(s.id, s);
    return map;
  }, [relatedSubjects]);

  const groupById = useMemo(() => {
    const map = new Map<string, SubjectGroupResponse>();
    for (const g of relatedGroups) map.set(g.id, g);
    return map;
  }, [relatedGroups]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!entity) return;
    setSaving(true);
    setFormError(null);
    try {
      let next: Entity;
      switch (entity.kind) {
        case "levels":
          next = {
            kind: "levels",
            data: await updateLevel(
              entity.data.id,
              {
                name: { fr: nameFr.trim(), en: nameEn.trim() || nameFr.trim() },
                cycle,
                section,
                order: Math.max(1, Number.parseInt(order, 10) || 1),
                nextLevelCode: nextLevelCode.trim() || null,
              },
              schoolId,
            ),
          };
          break;
        case "classes":
          next = {
            kind: "classes",
            data: await updateSchoolClass(
              entity.data.id,
              {
                name: plainName.trim(),
                trackCode: trackCode.trim() || null,
                capacity: capacity.trim() ? Number.parseInt(capacity, 10) : null,
                defaultLanguage,
                availableLanguages: entity.data.availableLanguages?.length
                  ? entity.data.availableLanguages
                  : ["FR", "EN"],
                homeRoomId: entity.data.homeRoomId,
                mainTeacherId: entity.data.mainTeacherId,
                gradingSchemeId: entity.data.gradingSchemeId,
              },
              schoolId,
            ),
          };
          break;
        case "subjects":
          next = {
            kind: "subjects",
            data: await updateSubject(
              entity.data.id,
              {
                name: { fr: nameFr.trim(), en: nameEn.trim() || nameFr.trim() },
                kind: subjectKind,
                shortName:
                  shortFr.trim() || shortEn.trim()
                    ? {
                        fr: shortFr.trim() || shortEn.trim(),
                        en: shortEn.trim() || shortFr.trim(),
                      }
                    : null,
                teachingLanguage: teachingLanguage || null,
                timetableAlias: timetableAlias.trim() || null,
              },
              schoolId,
            ),
          };
          break;
        case "groups":
          next = {
            kind: "groups",
            data: await updateSubjectGroup(
              entity.data.id,
              {
                name: { fr: nameFr.trim(), en: nameEn.trim() || nameFr.trim() },
                displayOrder: Number.parseInt(displayOrder, 10) || 0,
              },
              schoolId,
            ),
          };
          break;
        case "rooms":
          next = {
            kind: "rooms",
            data: await updateRoom(
              entity.data.id,
              {
                name: plainName.trim(),
                type: roomType,
                capacity: capacity.trim() ? Number.parseInt(capacity, 10) : null,
              },
              schoolId,
            ),
          };
          break;
      }
      setEntity(next);
      hydrateForm(next);
      setEditing(false);
      notify.success(t("updated"));
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) setFormError(error.message);
      else setFormError(t("updateError"));
    } finally {
      setSaving(false);
    }
  }

  async function onToggleActive() {
    if (!entity) return;
    try {
      let next: Entity;
      const deactivate = entity.data.active;
      switch (entity.kind) {
        case "levels":
          next = {
            kind: "levels",
            data: await (deactivate ? deactivateLevel : reactivateLevel)(
              entity.data.id,
              schoolId,
            ),
          };
          break;
        case "classes":
          next = {
            kind: "classes",
            data: await (deactivate ? deactivateSchoolClass : reactivateSchoolClass)(
              entity.data.id,
              schoolId,
            ),
          };
          break;
        case "subjects":
          next = {
            kind: "subjects",
            data: await (deactivate ? deactivateSubject : reactivateSubject)(
              entity.data.id,
              schoolId,
            ),
          };
          break;
        case "groups":
          next = {
            kind: "groups",
            data: await (deactivate ? deactivateSubjectGroup : reactivateSubjectGroup)(
              entity.data.id,
              schoolId,
            ),
          };
          break;
        case "rooms":
          next = {
            kind: "rooms",
            data: await (deactivate ? deactivateRoom : reactivateRoom)(
              entity.data.id,
              schoolId,
            ),
          };
          break;
      }
      setEntity(next);
      notify.success(deactivate ? t("deactivated") : t("reactivated"));
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("actionError"));
    } finally {
      setConfirmOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 slide-up">
        <div className="mx-auto flex w-full max-w-[560px] flex-col items-center">
          <Skeleton className="size-20 rounded-full" />
          <Skeleton className="mt-4 h-32 w-full rounded-[var(--radius-md)]" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-[var(--radius-md)]" />
          <Skeleton className="h-48 w-full rounded-[var(--radius-md)]" />
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4 slide-up">
        <h1 className="text-[22px] font-semibold text-[var(--ios-label)]">
          {t("detailNotFoundTitle")}
        </h1>
        <p className="text-[13px] text-[var(--ios-secondary-label)]">
          {t("detailNotFoundDescription")}
        </p>
        <Button type="button" variant="secondary" onClick={() => router.push(listHref)}>
          {t("backToList")}
        </Button>
      </div>
    );
  }

  const avatarLabel =
    entity.kind === "classes" || entity.kind === "rooms"
      ? codeInitials(entity.data.name)
      : codeInitials("code" in entity.data ? entity.data.code : entity.data.id);

  return (
    <div className="space-y-6 slide-up">
      <section className="mx-auto flex w-full max-w-[560px] flex-col items-center text-center">
        <div
          className={cn(
            "relative flex size-20 items-center justify-center rounded-full text-[18px] font-semibold tracking-[-0.02em]",
            active
              ? "bg-[var(--ios-info-soft)] text-[var(--ios-blue)] ring-1 ring-[color-mix(in_srgb,var(--ios-blue)_18%,transparent)]"
              : "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]",
          )}
          aria-hidden
        >
          <span className="absolute inset-0 flex items-center justify-center opacity-[0.18]">
            {heroIcon}
          </span>
          <span className="relative">{avatarLabel}</span>
        </div>

        <div className="mt-4 w-full overflow-hidden rounded-[var(--radius-md)] bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
          <div className="px-5 pb-3 pt-5">
            <h1 className="text-[var(--text-title2)] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
              {titleLabel}
            </h1>
            <p className="mt-1.5 truncate font-mono text-[var(--text-footnote)] text-[var(--ios-secondary-label)]">
              {subtitle}
            </p>
          </div>
          <div className="mx-5 border-t border-[var(--ios-separator)]" />
          <div className="flex flex-wrap items-center justify-center gap-2 px-5 py-3.5">
            <Badge tone={active ? "success" : "neutral"} className="gap-1.5 pl-1.5">
              <span className="size-1.5 shrink-0 rounded-full bg-current opacity-90" aria-hidden />
              {active ? t("statusActive") : t("inactive")}
            </Badge>
            <Badge tone="blue" className="gap-1.5 pl-1.5">
              <LayoutGrid className="size-3 stroke-[2]" aria-hidden />
              {t(`tabs.${tab}`)}
            </Badge>
            {entity.kind === "subjects" ? (
              <Badge tone="neutral">
                {t(`subjectKind.${entity.data.kind}`)}
              </Badge>
            ) : null}
            {entity.kind === "subjects" && entity.data.teachingLanguage ? (
              <Badge tone="neutral">{entity.data.teachingLanguage}</Badge>
            ) : null}
            {entity.kind === "levels" ? (
              <Badge tone="neutral">
                {t.has(`sections.${entity.data.section}`)
                  ? t(`sections.${entity.data.section}` as "sections.FRANCOPHONE")
                  : entity.data.section}
              </Badge>
            ) : null}
            {entity.kind === "classes" ? (
              <Badge tone="neutral">{entity.data.defaultLanguage}</Badge>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex w-full flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leadingIcon={<Pencil className="size-3.5" aria-hidden />}
            onClick={() => {
              hydrateForm(entity);
              setEditing((v) => !v);
              setFormError(null);
            }}
          >
            {editing ? tCommon("cancel") : t("actionEdit")}
          </Button>
          <Button
            type="button"
            variant={active ? "secondary" : "primary"}
            size="sm"
            leadingIcon={
              active ? (
                <PowerOff className="size-3.5" aria-hidden />
              ) : (
                <Power className="size-3.5" aria-hidden />
              )
            }
            onClick={() => setConfirmOpen(true)}
          >
            {active ? t("actionDeactivate") : t("actionReactivate")}
          </Button>
        </div>
      </section>

      {editing ? (
        <form
          onSubmit={(e) => void onSave(e)}
          className="mx-auto w-full max-w-3xl overflow-hidden rounded-[var(--radius-md)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]"
        >
          <div className="space-y-4 px-5 py-5 sm:px-6">
            {entity.kind === "levels" || entity.kind === "subjects" || entity.kind === "groups" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="det-fr" label={t("fields.nameFr")}>
                  <Input id="det-fr" value={nameFr} onChange={(e) => setNameFr(e.target.value)} />
                </Field>
                <Field id="det-en" label={t("fields.nameEn")}>
                  <Input id="det-en" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
                </Field>
              </div>
            ) : (
              <Field
                id="det-name"
                label={entity.kind === "rooms" ? t("fields.roomName") : t("fields.className")}
              >
                <Input
                  id="det-name"
                  value={plainName}
                  onChange={(e) => setPlainName(e.target.value)}
                />
              </Field>
            )}

            {entity.kind === "levels" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="det-cycle" label={t("fields.cycle")}>
                    <Select
                      id="det-cycle"
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
                  <Field id="det-section" label={t("fields.section")}>
                    <Select
                      id="det-section"
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
                  <Field id="det-order" label={t("fields.order")}>
                    <Input
                      id="det-order"
                      type="number"
                      min={1}
                      value={order}
                      onChange={(e) => setOrder(e.target.value)}
                    />
                  </Field>
                  <Field id="det-next" label={t("fields.nextLevelCode")}>
                    <Input
                      id="det-next"
                      value={nextLevelCode}
                      onChange={(e) => setNextLevelCode(e.target.value)}
                    />
                  </Field>
                </div>
              </>
            ) : null}

            {entity.kind === "classes" ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field id="det-track" label={t("fields.trackCode")}>
                  <Input
                    id="det-track"
                    value={trackCode}
                    onChange={(e) => setTrackCode(e.target.value)}
                  />
                </Field>
                <Field id="det-cap" label={t("fields.capacity")}>
                  <Input
                    id="det-cap"
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                  />
                </Field>
                <Field id="det-lang" label={t("fields.defaultLanguage")}>
                  <Select
                    id="det-lang"
                    value={defaultLanguage}
                    onChange={(e) => setDefaultLanguage(e.target.value as "FR" | "EN")}
                  >
                    <option value="FR">FR</option>
                    <option value="EN">EN</option>
                  </Select>
                </Field>
              </div>
            ) : null}

            {entity.kind === "subjects" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="det-short-fr" label={t("fields.shortFr")}>
                    <Input
                      id="det-short-fr"
                      value={shortFr}
                      onChange={(e) => setShortFr(e.target.value)}
                    />
                  </Field>
                  <Field id="det-short-en" label={t("fields.shortEn")}>
                    <Input
                      id="det-short-en"
                      value={shortEn}
                      onChange={(e) => setShortEn(e.target.value)}
                    />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field id="det-kind" label={t("fields.kind")}>
                    <Select
                      id="det-kind"
                      value={subjectKind}
                      onChange={(e) =>
                        setSubjectKind(e.target.value as "ACADEMIC" | "ACTIVITY")
                      }
                    >
                      <option value="ACADEMIC">{t("subjectKind.ACADEMIC")}</option>
                      <option value="ACTIVITY">{t("subjectKind.ACTIVITY")}</option>
                    </Select>
                  </Field>
                  <Field id="det-teach-lang" label={t("fields.teachingLanguage")}>
                    <Select
                      id="det-teach-lang"
                      value={teachingLanguage}
                      onChange={(e) =>
                        setTeachingLanguage(e.target.value as "" | "FR" | "EN")
                      }
                    >
                      <option value="">{t("fields.teachingLanguageAny")}</option>
                      <option value="FR">FR</option>
                      <option value="EN">EN</option>
                    </Select>
                  </Field>
                  <Field id="det-alias" label={t("fields.timetableAlias")}>
                    <Input
                      id="det-alias"
                      value={timetableAlias}
                      onChange={(e) => setTimetableAlias(e.target.value)}
                    />
                  </Field>
                </div>
              </>
            ) : null}

            {entity.kind === "groups" ? (
              <Field id="det-dorder" label={t("fields.displayOrder")}>
                <Input
                  id="det-dorder"
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                />
              </Field>
            ) : null}

            {entity.kind === "rooms" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="det-rtype" label={t("fields.roomType")}>
                  <Select
                    id="det-rtype"
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
                <Field id="det-rcap" label={t("fields.capacity")}>
                  <Input
                    id="det-rcap"
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                  />
                </Field>
              </div>
            ) : null}

            {formError ? (
              <p className="text-[12px] text-[var(--ios-danger)]" role="alert">
                {formError}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 border-t border-[var(--ios-separator)]/55 px-5 py-4 sm:px-6">
            <Button type="submit" disabled={saving}>
              {saving ? tCommon("loading") : tCommon("save")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          {entity.kind === "subjects" ? (
            <>
              <GroupedList header={t("detail.identitySection")} footer={t("detail.subjectIdentityHint")}>
                <GroupedListItem>
                  <DetailRow
                    label={t("columns.code")}
                    value={entity.data.code}
                    icon={<Hash className="size-4 stroke-[1.75]" />}
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.nameFr")}
                    value={entity.data.name.fr || "—"}
                    icon={<Languages className="size-4 stroke-[1.75]" />}
                    stacked
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.nameEn")}
                    value={entity.data.name.en || "—"}
                    icon={<Languages className="size-4 stroke-[1.75]" />}
                    stacked
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.shortFr")}
                    value={entity.data.shortName?.fr || "—"}
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.shortEn")}
                    value={entity.data.shortName?.en || "—"}
                  />
                </GroupedListItem>
              </GroupedList>

              <GroupedList header={t("detail.teachingSection")} footer={t("detail.subjectTeachingHint")}>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.kind")}
                    value={t(`subjectKind.${entity.data.kind}`)}
                    icon={<BookOpen className="size-4 stroke-[1.75]" />}
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.teachingLanguage")}
                    value={entity.data.teachingLanguage ?? t("fields.teachingLanguageAny")}
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.timetableAlias")}
                    value={dash(entity.data.timetableAlias)}
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow label={t("columns.status")} value={active ? t("statusActive") : t("inactive")} />
                </GroupedListItem>
              </GroupedList>
            </>
          ) : null}

          {entity.kind === "levels" ? (
            <>
              <GroupedList header={t("detail.identitySection")}>
                <GroupedListItem>
                  <DetailRow
                    label={t("columns.code")}
                    value={entity.data.code}
                    icon={<Hash className="size-4 stroke-[1.75]" />}
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow label={t("fields.nameFr")} value={entity.data.name.fr || "—"} stacked />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow label={t("fields.nameEn")} value={entity.data.name.en || "—"} stacked />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.section")}
                    value={
                      t.has(`sections.${entity.data.section}`)
                        ? t(`sections.${entity.data.section}` as "sections.FRANCOPHONE")
                        : entity.data.section
                    }
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.cycle")}
                    value={
                      t.has(`cycles.${entity.data.cycle}`)
                        ? t(`cycles.${entity.data.cycle}` as "cycles.PRIMAIRE")
                        : entity.data.cycle
                    }
                  />
                </GroupedListItem>
              </GroupedList>

              <GroupedList header={t("detail.progressionSection")} footer={t("detail.levelProgressionHint")}>
                <GroupedListItem>
                  <DetailRow label={t("fields.order")} value={String(entity.data.order)} />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.equivalenceIndex")}
                    value={dash(entity.data.equivalenceIndex)}
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.nextLevelCode")}
                    value={dash(entity.data.nextLevelCode)}
                    icon={<Layers3 className="size-4 stroke-[1.75]" />}
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.defaultGradingScheme")}
                    value={dash(entity.data.defaultGradingSchemeId)}
                    stacked
                  />
                </GroupedListItem>
              </GroupedList>

              <GroupedList
                header={t("detail.classesSection")}
                footer={yearLabel ? t("detail.classesOfYear", { year: yearLabel }) : t("detail.classesHint")}
                className="lg:col-span-2"
              >
                {relatedLoading ? (
                  <GroupedListItem className="block py-3">
                    <Skeleton className="h-3 w-2/3" />
                  </GroupedListItem>
                ) : relatedClasses.length === 0 ? (
                  <GroupedListItem className="block py-3">
                    <p className="text-[var(--text-subhead)] text-[var(--ios-secondary-label)]">
                      {t("detail.classesEmpty")}
                    </p>
                  </GroupedListItem>
                ) : (
                  relatedClasses.map((clazz) => (
                    <GroupedListItem key={clazz.id}>
                      <Link
                        href={academicDetailPath(workspaceHome, "classes", clazz.name, clazz.id)}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <DetailRow
                          label={clazz.name}
                          value={[
                            clazz.trackCode,
                            clazz.defaultLanguage,
                            clazz.capacity != null ? `${clazz.capacity}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                          icon={<School className="size-4 stroke-[1.75]" />}
                        />
                      </Link>
                    </GroupedListItem>
                  ))
                )}
              </GroupedList>
            </>
          ) : null}

          {entity.kind === "classes" ? (
            <>
              <GroupedList header={t("detail.identitySection")}>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.className")}
                    value={entity.data.name}
                    icon={<School className="size-4 stroke-[1.75]" />}
                    stacked
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow label={t("columns.level")} value={entity.data.levelCode} />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.section")}
                    value={
                      t.has(`sections.${entity.data.section}`)
                        ? t(`sections.${entity.data.section}` as "sections.FRANCOPHONE")
                        : entity.data.section
                    }
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.cycle")}
                    value={
                      t.has(`cycles.${entity.data.cycle}`)
                        ? t(`cycles.${entity.data.cycle}` as "cycles.PRIMAIRE")
                        : entity.data.cycle
                    }
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow label={t("fields.trackCode")} value={dash(entity.data.trackCode)} />
                </GroupedListItem>
              </GroupedList>

              <GroupedList header={t("detail.organisationSection")} footer={t("detail.classOrgHint")}>
                <GroupedListItem>
                  <DetailRow label={t("fields.year")} value={dash(yearLabel)} />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.defaultLanguage")}
                    value={entity.data.defaultLanguage}
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.availableLanguages")}
                    value={
                      entity.data.availableLanguages?.length
                        ? entity.data.availableLanguages.join(" · ")
                        : "—"
                    }
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.capacity")}
                    value={dash(entity.data.capacity)}
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.homeRoom")}
                    value={homeRoom?.name ?? dash(entity.data.homeRoomId)}
                    icon={<DoorOpen className="size-4 stroke-[1.75]" />}
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.mainTeacher")}
                    value={dash(entity.data.mainTeacherId)}
                    stacked
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.gradingScheme")}
                    value={dash(entity.data.gradingSchemeId)}
                    stacked
                  />
                </GroupedListItem>
              </GroupedList>

              <GroupedList
                header={t("detail.subjectsSection")}
                footer={t("detail.classSubjectsHint")}
                className="lg:col-span-2"
              >
                {relatedLoading ? (
                  <GroupedListItem className="block py-3">
                    <Skeleton className="h-3 w-2/3" />
                  </GroupedListItem>
                ) : classSubjects.length === 0 ? (
                  <GroupedListItem className="block py-3">
                    <p className="text-[var(--text-subhead)] text-[var(--ios-secondary-label)]">
                      {t("detail.subjectsEmpty")}
                    </p>
                  </GroupedListItem>
                ) : (
                  [...classSubjects]
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((row) => {
                      const subject = subjectById.get(row.subjectId);
                      const group = groupById.get(row.groupId);
                      const name = subject
                        ? localizedLabel(subject.name, locale)
                        : row.subjectId;
                      const meta = [
                        subject?.code,
                        group ? localizedLabel(group.name, locale) : null,
                        `×${row.coefficient}`,
                        row.weeklyHours != null ? `${row.weeklyHours}h` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <GroupedListItem key={row.id}>
                          {subject ? (
                            <Link
                              href={academicDetailPath(
                                workspaceHome,
                                "subjects",
                                localizedLabel(subject.name, "fr"),
                                subject.id,
                              )}
                              className="flex min-w-0 flex-1"
                            >
                              <DetailRow
                                label={name}
                                value={meta}
                                icon={<BookOpen className="size-4 stroke-[1.75]" />}
                                stacked
                              />
                            </Link>
                          ) : (
                            <DetailRow
                              label={name}
                              value={meta}
                              icon={<BookOpen className="size-4 stroke-[1.75]" />}
                              stacked
                            />
                          )}
                        </GroupedListItem>
                      );
                    })
                )}
              </GroupedList>
            </>
          ) : null}

          {entity.kind === "groups" ? (
            <>
              <GroupedList header={t("detail.identitySection")} footer={t("detail.groupIdentityHint")}>
                <GroupedListItem>
                  <DetailRow
                    label={t("columns.code")}
                    value={entity.data.code}
                    icon={<Hash className="size-4 stroke-[1.75]" />}
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow label={t("fields.nameFr")} value={entity.data.name.fr || "—"} stacked />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow label={t("fields.nameEn")} value={entity.data.name.en || "—"} stacked />
                </GroupedListItem>
              </GroupedList>
              <GroupedList header={t("detail.bulletinSection")} footer={t("detail.groupBulletinHint")}>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.displayOrder")}
                    value={String(entity.data.displayOrder)}
                    icon={<Shapes className="size-4 stroke-[1.75]" />}
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("columns.status")}
                    value={active ? t("statusActive") : t("inactive")}
                  />
                </GroupedListItem>
              </GroupedList>
            </>
          ) : null}

          {entity.kind === "rooms" ? (
            <>
              <GroupedList header={t("detail.identitySection")}>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.roomName")}
                    value={entity.data.name}
                    icon={<DoorOpen className="size-4 stroke-[1.75]" />}
                    stacked
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("fields.roomType")}
                    value={
                      t.has(`roomTypes.${entity.data.type}`)
                        ? t(`roomTypes.${entity.data.type}` as "roomTypes.CLASSROOM")
                        : entity.data.type
                    }
                  />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow label={t("fields.capacity")} value={dash(entity.data.capacity)} />
                </GroupedListItem>
                <GroupedListItem>
                  <DetailRow
                    label={t("columns.status")}
                    value={active ? t("statusActive") : t("inactive")}
                  />
                </GroupedListItem>
              </GroupedList>

              <GroupedList
                header={t("detail.homeClassesSection")}
                footer={t("detail.homeClassesHint")}
              >
                {relatedLoading ? (
                  <GroupedListItem className="block py-3">
                    <Skeleton className="h-3 w-2/3" />
                  </GroupedListItem>
                ) : relatedClasses.length === 0 ? (
                  <GroupedListItem className="block py-3">
                    <p className="text-[var(--text-subhead)] text-[var(--ios-secondary-label)]">
                      {t("detail.homeClassesEmpty")}
                    </p>
                  </GroupedListItem>
                ) : (
                  relatedClasses.map((clazz) => (
                    <GroupedListItem key={clazz.id}>
                      <Link
                        href={academicDetailPath(workspaceHome, "classes", clazz.name, clazz.id)}
                        className="flex min-w-0 flex-1"
                      >
                        <DetailRow
                          label={clazz.name}
                          value={clazz.levelCode}
                          icon={<School className="size-4 stroke-[1.75]" />}
                        />
                      </Link>
                    </GroupedListItem>
                  ))
                )}
              </GroupedList>
            </>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={active ? t("deactivateConfirmTitle") : t("reactivateConfirmTitle")}
        description={
          active
            ? t("deactivateConfirmDescription", { name: titleLabel })
            : t("reactivateConfirmDescription", { name: titleLabel })
        }
        confirmLabel={active ? t("actionDeactivate") : t("actionReactivate")}
        cancelLabel={tCommon("cancel")}
        tone={active ? "destructive" : "default"}
        onConfirm={() => void onToggleActive()}
      />
    </div>
  );
}
