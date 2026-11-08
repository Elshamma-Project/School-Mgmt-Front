"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { LoginLoading } from "@/components/auth/login-loading";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { IconInput } from "@/components/ui/icon-input";
import { Label } from "@/components/ui/label";
import { login as apiLogin } from "@/lib/api/auth";
import { createMockLogin, isComingSoonRole, listMockRoles } from "@/lib/auth/mock-users";
import {
  readRememberedEmail,
  readRememberMe,
  writeRememberedEmail,
  writeRememberMe,
} from "@/lib/auth/remember";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import { getTenantConfig } from "@/lib/tenant/config";
import { queuePostLoginFlash } from "@/lib/ui/post-login-flash";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/types/api";
import type { AppRole } from "@/types/auth";
import { primaryRole } from "@/types/auth";

/** Délai minimal loader — assez court pour ne pas ralentir inutilement. */
const LOGIN_MIN_MS = 320;

type LoginFormProps = {
  /** schoolId lu côté serveur depuis .env (prioritaire). */
  schoolId?: string;
};

export function LoginForm({ schoolId: schoolIdFromServer }: LoginFormProps) {
  const t = useTranslations("auth");
  const tRoles = useTranslations("roles");
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const tenant = useMemo(
    () => getTenantConfig(schoolIdFromServer),
    [schoolIdFromServer],
  );

  const [demoMode, setDemoMode] = useState(false);
  const [role, setRole] = useState<AppRole>("DIRECTOR");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  /** Se souvenir : e-mail + session durable — jamais le mot de passe en clair. */
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setRememberMe(readRememberMe());
    const remembered = readRememberedEmail();
    if (remembered) setEmail(remembered);
  }, []);

  function applyRememberPreference(emailValue: string) {
    writeRememberMe(rememberMe);
    if (rememberMe) {
      writeRememberedEmail(emailValue);
    } else {
      writeRememberedEmail(null);
    }
  }

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
      writeRememberMe(rememberMe);
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
      queuePostLoginFlash({
        kind: "loginSuccessDemo",
        roleLabel: tRoles(`${role}.label`),
      });
      router.replace(getRoleHomePath(role));
      // Garder le loader jusqu’à la navigation (démontage) — pas de toast ici.
      return;
    }

    const nextErrors: typeof fieldErrors = {};
    const emailValue = email.trim().toLowerCase();
    if (!emailValue) nextErrors.email = t("requiredField");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) nextErrors.email = t("invalidEmail");
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
      // Préférence avant setSession pour écrire tokens au bon storage.
      applyRememberPreference(emailValue);
      // schoolId automatique (env / domaine). SUPER_ADMIN résolu côté API en secours.
      const response = await apiLogin({
        email: emailValue,
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
      if (response.mustChangePassword) {
        router.replace("/change-password");
      } else {
        queuePostLoginFlash({ kind: "loginSuccess" });
        router.replace(getRoleHomePath(homeRole));
      }
      // Succès : loader jusqu’à la navigation. Échec : finally ci-dessous.
      return;
    } catch (error) {
      await waitMin(started);
      setFormError(mapLoginError(error, t));
      setSubmitting(false);
    }
  }

  const loadingRoleLabel = demoMode
    ? tRoles(`${role}.label`)
    : email.trim() || t("loginPreparingHint");

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
            <Field id="login-email" label={t("email")} error={fieldErrors.email}>
              <IconInput
                id="login-email"
                type="email"
                icon={<Mail className="size-4 stroke-[1.75]" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                invalid={Boolean(fieldErrors.email)}
                autoComplete="username"
                inputMode="email"
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

            <div className="rounded-[var(--radius-md)] bg-[var(--ios-fill)] px-3.5 py-3">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                disabled={submitting}
                onChange={(event) => setRememberMe(event.target.checked)}
                label={t("rememberMe")}
              />
              <p className="mt-1.5 pl-7 text-[var(--text-footnote)] leading-snug text-[var(--ios-secondary-label)]">
                {t("rememberMeHint")}
              </p>
            </div>
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
