export const APP_ROLES = [
  "teacher",
  "staff",
  "super_admin",
  "guardian",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type AuthUser = {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  /** Rôle principal de la session (mock ou API). */
  role: AppRole;
  roles: AppRole[];
};

export type LoginRequest = {
  username: string;
  password: string;
  schoolId?: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  mustChangePassword: boolean;
  user: AuthUser;
};

export type AuthSession = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  mustChangePassword: boolean;
  /** true tant que l’API réelle n’est pas branchée. */
  isMock: boolean;
};

export function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}

export function primaryRole(user: AuthUser | null): AppRole | null {
  if (!user) return null;
  return user.role ?? user.roles[0] ?? null;
}
