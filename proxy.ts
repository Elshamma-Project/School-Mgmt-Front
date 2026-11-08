import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const PUBLIC_PATHS = new Set(["/login"]);

function stripLocale(pathname: string): { locale: string; path: string } {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];

  if (routing.locales.includes(maybeLocale as "fr" | "en")) {
    const rest = segments.slice(1).join("/");
    return { locale: maybeLocale, path: rest ? `/${rest}` : "/" };
  }

  return { locale: routing.defaultLocale, path: pathname || "/" };
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { locale, path } = stripLocale(pathname);
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isPublic = PUBLIC_PATHS.has(path);

  if (!token && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  if (token && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
