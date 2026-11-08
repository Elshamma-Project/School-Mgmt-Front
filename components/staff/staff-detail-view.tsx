"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
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
import { useRouter } from "@/i18n/navigation";
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
import { ApiError } from "@/types/api";
import { primaryRole } from "@/types/auth";

type StaffDetailViewProps = {
  type: StaffTypeSlug;
  id: string;
};

export function StaffDetailView({ type, id }: StaffDetailViewProps) {
  const t = useTranslations("staff");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const schoolId = useAuthStore((s) => s.user?.schoolId);
  const role = primaryRole(useAuthStore((s) => s.user));
  const workspaceHome = role ? getRoleHomePath(role) : "/administration";
  const setOverride = usePageHeadingStore((s) => s.setOverride);
  const clearOverride = usePageHeadingStore((s) => s.clearOverride);

  const [member, setMember] = useState<StaffResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pendingKind, setPendingKind] = useState<"deactivate" | "reactivate" | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const backHref = staffListPath(workspaceHome);

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const data = await getStaff(id, schoolId);
      setMember(data);
      setOverride(data.fullName);
    } catch (error) {
      setMember(null);
      setNotFound(true);
      clearOverride();
      if (error instanceof ApiError && error.status !== 404) {
        notify.error(error.message);
      } else if (!(error instanceof ApiError)) {
        notify.error(t("loadError"));
      }
    } finally {
      setLoading(false);
    }
  }, [clearOverride, id, schoolId, setOverride, t]);

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
      setOverride(updated.fullName);
      notify.success(pendingKind === "deactivate" ? t("deactivated") : t("reactivated"));
      setPendingKind(null);
    } catch (error) {
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("actionError"));
    } finally {
      setActionBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 slide-up">
        <Skeleton className="h-9 w-28" />
        <div className="rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/70 bg-[var(--ios-card)] p-5 shadow-[var(--ios-shadow)]">
          <div className="flex items-center gap-4">
            <Skeleton className="size-14 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !member) {
    return (
      <div className="space-y-4 slide-up">
        <Button
          type="button"
          variant="secondary"
          leadingIcon={<ArrowLeft className="size-4 stroke-[1.75]" aria-hidden />}
          onClick={() => router.push(backHref)}
        >
          {t("backToList")}
        </Button>
        <EmptyState
          title={t("detailNotFoundTitle")}
          description={t("detailNotFoundDescription")}
          icon={<UserRound className="size-9 stroke-[1.5]" aria-hidden />}
        />
      </div>
    );
  }

  const lastLogin = formatInstant(member.lastLoginAt, locale) ?? t("neverLoggedIn");

  return (
    <div className="space-y-5 slide-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="secondary"
          leadingIcon={<ArrowLeft className="size-4 stroke-[1.75]" aria-hidden />}
          onClick={() => router.push(backHref)}
        >
          {t("backToList")}
        </Button>
        <div className="flex flex-wrap gap-2">
          {member.active ? (
            <Button
              type="button"
              variant="secondary"
              leadingIcon={<PowerOff className="size-4 stroke-[1.75]" aria-hidden />}
              onClick={() => setPendingKind("deactivate")}
            >
              {t("actionDeactivate")}
            </Button>
          ) : (
            <Button
              type="button"
              leadingIcon={<Power className="size-4 stroke-[1.75]" aria-hidden />}
              onClick={() => setPendingKind("reactivate")}
            >
              {t("actionReactivate")}
            </Button>
          )}
        </div>
      </div>

      <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/70 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
        <div className="border-b border-[var(--ios-separator)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ios-fill)_55%,transparent),transparent)] px-5 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--ios-info-soft)] text-[var(--ios-blue)] ring-1 ring-[color-mix(in_srgb,var(--ios-blue)_18%,transparent)]">
              <UserRound className="size-6 stroke-[1.75]" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-[18px] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
                  {member.fullName}
                </h2>
                <Badge tone={member.active ? "success" : "neutral"}>
                  {member.active ? t("statusActive") : t("inactive")}
                </Badge>
                <Badge tone="blue">{t(`tabs.${type}`)}</Badge>
              </div>
              <p className="mt-1 text-[12px] text-[var(--ios-secondary-label)]">
                {member.staffNumber ? `${t("columns.number")} · ${member.staffNumber}` : t("noStaffNumber")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-[var(--ios-separator)] sm:grid-cols-2">
          <DetailCell label={t("email")} value={member.contact.email || "—"} />
          <DetailCell
            label={t("phone")}
            value={member.contact.phones[0] || "—"}
          />
          <DetailCell label={t("columns.lastLogin")} value={lastLogin} />
          <DetailCell
            label={t("columns.functions")}
            value={
              <div className="flex flex-wrap gap-1.5">
                {member.functions.map((fn) => (
                  <Badge key={fn} tone={fn === "TEACHER" ? "blue" : "neutral"}>
                    {t.has(`functions.${fn}`) ? t(`functions.${fn}`) : fn}
                  </Badge>
                ))}
              </div>
            }
          />
        </div>
      </section>

      <p className="text-[12px] leading-relaxed text-[var(--ios-secondary-label)]">
        {t("detailEditHint")}
      </p>

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

function DetailCell({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="bg-[var(--ios-card)] px-5 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--ios-secondary-label)]">
        {label}
      </p>
      <div className="mt-1.5 text-[13px] text-[var(--ios-label)]">{value}</div>
    </div>
  );
}
