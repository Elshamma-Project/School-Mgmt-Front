import { ReportTemplateDetailView } from "@/components/reporting/report-template-detail-view";

export const instant = false;

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function DirectorReportTemplatePage({ params }: PageProps) {
  const { code } = await params;
  return <ReportTemplateDetailView code={decodeURIComponent(code)} />;
}
