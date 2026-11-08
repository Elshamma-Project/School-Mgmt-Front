"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Briefcase,
  Clock3,
  Hash,
  Mail,
  Phone,
  Power,
  PowerOff,
  UserRound,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
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
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { usePageHeadingStore } from "@/stores/page-heading-store";
import { ApiError, isAuthFailure } from "@/types/api";
import { primaryRole } from "@/types/auth";

type StaffDetailViewProps = {
  type: StaffTypeSlug;
  id: string;
};

function initialsOf(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
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
  const [loading, setLoading] = useState(true);
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
        ...(fullName?.trim()
          ? [{ label: fullName.trim() }]
          : []),
      ]);
    },
    [listHref, setCrumbs, t, tNav, type, typeListHref],
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
  }, [applyCrumbs, id, schoolId, setBackHref, t, typeListHref]);

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

  if (loading) {
    return (
      <div className="space-y-4 slide-up">
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/60 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
          <div className="h-20 bg-[var(--ios-fill)]/50 sm:h-24" />
          <div className="-mt-10 px-5 pb-5 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <Skeleton className="size-20 rounded-[var(--radius-lg)] ring-4 ring-[var(--ios-card)]" />
              <div className="min-w-0 flex-1 space-y-2 pb-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[88px] w-full rounded-[var(--radius-md)]" />
              ))}
            </div>
          </div>
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

  return (
    <div className="space-y-4 slide-up sm:space-y-5">
      <section className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/60 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
        {/* Bandeau */}
        <div
          className={cn(
            "relative h-20 sm:h-24",
            member.active
              ? "bg-[linear-gradient(135deg,color-mix(in_srgb,var(--ios-blue)_22%,transparent),color-mix(in_srgb,var(--ios-blue)_6%,transparent)_55%,transparent)]"
              : "bg-[linear-gradient(135deg,color-mix(in_srgb,var(--ios-fill)_90%,transparent),transparent)]",
          )}
        >
          <div className="absolute inset-x-0 bottom-0 h-px bg-[var(--ios-separator)]/50" />
        </div>

        <div className="relative -mt-11 px-4 pb-5 sm:-mt-12 sm:px-6 sm:pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-end gap-3.5 sm:gap-4">
              <div
                className={cn(
                  "flex size-20 shrink-0 items-center justify-center rounded-[var(--radius-lg)] text-[22px] font-semibold tracking-[-0.02em] shadow-[var(--ios-shadow)] ring-4 ring-[var(--ios-card)] sm:size-[88px] sm:text-[24px]",
                  member.active
                    ? "bg-[var(--ios-info-soft)] text-[var(--ios-blue)]"
                    : "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]",
                )}
                aria-hidden
              >
                {initials}
              </div>
              <div className="min-w-0 pb-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-[18px] font-semibold tracking-[-0.02em] text-[var(--ios-label)] sm:text-[20px]">
                    {member.fullName}
                  </h2>
                  <Badge tone={member.active ? "success" : "neutral"}>
                    {member.active ? t("statusActive") : t("inactive")}
                  </Badge>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge tone="blue">{t(`tabs.${type}`)}</Badge>
                  {member.staffNumber ? (
                    <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--ios-fill)]/80 px-2 py-0.5 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                      <Hash className="size-3 stroke-[1.75]" aria-hidden />
                      {member.staffNumber}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[var(--ios-secondary-label)]">
                      {t("noStaffNumber")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 sm:pb-1">
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
          </div>

          {/* Tuiles infos */}
          <div className="mt-5 grid gap-2.5 sm:mt-6 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
            <InfoTile
              icon={<Mail className="size-4 stroke-[1.75]" aria-hidden />}
              label={t("email")}
              value={email ?? "—"}
              muted={!email}
              href={email ? `mailto:${email}` : undefined}
            />
            <InfoTile
              icon={<Phone className="size-4 stroke-[1.75]" aria-hidden />}
              label={t("phone")}
              value={phone ?? "—"}
              muted={!phone}
              href={phone ? `tel:${phone}` : undefined}
            />
            <InfoTile
              icon={<Clock3 className="size-4 stroke-[1.75]" aria-hidden />}
              label={t("columns.lastLogin")}
              value={lastLogin}
              muted={!member.lastLoginAt}
            />
            <InfoTile
              icon={<Hash className="size-4 stroke-[1.75]" aria-hidden />}
              label={t("columns.number")}
              value={member.staffNumber || "—"}
              muted={!member.staffNumber}
              mono={Boolean(member.staffNumber)}
            />
          </div>
        </div>
      </section>

      {/* Fonctions */}
      <section className="rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/60 bg-[var(--ios-card)] p-4 shadow-[var(--ios-shadow)] sm:p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]">
            <Briefcase className="size-4 stroke-[1.75]" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
              {t("columns.functions")}
            </h3>
            <p className="text-[11px] text-[var(--ios-secondary-label)]">
              {t("detailFunctionsHint")}
            </p>
          </div>
        </div>
        <div className="mt-3.5 flex flex-wrap gap-2">
          {member.functions.map((fn) => (
            <span
              key={fn}
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1.5 text-[12px] font-semibold",
                fn === "TEACHER"
                  ? "bg-[var(--ios-info-soft)] text-[var(--ios-blue)]"
                  : "bg-[var(--ios-fill)] text-[var(--ios-label)]",
              )}
            >
              {t.has(`functions.${fn}`) ? t(`functions.${fn}`) : fn}
            </span>
          ))}
        </div>
      </section>

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

function InfoTile({
  icon,
  label,
  value,
  muted,
  href,
  mono,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  muted?: boolean;
  href?: string;
  mono?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]">
          {icon}
        </span>
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--ios-secondary-label)]">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "mt-2.5 truncate text-[13px] font-medium tracking-[-0.01em]",
          muted ? "text-[var(--ios-secondary-label)]" : "text-[var(--ios-label)]",
          mono && "font-mono text-[12px]",
        )}
      >
        {value}
      </p>
    </>
  );

  const className =
    "block rounded-[var(--radius-md)] border border-[var(--ios-separator)]/50 bg-[color-mix(in_srgb,var(--ios-fill)_35%,var(--ios-card))] p-3.5 transition-colors";

  if (href) {
    return (
      <a
        href={href}
        className={cn(className, "hover:border-[color-mix(in_srgb,var(--ios-blue)_28%,var(--ios-separator))] hover:bg-[color-mix(in_srgb,var(--ios-blue)_5%,var(--ios-card))]")}
      >
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}
