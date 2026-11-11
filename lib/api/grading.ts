import { apiRequest } from "./client";
import type { LocalizedTextDto } from "./academic";

export type EvaluationSessionResponse = {
  id: string;
  schoolId: string;
  academicYearId: string;
  number: number;
  termNumber: number;
  shortLabel: string;
  name: LocalizedTextDto;
  startDate: string | null;
  endDate: string | null;
  examDate: string | null;
  entryDeadline: string | null;
  status: "PLANNED" | "OPEN" | "CLOSED";
  openedAt: string | null;
  closedAt: string | null;
};

export type ScoreBandDto = {
  code: string;
  label: LocalizedTextDto | null;
  minInclusive: string | number;
  maxExclusive: string | number | null;
};

export type AppreciationScaleDto = {
  code: string;
  bands: ScoreBandDto[];
};

export type GradingSchemeResponse = {
  id: string;
  schoolId: string;
  code: string;
  name: LocalizedTextDto;
  maxScore: string | number;
  passMark: string | number;
  classSuccessThreshold: string | number;
  decimals: number;
  roundingPolicy: string;
  roundTermSubjectAverages: boolean;
  honourRollMinAverage: string | number;
  honourRollBlockedBySanction: boolean;
  effortSubjectThreshold: string | number | null;
  reportSheetDeadlineHours: number;
  reportSheetDeadlineBlocking: boolean;
  reportSheetMaxRowsPerPage: number;
  reportSheetAppreciationScaleCode: string;
  appreciationScales: AppreciationScaleDto[];
  overallMentionBands: ScoreBandDto[];
  active: boolean;
};

export type CreateGradingSchemePayload = {
  code: string;
  name: LocalizedTextDto;
  schoolId?: string | null;
};

export type UpdateGradingSchemePayload = {
  name?: LocalizedTextDto;
  maxScore?: number | string;
  passMark?: number | string;
  classSuccessThreshold?: number | string;
  decimals?: number;
  honourRollMinAverage?: number | string;
  honourRollBlockedBySanction?: boolean;
  effortSubjectThreshold?: number | string | null;
  clearEffortSubjectThreshold?: boolean;
  reportSheetDeadlineHours?: number;
  reportSheetDeadlineBlocking?: boolean;
  reportSheetMaxRowsPerPage?: number;
  reportSheetAppreciationScaleCode?: string;
  active?: boolean;
  schoolId?: string | null;
};

export type GradeAuditEntryResponse = {
  id: string;
  schoolId: string;
  target: string;
  action: string;
  classSubjectId: string;
  sessionId: string | null;
  studentId: string | null;
  changedBy: string;
  changedByRole: string | null;
  changedAt: string;
  reason: string | null;
  afterSessionClosed: boolean;
  previousValue: string | number | null;
  newValue: string | number | null;
};

function schoolParams(schoolId?: string | null): Record<string, string> {
  return schoolId?.trim() ? { schoolId: schoolId.trim() } : {};
}

function toSearch(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  return search.toString();
}

export async function listEvaluationSessions(options: {
  academicYearId: string;
  schoolId?: string | null;
}): Promise<EvaluationSessionResponse[]> {
  const qs = toSearch({
    academicYearId: options.academicYearId,
    ...schoolParams(options.schoolId),
  });
  return apiRequest<EvaluationSessionResponse[]>(`/api/v1/evaluation-sessions?${qs}`);
}

export async function openEvaluationSession(
  id: string,
  schoolId?: string | null,
): Promise<EvaluationSessionResponse> {
  const qs = toSearch({ ...schoolParams(schoolId) });
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<EvaluationSessionResponse>(`/api/v1/evaluation-sessions/${id}/open${suffix}`, {
    method: "POST",
  });
}

export async function closeEvaluationSession(
  id: string,
  options: { closeNote?: string | null; schoolId?: string | null } = {},
): Promise<EvaluationSessionResponse> {
  const qs = toSearch({ ...schoolParams(options.schoolId) });
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<EvaluationSessionResponse>(`/api/v1/evaluation-sessions/${id}/close${suffix}`, {
    method: "POST",
    body: {
      closeNote: options.closeNote?.trim() || null,
      schoolId: options.schoolId?.trim() || null,
    },
  });
}

export async function reopenEvaluationSession(
  id: string,
  options: { reason: string; schoolId?: string | null },
): Promise<EvaluationSessionResponse> {
  return apiRequest<EvaluationSessionResponse>(`/api/v1/evaluation-sessions/${id}/reopen`, {
    method: "POST",
    body: {
      reason: options.reason.trim(),
      schoolId: options.schoolId?.trim() || null,
    },
  });
}

export async function listGradingSchemes(
  schoolId?: string | null,
): Promise<GradingSchemeResponse[]> {
  const qs = toSearch({ ...schoolParams(schoolId) });
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<GradingSchemeResponse[]>(`/api/v1/grading-schemes${suffix}`);
}

export async function getGradingScheme(
  id: string,
  schoolId?: string | null,
): Promise<GradingSchemeResponse> {
  const qs = toSearch({ ...schoolParams(schoolId) });
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<GradingSchemeResponse>(`/api/v1/grading-schemes/${id}${suffix}`);
}

export async function createGradingScheme(
  payload: CreateGradingSchemePayload,
): Promise<GradingSchemeResponse> {
  return apiRequest<GradingSchemeResponse>("/api/v1/grading-schemes", {
    method: "POST",
    body: {
      code: payload.code.trim().toUpperCase(),
      name: payload.name,
      schoolId: payload.schoolId?.trim() || null,
    },
  });
}

export async function updateGradingScheme(
  id: string,
  payload: UpdateGradingSchemePayload,
): Promise<GradingSchemeResponse> {
  return apiRequest<GradingSchemeResponse>(`/api/v1/grading-schemes/${id}`, {
    method: "PATCH",
    body: {
      ...payload,
      schoolId: payload.schoolId?.trim() || null,
    },
  });
}

export async function listGradeAudits(options: {
  page?: number;
  size?: number;
  schoolId?: string | null;
} = {}): Promise<GradeAuditEntryResponse[]> {
  const qs = toSearch({
    page: options.page ?? 0,
    size: options.size ?? 50,
    ...schoolParams(options.schoolId),
  });
  return apiRequest<GradeAuditEntryResponse[]>(`/api/v1/grade-audits?${qs}`);
}
