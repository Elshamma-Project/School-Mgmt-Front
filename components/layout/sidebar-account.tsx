"use client";

import { useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isMock = useAuthStore((s) => s.isMock);
  const clearSession = useAuthStore((s) => s.clearSession);
  const role = primaryRole(user);
  const [confirmLogout, setConfirmLogout] = useState(false);

  function performLogout() {
    clearSession();
    router.replace("/login");
  }

  const name = user?.displayName ?? user?.username ?? "—";
  const email = user?.email ?? user?.username ?? "";
  const roleLabel = role ? tRoles(`${role}.label`) : "";

  const logoutDialog = (
    <ConfirmDialog
      open={confirmLogout}
      onOpenChange={setConfirmLogout}
      title={t("logoutConfirmTitle")}
      description={t("logoutConfirmDescription")}
      confirmLabel={t("logout")}
      cancelLabel={tCommon("cancel")}
      tone="destructive"
      onConfirm={performLogout}
    />
  );

  if (collapsed) {
    return (
      <>
        <div className="flex flex-col items-center gap-2 border-t border-[var(--ios-separator)] p-2">
          <button
            type="button"
            title={name}
            aria-label={name}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]"
          >
            <UserRound className="size-4 stroke-[1.75]" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            title={t("logout")}
            aria-label={t("logout")}
            className="flex size-9 cursor-pointer items-center justify-center rounded-[10px] text-[var(--ios-danger)] hover:bg-[var(--ios-danger)]/10"
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
        <div className="flex items-start gap-2.5 rounded-[12px] bg-[var(--ios-fill)]/70 px-2.5 py-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--ios-card)] text-[var(--ios-blue)] shadow-[var(--ios-shadow-sm)]">
            <UserRound className="size-4 stroke-[1.75]" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[var(--ios-label)]">{name}</p>
            <p className="truncate text-[11px] text-[var(--ios-secondary-label)]">{email}</p>
            {roleLabel ? (
              <p className="mt-0.5 truncate text-[11px] font-medium text-[var(--ios-blue)]">
                {roleLabel}
                {isMock ? ` · ${tCommon("demoBadge")}` : null}
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setConfirmLogout(true)}
          className={cn(
            "flex w-full cursor-pointer items-center gap-2 rounded-[10px] px-2.5 py-2 text-[13px] font-medium",
            "text-[var(--ios-danger)] hover:bg-[var(--ios-danger)]/8",
          )}
        >
          <LogOut className="size-4 stroke-[1.75]" aria-hidden />
          {t("logout")}
        </button>

        <LocaleSwitcher className="w-full justify-center" />
      </div>
      {logoutDialog}
    </>
  );
}
