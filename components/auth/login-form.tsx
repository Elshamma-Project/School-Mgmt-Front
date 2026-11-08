"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { LoginLoading } from "@/components/auth/login-loading";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { createMockLogin, isComingSoonRole, listMockRoles } from "@/lib/auth/mock-users";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import { notify } from "@/lib/ui/notify";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import type { AppRole } from "@/types/auth";

const LOGIN_MIN_MS = 900;

export function LoginForm() {
  const t = useTranslations("auth");
  const tRoles = useTranslations("roles");
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [demoMode, setDemoMode] = useState(true);
  const [role, setRole] = useState<AppRole>("TEACHER");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!demoMode || submitting) return;

    setSubmitting(true);
    const started = Date.now();
    const response = createMockLogin(role);

    setSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
      mustChangePassword: false,
      isMock: true,
    });

    const elapsed = Date.now() - started;
    if (elapsed < LOGIN_MIN_MS) {
      await new Promise((resolve) => setTimeout(resolve, LOGIN_MIN_MS - elapsed));
    }

    notify.success(t("loginSuccess"), {
      description: tRoles(`${role}.label`),
    });
    router.replace(getRoleHomePath(role));
  }

  return (
    <>
      <LoginLoading open={submitting} roleLabel={tRoles(`${role}.label`)} />

      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5" noValidate>
        <div className="rounded-[var(--radius-md)] bg-[var(--ios-fill)] px-3.5 py-3">
          <Checkbox
            id="demo-mode"
            checked={demoMode}
            disabled={submitting}
            onChange={(event) => setDemoMode(event.target.checked)}
            label={t("demoMode")}
          />
          <p className="mt-1.5 pl-7 text-[var(--text-footnote)] leading-snug text-[var(--ios-secondary-label)]">
            {t("demoModeHint")}
          </p>
        </div>

        {demoMode ? (
          <fieldset disabled={submitting}>
            <Label id="role-picker-label">{t("chooseRole")}</Label>
            <div
              role="radiogroup"
              aria-labelledby="role-picker-label"
              className="mt-2 max-h-[320px] overflow-y-auto overflow-hidden rounded-[var(--radius-md)] bg-[var(--ios-fill)]"
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
                      "pressable flex w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-3 text-left",
                      index > 0 && "border-t border-[var(--ios-separator)]",
                      selected && "bg-[var(--ios-card)]",
                    )}
                  >
                    <span>
                      <span className="block text-[var(--text-body)] font-medium text-[var(--ios-label)]">
                        {tRoles(`${value}.label`)}
                        {isComingSoonRole(value) ? (
                          <span className="ml-2 text-[var(--text-caption)] font-normal text-[var(--ios-warning)]">
                            · {t("rolePreview")}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-[var(--text-footnote)] text-[var(--ios-secondary-label)]">
                        {tRoles(`${value}.hint`)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
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
          <Alert tone="warning" title={t("apiDisabled")} />
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!demoMode || submitting}
          loading={submitting}
        >
          {submitting ? t("submitting") : t("submit")}
        </Button>
      </form>
    </>
  );
}
