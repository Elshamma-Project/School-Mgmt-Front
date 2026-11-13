import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { LoginBrand } from "@/components/auth/login-brand";
import { LoginForm } from "@/components/auth/login-form";
import { SessionRestorer } from "@/components/auth/session-restorer";
import { AppFooter } from "@/components/layout/app-footer";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getTenantConfig } from "@/lib/tenant/config";

/** Traductions next-intl = runtime locale → hors shell Instant pour l’instant. */
export const instant = false;

export default async function LoginPage() {
  const t = await getTranslations("auth");
  // Lu côté serveur via refs statiques NEXT_PUBLIC_* (.env), passé au formulaire client.
  const schoolId = getTenantConfig().schoolId;

  return (
    <div className="relative flex min-h-dvh flex-col bg-[var(--ios-bg)]">
      <Suspense fallback={null}>
        <SessionRestorer />
      </Suspense>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--ios-blue)_12%,transparent),_transparent_55%)]"
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-10">
        <LoginBrand schoolId={schoolId} />

        <div className="w-full max-w-[380px] rounded-[var(--radius-xl)] bg-[var(--ios-card)] p-6 shadow-[var(--ios-shadow)]">
          <h2 className="mb-5 text-[var(--text-title2)] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
            {t("loginTitle")}
          </h2>
          <LoginForm schoolId={schoolId} />
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          <ThemeToggle />
          <LocaleSwitcher className="w-auto" />
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
