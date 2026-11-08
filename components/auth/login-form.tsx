"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createMockLogin, listMockRoles } from "@/lib/auth/mock-users";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import type { AppRole } from "@/types/auth";

export function LoginForm() {
  const t = useTranslations("auth");
  const tRoles = useTranslations("roles");
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [demoMode, setDemoMode] = useState(true);
  const [role, setRole] = useState<AppRole>("teacher");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!demoMode) return;

    setSubmitting(true);
    const response = createMockLogin(role);
    setSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
      mustChangePassword: false,
      isMock: true,
    });
    router.replace("/");
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5" noValidate>
      <label className="flex cursor-pointer items-start gap-3 rounded-[12px] bg-[var(--ios-fill)] px-3.5 py-3">
        <input
          type="checkbox"
          checked={demoMode}
          onChange={(event) => setDemoMode(event.target.checked)}
          className="mt-0.5 size-[18px] accent-[var(--ios-blue)]"
        />
        <span>
          <span className="block text-[15px] font-semibold text-[var(--ios-label)]">
            {t("demoMode")}
          </span>
          <span className="mt-0.5 block text-[13px] leading-snug text-[var(--ios-secondary-label)]">
            {t("demoModeHint")}
          </span>
        </span>
      </label>

      {demoMode ? (
        <fieldset>
          <Label id="role-picker-label">{t("chooseRole")}</Label>
          <div
            role="radiogroup"
            aria-labelledby="role-picker-label"
            className="mt-2 overflow-hidden rounded-[12px] bg-[var(--ios-fill)]"
          >
            {listMockRoles().map((value, index) => {
              const selected = role === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setRole(value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors",
                    index > 0 && "border-t border-[var(--ios-separator)]",
                    selected && "bg-[var(--ios-card)]",
                  )}
                >
                  <span>
                    <span className="block text-[17px] font-medium text-[var(--ios-label)]">
                      {tRoles(`${value}.label`)}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-[var(--ios-secondary-label)]">
                      {tRoles(`${value}.hint`)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border",
                      selected
                        ? "border-[var(--ios-blue)] bg-[var(--ios-blue)] text-white"
                        : "border-[var(--ios-fill-secondary)] bg-transparent text-transparent",
                    )}
                    aria-hidden
                  >
                    <Check className="size-3.5 stroke-[2.5]" />
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <p className="rounded-[12px] bg-[var(--ios-fill)] px-3.5 py-3 text-[14px] leading-relaxed text-[var(--ios-secondary-label)]">
          {t("apiDisabled")}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={!demoMode || submitting}>
        {submitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
