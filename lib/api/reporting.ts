import { apiRequest } from "./client";
import type { LocalizedTextDto } from "./academic";

export type ReportTemplateResponse = {
  id: string;
  schoolId: string;
  code: string;
  name: LocalizedTextDto;
  periodType: string;
  sequenceColumns: number[];
  appreciationScaleCode: string;
  minFontSizePt: number;
  maxFontSizePt: number;
  active: boolean;
};

function schoolQuery(schoolId?: string | null): string {
  return schoolId?.trim() ? `?schoolId=${encodeURIComponent(schoolId.trim())}` : "";
}

export async function listReportTemplates(
  schoolId?: string | null,
): Promise<ReportTemplateResponse[]> {
  return apiRequest<ReportTemplateResponse[]>(
    `/api/v1/report-templates${schoolQuery(schoolId)}`,
  );
}
