"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { GroupedList, GroupedListItem } from "@/components/ui/grouped-list";
import { PageHeader } from "@/components/ui/page-header";
import { Link } from "@/i18n/navigation";
import { getNavItemsForRole } from "@/lib/auth/nav-config";
import { useAuthStore } from "@/stores/auth-store";
import { primaryRole } from "@/types/auth";

export function RoleHome() {
  const t = useTranslations("home");
  const tNav = useTranslations("nav");
  const tRoles = useTranslations("roles");
  const tCommon = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const isMock = useAuthStore((s) => s.isMock);
  const role = primaryRole(user);
  const modules = getNavItemsForRole(role).filter((item) => item.key !== "home");

  const greetingName = user?.displayName ?? user?.username ?? "";
  const roleLabel = role ? tRoles(`${role}.label`) : "";
  const blurb = role ? tRoles(`${role}.homeBlurb`) : t("description");

  return (
    <div className="space-y-6 slide-up">
      <div>
        <p className="text-[var(--text-title2)] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
          {t("greeting", { name: greetingName })}
        </p>
        <PageHeader
          description={blurb}
          className="mb-0 mt-1 max-w-2xl text-[var(--text-subhead)] leading-relaxed text-[var(--ios-secondary-label)]"
        />
      </div>

      {role ? (
        <GroupedList header={t("profileSection")} footer={isMock ? t("demoFooter") : undefined}>
          <GroupedListItem>
            <span className="text-[var(--text-body)] text-[var(--ios-label)]">{t("roleLabel")}</span>
            <Badge tone="blue">
              {roleLabel}
              {isMock ? ` · ${tCommon("demoBadge")}` : null}
            </Badge>
          </GroupedListItem>
          <GroupedListItem>
            <span className="text-[17px] text-[var(--ios-label)]">{t("accountLabel")}</span>
            <span className="truncate text-[17px] text-[var(--ios-secondary-label)]">
              {user?.username}
            </span>
          </GroupedListItem>
        </GroupedList>
      ) : null}

      <GroupedList header={t("modulesSection")}>
        {modules.map(({ href, key, icon: Icon }) => (
          <GroupedListItem key={href} className="p-0">
            <Link
              href={href}
              className="flex min-h-11 w-full items-center gap-3 px-4 py-2.5 active:bg-[var(--ios-fill)]"
            >
              <span className="flex size-8 items-center justify-center rounded-[8px] bg-[var(--ios-blue)]/10 text-[var(--ios-blue)]">
                <Icon className="size-4 stroke-[1.75]" aria-hidden />
              </span>
              <span className="flex-1 text-[17px] text-[var(--ios-label)]">{tNav(key)}</span>
              <ChevronRight
                className="size-4 stroke-[1.75] text-[var(--ios-tertiary-label)]"
                aria-hidden
              />
            </Link>
          </GroupedListItem>
        ))}
      </GroupedList>
    </div>
  );
}
