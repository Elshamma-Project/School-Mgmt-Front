"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AtSign,
  BookOpen,
  Clock3,
  Hash,
  IdCard,
  Phone,
  Power,
  PowerOff,
  School,
  Shield,
  UserRound,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DetailRow } from "@/components/ui/detail-row";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupedList, GroupedListItem } from "@/components/ui/grouped-list";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listTeacherAssignments,
  localizedLabel,
  type TeacherAssignmentResponse,
} from "@/lib/api/academic";
import {
  deactivateStaff,
  getStaff,
  reactivateStaff,
  type StaffResponse,
} from "@/lib/api/staff";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import { formatInstant } from "@/lib/datetime/format";
import { staffListPath, type StaffTypeSlug } from "@/lib/staff/routes";
import { notify } from "@/lib/ui/notify";
import { useAuthStore } from "@/stores/auth-store";
import { usePageHeadingStore } from "@/stores/page-heading-store";
import { ApiError, isAuthFailure } from "@/types/api";
import { primaryRole } from "@/types/auth";

type StaffDetailViewProps = {
  type: StaffTypeSlug;
  id: string;
};

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function StaffDetailView({ type, id }: StaffDetailViewProps) {
  const t = useTranslations("staff");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const schoolId = useAuthStore((s) => s.user?.schoolId);
  const role = primaryRole(useAuthStore((s) => s.user));
  const workspaceHome = role ? getRoleHomePath(role) : "/administration";
  const setCrumbs = usePageHeadingStore((s) => s.setCrumbs);
  const setBackHref = usePageHeadingStore((s) => s.setBackHref);
  const clearOverride = usePageHeadingStore((s) => s.clearOverride);

  const [member, setMember] = useState<StaffResponse | null>(null);
  const [assignments, setAssignments] = useState<TeacherAssignmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [pendingKind, setPendingKind] = useState<"deactivate" | "reactivate" | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const listHref = staffListPath(workspaceHome);
  const typeListHref = staffListPath(workspaceHome, type);

  const applyCrumbs = useCallback(
    (fullName?: string | null) => {
      setCrumbs([
        { label: tNav("staff"), href: listHref },
        { label: t(`tabs.${type}`), href: typeListHref },
        ...(fullName?.trim() ? [{ label: fullName.trim() }] : []),
      ]);
    },
    [listHref, setCrumbs, t, tNav, type, typeListHref],
  );

  const loadAssignments = useCallback(
    async (staffId: string) => {
      setAssignmentsLoading(true);
      try {
        const rows = await listTeacherAssignments(staffId, { schoolId });
        setAssignments(rows);
      } catch (error) {
        if (!isAuthFailure(error)) {
          console.warn("[staff] assignments load failed", error);
        }
        setAssignments([]);
      } finally {
        setAssignmentsLoading(false);
      }
    },
    [schoolId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    setBackHref(typeListHref);
    applyCrumbs();
    try {
      const data = await getStaff(id, schoolId);
      setMember(data);
      applyCrumbs(data.fullName);
      void loadAssignments(data.id);
    } catch (error) {
      if (isAuthFailure(error)) return;
      setMember(null);
      setNotFound(true);
      applyCrumbs();
      if (error instanceof ApiError && error.status !== 404) {
        notify.error(error.message);
      } else if (!(error instanceof ApiError)) {
        notify.error(t("loadError"));
      }
    } finally {
      setLoading(false);
    }
  }, [applyCrumbs, id, loadAssignments, schoolId, setBackHref, t, typeListHref]);

  useEffect(() => {
    void load();
    return () => clearOverride();
  }, [clearOverride, load]);

  async function confirmAction() {
    if (!member || !pendingKind) return;
    setActionBusy(true);
    try {
      const updated =
        pendingKind === "deactivate"
          ? await deactivateStaff(member.id, schoolId)
          : await reactivateStaff(member.id, schoolId);
      setMember(updated);
      applyCrumbs(updated.fullName);
      notify.success(pendingKind === "deactivate" ? t("deactivated") : t("reactivated"));
      setPendingKind(null);
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("actionError"));
    } finally {
      setActionBusy(false);
    }
  }

  const subjectsTaught = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    for (const row of assignments) {
      if (!map.has(row.subjectId)) {
        map.set(row.subjectId, {
          code: row.subjectCode,
          name: localizedLabel(row.subjectName, locale),
        });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [assignments, locale]);

  const classesTaught = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of assignments) {
      if (!map.has(row.classId)) map.set(row.classId, row.className);
    }
    return [...map.entries()]
      .map(([classId, className]) => ({ classId, className }))
      .sort((a, b) => a.className.localeCompare(b.className, locale));
  }, [assignments, locale]);

  if (loading) {
    return (
      <div className="space-y-6 slide-up">
        <div className="mx-auto flex w-full max-w-[560px] flex-col items-center">
          <Skeleton className="size-20 rounded-full" />
          <Skeleton className="mt-4 h-28 w-full rounded-[var(--radius-md)]" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-[var(--radius-md)]" />
          <Skeleton className="h-48 w-full rounded-[var(--radius-md)]" />
        </div>
      </div>
    );
  }

  if (notFound || !member) {
    return (
      <div className="space-y-4 slide-up">
        <EmptyState
          title={t("detailNotFoundTitle")}
          description={t("detailNotFoundDescription")}
          icon={<UserRound className="size-9 stroke-[1.5]" aria-hidden />}
        />
      </div>
    );
  }

  const lastLogin = formatInstant(member.lastLoginAt, locale) ?? t("neverLoggedIn");
  const initials = initialsOf(member.fullName);
  const email = member.contact.email?.trim() || null;
  const phone = member.contact.phones[0]?.trim() || null;
  const isTeacher = member.functions.includes("TEACHER");

  return (
    <div className="space-y-6 slide-up">
      {/* En-tête style profil */}
      <section className="mx-auto flex w-full max-w-[560px] flex-col items-center text-center">
        <div
          className={
            member.active
              ? "flex size-20 items-center justify-center rounded-full bg-[var(--ios-info-soft)] text-[22px] font-semibold tracking-[-0.02em] text-[var(--ios-blue)] ring-1 ring-[color-mix(in_srgb,var(--ios-blue)_18%,transparent)]"
              : "flex size-20 items-center justify-center rounded-full bg-[var(--ios-fill)] text-[22px] font-semibold tracking-[-0.02em] text-[var(--ios-secondary-label)]"
          }
          aria-hidden
        >
          {initials}
        </div>
        <div className="mt-4 w-full overflow-hidden rounded-[var(--radius-md)] bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
          <div className="px-5 pb-3 pt-5">
            <h2 className="text-[var(--text-title2)] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
              {member.fullName}
            </h2>
            <p className="mt-1.5 truncate text-[var(--text-footnote)] text-[var(--ios-secondary-label)]">
              {member.staffNumber
                ? `${t("columns.number")} · ${member.staffNumber}`
                : t("noStaffNumber")}
            </p>
          </div>
          <div className="mx-5 border-t border-[var(--ios-separator)]" />
          <div className="flex flex-wrap items-center justify-center gap-2 px-5 py-3.5">
            <Badge tone={member.active ? "success" : "neutral"} className="gap-1.5 pl-1.5">
              <span className="size-1.5 shrink-0 rounded-full bg-current opacity-90" aria-hidden />
              {member.active ? t("statusActive") : t("inactive")}
            </Badge>
            <Badge tone="blue" className="gap-1.5 pl-1.5">
              <Shield className="size-3 stroke-[2]" aria-hidden />
              {t(`tabs.${type}`)}
            </Badge>
            {member.functions.map((fn) => (
              <Badge key={fn} tone={fn === "TEACHER" ? "blue" : "neutral"}>
                {t.has(`functions.${fn}`) ? t(`functions.${fn}`) : fn}
              </Badge>
            ))}
          </div>
        </div>

        <div className="mt-3 flex w-full justify-center">
          {member.active ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leadingIcon={<PowerOff className="size-3.5 stroke-[1.75]" aria-hidden />}
              onClick={() => setPendingKind("deactivate")}
            >
              {t("actionDeactivate")}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              leadingIcon={<Power className="size-3.5 stroke-[1.75]" aria-hidden />}
              onClick={() => setPendingKind("reactivate")}
            >
              {t("actionReactivate")}
            </Button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <GroupedList header={t("detailContactSection")}>
          <GroupedListItem>
            <DetailRow
              label={t("email")}
              value={email ?? "—"}
              icon={<AtSign className="size-4 stroke-[1.75]" />}
              stacked
            />
          </GroupedListItem>
          <GroupedListItem>
            <DetailRow
              label={t("phone")}
              value={phone ?? "—"}
              icon={<Phone className="size-4 stroke-[1.75]" />}
            />
          </GroupedListItem>
          <GroupedListItem>
            <DetailRow
              label={t("columns.lastLogin")}
              value={lastLogin}
              icon={<Clock3 className="size-4 stroke-[1.75]" />}
              stacked
            />
          </GroupedListItem>
          <GroupedListItem>
            <DetailRow
              label={t("columns.number")}
              value={member.staffNumber || "—"}
              icon={<Hash className="size-4 stroke-[1.75]" />}
            />
          </GroupedListItem>
        </GroupedList>

        <GroupedList
          header={t("columns.functions")}
          footer={t("detailFunctionsHint")}
        >
          {member.functions.map((fn) => (
            <GroupedListItem key={fn}>
              <DetailRow
                label={t.has(`functions.${fn}`) ? t(`functions.${fn}`) : fn}
                value={fn}
                icon={<IdCard className="size-4 stroke-[1.75]" />}
              />
            </GroupedListItem>
          ))}
        </GroupedList>

        <GroupedList
          header={t("detailSubjectsSection")}
          footer={
            isTeacher
              ? t("detailSubjectsHint")
              : t("detailNotTeacherHint")
          }
        >
          {assignmentsLoading ? (
            <GroupedListItem className="block py-3">
              <div className="space-y-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </GroupedListItem>
          ) : subjectsTaught.length === 0 ? (
            <GroupedListItem className="block py-3">
              <p className="text-[var(--text-subhead)] text-[var(--ios-secondary-label)]">
                {t("detailSubjectsEmpty")}
              </p>
            </GroupedListItem>
          ) : (
            subjectsTaught.map((subject) => (
              <GroupedListItem key={subject.code}>
                <DetailRow
                  label={subject.name}
                  value={subject.code}
                  icon={<BookOpen className="size-4 stroke-[1.75]" />}
                />
              </GroupedListItem>
            ))
          )}
        </GroupedList>

        <GroupedList
          header={t("detailClassesSection")}
          footer={
            isTeacher ? t("detailClassesHint") : t("detailNotTeacherHint")
          }
        >
          {assignmentsLoading ? (
            <GroupedListItem className="block py-3">
              <div className="space-y-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </GroupedListItem>
          ) : classesTaught.length === 0 ? (
            <GroupedListItem className="block py-3">
              <p className="text-[var(--text-subhead)] text-[var(--ios-secondary-label)]">
                {t("detailClassesEmpty")}
              </p>
            </GroupedListItem>
          ) : (
            classesTaught.map((clazz) => {
              const classSubjects = assignments.filter((a) => a.classId === clazz.classId);
              return (
                <GroupedListItem key={clazz.classId} className="block py-3">
                  <div className="flex w-full gap-3">
                    <span className="mt-0.5 inline-flex shrink-0 text-[var(--ios-secondary-label)]">
                      <School className="size-4 stroke-[1.75]" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[var(--text-body)] font-medium text-[var(--ios-label)]">
                        {clazz.className}
                      </p>
                      <p className="mt-0.5 text-[var(--text-footnote)] text-[var(--ios-secondary-label)]">
                        {classSubjects
                          .map((a) => localizedLabel(a.subjectName, locale))
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                </GroupedListItem>
              );
            })
          )}
        </GroupedList>
      </div>

      <ConfirmDialog
        open={Boolean(pendingKind)}
        onOpenChange={(open) => {
          if (!open && !actionBusy) setPendingKind(null);
        }}
        title={
          pendingKind === "deactivate"
            ? t("deactivateConfirmTitle")
            : t("reactivateConfirmTitle")
        }
        description={
          pendingKind === "deactivate"
            ? t("deactivateConfirmDescription", { name: member.fullName })
            : t("reactivateConfirmDescription", { name: member.fullName })
        }
        confirmLabel={
          pendingKind === "deactivate" ? t("actionDeactivate") : t("actionReactivate")
        }
        cancelLabel={tCommon("cancel")}
        tone={pendingKind === "deactivate" ? "destructive" : "default"}
        onConfirm={() => void confirmAction()}
      />
    </div>
  );
}
