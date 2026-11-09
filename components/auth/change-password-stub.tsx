"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { IconInput } from "@/components/ui/icon-input";
import { notify } from "@/lib/ui/notify";
import {
  INPUT_LIMITS,
  validatePassword,
  validatePasswordConfirm,
  validationMessage,
} from "@/lib/validation/input";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";

type PasswordErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

/** Stub UI — branchement API change-password à venir. */
export function ChangePasswordStub() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const tProfile = useTranslations("profile");
  const router = useRouter();
  const setMustChangePassword = useAuthStore((s) => s.setMustChangePassword);
  const isMock = useAuthStore((s) => s.isMock);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [saving, setSaving] = useState(false);

  function validate(): PasswordErrors {
    const next: PasswordErrors = {};
    if (!currentPassword) next.currentPassword = t("requiredField");
    else if (currentPassword.length > INPUT_LIMITS.passwordMax) {
      next.currentPassword = tCommon("validation.tooLong", {
        max: INPUT_LIMITS.passwordMax,
      });
    }
    const pwd = validatePassword(newPassword);
    if (!pwd.ok) next.newPassword = validationMessage(tCommon, pwd);
    const confirm = validatePasswordConfirm(newPassword, confirmPassword);
    if (!confirm.ok) next.confirmPassword = validationMessage(tCommon, confirm);
    return next;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 280));
    setMustChangePassword(false);
    setSaving(false);
    notify.success(tProfile("passwordSaved"), {
      description: isMock ? tProfile("mockHint") : undefined,
    });
    router.replace("/");
  }

  return (
    <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <Field id="stub-currentPassword" label={t("currentPassword")} error={errors.currentPassword}>
        <IconInput
          id="stub-currentPassword"
          type="password"
          icon={<LockKeyhole className="size-4 stroke-[1.75]" />}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          invalid={Boolean(errors.currentPassword)}
          autoComplete="current-password"
          maxLength={INPUT_LIMITS.passwordMax}
        />
      </Field>

      <Field
        id="stub-newPassword"
        label={t("newPassword")}
        hint={tProfile("passwordHint")}
        error={errors.newPassword}
      >
        <IconInput
          id="stub-newPassword"
          type="password"
          icon={<KeyRound className="size-4 stroke-[1.75]" />}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          invalid={Boolean(errors.newPassword)}
          autoComplete="new-password"
          maxLength={INPUT_LIMITS.passwordMax}
        />
      </Field>

      <Field id="stub-confirmPassword" label={t("confirmPassword")} error={errors.confirmPassword}>
        <IconInput
          id="stub-confirmPassword"
          type="password"
          icon={<KeyRound className="size-4 stroke-[1.75]" />}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          invalid={Boolean(errors.confirmPassword)}
          autoComplete="new-password"
          maxLength={INPUT_LIMITS.passwordMax}
        />
      </Field>

      <Button type="submit" size="lg" className="mt-2 w-full" loading={saving}>
        {t("changePasswordSubmit")}
      </Button>
    </form>
  );
}
