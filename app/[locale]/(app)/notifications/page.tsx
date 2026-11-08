"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const tCommon = useTranslations("common");

  return (
    <div>
      <PageHeader description={t("description")} />
      <EmptyState
        title={tCommon("emptyTitle")}
        description={t("empty")}
        icon={<Bell className="size-10 stroke-[1.5]" aria-hidden />}
      />
    </div>
  );
}
