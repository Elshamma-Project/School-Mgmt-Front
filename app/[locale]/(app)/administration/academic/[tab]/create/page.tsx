import { notFound } from "next/navigation";
import { AcademicCreateView } from "@/components/academic/academic-create-view";
import { parseAcademicTab } from "@/lib/academic/tabs";

export const instant = false;

type PageProps = {
  params: Promise<{ tab: string }>;
};

export default async function AdminAcademicCreatePage({ params }: PageProps) {
  const { tab } = await params;
  const parsed = parseAcademicTab(tab);
  if (!parsed) notFound();
  return <AcademicCreateView tab={parsed} />;
}
