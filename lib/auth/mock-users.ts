import type { AppRole, AuthUser, LoginResponse } from "@/types/auth";

type MockPersona = {
  role: AppRole;
  username: string;
  displayName: string;
};

const PERSONAS: Record<AppRole, MockPersona> = {
  teacher: {
    role: "teacher",
    username: "demo.enseignant",
    displayName: "Enseignant démo",
  },
  staff: {
    role: "staff",
    username: "demo.staff",
    displayName: "Staff démo",
  },
  super_admin: {
    role: "super_admin",
    username: "demo.admin",
    displayName: "Super admin démo",
  },
  guardian: {
    role: "guardian",
    username: "demo.parent",
    displayName: "Parent / tuteur démo",
  },
};

export function createMockLogin(role: AppRole): LoginResponse {
  const persona = PERSONAS[role];
  const user: AuthUser = {
    id: `mock-${role}`,
    username: persona.username,
    displayName: persona.displayName,
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
