"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  Briefcase,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  Shield,
  UserRound,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { IconInput } from "@/components/ui/icon-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import {
  createStaff,
  deactivateStaff,
  listStaff,
  reactivateStaff,
  type StaffResponse,
} from "@/lib/api/staff";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import { formatInstant } from "@/lib/datetime/format";
import {
  matchesStaffTab,
  STAFF_LIST_TABS,
  type StaffListTab,
} from "@/lib/staff/functions";
import {
  parseStaffListTab,
  staffDetailPath,
  staffListPath,
  staffTypeSlug,
} from "@/lib/staff/routes";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError, isAuthFailure } from "@/types/api";
import { primaryRole } from "@/types/auth";

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs, value]);
  return debounced;
}

function matchesQuery(member: StaffResponse, q: string): boolean {
  if (!q) return true;
  const haystack = [
    member.fullName,
    member.lastName,
    member.firstName,
    member.staffNumber,
    member.contact.email,
    ...member.contact.phones,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q.toLowerCase());
}

function staffInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function StaffAvatar({
  name,
  active,
  size = "md",
}: {
  name: string;
  active: boolean;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "size-9 text-[11px]" : "size-10 text-[12px]";
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold tracking-[-0.02em]",
        dim,
        active
          ? "bg-[var(--ios-info-soft)] text-[var(--ios-blue)] ring-1 ring-[color-mix(in_srgb,var(--ios-blue)_16%,transparent)]"
          : "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]",
      )}
      aria-hidden
    >
      {staffInitials(name)}
    </span>
  );
}

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

const toneStyles: Record<
  StatTone,
  { accent: string; icon: string; value: string; ring: string }
