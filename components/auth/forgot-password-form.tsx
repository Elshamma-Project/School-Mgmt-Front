"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { IconInput } from "@/components/ui/icon-input";
import { requestPasswordReset } from "@/lib/api/auth";
import { getTenantConfig } from "@/lib/tenant/config";
import { Link } from "@/i18n/navigation";
import {
  INPUT_LIMITS,
  validateEmail,
  validationMessage,
} from "@/lib/validation/input";
import { ApiError } from "@/types/api";

type ForgotPasswordFormProps = {
  schoolId?: string;
};

export function ForgotPasswordForm({ schoolId: schoolIdFromServer }: ForgotPasswordFormProps) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const tenant = useMemo(
    () => getTenantConfig(schoolIdFromServer),
    [schoolIdFromServer],
  );

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);
    setEmailError(undefined);

    const emailResult = validateEmail(email, { required: true });
    if (!emailResult.ok) {
      setEmailError(validationMessage(tCommon, emailResult));
      return;
    }
    if (!tenant.schoolId) {
      setFormError(t("schoolIdMissing"));
      return;
    }

    setSubmitting(true);
    try {
      await requestPasswordReset({
        email: emailResult.value,
        schoolId: tenant.schoolId,
      });
      setDone(true);
    } catch (error) {
      setFormError(mapForgotError(error, t));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--ios-success)_16%,transparent)] text-[var(--ios-success)]">
            <CheckCircle2 className="size-6 stroke-[1.75]" aria-hidden />
          </span>
          <div>
            <p className="text-[var(--text-body)] font-semibold text-[var(--ios-label)]">
              {t("forgotPasswordSuccessTitle")}
            </p>
            <p className="mt-2 text-[var(--text-footnote)] leading-relaxed text-[var(--ios-secondary-label)]">
              {t("forgotPasswordSuccessBody")}
            </p>
          </div>
        </div>
        <Link
          href="/login"
          className="pressable inline-flex h-[var(--control-height-lg)] w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--ios-blue)] text-[12px] font-semibold text-white hover:brightness-[1.04]"
        >
          {t("forgotPasswordBackToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5" noValidate>
      <p className="text-[var(--text-footnote)] leading-relaxed text-[var(--ios-secondary-label)]">
        {t("forgotPasswordHint")}
      </p>

      <Field id="forgot-email" label={t("email")} error={emailError}>
        <IconInput
          id="forgot-email"
          type="email"
          icon={<Mail className="size-4 stroke-[1.75]" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          invalid={Boolean(emailError)}
          autoComplete="username"
          inputMode="email"
          maxLength={INPUT_LIMITS.email}
          disabled={submitting}
          autoFocus
        />
      </Field>

      {formError ? <Alert tone="danger" title={formError} /> : null}

      <Button type="submit" size="lg" className="w-full" disabled={submitting} loading={submitting}>
        {submitting ? t("forgotPasswordSubmitting") : t("forgotPasswordSubmit")}
      </Button>

      <Link
        href="/login"
        className="pressable inline-flex items-center justify-center gap-1.5 text-[var(--text-footnote)] font-medium text-[var(--ios-blue)] hover:underline"
      >
        <ArrowLeft className="size-3.5 stroke-[2]" aria-hidden />
        {t("forgotPasswordBackToLogin")}
      </Link>
    </form>
  );
}

function mapForgotError(
  error: unknown,
  t: (
    key: "networkError" | "timeoutError" | "serverError" | "rateLimited" | "invalidEmail",
  ) => string,
): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      const msg = (error.message || "").toLowerCase();
      if (msg === "timeout" || msg === "aborted") return t("timeoutError");
      return t("networkError");
    }
    if (error.status === 429) return t("rateLimited");
    if (error.status >= 500) return t("serverError");
    if (error.status === 400) return t("invalidEmail");
    return error.message || t("networkError");
  }
  return t("networkError");
}
