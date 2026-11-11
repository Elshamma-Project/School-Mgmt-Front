"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { UserAvatar } from "@/components/profile/user-avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { performClientLogout } from "@/lib/auth/logout-client";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { primaryRole } from "@/types/auth";

type SidebarAccountProps = {
  collapsed?: boolean;
};

export function SidebarAccount({ collapsed = false }: SidebarAccountProps) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const tRoles = useTranslations("roles");
  const locale = useLocale();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isMock = useAuthStore((s) => s.isMock);
  const role = primaryRole(user);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function performLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setConfirmLogout(false);
    try {
      await performClientLogout(locale);
    } catch {
      setLoggingOut(false);
    }
  }

  const name = user?.displayName?.trim() || user?.username || "—";
  // E-mail sous le nom seulement s’il diffère (évite schoolId + doublon).
  const secondary =
    user?.displayName?.trim() && user.username && user.username !== user.displayName.trim()
      ? user.username
      : "";
  const roleLabel = role ? tRoles(`${role}.label`) : "";

  const logoutDialog = (
    <ConfirmDialog
      open={confirmLogout}
      onOpenChange={(open) => {
        if (!loggingOut) setConfirmLogout(open);
      }}
      title={t("logoutConfirmTitle")}
      description={t("logoutConfirmDescription")}
      confirmLabel={t("logout")}
      cancelLabel={tCommon("cancel")}
      tone="destructive"
      onConfirm={() => {
        void performLogout();
      }}
    />
  );

  if (collapsed) {
    return (
      <>
        <div className="flex flex-col items-center gap-2 border-t border-[var(--ios-separator)] p-2">
          <button
            type="button"
            title={name}
            aria-label={t("openProfile")}
            onClick={() => router.push("/profile")}
            className="pressable flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[var(--ios-fill)] text-[var(--ios-secondary-label)] hover:bg-[var(--ios-fill-secondary)] focus-visible:shadow-[var(--focus-ring)]"
          >
            <UserAvatar
              size="md"
              className="size-9 bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]"
            />
          </button>
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            title={t("logout")}
            aria-label={t("logout")}
            disabled={loggingOut}
            className="pressable flex size-9 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-[var(--ios-danger)] hover:bg-[var(--ios-danger)]/10 focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut className="size-4 stroke-[1.75]" aria-hidden />
          </button>
        </div>
        {logoutDialog}
      </>
    );
  }

  return (
    <>
      <div className="mt-auto space-y-2 border-t border-[var(--ios-separator)] p-2.5">
        <button
          type="button"
          onClick={() => router.push("/profile")}
          aria-label={t("openProfile")}
          className="pressable flex w-full cursor-pointer items-start gap-2 rounded-[var(--radius-md)] bg-[var(--ios-fill)]/70 px-2 py-2 text-left transition-colors hover:bg-[var(--ios-fill)] focus-visible:shadow-[var(--focus-ring)]"
        >
          <UserAvatar
            size="sm"
            className="bg-[var(--ios-card)] text-[var(--ios-blue)] shadow-[var(--ios-shadow-sm)]"
            iconClassName="text-[var(--ios-blue)]"
          />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[11px] font-semibold text-[var(--ios-label)]">
              {name}
            </p>
            {secondary ? (
              <p className="mt-0.5 truncate text-[10px] text-[var(--ios-secondary-label)]">
                {secondary}
              </p>
            ) : null}
            {roleLabel ? (
              <p className="mt-0.5 truncate text-[10px] font-medium text-[var(--ios-blue)]">
                {roleLabel}
                {isMock ? ` · ${tCommon("demoBadge")}` : null}
              </p>
            ) : null}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setConfirmLogout(true)}
          disabled={loggingOut}
          className={cn(
            "pressable flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-[11px] font-medium",
            "text-[var(--ios-danger)] hover:bg-[var(--ios-danger)]/10 focus-visible:shadow-[var(--focus-ring)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <LogOut className="size-3.5 stroke-[1.75]" aria-hidden />
          {t("logout")}
        </button>
      </div>
      {logoutDialog}
    </>
  );
}
