import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

type LoginPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("auth");
  const tCommon = await getTranslations("common");

  return (
    <div className="relative flex min-h-dvh flex-col bg-[var(--ios-bg)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,122,255,0.08),_transparent_55%)]"
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-10">
        <div className="mb-8 w-full max-w-[380px] text-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--ios-secondary-label)]">
            {tCommon("schoolName")}
          </p>
          <h1 className="mt-2 text-[40px] font-bold tracking-[-0.03em] text-[var(--ios-label)]">
            {tCommon("appName")}
          </h1>
          <p className="mt-3 text-[17px] leading-relaxed text-[var(--ios-secondary-label)]">
            {t("loginSubtitle")}
          </p>
        </div>

        <div className="w-full max-w-[380px] rounded-[16px] bg-[var(--ios-card)] p-6 shadow-[var(--ios-shadow)]">
          <h2 className="mb-5 text-[22px] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
            {t("loginTitle")}
          </h2>
          <LoginForm />
        </div>

        <div className="mt-8">
          <LocaleSwitcher />
        </div>
      </div>
    </div>
  );
}
