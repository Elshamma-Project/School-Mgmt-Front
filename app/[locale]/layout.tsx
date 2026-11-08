import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { StoreHydration } from "@/components/providers/store-hydration";
import { AppToaster } from "@/components/ui/toaster";
import { THEME_COOKIE_NAME, isAppTheme } from "@/lib/theme/constants";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/** Locale dans l’URL : ce layout peut bloquer ; les pages enfants restent éligibles à Instant. */
export const instant = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: {
    default: "SMELS — El Shammah",
    template: "%s · SMELS",
  },
  description: "School Management System — El Shammah (Cameroon)",
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const themeCookie = (await cookies()).get(THEME_COOKIE_NAME)?.value;
  const theme = isAppTheme(themeCookie) ? themeCookie : "light";

  return (
    <html
      lang={locale}
      className={cn("h-full antialiased", theme === "dark" && "dark")}
      style={{ colorScheme: theme }}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans">
        <NextIntlClientProvider messages={messages}>
          <StoreHydration />
          {children}
          <AppToaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
