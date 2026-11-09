import { apiRequest } from "./client";
import type { LocalizedTextDto } from "./academic";
import { getTenantConfig } from "@/lib/tenant/config";
import { openSecret } from "@/lib/auth/token-vault";
import { useAuthStore } from "@/stores/auth-store";

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

export type ReportCardSummaryResponse = {
  id: string;
  schoolId: string;
  studentId: string;
  academicYearId: string;
  classId: string;
  periodType: string;
  periodNumber: number | null;
  revision: number;
  status: string;
  language: string;
  verificationCode: string;
  average: string | number | null;
  rank: number | null;
  generatedAt: string;
};

export type GenerateReportCardsPayload = {
  classId: string;
  periodType: "ANNUAL" | "TERM" | "SEQUENCE";
  periodNumber?: number | null;
  language?: "FR" | "EN" | null;
  templateCode?: string | null;
  schoolId?: string | null;
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

export async function generateReportCards(
  payload: GenerateReportCardsPayload,
): Promise<ReportCardSummaryResponse[]> {
  return apiRequest<ReportCardSummaryResponse[]>("/api/v1/report-cards/generate", {
    method: "POST",
    body: payload,
  });
}

export async function listReportCardsForStudent(
  studentId: string,
  options: { academicYearId?: string | null; schoolId?: string | null } = {},
): Promise<ReportCardSummaryResponse[]> {
  const qs = new URLSearchParams();
  qs.set("studentId", studentId);
  if (options.academicYearId) qs.set("academicYearId", options.academicYearId);
  if (options.schoolId?.trim()) qs.set("schoolId", options.schoolId.trim());
  return apiRequest<ReportCardSummaryResponse[]>(`/api/v1/report-cards?${qs}`);
}

export async function publishReportCard(
  id: string,
  schoolId?: string | null,
): Promise<ReportCardSummaryResponse> {
  return apiRequest<ReportCardSummaryResponse>(
    `/api/v1/report-cards/${encodeURIComponent(id)}/publish${schoolQuery(schoolId)}`,
    { method: "POST" },
  );
}

export async function validateReportCard(
  id: string,
  schoolId?: string | null,
): Promise<ReportCardSummaryResponse> {
  return apiRequest<ReportCardSummaryResponse>(
    `/api/v1/report-cards/${encodeURIComponent(id)}/validate${schoolQuery(schoolId)}`,
    { method: "POST" },
  );
}

/** Télécharge le PDF d’un bulletin (blob). */
export async function downloadReportCardPdf(
  id: string,
  schoolId?: string | null,
): Promise<Blob> {
  const baseUrl = getTenantConfig().apiBaseUrl.replace(/\/$/, "") || "http://localhost:8090";
  const token = openSecret(useAuthStore.getState().accessToken);
  const qs = schoolId?.trim() ? `?schoolId=${encodeURIComponent(schoolId.trim())}` : "";
  const response = await fetch(
    `${baseUrl}/api/v1/report-cards/${encodeURIComponent(id)}/pdf${qs}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  if (!response.ok) {
    throw new Error(`PDF ${response.status}`);
  }
  return response.blob();
}
