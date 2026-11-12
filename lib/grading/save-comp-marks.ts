import {
  batchUpsertGrades,
  createAssessment,
  listAssessments,
  listGradeSheets,
  type EvaluationSessionResponse,
  type GradeStatus,
} from "@/lib/api/grading";
import { parseMarkInput } from "@/lib/grading/marks";

export type CompDraft = { value: string };

export type CompSaveItem = {
  sessionId: string;
  studentId: string;
  raw: string;
};

/**
 * Enregistre des Comp./20 (colonne SEQUENCE_MARK) puis laisse l’appelant régénérer la fiche de report.
 * BR-11…18 : écriture uniquement via GradeService (batch).
 */
export async function saveCompMarks(options: {
  classSubjectId: string;
  schoolId?: string | null;
  items: CompSaveItem[];
  columnTitle: string;
}): Promise<{ saved: number }> {
  const { classSubjectId, schoolId, items, columnTitle } = options;
  if (items.length === 0) return { saved: 0 };

  const bySession = new Map<string, CompSaveItem[]>();
  for (const item of items) {
    const list = bySession.get(item.sessionId) ?? [];
    list.push(item);
    bySession.set(item.sessionId, list);
  }

  let saved = 0;
  for (const [sessionId, sessionItems] of bySession) {
    const sheets = await listGradeSheets(sessionId, schoolId);
    const sheet = sheets.find((s) => s.classSubjectId === classSubjectId);
    if (!sheet) {
      throw new Error(`GRADE_SHEET_MISSING:${sessionId}`);
    }
    if (sheet.status === "LOCKED") {
      throw new Error("SHEET_LOCKED");
    }

    const assessments = await listAssessments(sheet.id, schoolId);
    let assessment = assessments.find((a) => a.type === "SEQUENCE_MARK") ?? null;
    if (!assessment) {
      assessment = await createAssessment({
        sheetId: sheet.id,
        title: columnTitle,
        type: "SEQUENCE_MARK",
        maxScore: 20,
        weight: 1,
        schoolId,
      });
    }

    const grades: Array<{ studentId: string; status: GradeStatus; value: string | null }> = [];
    for (const item of sessionItems) {
      const parsed = parseMarkInput(item.raw, 20);
      if (!parsed.ok) throw new Error(`INVALID_MARK:${item.studentId}`);
      grades.push({
        studentId: item.studentId,
        status: parsed.value === null ? "PENDING" : "SCORED",
        value: parsed.value,
      });
    }

    const rows = await batchUpsertGrades({
      assessmentId: assessment.id,
      grades,
      schoolId,
    });
    saved += rows.length;
  }

  return { saved };
}

export function sessionForSequenceNumber(
  sessions: EvaluationSessionResponse[],
  sequenceNumber: number | null | undefined,
): EvaluationSessionResponse | null {
  if (sequenceNumber == null) return null;
  return sessions.find((s) => s.number === sequenceNumber) ?? null;
}
