import { Inbox } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} />
      <EmptyState
        title={tCommon("emptyTitle")}
        description={tCommon("emptyDescription")}
        icon={<Inbox className="size-10 stroke-[1.5]" aria-hidden />}
      />
    </div>
  );
}
