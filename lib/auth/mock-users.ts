import type { AppRole, AuthUser, LoginResponse } from "@/types/auth";

type MockPersona = {
  role: AppRole;
  username: string;
  displayName: string;
  email: string;
};

const PERSONAS: Record<AppRole, MockPersona> = {
  teacher: {
    role: "teacher",
    username: "demo.enseignant",
    displayName: "Amina Ngo",
    email: "amina.ngo@elshammah.cm",
  },
  staff: {
    role: "staff",
    username: "demo.staff",
    displayName: "Paul Mbarga",
    email: "paul.mbarga@elshammah.cm",
  },
  super_admin: {
    role: "super_admin",
    username: "demo.admin",
    displayName: "Claire Fouda",
    email: "claire.fouda@elshammah.cm",
  },
  guardian: {
    role: "guardian",
    username: "demo.parent",
    displayName: "Jean Owona",
    email: "jean.owona@email.cm",
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
  };

  return {
    accessToken: `mock-access-${role}`,
    refreshToken: `mock-refresh-${role}`,
    mustChangePassword: false,
    user,
  };
}

export function listMockRoles(): AppRole[] {
  return Object.keys(PERSONAS) as AppRole[];
}
