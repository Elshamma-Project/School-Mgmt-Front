"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listMyChildren,
  type GuardianLinkDto,
  type StudentResponse,
} from "@/lib/api/student";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError, isAuthFailure } from "@/types/api";

const STORAGE_KEY = "smels.parent.selectedChildId";

function readStoredId(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(STORAGE_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

function writeStoredId(id: string) {
  if (typeof window === "undefined") return;
  try {
    if (id) sessionStorage.setItem(STORAGE_KEY, id);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function childInitials(child: StudentResponse): string {
  const a = child.firstName?.trim()?.[0] ?? "";
  const b = child.lastName?.trim()?.[0] ?? "";
  const pair = `${a}${b}`.toUpperCase();
  return pair || child.fullName.slice(0, 2).toUpperCase() || "?";
}

export function guardianLinkForMe(
  child: StudentResponse,
  guardianProfileId: string | null | undefined,
): GuardianLinkDto | null {
  if (!guardianProfileId) return null;
  return child.guardians.find((g) => g.guardianId === guardianProfileId) ?? null;
}

/** Charge les enfants liés et mémorise l’enfant sélectionné (session). */
export function useParentChildren() {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId;
  const guardianId = user?.profileType === "GUARDIAN" ? user.profileId : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [children, setChildren] = useState<StudentResponse[]>([]);
  const [selectedId, setSelectedIdState] = useState<string>("");

  const setSelectedId = useCallback((id: string) => {
    setSelectedIdState(id);
    writeStoredId(id);
  }, []);

  const reload = useCallback(async () => {
    if (!guardianId) {
      setChildren([]);
      setSelectedIdState("");
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listMyChildren(schoolId);
      const sorted = [...rows].sort((a, b) =>
        a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" }),
      );
      setChildren(sorted);
      const stored = readStoredId();
      const next =
        (stored && sorted.some((c) => c.id === stored) ? stored : null) ??
        sorted[0]?.id ??
        "";
      setSelectedIdState(next);
      writeStoredId(next);
    } catch (err) {
      if (isAuthFailure(err)) return;
      setChildren([]);
      setSelectedIdState("");
      setError(err instanceof ApiError && err.message ? err.message : "LOAD");
    } finally {
      setLoading(false);
    }
  }, [guardianId, schoolId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selected = useMemo(
    () => children.find((c) => c.id === selectedId) ?? null,
    [children, selectedId],
  );

  const link = useMemo(
    () => (selected ? guardianLinkForMe(selected, guardianId) : null),
    [selected, guardianId],
  );

  return {
    schoolId,
    guardianId,
    loading,
    error,
    children,
    selected,
    selectedId,
    setSelectedId,
    link,
    canViewGrades: link?.canViewGrades !== false,
    canDownloadReportCards: link?.canDownloadReportCards !== false,
    reload,
  };
}
