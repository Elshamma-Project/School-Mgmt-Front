import { getTranslations } from "next-intl/server";
import { ChangePasswordStub } from "@/components/auth/change-password-stub";
import { AppFooter } from "@/components/layout/app-footer";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

export const instant = false;

export default async function ChangePasswordPage() {
  const t = await getTranslations("auth");
  const tCommon = await getTranslations("common");

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--ios-bg)]">
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10">
        <div className="mb-8 w-full max-w-[380px] text-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--ios-secondary-label)]">
            {tCommon("appName")}
          </p>
          <h1 className="mt-2 text-[28px] font-bold tracking-[-0.02em] text-[var(--ios-label)]">
            {t("changePasswordTitle")}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--ios-secondary-label)]">
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
