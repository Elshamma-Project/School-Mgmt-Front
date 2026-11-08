export const THEME_STORAGE_KEY = "smels-theme";
export const THEME_COOKIE_NAME = "smels-theme";

export type AppTheme = "light" | "dark";

export function isAppTheme(value: string | undefined | null): value is AppTheme {
  return value === "light" || value === "dark";
}
