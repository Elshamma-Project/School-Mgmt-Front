import { apiRequest } from "@/lib/api/client";

function schoolParams(schoolId?: string | null): Record<string, string> {
  const id = schoolId?.trim();
  return id ? { schoolId: id } : {};
}

function toSearch(params: Record<string, string | number | boolean | null | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    qs.set(key, String(value));
  }
  return qs.toString();
}

export type NotificationCategory =
  | "SESSION_CLOSED"
  | "CORRECTION_REQUESTED"
  | "CORRECTION_DECIDED"
  | "REPORT_SHEET_REJECTED"
  | "STAFF_SIGNAL"
  | "SYSTEM";

export type NotificationSeverity = "INFO" | "SUCCESS" | "WARNING" | "URGENT";

export type LocalizedTextDto = { fr: string | null; en: string | null };

export type InAppNotificationResponse = {
  id: string;
  schoolId: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: LocalizedTextDto;
  body: LocalizedTextDto;
  sourceEventType: string | null;
  resourceType: string | null;
  resourceId: string | null;
  deepLink: string | null;
  ackRequired: boolean;
  createdAt: string;
  readAt: string | null;
  ackedAt: string | null;
  unread: boolean;
  pendingAck: boolean;
};

export type StaffSignalCategory =
  | "DATA_ERROR"
  | "GRADE_ISSUE"
  | "MISSING_INFO"
  | "ACCESS_ISSUE"
  | "OTHER";

export type StaffSignalStatus = "OPEN" | "ACKNOWLEDGED" | "CLOSED";

export type StaffSignalResponse = {
  id: string;
  schoolId: string;
  authorAccountId: string;
  authorStaffId: string | null;
  authorLabel: string;
  category: StaffSignalCategory;
  subject: string;
  message: string;
  relatedSessionId: string | null;
  relatedSessionNumber: number | null;
  relatedClassSubjectId: string | null;
  status: StaffSignalStatus;
  createdAt: string;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  closedBy: string | null;
  closedAt: string | null;
  adminNote: string | null;
};

export type CreateStaffSignalPayload = {
  category: StaffSignalCategory;
  subject: string;
  message: string;
  relatedSessionId?: string | null;
  relatedSessionNumber?: number | null;
  relatedClassSubjectId?: string | null;
  schoolId?: string | null;
};

export async function listNotifications(
  opts?: { unreadOnly?: boolean; schoolId?: string | null },
): Promise<InAppNotificationResponse[]> {
  const qs = toSearch({
    unreadOnly: opts?.unreadOnly ? "true" : undefined,
    ...schoolParams(opts?.schoolId),
  });
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<InAppNotificationResponse[]>(`/api/v1/notifications${suffix}`);
}

export async function fetchUnreadNotificationCount(
  schoolId?: string | null,
): Promise<number> {
  const qs = toSearch({ ...schoolParams(schoolId) });
  const suffix = qs ? `?${qs}` : "";
  const res = await apiRequest<{ count: number }>(`/api/v1/notifications/unread-count${suffix}`);
  return res.count ?? 0;
}

export async function markNotificationRead(
  id: string,
  schoolId?: string | null,
): Promise<InAppNotificationResponse> {
  const qs = toSearch({ ...schoolParams(schoolId) });
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<InAppNotificationResponse>(
    `/api/v1/notifications/${encodeURIComponent(id)}/read${suffix}`,
    { method: "POST" },
  );
}

export async function acknowledgeNotification(
  id: string,
  schoolId?: string | null,
): Promise<InAppNotificationResponse> {
  const qs = toSearch({ ...schoolParams(schoolId) });
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<InAppNotificationResponse>(
    `/api/v1/notifications/${encodeURIComponent(id)}/ack${suffix}`,
    { method: "POST" },
  );
}

export async function createStaffSignal(
  payload: CreateStaffSignalPayload,
): Promise<StaffSignalResponse> {
  return apiRequest<StaffSignalResponse>("/api/v1/staff-signals", {
    method: "POST",
    body: {
      category: payload.category,
      subject: payload.subject,
      message: payload.message,
      relatedSessionId: payload.relatedSessionId ?? null,
      relatedSessionNumber: payload.relatedSessionNumber ?? null,
      relatedClassSubjectId: payload.relatedClassSubjectId ?? null,
      schoolId: payload.schoolId?.trim() || null,
    },
  });
}

export async function listMyStaffSignals(
  schoolId?: string | null,
): Promise<StaffSignalResponse[]> {
  const qs = toSearch({ ...schoolParams(schoolId) });
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<StaffSignalResponse[]>(`/api/v1/staff-signals/mine${suffix}`);
}

export async function listAdminStaffSignals(
  opts?: { status?: StaffSignalStatus | null; schoolId?: string | null },
): Promise<StaffSignalResponse[]> {
  const qs = toSearch({
    status: opts?.status ?? undefined,
    ...schoolParams(opts?.schoolId),
  });
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<StaffSignalResponse[]>(`/api/v1/staff-signals${suffix}`);
}

export async function acknowledgeStaffSignal(
  id: string,
  adminNote?: string,
  schoolId?: string | null,
): Promise<StaffSignalResponse> {
  return apiRequest<StaffSignalResponse>(
    `/api/v1/staff-signals/${encodeURIComponent(id)}/acknowledge`,
    {
      method: "POST",
      body: { adminNote: adminNote?.trim() || null, schoolId: schoolId?.trim() || null },
    },
  );
}

export async function closeStaffSignal(
  id: string,
  adminNote?: string,
  schoolId?: string | null,
): Promise<StaffSignalResponse> {
  return apiRequest<StaffSignalResponse>(
    `/api/v1/staff-signals/${encodeURIComponent(id)}/close`,
    {
      method: "POST",
      body: { adminNote: adminNote?.trim() || null, schoolId: schoolId?.trim() || null },
    },
  );
}
