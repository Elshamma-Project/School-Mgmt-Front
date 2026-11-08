"use client";

import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Button } from "@/components/ui/button";
import { GroupedList, GroupedListItem } from "@/components/ui/grouped-list";
import { PageHeader } from "@/components/ui/page-header";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <GroupedList header={t("languageSection")}>
        <GroupedListItem>
          <span className="text-[17px] text-[var(--ios-label)]">{tCommon("language")}</span>
          <LocaleSwitcher />
        </GroupedListItem>
      </GroupedList>

      <GroupedList header={t("sessionSection")}>
        <GroupedListItem>
          <span className="text-[17px] text-[var(--ios-label)]">
            {user?.displayName ?? user?.username ?? "—"}
          </span>
          <Button variant="destructive" size="sm" onClick={handleLogout}>
            {tAuth("logout")}
          </Button>
        </GroupedListItem>
      </GroupedList>
    </div>
  );
}
