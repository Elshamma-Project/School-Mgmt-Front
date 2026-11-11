import { apiRequest } from "./client";
import type { LocalizedTextDto } from "./academic";

export type ContactInfoDto = {
  phones: string[];
  email: string | null;
  address: string | null;
  city: string | null;
};

export type OfficialHeaderDto = {
  cycles: string[];
  republic: LocalizedTextDto;
  motto: LocalizedTextDto;
  ministry: LocalizedTextDto;
  regionalDelegation: LocalizedTextDto | null;
  divisionalDelegation: LocalizedTextDto | null;
};

export type SchoolResponse = {
  id: string;
  code: string;
  name: LocalizedTextDto;
  shortName: string | null;
  officialHeaders: OfficialHeaderDto[];
  contact: ContactInfoDto;
  postalBox: string | null;
  signaturePlace: string | null;
  headTitle: LocalizedTextDto | null;
  headOfSchoolStaffId: string | null;
  logoFileId: string | null;
  hasLogo: boolean;
  reportCardNotice: LocalizedTextDto | null;
  reportCardDisclaimer: LocalizedTextDto | null;
  timezone: string;
  active: boolean;
};

export type UpdateSchoolPayload = {
  name: LocalizedTextDto;
  shortName?: string | null;
  officialHeaders?: OfficialHeaderDto[];
  contact?: ContactInfoDto;
  postalBox?: string | null;
  signaturePlace?: string | null;
  headTitle?: LocalizedTextDto | null;
  headOfSchoolStaffId?: string | null;
  reportCardNotice?: LocalizedTextDto | null;
  reportCardDisclaimer?: LocalizedTextDto | null;
  timezone?: string;
  active?: boolean;
};

export async function listSchools(): Promise<SchoolResponse[]> {
  return apiRequest<SchoolResponse[]>("/api/v1/schools");
}

/** École du jeton (ou première pour SUPER_ADMIN). */
export async function getMySchool(schoolId?: string | null): Promise<SchoolResponse | null> {
  if (schoolId) {
    return apiRequest<SchoolResponse>(`/api/v1/schools/${schoolId}`);
  }
  const schools = await listSchools();
  return schools[0] ?? null;
}

export async function updateSchool(
  id: string,
  payload: UpdateSchoolPayload,
): Promise<SchoolResponse> {
  return apiRequest<SchoolResponse>(`/api/v1/schools/${id}`, {
    method: "PUT",
    body: {
      name: payload.name,
      shortName: payload.shortName ?? null,
      officialHeaders: payload.officialHeaders ?? [],
      contact: payload.contact ?? { phones: [], email: null, address: null, city: null },
      postalBox: payload.postalBox ?? null,
      signaturePlace: payload.signaturePlace ?? null,
      headTitle: payload.headTitle ?? null,
      headOfSchoolStaffId: payload.headOfSchoolStaffId ?? null,
      reportCardNotice: payload.reportCardNotice ?? null,
      reportCardDisclaimer: payload.reportCardDisclaimer ?? null,
      timezone: payload.timezone ?? "Africa/Douala",
      active: payload.active ?? true,
    },
  });
}

export async function uploadSchoolLogo(schoolId: string, file: File): Promise<SchoolResponse> {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<SchoolResponse>(`/api/v1/schools/${schoolId}/logo`, {
    method: "PUT",
    body: form,
  });
}

export async function fetchSchoolLogoBlob(schoolId: string): Promise<Blob | null> {
  try {
    return await apiRequest<Blob>(`/api/v1/schools/${schoolId}/logo`, {
      responseType: "blob",
      clearSessionOnFailure: false,
    });
  } catch {
    return null;
  }
}

export async function deleteSchoolLogo(schoolId: string): Promise<SchoolResponse> {
  return apiRequest<SchoolResponse>(`/api/v1/schools/${schoolId}/logo`, {
    method: "DELETE",
  });
}

export async function setCurrentAcademicYear(
  yearId: string,
  schoolId?: string | null,
): Promise<void> {
  const qs = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : "";
  await apiRequest(`/api/v1/academic-years/${yearId}/set-current${qs}`, {
    method: "POST",
    responseType: "json",
  });
}
