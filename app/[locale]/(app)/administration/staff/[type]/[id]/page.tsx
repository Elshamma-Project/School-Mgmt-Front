import { notFound } from "next/navigation";
import { StaffDetailView } from "@/components/staff/staff-detail-view";
import { isStaffTypeSlug } from "@/lib/staff/routes";

export const instant = false;

type PageProps = {
  params: Promise<{ type: string; id: string }>;
};

export default async function AdminStaffDetailPage({ params }: PageProps) {
  const { type, id } = await params;
  if (!isStaffTypeSlug(type) || !id?.trim()) notFound();
  return <StaffDetailView type={type} id={id} />;
}
