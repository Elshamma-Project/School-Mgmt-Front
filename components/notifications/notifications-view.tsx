"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export function NotificationsView() {
  const t = useTranslations("notifications");
  const tCommon = useTranslations("common");

  return (
    <div className="space-y-6 slide-up">
      <PageHeader description={t("description")} />
      <EmptyState
        title={tCommon("emptyTitle")}
        description={t("empty")}
        icon={<Bell className="size-9 stroke-[1.5]" aria-hidden />}
      />
    </div>
  );
}
