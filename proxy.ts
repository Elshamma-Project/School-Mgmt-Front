import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_LEGACY_NAME,
  AUTH_COOKIE_NAME,
} from "@/lib/auth/constants";
import { LOGOUT_QUERY } from "@/lib/auth/constants";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

function stripLocale(pathname: string): { locale: string; path: string } {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];

  if (routing.locales.includes(maybeLocale as "fr" | "en")) {
    const rest = segments.slice(1).join("/");
    return { locale: maybeLocale, path: rest ? `/${rest}` : "/" };
  }

  return { locale: routing.defaultLocale, path: pathname || "/" };
}

function clearSessionCookies(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  response.cookies.set(AUTH_COOKIE_LEGACY_NAME, "", { path: "/", maxAge: 0 });
}

/**
 * Proxy léger (i18n).
 * Ne redirige PAS vers /login si le cookie manque : jetons en localStorage,
 * AuthGuard client = source de vérité.
 * Ne redirige PAS /login → / sur cookie seul (évite boucle cookie périmé).
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { path } = stripLocale(pathname);
  const justLoggedOut = request.nextUrl.searchParams.get(LOGOUT_QUERY) === "1";

  // Après déconnexion : rester sur /login et purger les cookies de présence.
  if (path === "/login" && justLoggedOut) {
    const response = intlMiddleware(request);
    clearSessionCookies(response);
    return response;
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
