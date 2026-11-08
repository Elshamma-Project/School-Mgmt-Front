/** Rôles alignés sur `docs/05-roles-permissions.md` / module user (JWT). */
export const APP_ROLES = [
  "STUDENT",
  "PARENT",
  "TEACHER",
  "ADMINISTRATION",
  "DIRECTOR",
  "SUPER_ADMIN",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** Rôles proposés en connexion démo (élève activé plus tard côté prod). */
export const DEMO_LOGIN_ROLES: AppRole[] = [
  "TEACHER",
  "PARENT",
  "ADMINISTRATION",
  "DIRECTOR",
  "SUPER_ADMIN",
  "STUDENT",
];

export type AuthUser = {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  /** Rôle principal de la session (mock ou API). */
  role: AppRole;
  /** Union des rôles du compte (cumul possible). */
  roles: AppRole[];
  schoolId?: string;
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

/** Droit effectif = union des rôles du compte. */
export function userHasRole(user: AuthUser | null, role: AppRole): boolean {
  if (!user) return false;
  return user.roles.includes(role) || user.role === role;
}
