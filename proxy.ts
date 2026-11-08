import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_LEGACY_NAME,
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_PRESENT,
} from "@/lib/auth/constants";
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

function hasSessionCookie(request: NextRequest): boolean {
  const current = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (current === AUTH_COOKIE_PRESENT || Boolean(current)) return true;
  const legacy = request.cookies.get(AUTH_COOKIE_LEGACY_NAME)?.value;
  return Boolean(legacy);
}

/**
 * Proxy léger (i18n).
 * Ne redirige PLUS vers /login si le cookie manque : les jetons vivent en localStorage
 * et un F5 avant JS ne doit pas déconnecter. AuthGuard client = source de vérité.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { locale, path } = stripLocale(pathname);
  const hasSession = hasSessionCookie(request);

  // Cookie opaque présent + page login → évite le formulaire inutile.
  if (hasSession && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
