"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { IconInput } from "@/components/ui/icon-input";
import { notify } from "@/lib/ui/notify";
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
    <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit}>
      <Field
        id="currentPassword"
        label={t("currentPassword")}
        error={errors.currentPassword}
      >
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

      <Field
        id="confirmPassword"
        label={t("confirmPassword")}
        error={errors.confirmPassword}
      >
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

      <Button type="submit" size="lg" className="mt-2 w-full" loading={saving}>
        {t("changePasswordSubmit")}
      </Button>
    </form>
  );
}