> = {
  blue: {
    accent: "bg-[var(--ios-blue)]",
    icon: "bg-[var(--ios-info-soft)] text-[var(--ios-blue)]",
    value: "text-[var(--ios-blue)]",
    ring: "ring-[color-mix(in_srgb,var(--ios-blue)_35%,transparent)]",
  },
  green: {
    accent: "bg-[var(--ios-success)]",
    icon: "bg-[var(--ios-success-soft)] text-[var(--ios-success)]",
    value: "text-[var(--ios-success)]",
    ring: "ring-[color-mix(in_srgb,var(--ios-success)_35%,transparent)]",
  },
  amber: {
    accent: "bg-[var(--ios-warning)]",
    icon: "bg-[var(--ios-warning-soft)] text-[var(--ios-warning)]",
    value: "text-[var(--ios-warning)]",
    ring: "ring-[color-mix(in_srgb,var(--ios-warning)_35%,transparent)]",
  },
  slate: {
    accent: "bg-[var(--ios-secondary-label)]",
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
      <span
        className={cn(
          "absolute inset-x-0 top-0 h-[3px]",
          styles.accent,
          !active && "opacity-70",
        )}
        aria-hidden
      />
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

type PendingAction = {
  member: StaffResponse;
  kind: "deactivate" | "reactivate";
};

export function StaffListView(_props: { descriptionKey?: "adminStaff" | "directorStaff" } = {}) {
  const t = useTranslations("staff");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const schoolId = useAuthStore((s) => s.user?.schoolId);
  const role = primaryRole(useAuthStore((s) => s.user));
  const workspaceHome = role ? getRoleHomePath(role) : "/administration";

  const tabFromUrl = parseStaffListTab(searchParams.get("tab")) ?? "all";
  const [tab, setTab] = useState<StaffListTab>(tabFromUrl);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 280);

  useEffect(() => {
    setTab(tabFromUrl);
  }, [tabFromUrl]);

  function selectTab(next: StaffListTab) {
    setTab(next);
    router.replace(staffListPath(workspaceHome, next));
  }
  const [allItems, setAllItems] = useState<StaffResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [asTeacher, setAsTeacher] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await listStaff({
        page: 0,
        size: 100,
        active: null,
        schoolId,
      });
      setAllItems(page.content);
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("loadError"));
      setAllItems([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!menuId) return;
    function onDocClick() {
      setMenuId(null);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuId]);

  const stats = useMemo(() => {
    const activeMembers = allItems.filter((m) => m.active);
    let teachers = 0;
    let leadership = 0;
    let support = 0;
    for (const member of activeMembers) {
      if (matchesStaffTab(member.functions, "teachers")) teachers += 1;
      if (matchesStaffTab(member.functions, "leadership")) leadership += 1;
      if (matchesStaffTab(member.functions, "support")) support += 1;
    }
    return {
      total: activeMembers.length,
      teachers,
      leadership,
      support,
    };
  }, [allItems]);

  const items = useMemo(
    () =>
      allItems.filter(
        (member) =>
          matchesStaffTab(member.functions, tab) && matchesQuery(member, debouncedQuery.trim()),
      ),
    [allItems, debouncedQuery, tab],
  );

  function openDetail(member: StaffResponse) {
    router.push(staffDetailPath(workspaceHome, staffTypeSlug(member.functions), member.id));
  }

  function resetCreateForm() {
    setLastName("");
    setFirstName("");
    setEmail("");
    setPhone("");
    setAsTeacher(true);
    setFormError(null);
  }

  async function submitCreate() {
    if (!lastName.trim()) {
      setFormError(t("lastNameRequired"));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await createStaff({
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        contact: {
          email: email.trim() || null,
          phones: phone.trim() ? [phone.trim()] : [],
        },
        functions: asTeacher ? ["TEACHER"] : ["OTHER"],
        schoolId,
      });
      notify.success(t("created"));
      setCreateOpen(false);
      resetCreateForm();
      await load();
    } catch (error) {
      if (error instanceof ApiError) setFormError(error.message);
      else setFormError(t("createError"));
    } finally {
      setSaving(false);
    }
  }

  async function confirmPendingAction() {
    if (!pending) return;
    setActionBusy(true);
    try {
      if (pending.kind === "deactivate") {
        await deactivateStaff(pending.member.id, schoolId);
        notify.success(t("deactivated"));
      } else {
        await reactivateStaff(pending.member.id, schoolId);
        notify.success(t("reactivated"));
      }
      setPending(null);
      await load();
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("actionError"));
    } finally {
      setActionBusy(false);
    }
  }

  function stopRowNav(e: MouseEvent) {
    e.stopPropagation();
  }

  function lastLoginLabel(member: StaffResponse): string {
    return formatInstant(member.lastLoginAt, locale) ?? t("neverLoggedIn");
  }

  function ActionMenu({ member }: { member: StaffResponse }) {
    const open = menuId === member.id;
    return (
      <div className="relative" onClick={stopRowNav}>
        <button
          type="button"
          aria-label={t("actions")}
          aria-expanded={open}
          className="pressable inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ios-secondary-label)] hover:bg-[var(--ios-fill)] hover:text-[var(--ios-label)] focus-visible:shadow-[var(--focus-ring)]"
          onClick={(e) => {
            e.stopPropagation();
            setMenuId(open ? null : member.id);
          }}
        >
          <MoreHorizontal className="size-4 stroke-[1.75]" aria-hidden />
        </button>
        {open ? (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-[200px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--ios-separator)] bg-[var(--ios-card)] py-1 shadow-[var(--ios-shadow-lg)]"
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-[var(--ios-label)] hover:bg-[var(--ios-fill)]"
              onClick={() => {
                setMenuId(null);
                openDetail(member);
              }}
            >
              <Pencil className="size-3.5 stroke-[1.75]" aria-hidden />
              {t("actionEdit")}
            </button>
            {member.active ? (
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-[var(--ios-danger)] hover:bg-[var(--ios-danger-soft)]"
                onClick={() => {
                  setMenuId(null);
                  setPending({ member, kind: "deactivate" });
                }}
              >
                <PowerOff className="size-3.5 stroke-[1.75]" aria-hidden />
                {t("actionDeactivate")}
              </button>
            ) : (
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-[var(--ios-success)] hover:bg-[var(--ios-success-soft)]"
                onClick={() => {
                  setMenuId(null);
                  setPending({ member, kind: "reactivate" });
                }}
              >
                <Power className="size-3.5 stroke-[1.75]" aria-hidden />
                {t("actionReactivate")}
              </button>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5 slide-up">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatCard
          label={t("stats.total")}
          value={stats.total}
          loading={loading}
          tone="blue"
          active={tab === "all"}
          onSelect={() => selectTab("all")}
          icon={<Users className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
        <StatCard
          label={t("stats.teachers")}
          value={stats.teachers}
          loading={loading}
          tone="green"
          active={tab === "teachers"}
          onSelect={() => selectTab("teachers")}
          icon={<UserRound className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
        <StatCard
          label={t("stats.leadership")}
          value={stats.leadership}
          loading={loading}
          tone="amber"
          active={tab === "leadership"}
          onSelect={() => selectTab("leadership")}
          icon={<Shield className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
        <StatCard
          label={t("stats.support")}
          value={stats.support}
          loading={loading}
          tone="slate"
          active={tab === "support"}
          onSelect={() => selectTab("support")}
          icon={<Briefcase className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STAFF_LIST_TABS.map((key) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => selectTab(key)}
                className={cn(
                  "pressable shrink-0 rounded-[var(--radius-sm)] px-3 py-1.5 text-[11px] font-semibold transition-colors focus-visible:shadow-[var(--focus-ring)]",
                  active
                    ? "bg-[var(--ios-blue)] text-white"
                    : "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]",
                )}
              >
                {t(`tabs.${key}`)}
              </button>
            );
          })}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[320px] sm:flex-row">
          <div className="min-w-0 flex-1 sm:w-[220px] sm:flex-none">
            <IconInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              icon={<Search className="size-4 stroke-[1.75]" />}
              aria-label={tCommon("search")}
            />
          </div>
          <Button
            type="button"
            className="shrink-0"
            leadingIcon={<Plus className="size-4 stroke-[1.75]" aria-hidden />}
            onClick={() => {
              resetCreateForm();
              setCreateOpen(true);
            }}
          >
            {t("add")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/60 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-[var(--ios-separator)] px-4 py-3.5 last:border-b-0"
            >
              <Skeleton className="size-9 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          icon={<Users className="size-9 stroke-[1.5]" aria-hidden />}
          action={
            <Button
              type="button"
              leadingIcon={<Plus className="size-4 stroke-[1.75]" aria-hidden />}
              onClick={() => {
                resetCreateForm();
                setCreateOpen(true);
              }}
            >
              {t("add")}
            </Button>
          }
        />
      ) : (
        <>
          <ul className="space-y-2.5 md:hidden">
            {items.map((member) => (
              <li
                key={member.id}
                className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]"
              >
                <div className="flex items-start gap-3 p-3.5">
                  <button
                    type="button"
                    onClick={() => openDetail(member)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <StaffAvatar name={member.fullName} active={member.active} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
                          {member.fullName}
                        </p>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            member.active
                              ? "bg-[var(--ios-success-soft)] text-[var(--ios-success)]"
                              : "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]",
                          )}
                        >
                          <span className="size-1.5 rounded-full bg-current opacity-90" aria-hidden />
                          {member.active ? t("statusActive") : t("inactive")}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-[var(--ios-secondary-label)]">
                        {member.contact.email || t("noContact")}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-[var(--ios-secondary-label)]">
                        {member.staffNumber || "—"}
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {member.functions.map((fn) => (
                          <Badge key={fn} tone={fn === "TEACHER" ? "blue" : "neutral"}>
                            {t.has(`functions.${fn}`) ? t(`functions.${fn}`) : fn}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </button>
                  <ActionMenu member={member} />
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/50 bg-[var(--ios-card)] shadow-[var(--ios-shadow)] md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
                    <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                      {t("columns.name")}
                    </th>
                    <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                      {t("columns.number")}
                    </th>
                    <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                      {t("columns.lastLogin")}
                    </th>
                    <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                      {t("columns.functions")}
                    </th>
                    <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                      {t("columns.status")}
                    </th>
                    <th className="px-5 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                      {t("columns.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((member, index) => (
                    <tr
                      key={member.id}
                      tabIndex={0}
                      role="link"
                      onClick={() => openDetail(member)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openDetail(member);
                        }
                      }}
                      className={cn(
                        "group cursor-pointer border-b border-[var(--ios-separator)]/55 last:border-b-0 transition-colors duration-[var(--duration-fast)]",
                        index % 2 === 1 && "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                        "hover:bg-[color-mix(in_srgb,var(--ios-blue)_6%,var(--ios-card))]",
                        "focus-visible:bg-[color-mix(in_srgb,var(--ios-blue)_8%,var(--ios-card))] focus-visible:outline-none",
                        !member.active && "opacity-70",
                      )}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex min-w-[220px] items-center gap-3">
                          <StaffAvatar name={member.fullName} active={member.active} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold tracking-[-0.015em] text-[var(--ios-label)] group-hover:text-[var(--ios-blue)]">
                              {member.fullName}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-[var(--ios-secondary-label)]">
                              {member.contact.email || t("noContact")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="inline-flex rounded-[var(--radius-sm)] border border-[var(--ios-separator)]/70 bg-[var(--ios-card)] px-2 py-1 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                          {member.staffNumber || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={cn(
                            "whitespace-nowrap text-[12px]",
                            member.lastLoginAt
                              ? "text-[var(--ios-label)]"
                              : "text-[var(--ios-secondary-label)]",
                          )}
                        >
                          {lastLoginLabel(member)}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex min-w-[150px] flex-wrap gap-1.5">
                          {member.functions.map((fn) => (
                            <Badge key={fn} tone={fn === "TEACHER" ? "blue" : "neutral"}>
                              {t.has(`functions.${fn}`) ? t(`functions.${fn}`) : fn}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            member.active
                              ? "bg-[var(--ios-success-soft)] text-[var(--ios-success)]"
                              : "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]",
                          )}
                        >
                          <span className="size-1.5 rounded-full bg-current" aria-hidden />
                          {member.active ? t("statusActive") : t("inactive")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div
                          className="inline-flex items-center justify-end gap-0.5 rounded-[var(--radius-md)] bg-[var(--ios-fill)]/0 p-0.5 transition-colors group-hover:bg-[var(--ios-fill)]/55"
                          onClick={stopRowNav}
                        >
                          {member.active ? (
                            <button
                              type="button"
                              title={t("actionDeactivate")}
                              aria-label={t("actionDeactivate")}
                              className="pressable inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ios-secondary-label)] hover:bg-[var(--ios-danger-soft)] hover:text-[var(--ios-danger)] focus-visible:shadow-[var(--focus-ring)]"
                              onClick={() => setPending({ member, kind: "deactivate" })}
                            >
                              <PowerOff className="size-3.5 stroke-[1.75]" aria-hidden />
                            </button>
                          ) : (
                            <button
                              type="button"
                              title={t("actionReactivate")}
                              aria-label={t("actionReactivate")}
                              className="pressable inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ios-secondary-label)] hover:bg-[var(--ios-success-soft)] hover:text-[var(--ios-success)] focus-visible:shadow-[var(--focus-ring)]"
                              onClick={() => setPending({ member, kind: "reactivate" })}
                            >
                              <Power className="size-3.5 stroke-[1.75]" aria-hidden />
                            </button>
                          )}
                          <button
                            type="button"
                            title={t("actionEdit")}
                            aria-label={t("actionEdit")}
                            className="pressable inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ios-secondary-label)] hover:bg-[var(--ios-card)] hover:text-[var(--ios-label)] focus-visible:shadow-[var(--focus-ring)]"
                            onClick={() => openDetail(member)}
                          >
                            <Pencil className="size-3.5 stroke-[1.75]" aria-hidden />
                          </button>
                          <ActionMenu member={member} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--ios-separator)]/60 bg-[color-mix(in_srgb,var(--ios-fill)_28%,var(--ios-card))] px-5 py-2.5">
              <p className="text-[11px] text-[var(--ios-secondary-label)]">
                {t("tableCount", { count: items.length })}
              </p>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open && !actionBusy) setPending(null);
        }}
        title={
          pending?.kind === "deactivate"
            ? t("deactivateConfirmTitle")
            : t("reactivateConfirmTitle")
        }
        description={
          pending
            ? pending.kind === "deactivate"
              ? t("deactivateConfirmDescription", { name: pending.member.fullName })
              : t("reactivateConfirmDescription", { name: pending.member.fullName })
            : undefined
        }
        confirmLabel={
          pending?.kind === "deactivate" ? t("actionDeactivate") : t("actionReactivate")
        }
        cancelLabel={tCommon("cancel")}
        tone={pending?.kind === "deactivate" ? "destructive" : "default"}
        onConfirm={() => void confirmPendingAction()}
      />

      {createOpen ? (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label={tCommon("cancel")}
            className="absolute inset-0 bg-black/40 backdrop-blur-[6px]"
            onClick={() => {
              if (!saving) {
                setCreateOpen(false);
                resetCreateForm();
              }
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("createTitle")}
            className="relative z-10 w-full max-w-[400px] overflow-hidden rounded-[var(--radius-xl)] bg-[var(--ios-card)] shadow-[var(--ios-shadow-lg)] ring-1 ring-[var(--ios-separator)] slide-up"
          >
            <div className="border-b border-[var(--ios-separator)] px-5 py-4">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
                {t("createTitle")}
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--ios-secondary-label)]">
                {t("createDescription")}
              </p>
            </div>
            <div className="space-y-3 px-5 py-4">
              <Field id="staff-last-name" label={t("lastName")} error={formError ?? undefined}>
                <IconInput
                  id="staff-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  invalid={Boolean(formError)}
                />
              </Field>
              <Field id="staff-first-name" label={t("firstName")}>
                <IconInput
                  id="staff-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </Field>
              <Field id="staff-email" label={t("email")}>
                <IconInput
                  id="staff-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </Field>
              <Field id="staff-phone" label={t("phone")}>
                <IconInput
                  id="staff-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                />
              </Field>
              <label className="flex cursor-pointer items-center gap-2 text-[var(--text-subhead)] text-[var(--ios-label)]">
                <input
                  type="checkbox"
                  checked={asTeacher}
                  onChange={(e) => setAsTeacher(e.target.checked)}
                  className="size-4 accent-[var(--ios-blue)]"
                />
                {t("markAsTeacher")}
              </label>
            </div>
            <div className="flex gap-2 border-t border-[var(--ios-separator)] px-5 py-3">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                disabled={saving}
                onClick={() => {
                  setCreateOpen(false);
                  resetCreateForm();
                }}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="button"
                className="flex-1"
                loading={saving}
                onClick={() => void submitCreate()}
              >
                {t("createSubmit")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
