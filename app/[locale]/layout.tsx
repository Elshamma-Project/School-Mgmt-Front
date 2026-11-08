import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Toaster } from "sonner";
import { routing } from "@/i18n/routing";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

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
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full font-sans">
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              className:
                "!rounded-[12px] !border-0 !bg-[var(--ios-card)] !text-[var(--ios-label)] !shadow-[0_8px_30px_rgba(0,0,0,0.12)]",
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
