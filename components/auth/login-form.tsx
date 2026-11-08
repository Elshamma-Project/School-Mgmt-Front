"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Eye, EyeOff, KeyRound, UserRound } from "lucide-react";
import { LoginLoading } from "@/components/auth/login-loading";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { IconInput } from "@/components/ui/icon-input";
import { Label } from "@/components/ui/label";
import { login as apiLogin } from "@/lib/api/auth";
import { createMockLogin, isComingSoonRole, listMockRoles } from "@/lib/auth/mock-users";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import { getTenantConfig } from "@/lib/tenant/config";
import { notify } from "@/lib/ui/notify";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/types/api";
import type { AppRole } from "@/types/auth";
import { primaryRole } from "@/types/auth";

const LOGIN_MIN_MS = 700;

export function LoginForm() {
  const t = useTranslations("auth");
  const tRoles = useTranslations("roles");
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const tenant = useMemo(() => getTenantConfig(), []);

  const [demoMode, setDemoMode] = useState(false);
  const [role, setRole] = useState<AppRole>("DIRECTOR");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);

    if (demoMode) {
      if (!tenant.enableDemoLogin) {
        setFormError(t("demoDisabled"));
        return;
      }
      setSubmitting(true);
      const started = Date.now();
      const response = createMockLogin(role);
      setSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        sessionId: response.sessionId,
        user: response.user,
        mustChangePassword: response.mustChangePassword,
        isMock: true,
      });
      await waitMin(started);
      notify.success(t("loginSuccessDemo"), {
        description: tRoles(`${role}.label`),
      });
      router.replace(getRoleHomePath(role));
      setSubmitting(false);
      return;
    }

    const nextErrors: typeof fieldErrors = {};
    if (!username.trim()) nextErrors.username = t("requiredField");
    if (!password) nextErrors.password = t("requiredField");
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (!tenant.schoolId) {
      setFormError(t("schoolIdMissing"));
      return;
    }

    setSubmitting(true);
    const started = Date.now();
    try {
      // schoolId automatique (env / domaine). SUPER_ADMIN résolu côté API en secours.
      const response = await apiLogin({
        username: username.trim(),
        password,
        schoolId: tenant.schoolId,
        deviceLabel: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : undefined,
      });
      setSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        sessionId: response.sessionId,
        user: response.user,
        mustChangePassword: response.mustChangePassword,
        isMock: false,
      });
      await waitMin(started);
      const homeRole = primaryRole(response.user) ?? response.user.role;
      notify.success(t("loginSuccess"));
      if (response.mustChangePassword) {
        router.replace("/change-password");
      } else {
        router.replace(getRoleHomePath(homeRole));
      }
    } catch (error) {
      await waitMin(started);
      setFormError(mapLoginError(error, t));
    } finally {
      setSubmitting(false);
    }
  }

  const loadingRoleLabel = demoMode
    ? tRoles(`${role}.label`)
    : username.trim() || t("loginPreparingHint");

  return (
    <>
      <LoginLoading open={submitting} roleLabel={loadingRoleLabel} />

      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5" noValidate>
        {tenant.enableDemoLogin ? (
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
        ) : null}

        {demoMode && tenant.enableDemoLogin ? (
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
          <div className="flex flex-col gap-4">
            <Field id="login-username" label={t("username")} error={fieldErrors.username}>
              <IconInput
                id="login-username"
                icon={<UserRound className="size-4 stroke-[1.75]" />}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                invalid={Boolean(fieldErrors.username)}
                autoComplete="username"
                disabled={submitting}
              />
            </Field>

            <Field id="login-password" label={t("password")} error={fieldErrors.password}>
              <IconInput
                id="login-password"
                type={showPassword ? "text" : "password"}
                icon={<KeyRound className="size-4 stroke-[1.75]" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                invalid={Boolean(fieldErrors.password)}
                autoComplete="current-password"
                disabled={submitting}
                trailing={
                  <button
                    type="button"
                    tabIndex={-1}
                    disabled={submitting}
                    onClick={() => setShowPassword((v) => !v)}
                    className="pressable flex size-8 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-[var(--ios-secondary-label)] hover:bg-[var(--ios-fill-secondary)] hover:text-[var(--ios-label)] focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed"
                    aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4 stroke-[1.75]" aria-hidden />
                    ) : (
                      <Eye className="size-4 stroke-[1.75]" aria-hidden />
                    )}
                  </button>
                }
              />
            </Field>
          </div>
        )}

        {formError ? <Alert tone="danger" title={formError} /> : null}

        <Button type="submit" size="lg" className="w-full" disabled={submitting} loading={submitting}>
          {submitting ? t("submitting") : t("submit")}
        </Button>
      </form>
    </>
  );
}

function waitMin(started: number) {
  const elapsed = Date.now() - started;
  if (elapsed >= LOGIN_MIN_MS) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, LOGIN_MIN_MS - elapsed));
}

function mapLoginError(
  error: unknown,
  t: (key: "networkError" | "accountLocked" | "invalidCredentials") => string,
): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return t("networkError");
    if (error.status === 401 || error.status === 403) {
      if (error.message.toLowerCase().includes("locked")) {
        return t("accountLocked");
      }
      return t("invalidCredentials");
    }
    return error.message || t("invalidCredentials");
  }
  return t("invalidCredentials");
}
