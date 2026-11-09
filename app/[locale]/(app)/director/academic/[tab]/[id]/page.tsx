import { notFound } from "next/navigation";
import { AcademicDetailView } from "@/components/academic/academic-detail-view";
import { parseAcademicTab } from "@/lib/academic/tabs";

export const instant = false;

type PageProps = {
  params: Promise<{ tab: string; id: string }>;
};

export default async function DirectorAcademicDetailPage({ params }: PageProps) {
  const { tab, id } = await params;
  const parsed = parseAcademicTab(tab);
  if (!parsed || id === "create") notFound();
  return <AcademicDetailView tab={parsed} slug={id} />;
}
