import { HELP_CATALOG } from "@/lib/help/catalog";
import { normalizeAppPath, pathMatchesRule } from "@/lib/help/normalize-path";
import type { HelpArticle } from "@/lib/help/types";

export type ResolveHelpInput = {
  pathname: string;
  /** Ex. `tab` pour les hubs. */
  searchParams?: URLSearchParams | { get(name: string): string | null };
};

export function resolveHelpArticle(input: ResolveHelpInput): HelpArticle {
  const normalized = normalizeAppPath(input.pathname);
  const tab = input.searchParams?.get("tab")?.trim() || null;

  let best: HelpArticle | null = null;

  for (const article of HELP_CATALOG) {
    const matched = article.routes.some((rule) => {
      if (!pathMatchesRule(rule.path, normalized, rule.excludeLast)) return false;
      if (rule.tab != null) {
        // Hub avec onglet explicite dans la règle.
        return (tab ?? "") === rule.tab;
      }
      return true;
    });
    if (!matched) continue;
    if (!best || article.priority > best.priority) best = article;
  }

  return best ?? HELP_CATALOG[HELP_CATALOG.length - 1]!;
}

export function pickLocalized(
  value: { fr: string; en: string },
  locale: string,
): string {
  return locale.toLowerCase().startsWith("fr") ? value.fr : value.en;
}
