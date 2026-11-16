export const THEME_STORAGE_KEY = "bee-sm-theme";
export const THEME_COOKIE_NAME = "bee-sm-theme";

export type AppTheme = "light" | "dark";

export function isAppTheme(value: string | undefined | null): value is AppTheme {
  return value === "light" || value === "dark";
}
