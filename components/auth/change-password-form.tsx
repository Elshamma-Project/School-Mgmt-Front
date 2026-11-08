"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { IconInput } from "@/components/ui/icon-input";
import { changePassword } from "@/lib/api/auth";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import { notify } from "@/lib/ui/notify";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/types/api";
import { primaryRole } from "@/types/auth";

type PasswordErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export function ChangePasswordForm() {
  const t = useTranslations("auth");
  const tProfile = useTranslations("profile");
  const router = useRouter();
  const setMustChangePassword = useAuthStore((s) => s.setMustChangePassword);
  const applyTokens = useAuthStore((s) => s.applyTokens);
  const isMock = useAuthStore((s) => s.isMock);
  const user = useAuthStore((s) => s.user);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function validate(): PasswordErrors {
    const next: PasswordErrors = {};
    if (!currentPassword) next.currentPassword = t("requiredField");
    if (!newPassword) next.newPassword = t("requiredField");
    else if (newPassword.length < 8) next.newPassword = tProfile("passwordTooShort");
    if (!confirmPassword) next.confirmPassword = t("requiredField");
    else if (newPassword && confirmPassword !== newPassword) {
      next.confirmPassword = tProfile("passwordMismatch");
    }
    return next;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      if (isMock) {
        setMustChangePassword(false);
        notify.success(tProfile("passwordSaved"), {
          description: tProfile("mockHint"),
        });
      } else {
        const tokens = await changePassword({
          currentPassword,
          newPassword,
          confirmPassword,
        });
        applyTokens(tokens);
        notify.success(tProfile("passwordSaved"));
      }
      const role = primaryRole(useAuthStore.getState().user) ?? primaryRole(user);
      router.replace(role ? getRoleHomePath(role) : "/");
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message || t("invalidCredentials"));
      } else {
        setFormError(t("networkError"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit}>
      <Field id="currentPassword" label={t("currentPassword")} error={errors.currentPassword}>
        <IconInput
          id="currentPassword"
          type="password"
          icon={<LockKeyhole className="size-4 stroke-[1.75]" />}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          invalid={Boolean(errors.currentPassword)}
          autoComplete="current-password"
        />
      </Field>

      <Field
        id="newPassword"
        label={t("newPassword")}
        hint={tProfile("passwordHint")}
        error={errors.newPassword}
      >
        <IconInput
          id="newPassword"
          type="password"
          icon={<KeyRound className="size-4 stroke-[1.75]" />}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          invalid={Boolean(errors.newPassword)}
          autoComplete="new-password"
        />
      </Field>

      <Field id="confirmPassword" label={t("confirmPassword")} error={errors.confirmPassword}>
        <IconInput
          id="confirmPassword"
          type="password"
          icon={<KeyRound className="size-4 stroke-[1.75]" />}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          invalid={Boolean(errors.confirmPassword)}
          autoComplete="new-password"
        />
      </Field>

      {formError ? (
        <p className="text-[var(--text-footnote)] text-[var(--ios-danger)]" role="alert">
          {formError}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="mt-2 w-full" loading={saving}>
        {t("changePasswordSubmit")}
      </Button>
    </form>
  );
}
