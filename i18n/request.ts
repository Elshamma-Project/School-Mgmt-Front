import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing, type AppLocale } from "./routing";
import en from "../messages/en.json";
import fr from "../messages/fr.json";

/**
 * Imports statiques : avec Turbopack, `import(\`../messages/${locale}.json\`)`
 * peut renvoyer un module vide → SyntaxError « Unexpected end of JSON input ».
 */
const messagesByLocale: Record<AppLocale, typeof fr> = {
  fr,
  en,
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: AppLocale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    timeZone: "Africa/Douala",
    messages: messagesByLocale[locale],
  };
});
