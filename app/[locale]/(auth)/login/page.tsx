import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";
import { SessionRestorer } from "@/components/auth/session-restorer";
import { AppFooter } from "@/components/layout/app-footer";
import { BrandMark } from "@/components/layout/brand-mark";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { getTenantConfig } from "@/lib/tenant/config";

/** Traductions next-intl = runtime locale → hors shell Instant pour l’instant. */
export const instant = false;

export default async function LoginPage() {
  const t = await getTranslations("auth");
  const tCommon = await getTranslations("common");
  // Lu côté serveur via refs statiques NEXT_PUBLIC_* (.env), passé au formulaire client.
  const schoolId = getTenantConfig().schoolId;

  return (
    <div className="relative flex min-h-dvh flex-col bg-[var(--ios-bg)]">
      <SessionRestorer />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--ios-blue)_12%,transparent),_transparent_55%)]"
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-10">
        <div className="mb-8 flex w-full max-w-[380px] flex-col items-center text-center">
          <BrandMark size="lg" alt={tCommon("schoolName")} className="mb-4" />
          <p className="text-[var(--text-footnote)] font-semibold uppercase tracking-[0.12em] text-[var(--ios-secondary-label)]">
            {tCommon("schoolName")}
          </p>
          <h1 className="mt-2 text-[var(--text-title1)] font-bold tracking-[-0.03em] text-[var(--ios-label)]">
            {tCommon("appName")}
          </h1>
        </div>

        <div className="w-full max-w-[380px] rounded-[var(--radius-xl)] bg-[var(--ios-card)] p-6 shadow-[var(--ios-shadow)]">
          <h2 className="mb-5 text-[var(--text-title2)] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
            {t("loginTitle")}
          </h2>
          <LoginForm schoolId={schoolId} />
        </div>

        <div className="mt-8">
          <LocaleSwitcher />
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
