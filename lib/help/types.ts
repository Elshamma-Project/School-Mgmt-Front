/** Article d’aide — miroir runtime de `docs/rag/*.md`. */

export type LocalizedHelp = {
  fr: string;
  en: string;
};

export type HelpSection = {
  heading: LocalizedHelp;
  paragraphs: LocalizedHelp[];
  bullets?: LocalizedHelp[];
};

/** Règle de matching sur chemin normalisé (sans préfixe rôle). */
export type HelpRouteRule = {
  /** Exact : `/academic` — préfixe un segment : `/academic/classes/*` — tout : `/**` */
  path: string;
  /** Onglet query `?tab=` (hubs). */
  tab?: string;
  /** Exclure le dernier segment (ex. `create`). */
  excludeLast?: string[];
};

export type HelpArticle = {
  id: string;
  /** Source Markdown dans docs/rag. */
  source: string;
  priority: number;
  routes: HelpRouteRule[];
  title: LocalizedHelp;
  sections: HelpSection[];
};
