export type AuthUser = {
  id: string;
  username: string;
  displayName?: string;
  roles: string[];
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
};
