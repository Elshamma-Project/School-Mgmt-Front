import { DEMO_LOGIN_ROLES, type AppRole, type AuthUser, type LoginResponse } from "@/types/auth";

type MockPersona = {
  role: AppRole;
  username: string;
  displayName: string;
  email: string;
  schoolId: string;
  /** Élève : démo seulement, prod plus tard. */
  comingSoon?: boolean;
};

const PERSONAS: Record<AppRole, MockPersona> = {
  TEACHER: {
    role: "TEACHER",
    username: "demo.enseignant",
    displayName: "Amina Ngo",
    email: "amina.ngo@elshammah.cm",
    schoolId: "school-el-shammah",
  },
  PARENT: {
    role: "PARENT",
    username: "demo.parent",
    displayName: "Jean Owona",
    email: "jean.owona@email.cm",
    schoolId: "school-el-shammah",
  },
  ADMINISTRATION: {
    role: "ADMINISTRATION",
    username: "demo.administration",
    displayName: "Paul Mbarga",
    email: "paul.mbarga@elshammah.cm",
    schoolId: "school-el-shammah",
  },
  DIRECTOR: {
    role: "DIRECTOR",
    username: "demo.directeur",
    displayName: "Claire Fouda",
    email: "claire.fouda@elshammah.cm",
    schoolId: "school-el-shammah",
  },
  SUPER_ADMIN: {
    role: "SUPER_ADMIN",
    username: "demo.super",
    displayName: "Support KOBE",
    email: "support@kobe.cm",
    schoolId: "platform",
  },
  STUDENT: {
    role: "STUDENT",
    username: "ELSH-2026-0001",
    displayName: "Élève démo",
    email: "eleve.demo@elshammah.cm",
    schoolId: "school-el-shammah",
    comingSoon: true,
  },
};

export function createMockLogin(role: AppRole): LoginResponse {
  const persona = PERSONAS[role];
  const user: AuthUser = {
    id: `mock-${role}`,
    username: persona.username,
    displayName: persona.displayName,
    email: persona.email,
    role,
    roles: [role],
    schoolId: persona.schoolId,
  };

  return {
    accessToken: `mock-access-${role}`,
    refreshToken: `mock-refresh-${role}`,
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
