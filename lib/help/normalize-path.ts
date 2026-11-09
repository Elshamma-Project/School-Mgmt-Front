const ROLE_PREFIXES = new Set([
  "administration",
  "director",
  "teacher",
  "surveillant-general",
  "parent",
  "student",
  "super-admin",
]);

/**
 * Retire le préfixe d’espace de travail pour matcher `docs/rag`.
 * `/administration/academic/classes/x` → `/academic/classes/x`
 */
export function normalizeAppPath(pathname: string): string {
  const clean = pathname.split("?")[0] ?? pathname;
  const parts = clean.split("/").filter(Boolean);
  if (parts.length > 0 && ROLE_PREFIXES.has(parts[0]!)) {
    parts.shift();
  }
  return `/${parts.join("/")}`;
}

export function pathMatchesRule(
  rulePath: string,
  normalizedPath: string,
  excludeLast?: string[],
): boolean {
  if (rulePath === "/**") return true;

  const last = normalizedPath.split("/").filter(Boolean).pop();
  if (excludeLast?.length && last && excludeLast.includes(last)) {
    return false;
  }

  if (rulePath.endsWith("/*")) {
    const base = rulePath.slice(0, -2);
    if (normalizedPath === base) return false;
    if (!normalizedPath.startsWith(`${base}/`)) return false;
    const rest = normalizedPath.slice(base.length + 1);
    return rest.length > 0 && !rest.includes("/");
  }

  if (rulePath.endsWith("/**")) {
    const base = rulePath.slice(0, -3);
    return normalizedPath === base || normalizedPath.startsWith(`${base}/`);
  }

  return normalizedPath === rulePath;
}
