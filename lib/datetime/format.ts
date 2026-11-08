/** Affichage Africa/Douala — dates Instant ISO. */
export function formatInstant(
  value: string | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  },
): string | null {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: "Africa/Douala",
    }).format(new Date(value));
  } catch {
    return null;
  }
}
