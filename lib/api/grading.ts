import { apiRequest } from "./client";
import type { LocalizedTextDto } from "./academic";
import { getTenantConfig } from "@/lib/tenant/config";
import { openSecret } from "@/lib/auth/token-vault";
import { useAuthStore } from "@/stores/auth-store";

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

export type ScoreBandWritePayload = {
  code: string;
  label?: LocalizedTextDto | null;
  minInclusive: number | string;
  maxExclusive?: number | string | null;
};

export type AppreciationScaleWritePayload = {
  code: string;
  bands: ScoreBandWritePayload[];
};

export type CreateGradingSchemePayload = {
  code: string;
  name: LocalizedTextDto;
  maxScore?: number | string;
  passMark?: number | string;
  classSuccessThreshold?: number | string;
  decimals?: number;
  honourRollMinAverage?: number | string;
  honourRollBlockedBySanction?: boolean;
  effortSubjectThreshold?: number | string | null;
  reportSheetDeadlineHours?: number;
  reportSheetDeadlineBlocking?: boolean;
  reportSheetMaxRowsPerPage?: number;
  reportSheetAppreciationScaleCode?: string;
  appreciationScales?: AppreciationScaleWritePayload[];
  overallMentionBands?: ScoreBandWritePayload[];
  active?: boolean;
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
  appreciationScales?: AppreciationScaleWritePayload[];
  overallMentionBands?: ScoreBandWritePayload[];
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
  /** Username lisible ; repli = `changedBy` (id). */
  changedByLabel: string | null;
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

/** BR-20 : crée les 6 séquences (DEV1–DEV6) de l’année si absentes. */
export async function ensureEvaluationSessions(options: {
  academicYearId: string;
  schoolId?: string | null;
}): Promise<EvaluationSessionResponse[]> {
  return apiRequest<EvaluationSessionResponse[]>("/api/v1/evaluation-sessions/ensure", {
    method: "POST",
    body: {
      academicYearId: options.academicYearId,
      schoolId: options.schoolId?.trim() || null,
    },
  });
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

export async function updateEvaluationSessionSchedule(
  id: string,
  options: {
    examDate?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    entryDeadline?: string | null;
    schoolId?: string | null;
  },
): Promise<EvaluationSessionResponse> {
  return apiRequest<EvaluationSessionResponse>(
    `/api/v1/evaluation-sessions/${encodeURIComponent(id)}/schedule`,
    {
      method: "PUT",
      body: {
        examDate: options.examDate?.trim() || null,
        startDate: options.startDate?.trim() || null,
        endDate: options.endDate?.trim() || null,
        entryDeadline: options.entryDeadline?.trim() || null,
        schoolId: options.schoolId?.trim() || null,
      },
    },
  );
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
      ...payload,
      code: payload.code.trim().toUpperCase(),
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

/* ────────────────────────────────────────────────────────────────────────── */
/* Fiches de notes (GradeSheet) — saisie enseignant                           */
/* ────────────────────────────────────────────────────────────────────────── */

export type SheetStatus = "DRAFT" | "SUBMITTED" | "LOCKED";

export type AssessmentType =
  | "SEQUENCE_MARK"
  | "BONUS"
  | "MALUS"
  | "TEST"
  | "QUIZ"
  | "HOMEWORK"
  | "ORAL"
  | "PRACTICAL"
  | "EXAM"
  | "OTHER";

export type GradeStatus =
  | "SCORED"
  | "PENDING"
  | "ABSENT"
  | "ABSENT_EXCUSED"
  | "EXEMPTED";

export type SexCode = "MALE" | "FEMALE";

export type TotalizationRuleDto = {
  formula: string;
  minScore: string | number;
  maxScore: string | number;
  capAtMax: boolean;
};

export type GradeSheetResponse = {
  id: string;
  schoolId: string;
  academicYearId: string;
  classId: string;
  classSubjectId: string;
  sessionId: string;
  sessionNumber: number;
  teacherId: string | null;
  status: SheetStatus;
  totalization: TotalizationRuleDto;
  lastTotalizedAt: string | null;
};

export type AssessmentResponse = {
  id: string;
  schoolId: string;
  sheetId: string | null;
  classId: string;
  classSubjectId: string;
  sessionId: string;
  sessionNumber: number;
  title: string;
  type: AssessmentType;
  maxScore: string | number;
  weight: string | number;
  date: string | null;
  published: boolean;
};

export type CreateAssessmentPayload = {
  sheetId: string;
  title: string;
  type?: AssessmentType;
  maxScore?: number | string;
  weight?: number | string;
  date?: string | null;
  published?: boolean;
  schoolId?: string | null;
};

export type GradeResponse = {
  id: string;
  schoolId: string;
  assessmentId: string;
  studentId: string;
  enrollmentId: string;
  classId: string;
  classSubjectId: string;
  sessionId: string;
  value: string | number | null;
  status: GradeStatus;
  comment: string | null;
};

export type BatchGradeItemPayload = {
  studentId: string;
  status: GradeStatus;
  /** Obligatoire si `status === "SCORED"` ; `null` sinon (jamais 0 pour « non saisi »). */
  value?: number | string | null;
  comment?: string | null;
};

export type BatchUpsertGradesPayload = {
  assessmentId: string;
  grades: BatchGradeItemPayload[];
  /** Obligatoire si la séquence est CLOSED (BR-22). */
  reason?: string | null;
  schoolId?: string | null;
};

export type SequenceMarkResponse = {
  id: string;
  schoolId: string;
  sheetId: string;
  studentId: string;
  classSubjectId: string;
  sessionId: string;
  sessionNumber: number;
  termNumber: number;
  value: string | number | null;
  status: GradeStatus;
  source: "COMPUTED" | "MANUAL_OVERRIDE";
  computedAt: string | null;
};

/** Séquences de l’enseignant connecté (ou de toute l’école pour l’administration). */
export async function listGradeSheets(
  sessionId: string,
  schoolId?: string | null,
): Promise<GradeSheetResponse[]> {
  const qs = toSearch({ sessionId, ...schoolParams(schoolId) });
  return apiRequest<GradeSheetResponse[]>(`/api/v1/grade-sheets?${qs}`);
}

export async function getGradeSheet(
  id: string,
  schoolId?: string | null,
): Promise<GradeSheetResponse> {
  const qs = toSearch({ ...schoolParams(schoolId) });
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<GradeSheetResponse>(`/api/v1/grade-sheets/${encodeURIComponent(id)}${suffix}`);
}

export async function listAssessments(
  sheetId: string,
  schoolId?: string | null,
): Promise<AssessmentResponse[]> {
  const qs = toSearch({ sheetId, ...schoolParams(schoolId) });
  return apiRequest<AssessmentResponse[]>(`/api/v1/assessments?${qs}`);
}

export async function createAssessment(
  payload: CreateAssessmentPayload,
): Promise<AssessmentResponse> {
  return apiRequest<AssessmentResponse>("/api/v1/assessments", {
    method: "POST",
    body: {
      sheetId: payload.sheetId,
      title: payload.title.trim(),
      type: payload.type ?? "SEQUENCE_MARK",
      maxScore: payload.maxScore ?? 20,
      weight: payload.weight ?? 1,
      date: payload.date ?? null,
      published: payload.published ?? true,
      schoolId: payload.schoolId?.trim() || null,
    },
  });
}

export async function listGrades(
  assessmentId: string,
  schoolId?: string | null,
): Promise<GradeResponse[]> {
  const qs = toSearch({ assessmentId, ...schoolParams(schoolId) });
  return apiRequest<GradeResponse[]>(`/api/v1/grades?${qs}`);
}

/** Enregistre plusieurs notes d’une colonne (passe par GradeService : BR-11 à BR-18). */
export async function batchUpsertGrades(
  payload: BatchUpsertGradesPayload,
): Promise<GradeResponse[]> {
  return apiRequest<GradeResponse[]>("/api/v1/grades/batch", {
    method: "POST",
    body: {
      assessmentId: payload.assessmentId,
      grades: payload.grades.map((g) => ({
        studentId: g.studentId,
        status: g.status,
        value: g.status === "SCORED" ? (g.value ?? null) : null,
        comment: g.comment?.trim() || null,
      })),
      reason: payload.reason?.trim() || null,
      schoolId: payload.schoolId?.trim() || null,
    },
  });
}

/** Notes de séquence calculées (moyenne des colonnes + bonus − malus, plafonnée à 20 — Q-25). */
export async function listSheetSequenceMarks(
  sheetId: string,
  schoolId?: string | null,
): Promise<SequenceMarkResponse[]> {
  const qs = toSearch({ ...schoolParams(schoolId) });
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<SequenceMarkResponse[]>(
    `/api/v1/grade-sheets/${encodeURIComponent(sheetId)}/sequence-marks${suffix}`,
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Fiche de report de notes (GradeReportSheet)                                */
/* ────────────────────────────────────────────────────────────────────────── */

export type ReportSheetStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "VISA_SG"
  | "VISA_PRINCIPAL"
  | "REJECTED";

export type ReportSheetVisaDto = {
  userId: string;
  at: string;
};

export type ReportSheetSequenceCellDto = {
  mark: string | number | null;
  markStatus: GradeStatus;
  coefficient: string | number | null;
  weightedMark: string | number | null;
  rank: number | null;
  appreciation: string | null;
  appreciationOverride: string | null;
  displayedAppreciation: string | null;
};

export type GradeReportSheetLineDto = {
  rollNumber: number | null;
  studentId: string;
  studentLabel: string;
  sex: SexCode | null;
  sequence1: ReportSheetSequenceCellDto;
  sequence2: ReportSheetSequenceCellDto;
};

export type GradeReportSheetResponse = {
  id: string;
  schoolId: string;
  academicYearId: string;
  classId: string;
  classSubjectId: string;
  termNumber: number;
  teacherId: string | null;
  status: ReportSheetStatus;
  teacherLabel: string | null;
  subjectLabel: LocalizedTextDto;
  classLabel: string | null;
  coefficient: string | number;
  headcount: number;
  boysCount: number;
  girlsCount: number;
  sexCountWarning: boolean;
  sequence1ExamDate: string | null;
  sequence2ExamDate: string | null;
  sequence1Number: number | null;
  sequence2Number: number | null;
  appreciationScaleCode: string | null;
  deadlineWarning: boolean;
  lines: GradeReportSheetLineDto[];
  submittedAt: string | null;
  visaSupervisor: ReportSheetVisaDto | null;
  visaPrincipal: ReportSheetVisaDto | null;
  rejectionReason: string | null;
};

export type GenerateReportSheetPayload = {
  classSubjectId: string;
  termNumber: number;
  /** true : noms seuls, cellules vides (saisie manuscrite — Q-36). */
  blank?: boolean;
  schoolId?: string | null;
};

export async function listGradeReportSheets(
  academicYearId: string,
  termNumber: number,
  schoolId?: string | null,
): Promise<GradeReportSheetResponse[]> {
  const qs = toSearch({ academicYearId, termNumber, ...schoolParams(schoolId) });
  return apiRequest<GradeReportSheetResponse[]>(`/api/v1/grade-report-sheets?${qs}`);
}

export async function getGradeReportSheet(
  id: string,
  schoolId?: string | null,
): Promise<GradeReportSheetResponse> {
  const qs = toSearch({ ...schoolParams(schoolId) });
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<GradeReportSheetResponse>(
    `/api/v1/grade-report-sheets/${encodeURIComponent(id)}${suffix}`,
  );
}

/** Crée (ou régénère en brouillon) la fiche de report d’une matière pour un trimestre. */
export async function generateGradeReportSheet(
  payload: GenerateReportSheetPayload,
): Promise<GradeReportSheetResponse> {
  return apiRequest<GradeReportSheetResponse>("/api/v1/grade-report-sheets/generate", {
    method: "POST",
    body: {
      classSubjectId: payload.classSubjectId,
      termNumber: payload.termNumber,
      blank: payload.blank ?? false,
      schoolId: payload.schoolId?.trim() || null,
    },
  });
}

/** Régénère une fiche existante (remplie ou vierge) ; repasse en DRAFT. */
export async function regenerateGradeReportSheet(
  id: string,
  options: { blank?: boolean; schoolId?: string | null } = {},
): Promise<GradeReportSheetResponse> {
  const qs = toSearch({
    blank: options.blank ? "true" : "false",
    ...schoolParams(options.schoolId),
  });
  return apiRequest<GradeReportSheetResponse>(
    `/api/v1/grade-report-sheets/${encodeURIComponent(id)}/regenerate?${qs}`,
    { method: "POST" },
  );
}

export async function submitGradeReportSheet(
  id: string,
  schoolId?: string | null,
): Promise<GradeReportSheetResponse> {
  const qs = toSearch({ ...schoolParams(schoolId) });
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<GradeReportSheetResponse>(
    `/api/v1/grade-report-sheets/${encodeURIComponent(id)}/submit${suffix}`,
    { method: "POST" },
  );
}

/** Visa du Surveillant Général (fiche SUBMITTED → VISA_SG). Rôles : SG, administration, directeur. */
export async function visaSupervisorReportSheet(
  id: string,
  schoolId?: string | null,
): Promise<GradeReportSheetResponse> {
  const qs = toSearch({ ...schoolParams(schoolId) });
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<GradeReportSheetResponse>(
    `/api/v1/grade-report-sheets/${encodeURIComponent(id)}/visa-supervisor${suffix}`,
    { method: "POST" },
  );
}

/** Visa final du Principal (fiche → VISA_PRINCIPAL). Réservé au directeur (et super-admin). */
export async function visaPrincipalReportSheet(
  id: string,
  schoolId?: string | null,
): Promise<GradeReportSheetResponse> {
  const qs = toSearch({ ...schoolParams(schoolId) });
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<GradeReportSheetResponse>(
    `/api/v1/grade-report-sheets/${encodeURIComponent(id)}/visa-principal${suffix}`,
    { method: "POST" },
  );
}

/** Rejette une fiche déjà soumise ; le motif est obligatoire. */
export async function rejectGradeReportSheet(
  id: string,
  options: { reason: string; schoolId?: string | null },
): Promise<GradeReportSheetResponse> {
  return apiRequest<GradeReportSheetResponse>(
    `/api/v1/grade-report-sheets/${encodeURIComponent(id)}/reject`,
    {
      method: "POST",
      body: {
        reason: options.reason.trim(),
        schoolId: options.schoolId?.trim() || null,
      },
    },
  );
}

/** PDF A4 paysage de la fiche de report (blob). */
export async function downloadGradeReportSheetPdf(
  id: string,
  options: { schoolId?: string | null; language?: "FR" | "EN" } = {},
): Promise<Blob> {
  const baseUrl = getTenantConfig().apiBaseUrl.replace(/\/$/, "") || "http://localhost:8090";
  const token = openSecret(useAuthStore.getState().accessToken);
  const qs = toSearch({
    language: options.language ?? null,
    ...schoolParams(options.schoolId),
  });
  const suffix = qs ? `?${qs}` : "";
  const response = await fetch(
    `${baseUrl}/api/v1/grade-report-sheets/${encodeURIComponent(id)}/pdf${suffix}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  if (!response.ok) {
    throw new Error(`PDF ${response.status}`);
  }
  return response.blob();
}

/** BR-80 — demande de correction post-clôture. */
export type GradeCorrectionStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type GradeCorrectionEvidenceDto = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  capturedAt: string;
};

export type GradeCorrectionRequestResponse = {
  id: string;
  schoolId: string;
  academicYearId: string;
  sessionId: string;
  sessionNumber: number;
  classId: string;
  classSubjectId: string;
  assessmentId: string;
  studentId: string;
  studentLabel: string;
  classLabel: string | null;
  subjectLabelFr: string | null;
  subjectLabelEn: string | null;
  teacherId: string | null;
  teacherLabel: string | null;
  previousStatus: GradeStatus;
  previousValue: string | number | null;
  proposedStatus: GradeStatus;
  proposedValue: string | number | null;
  reason: string;
  evidence: GradeCorrectionEvidenceDto[];
  status: GradeCorrectionStatus;
  requestedBy: string;
  requestedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
};

export type CreateGradeCorrectionPayload = {
  sessionId: string;
  classSubjectId: string;
  studentId: string;
  reason: string;
  proposedValue?: string | null;
  proposedStatus?: GradeStatus | null;
  evidence?: Array<{ fileName: string; contentType: string; base64Data: string }>;
  schoolId?: string | null;
};

export async function createGradeCorrectionRequest(
  payload: CreateGradeCorrectionPayload,
): Promise<GradeCorrectionRequestResponse> {
  return apiRequest<GradeCorrectionRequestResponse>("/api/v1/grade-correction-requests", {
    method: "POST",
    body: {
      sessionId: payload.sessionId,
      classSubjectId: payload.classSubjectId,
      studentId: payload.studentId,
      reason: payload.reason,
      proposedValue: payload.proposedValue ?? null,
      proposedStatus: payload.proposedStatus ?? "SCORED",
      evidence: payload.evidence ?? [],
      schoolId: payload.schoolId?.trim() || null,
    },
  });
}

export async function listPendingGradeCorrections(
  schoolId?: string | null,
): Promise<GradeCorrectionRequestResponse[]> {
  const qs = toSearch({ ...schoolParams(schoolId) });
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<GradeCorrectionRequestResponse[]>(
    `/api/v1/grade-correction-requests/pending${suffix}`,
  );
}

export async function listSheetGradeCorrections(
  sessionId: string,
  classSubjectId: string,
  schoolId?: string | null,
): Promise<GradeCorrectionRequestResponse[]> {
  const qs = toSearch({
    sessionId,
    classSubjectId,
    ...schoolParams(schoolId),
  });
  return apiRequest<GradeCorrectionRequestResponse[]>(
    `/api/v1/grade-correction-requests?${qs}`,
  );
}

export async function approveGradeCorrection(
  id: string,
  schoolId?: string | null,
): Promise<GradeCorrectionRequestResponse> {
  const qs = toSearch({ ...schoolParams(schoolId) });
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<GradeCorrectionRequestResponse>(
    `/api/v1/grade-correction-requests/${encodeURIComponent(id)}/approve${suffix}`,
    { method: "POST" },
  );
}

export async function rejectGradeCorrection(
  id: string,
  reviewNote: string,
  schoolId?: string | null,
): Promise<GradeCorrectionRequestResponse> {
  return apiRequest<GradeCorrectionRequestResponse>(
    `/api/v1/grade-correction-requests/${encodeURIComponent(id)}/reject`,
    {
      method: "POST",
      body: { reviewNote, schoolId: schoolId?.trim() || null },
    },
  );
}

export async function fetchGradeCorrectionEvidence(
  requestId: string,
  evidenceId: string,
  schoolId?: string | null,
): Promise<Blob> {
  const qs = toSearch({ ...schoolParams(schoolId) });
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<Blob>(
    `/api/v1/grade-correction-requests/${encodeURIComponent(requestId)}/evidence/${encodeURIComponent(evidenceId)}${suffix}`,
    { responseType: "blob" },
  );
}
