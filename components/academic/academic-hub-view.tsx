"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BookOpen,
  DoorOpen,
  Layers3,
  LayoutGrid,
  Plus,
  School,
  Search,
  Shapes,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconInput } from "@/components/ui/icon-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/navigation";
import {
  academicCreatePath,
  academicListPath,
  ACADEMIC_TABS,
  parseAcademicTab,
  type AcademicTab,
} from "@/lib/academic/tabs";
import {
  listAcademicYears,
  listClasses,
  listLevels,
  listRooms,
  listSubjectGroups,
  listSubjects,
  localizedLabel,
  type AcademicYearResponse,
  type LevelResponse,
  type RoomResponse,
  type SchoolClassResponse,
  type SubjectGroupResponse,
  type SubjectResponse,
} from "@/lib/api/academic";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError, isAuthFailure } from "@/types/api";
import { primaryRole } from "@/types/auth";

type StatTone = "blue" | "green" | "amber" | "slate";

type StatCardProps = {
  label: string;
  value: number;
  icon: ReactNode;
  tone: StatTone;
  loading?: boolean;
  active?: boolean;
  onSelect?: () => void;
};

const toneStyles: Record<StatTone, { icon: string; value: string; ring: string }> = {
  blue: {
    icon: "bg-[var(--ios-info-soft)] text-[var(--ios-blue)]",
    value: "text-[var(--ios-blue)]",
    ring: "ring-[color-mix(in_srgb,var(--ios-blue)_35%,transparent)]",
  },
  green: {
    icon: "bg-[var(--ios-success-soft)] text-[var(--ios-success)]",
    value: "text-[var(--ios-success)]",
    ring: "ring-[color-mix(in_srgb,var(--ios-success)_35%,transparent)]",
  },
  amber: {
    icon: "bg-[var(--ios-warning-soft)] text-[var(--ios-warning)]",
    value: "text-[var(--ios-warning)]",
    ring: "ring-[color-mix(in_srgb,var(--ios-warning)_35%,transparent)]",
  },
  slate: {
    icon: "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]",
    value: "text-[var(--ios-label)]",
    ring: "ring-[color-mix(in_srgb,var(--ios-fill-tertiary)_55%,transparent)]",
  },
};

function StatCard({
  label,
  value,
  icon,
  tone,
  loading,
  active = false,
  onSelect,
}: StatCardProps) {
  const styles = toneStyles[tone];
  const interactive = Boolean(onSelect);

  return (
    <button
      type="button"
      disabled={!interactive || loading}
      aria-pressed={interactive ? active : undefined}
      onClick={onSelect}
      className={cn(
        "group relative w-full overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--ios-card)] text-left shadow-[var(--ios-shadow)] transition-[box-shadow,border-color,transform] duration-[var(--duration-fast)]",
        active
          ? cn("border-transparent ring-2", styles.ring)
          : "border-[var(--ios-separator)]/55",
        interactive &&
          !loading &&
          "pressable hover:border-[var(--ios-separator)] hover:shadow-[var(--ios-shadow-md)] focus-visible:shadow-[var(--focus-ring)]",
        (!interactive || loading) && "cursor-default",
      )}
    >
      <div className="flex items-center gap-3 px-3.5 py-3.5 sm:gap-3.5 sm:px-4 sm:py-4">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full sm:size-11",
            styles.icon,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)] sm:text-[11px]">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-14" />
          ) : (
            <p
              className={cn(
                "mt-1 text-[26px] font-semibold leading-none tracking-[-0.03em] tabular-nums sm:text-[28px]",
                active ? styles.value : "text-[var(--ios-label)]",
              )}
            >
              {value}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs, value]);
  return debounced;
}

