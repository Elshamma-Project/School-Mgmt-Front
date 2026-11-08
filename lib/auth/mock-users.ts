import { getTenantConfig } from "@/lib/tenant/config";
import { DEMO_LOGIN_ROLES, type AppRole, type AuthUser, type LoginResponse } from "@/types/auth";

type MockPersona = {
  role: AppRole;
  username: string;
  displayName: string;
  comingSoon?: boolean;
};

/**
 * Personas UI uniquement (NEXT_PUBLIC_ENABLE_DEMO_LOGIN).
 * schoolId vient de la config tenant — jamais hardcodé ici.
 */
const PERSONAS: Record<AppRole, MockPersona> = {
  TEACHER: {
    role: "TEACHER",
    username: "enseignant@elshammah.demo",
    displayName: "Demo Teacher",
  },
  PARENT: {
    role: "PARENT",
    username: "parent.demo@elshammah.demo",
    displayName: "Demo Parent",
  },
  ADMINISTRATION: {
    role: "ADMINISTRATION",
    username: "admin@elshammah.demo",
    displayName: "Demo Administration",
  },
  SURVEILLANT_GENERAL: {
    role: "SURVEILLANT_GENERAL",
    username: "surveillant@elshammah.demo",
    displayName: "Demo Surveillant",
  },
  DIRECTOR: {
    role: "DIRECTOR",
    username: "directeur@elshammah.demo",
    displayName: "Demo Director",
  },
  SUPER_ADMIN: {
    role: "SUPER_ADMIN",
    username: "superadmin@smels.local",
    displayName: "Demo Platform",
  },
  STUDENT: {
    role: "STUDENT",
    username: "eleve.demo@elshammah.demo",
    displayName: "Demo Student",
    comingSoon: true,
  },
};

export function createMockLogin(role: AppRole): LoginResponse {
  const persona = PERSONAS[role];
  const { schoolId: tenantSchoolId } = getTenantConfig();
  const schoolId = role === "SUPER_ADMIN" ? null : tenantSchoolId || null;
  const user: AuthUser = {
    id: `mock-${role}`,
    username: persona.username,
    displayName: persona.displayName,
    role,
    roles: [role],
    schoolId,
    profileType: role === "STUDENT" ? "STUDENT" : role === "PARENT" ? "GUARDIAN" : role === "SUPER_ADMIN" ? "NONE" : "STAFF",
    profileId: null,
    status: "ACTIVE",
  };

  return {
    accessToken: `mock-access-${role}`,
    refreshToken: `mock-refresh-${role}`,
    sessionId: `mock-session-${role}`,
    expiresInMs: 900_000,
    mustChangePassword: false,
    user,
  };
}

export function listMockRoles(): AppRole[] {
  return DEMO_LOGIN_ROLES;
}

export function isComingSoonRole(role: AppRole): boolean {
  return Boolean(PERSONAS[role]?.comingSoon);
}
