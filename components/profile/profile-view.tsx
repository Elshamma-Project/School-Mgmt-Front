"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { notify } from "@/lib/ui/notify";
import { useAuthStore } from "@/stores/auth-store";
import { primaryRole } from "@/types/auth";

type ProfileErrors = {
  displayName?: string;
  email?: string;
};

type PasswordErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

/** Profil compte : infos personnelles + changement de mot de passe (mock jusqu’à l’API). */
export function ProfileView() {
  const t = useTranslations("profile");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const tRoles = useTranslations("roles");
  const user = useAuthStore((s) => s.user);
  const isMock = useAuthStore((s) => s.isMock);
  const updateUser = useAuthStore((s) => s.updateUser);
  const role = primaryRole(user);

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
    setEmail(user?.email ?? "");
  }, [user?.displayName, user?.email]);

  function validateProfile(): ProfileErrors {
    const next: ProfileErrors = {};
    if (!displayName.trim()) next.displayName = tAuth("requiredField");
    if (!email.trim()) next.email = tAuth("requiredField");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = t("invalidEmail");
    }
    return next;
  }

  function validatePassword(): PasswordErrors {
    const next: PasswordErrors = {};
    if (!currentPassword) next.currentPassword = tAuth("requiredField");
    if (!newPassword) next.newPassword = tAuth("requiredField");
    else if (newPassword.length < 8) next.newPassword = t("passwordTooShort");
    if (!confirmPassword) next.confirmPassword = tAuth("requiredField");
    else if (newPassword && confirmPassword !== newPassword) {
      next.confirmPassword = t("passwordMismatch");
    }
    return next;
  }

  async function onSaveProfile(event: FormEvent) {
    event.preventDefault();
    const errors = validateProfile();
    setProfileErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingProfile(true);
    await new Promise((resolve) => setTimeout(resolve, 280));
    updateUser({
      displayName: displayName.trim(),
      email: email.trim(),
    });
    setSavingProfile(false);
    notify.success(t("profileSaved"), {
      description: isMock ? t("mockHint") : undefined,
    });
  }

  async function onChangePassword(event: FormEvent) {
    event.preventDefault();
    const errors = validatePassword();
    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingPassword(true);
    await new Promise((resolve) => setTimeout(resolve, 280));
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordErrors({});
    setSavingPassword(false);
    notify.success(t("passwordSaved"), {
      description: isMock ? t("mockHint") : undefined,
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader description={t("description")} />

      <form
        onSubmit={onSaveProfile}
        className="space-y-4 rounded-[var(--radius-lg)] bg-[var(--ios-card)] p-5 shadow-[var(--ios-shadow-sm)]"
      >
        <div>
          <h2 className="text-[17px] font-semibold text-[var(--ios-label)]">
            {t("accountSection")}
          </h2>
          <p className="mt-1 text-[13px] text-[var(--ios-secondary-label)]">
            {t("accountSectionHint")}
          </p>
        </div>

        <Field id="profile-username" label={t("username")} hint={t("usernameHint")}>
          <Input
            id="profile-username"
            value={user?.username ?? ""}
            readOnly
            disabled
            autoComplete="username"
          />
        </Field>

        <Field
          id="profile-display-name"
          label={t("displayName")}
          error={profileErrors.displayName}
        >
          <Input
            id="profile-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            invalid={Boolean(profileErrors.displayName)}
            autoComplete="name"
          />
        </Field>

        <Field id="profile-email" label={t("email")} error={profileErrors.email}>
          <Input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={Boolean(profileErrors.email)}
            autoComplete="email"
          />
        </Field>

        <Field id="profile-role" label={t("role")}>
          <Input
            id="profile-role"
            value={role ? tRoles(`${role}.label`) : "—"}
            readOnly
            disabled
          />
        </Field>

        <div className="flex justify-end pt-1">
          <Button type="submit" loading={savingProfile}>
            {tCommon("save")}
          </Button>
        </div>
      </form>

      <form
        onSubmit={onChangePassword}
        className="space-y-4 rounded-[var(--radius-lg)] bg-[var(--ios-card)] p-5 shadow-[var(--ios-shadow-sm)]"
      >
        <div>
          <h2 className="text-[17px] font-semibold text-[var(--ios-label)]">
            {t("passwordSection")}
          </h2>
          <p className="mt-1 text-[13px] text-[var(--ios-secondary-label)]">
            {t("passwordSectionHint")}
          </p>
        </div>

        <Field
          id="profile-current-password"
          label={tAuth("currentPassword")}
          error={passwordErrors.currentPassword}
        >
          <Input
            id="profile-current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            invalid={Boolean(passwordErrors.currentPassword)}
            autoComplete="current-password"
          />
        </Field>

        <Field
          id="profile-new-password"
          label={tAuth("newPassword")}
          error={passwordErrors.newPassword}
          hint={t("passwordHint")}
        >
          <Input
            id="profile-new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            invalid={Boolean(passwordErrors.newPassword)}
            autoComplete="new-password"
          />
        </Field>

        <Field
          id="profile-confirm-password"
          label={tAuth("confirmPassword")}
          error={passwordErrors.confirmPassword}
        >
          <Input
            id="profile-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            invalid={Boolean(passwordErrors.confirmPassword)}
            autoComplete="new-password"
          />
        </Field>

        <div className="flex justify-end pt-1">
          <Button type="submit" loading={savingPassword}>
            {tAuth("changePasswordSubmit")}
          </Button>
        </div>
      </form>
    </div>
  );
}
