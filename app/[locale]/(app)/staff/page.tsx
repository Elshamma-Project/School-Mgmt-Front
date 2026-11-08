import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const instant = false;

export default async function StaffPage() {
  const t = await getTranslations("staff");
  const tCommon = await getTranslations("common");

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} />
      <EmptyState
        title={tCommon("emptyTitle")}
        description={tCommon("emptyDescription")}
        icon={<Users className="size-10 stroke-[1.5]" aria-hidden />}
      />
    </div>
  );
}