function StatusPill({ active, activeLabel, inactiveLabel }: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        active
          ? "bg-[var(--ios-success-soft)] text-[var(--ios-success)]"
          : "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

export function AcademicHubView() {
  const t = useTranslations("academic");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const schoolId = useAuthStore((s) => s.user?.schoolId);
  const role = primaryRole(useAuthStore((s) => s.user));
  const workspaceHome = role ? getRoleHomePath(role) : "/administration";

  const tabFromUrl = parseAcademicTab(searchParams.get("tab")) ?? "levels";
  const [tab, setTab] = useState<AcademicTab>(tabFromUrl);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 280);

  const [year, setYear] = useState<AcademicYearResponse | null>(null);
  const [levels, setLevels] = useState<LevelResponse[]>([]);
  const [classes, setClasses] = useState<SchoolClassResponse[]>([]);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [groups, setGroups] = useState<SubjectGroupResponse[]>([]);
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTab(tabFromUrl);
  }, [tabFromUrl]);

  function selectTab(next: AcademicTab) {
    setTab(next);
    router.replace(academicListPath(workspaceHome, next));
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [yearsPage, levelsPage, subjectsPage, groupsPage, roomsPage] =
        await Promise.all([
          listAcademicYears({ page: 0, size: 20, schoolId }),
          listLevels({ page: 0, size: 100, schoolId }),
          listSubjects({ page: 0, size: 100, schoolId }),
          listSubjectGroups({ page: 0, size: 100, schoolId }),
          listRooms({ page: 0, size: 100, schoolId }),
        ]);

      const currentYear =
        yearsPage.content.find((y) => y.current) ??
        yearsPage.content.find((y) => y.status === "ACTIVE") ??
        yearsPage.content[0] ??
        null;
      setYear(currentYear);
      setLevels(levelsPage.content);
      setSubjects(subjectsPage.content);
      setGroups(groupsPage.content);
      setRooms(roomsPage.content);

      if (currentYear) {
        const classesPage = await listClasses({
          academicYearId: currentYear.id,
          page: 0,
          size: 100,
          schoolId,
        });
        setClasses(classesPage.content);
      } else {
        setClasses([]);
      }
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("loadError"));
      setYear(null);
      setLevels([]);
      setClasses([]);
      setSubjects([]);
      setGroups([]);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const q = debouncedQuery.trim().toLowerCase();

  const filteredLevels = useMemo(() => {
    if (!q) return levels;
    return levels.filter((item) => {
      const name = localizedLabel(item.name, locale).toLowerCase();
      return (
        item.code.toLowerCase().includes(q) ||
        name.includes(q) ||
        item.cycle.toLowerCase().includes(q) ||
        item.section.toLowerCase().includes(q)
      );
    });
  }, [levels, locale, q]);

  const filteredClasses = useMemo(() => {
    if (!q) return classes;
    return classes.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.levelCode.toLowerCase().includes(q) ||
        (item.trackCode?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [classes, q]);

  const filteredSubjects = useMemo(() => {
    if (!q) return subjects;
    return subjects.filter((item) => {
      const name = localizedLabel(item.name, locale).toLowerCase();
      return item.code.toLowerCase().includes(q) || name.includes(q);
    });
  }, [locale, q, subjects]);

  const filteredGroups = useMemo(() => {
    if (!q) return groups;
    return groups.filter((item) => {
      const name = localizedLabel(item.name, locale).toLowerCase();
      return item.code.toLowerCase().includes(q) || name.includes(q);
    });
  }, [groups, locale, q]);

  const filteredRooms = useMemo(() => {
    if (!q) return rooms;
    return rooms.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
      );
    });
  }, [q, rooms]);

  const stats = useMemo(
    () => ({
      levels: levels.filter((x) => x.active).length,
      classes: classes.filter((x) => x.active).length,
      subjects: subjects.filter((x) => x.active).length,
      groups: groups.filter((x) => x.active).length,
    }),
    [classes, groups, levels, subjects],
  );

  const activeCount = (() => {
    switch (tab) {
      case "levels":
        return filteredLevels.length;
      case "classes":
        return filteredClasses.length;
      case "subjects":
        return filteredSubjects.length;
      case "groups":
        return filteredGroups.length;
      case "rooms":
        return filteredRooms.length;
    }
  })();

  function openCreate() {
    router.push(academicCreatePath(workspaceHome, tab));
  }

  return (
    <div className="space-y-5 slide-up">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] px-4 py-3 shadow-[var(--ios-shadow)]">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)]">
            {t("yearLabel")}
          </p>
          {loading ? (
            <Skeleton className="mt-1.5 h-5 w-40" />
          ) : year ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="truncate text-[15px] font-semibold tracking-[-0.015em] text-[var(--ios-label)]">
                {year.label}
              </p>
              <Badge tone={year.status === "ACTIVE" ? "success" : "neutral"}>
                {t.has(`yearStatus.${year.status}`)
                  ? t(`yearStatus.${year.status}`)
                  : year.status}
              </Badge>
            </div>
          ) : (
            <p className="mt-1 text-[13px] text-[var(--ios-secondary-label)]">
              {t("yearEmpty")}
            </p>
          )}
        </div>
        <p className="max-w-[280px] text-right text-[11px] leading-relaxed text-[var(--ios-secondary-label)]">
          {t("yearHint")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatCard
          label={t("stats.levels")}
          value={stats.levels}
          loading={loading}
          tone="blue"
          active={tab === "levels"}
          onSelect={() => selectTab("levels")}
          icon={<Layers3 className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
        <StatCard
          label={t("stats.classes")}
          value={stats.classes}
          loading={loading}
          tone="green"
          active={tab === "classes"}
          onSelect={() => selectTab("classes")}
          icon={<School className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
        <StatCard
          label={t("stats.subjects")}
          value={stats.subjects}
          loading={loading}
          tone="amber"
          active={tab === "subjects"}
          onSelect={() => selectTab("subjects")}
          icon={<BookOpen className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
        <StatCard
          label={t("stats.groups")}
          value={stats.groups}
          loading={loading}
          tone="slate"
          active={tab === "groups"}
          onSelect={() => selectTab("groups")}
          icon={<Shapes className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <nav
          aria-label={t("tabsNav")}
          className="flex min-w-0 items-stretch gap-0 overflow-x-auto border-b border-[var(--ios-separator)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {ACADEMIC_TABS.map((key) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => selectTab(key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative shrink-0 px-3 py-2.5 text-[12px] font-medium tracking-[-0.01em] transition-colors duration-[var(--duration-fast)] focus-visible:shadow-[var(--focus-ring)] sm:px-3.5",
                  active
                    ? "text-[var(--ios-label)]"
                    : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]",
                )}
              >
                {t(`tabs.${key}`)}
                {active ? (
                  <span
                    className="absolute inset-x-2 bottom-[-1px] h-[2px] rounded-full bg-[var(--ios-blue)]"
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="min-w-0 flex-1 lg:w-[220px] lg:flex-none">
            <IconInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(`search.${tab}`)}
              icon={<Search className="size-4 stroke-[1.75]" />}
              aria-label={tCommon("search")}
            />
          </div>
          <Button
            type="button"
            className="shrink-0"
            leadingIcon={<Plus className="size-4 stroke-[1.75]" aria-hidden />}
            onClick={openCreate}
          >
            {t(`add.${tab}`)}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/50 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-[var(--ios-separator)]/55 px-5 py-3.5 last:border-b-0"
            >
              <Skeleton className="size-9 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : activeCount === 0 ? (
        <EmptyState
          title={t(`empty.${tab}.title`)}
          description={t(`empty.${tab}.description`)}
          icon={
            tab === "rooms" ? (
              <DoorOpen className="size-9 stroke-[1.5]" aria-hidden />
            ) : tab === "classes" ? (
              <School className="size-9 stroke-[1.5]" aria-hidden />
            ) : tab === "groups" ? (
              <Shapes className="size-9 stroke-[1.5]" aria-hidden />
            ) : tab === "subjects" ? (
              <BookOpen className="size-9 stroke-[1.5]" aria-hidden />
            ) : (
              <LayoutGrid className="size-9 stroke-[1.5]" aria-hidden />
            )
          }
          action={
            <Button
              type="button"
              leadingIcon={<Plus className="size-4 stroke-[1.75]" aria-hidden />}
              onClick={openCreate}
            >
              {t(`add.${tab}`)}
            </Button>
          }
        />
      ) : (
        <>
          <ul className="space-y-2.5 md:hidden">
            {tab === "levels"
              ? filteredLevels.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-3.5 shadow-[var(--ios-shadow)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[var(--ios-label)]">
                          {localizedLabel(item.name, locale)}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                          {item.code}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge tone="neutral">{item.section}</Badge>
                          <Badge tone="blue">{item.cycle}</Badge>
                        </div>
                      </div>
                      <StatusPill
                        active={item.active}
                        activeLabel={t("statusActive")}
                        inactiveLabel={t("inactive")}
                      />
                    </div>
                  </li>
                ))
              : null}
            {tab === "classes"
              ? filteredClasses.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-3.5 shadow-[var(--ios-shadow)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[var(--ios-label)]">
                          {item.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--ios-secondary-label)]">
                          {item.levelCode}
                          {item.trackCode ? ` · ${item.trackCode}` : ""}
                        </p>
                      </div>
                      <StatusPill
                        active={item.active}
                        activeLabel={t("statusActive")}
                        inactiveLabel={t("inactive")}
                      />
                    </div>
                  </li>
                ))
              : null}
            {tab === "subjects"
              ? filteredSubjects.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-3.5 shadow-[var(--ios-shadow)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[var(--ios-label)]">
                          {localizedLabel(item.name, locale)}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                          {item.code}
                        </p>
                      </div>
                      <StatusPill
                        active={item.active}
                        activeLabel={t("statusActive")}
                        inactiveLabel={t("inactive")}
                      />
                    </div>
                  </li>
                ))
              : null}
            {tab === "groups"
              ? filteredGroups.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-3.5 shadow-[var(--ios-shadow)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[var(--ios-label)]">
                          {localizedLabel(item.name, locale)}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                          {item.code}
                        </p>
                      </div>
                      <StatusPill
                        active={item.active}
                        activeLabel={t("statusActive")}
                        inactiveLabel={t("inactive")}
                      />
                    </div>
                  </li>
                ))
              : null}
            {tab === "rooms"
              ? filteredRooms.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-3.5 shadow-[var(--ios-shadow)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[var(--ios-label)]">
                          {item.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--ios-secondary-label)]">
                          {item.type}
                          {item.capacity != null ? ` · ${item.capacity}` : ""}
                        </p>
                      </div>
                      <StatusPill
                        active={item.active}
                        activeLabel={t("statusActive")}
                        inactiveLabel={t("inactive")}
                      />
                    </div>
                  </li>
                ))
              : null}
          </ul>

          <div className="hidden overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/50 bg-[var(--ios-card)] shadow-[var(--ios-shadow)] md:block">
            <div className="overflow-x-auto">
              {tab === "levels" ? (
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
                      <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                        {t("columns.name")}
                      </th>
                      <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                        {t("columns.code")}
                      </th>
                      <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                        {t("columns.section")}
                      </th>
                      <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                        {t("columns.cycle")}
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                        {t("columns.status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLevels.map((item, index) => (
                      <tr
                        key={item.id}
                        className={cn(
                          "border-b border-[var(--ios-separator)]/55 last:border-b-0",
                          index % 2 === 1 &&
                            "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                          !item.active && "opacity-70",
                        )}
                      >
                        <td className="px-5 py-3.5 text-[13px] font-semibold text-[var(--ios-label)]">
                          {localizedLabel(item.name, locale)}
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="inline-flex rounded-[var(--radius-sm)] border border-[var(--ios-separator)]/70 px-2 py-1 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                            {item.code}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          <Badge tone="neutral">{item.section}</Badge>
                        </td>
                        <td className="px-3 py-3.5 text-[12px] text-[var(--ios-label)]">
                          {item.cycle}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusPill
                            active={item.active}
                            activeLabel={t("statusActive")}
                            inactiveLabel={t("inactive")}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {tab === "classes" ? (
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
                      <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                        {t("columns.class")}
                      </th>
                      <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                        {t("columns.level")}
                      </th>
                      <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                        {t("columns.language")}
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
                    {filteredClasses.map((item, index) => (
                      <tr
                        key={item.id}
                        className={cn(
                          "border-b border-[var(--ios-separator)]/55 last:border-b-0",
                          index % 2 === 1 &&
                            "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                          !item.active && "opacity-70",
                        )}
                      >
                        <td className="px-5 py-3.5">
                          <p className="text-[13px] font-semibold text-[var(--ios-label)]">
                            {item.name}
                          </p>
                          {item.trackCode ? (
                            <p className="mt-0.5 text-[11px] text-[var(--ios-secondary-label)]">
                              {item.trackCode}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="inline-flex rounded-[var(--radius-sm)] border border-[var(--ios-separator)]/70 px-2 py-1 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                            {item.levelCode}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          <Badge tone="blue">{item.defaultLanguage}</Badge>
                        </td>
                        <td className="px-3 py-3.5 text-[12px] tabular-nums text-[var(--ios-label)]">
                          {item.capacity ?? "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusPill
                            active={item.active}
                            activeLabel={t("statusActive")}
                            inactiveLabel={t("inactive")}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {tab === "subjects" ? (
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
                      <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                        {t("columns.name")}
                      </th>
                      <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                        {t("columns.code")}
                      </th>
                      <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                        {t("columns.kind")}
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                        {t("columns.status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubjects.map((item, index) => (
                      <tr
                        key={item.id}
                        className={cn(
                          "border-b border-[var(--ios-separator)]/55 last:border-b-0",
                          index % 2 === 1 &&
                            "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                          !item.active && "opacity-70",
                        )}
                      >
                        <td className="px-5 py-3.5 text-[13px] font-semibold text-[var(--ios-label)]">
                          {localizedLabel(item.name, locale)}
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="inline-flex rounded-[var(--radius-sm)] border border-[var(--ios-separator)]/70 px-2 py-1 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                            {item.code}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          <Badge tone={item.kind === "ACADEMIC" ? "blue" : "neutral"}>
                            {t.has(`subjectKind.${item.kind}`)
                              ? t(`subjectKind.${item.kind}`)
                              : item.kind}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusPill
                            active={item.active}
                            activeLabel={t("statusActive")}
                            inactiveLabel={t("inactive")}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {tab === "groups" ? (
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
                      <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                        {t("columns.name")}
                      </th>
                      <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                        {t("columns.code")}
                      </th>
                      <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                        {t("columns.order")}
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                        {t("columns.status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroups.map((item, index) => (
                      <tr
                        key={item.id}
                        className={cn(
                          "border-b border-[var(--ios-separator)]/55 last:border-b-0",
                          index % 2 === 1 &&
                            "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                          !item.active && "opacity-70",
                        )}
                      >
                        <td className="px-5 py-3.5 text-[13px] font-semibold text-[var(--ios-label)]">
                          {localizedLabel(item.name, locale)}
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="inline-flex rounded-[var(--radius-sm)] border border-[var(--ios-separator)]/70 px-2 py-1 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                            {item.code}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-[12px] tabular-nums text-[var(--ios-label)]">
                          {item.displayOrder}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusPill
                            active={item.active}
                            activeLabel={t("statusActive")}
                            inactiveLabel={t("inactive")}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {tab === "rooms" ? (
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
                          !item.active && "opacity-70",
                        )}
                      >
                        <td className="px-5 py-3.5 text-[13px] font-semibold text-[var(--ios-label)]">
                          {item.name}
                        </td>
                        <td className="px-3 py-3.5 text-[12px] text-[var(--ios-label)]">
                          {item.type}
                        </td>
                        <td className="px-3 py-3.5 text-[12px] tabular-nums text-[var(--ios-label)]">
                          {item.capacity ?? "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusPill
                            active={item.active}
                            activeLabel={t("statusActive")}
                            inactiveLabel={t("inactive")}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
            <div className="flex items-center justify-between border-t border-[var(--ios-separator)]/60 bg-[color-mix(in_srgb,var(--ios-fill)_28%,var(--ios-card))] px-5 py-2.5">
              <p className="text-[11px] text-[var(--ios-secondary-label)]">
                {t("tableCount", { count: activeCount })}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
