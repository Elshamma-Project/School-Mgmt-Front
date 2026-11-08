import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { StoreHydration } from "@/components/providers/store-hydration";
import { AppToaster } from "@/components/ui/toaster";
import { routing } from "@/i18n/routing";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Pas de `cookies()` ici : évite de forcer toute la route en dynamique
 * (accélère le premier paint). Le thème est appliqué côté client (theme-store).
 */
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

  return (
    <html lang={locale} className="h-full antialiased" suppressHydrationWarning>
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
