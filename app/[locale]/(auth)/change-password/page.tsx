import { getTranslations } from "next-intl/server";
import { ChangePasswordStub } from "@/components/auth/change-password-stub";
import { AppFooter } from "@/components/layout/app-footer";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

export const instant = false;

export default async function ChangePasswordPage() {
  const t = await getTranslations("auth");
  const tCommon = await getTranslations("common");

  return (
    <div className="relative flex min-h-dvh flex-col bg-[var(--ios-bg)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--ios-blue)_12%,transparent),_transparent_55%)]"
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-10">
        <div className="mb-8 w-full max-w-[380px] text-center">
          <p className="text-[var(--text-footnote)] font-semibold uppercase tracking-[0.12em] text-[var(--ios-secondary-label)]">
            {tCommon("schoolName")}
          </p>
          <h1 className="mt-2 text-[var(--text-title1)] font-bold tracking-[-0.03em] text-[var(--ios-label)]">
            {t("changePasswordTitle")}
          </h1>
          <p className="mt-3 text-[var(--text-body)] leading-relaxed text-[var(--ios-secondary-label)]">
            {t("changePasswordSubtitle")}
          </p>
        </div>

        <div className="w-full max-w-[380px] rounded-[var(--radius-xl)] bg-[var(--ios-card)] p-6 shadow-[var(--ios-shadow)]">
          <ChangePasswordStub />
        </div>

        <div className="mt-8">
          <LocaleSwitcher />
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
