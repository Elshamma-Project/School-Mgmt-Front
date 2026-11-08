"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AtSign,
  IdCard,
  KeyRound,
  LockKeyhole,
  Mail,
  Shield,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { GroupedList, GroupedListItem } from "@/components/ui/grouped-list";
import { IconInput } from "@/components/ui/icon-input";
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

/** Profil compte — GroupedList + Field + IconInput. */
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

  const profileDirty =
    displayName.trim() !== (user?.displayName ?? "").trim() ||
    email.trim() !== (user?.email ?? "").trim();

  const passwordDirty =
    currentPassword.length > 0 || newPassword.length > 0 || confirmPassword.length > 0;

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
    <div className="mx-auto max-w-[560px] space-y-6 slide-up">
      <section className="flex flex-col items-center text-center">
        <div
          className="flex size-20 items-center justify-center rounded-full bg-[var(--ios-info-soft)] text-[var(--ios-blue)]"
          aria-hidden
        >
          <UserRound className="size-9 stroke-[1.5]" />
        </div>
        <h2 className="mt-4 text-[var(--text-title2)] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
          {displayName.trim() || user?.username || "—"}
        </h2>
        <p className="mt-1 text-[var(--text-subhead)] text-[var(--ios-secondary-label)]">
          {email.trim() || user?.email || "—"}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {role ? <Badge tone="blue">{tRoles(`${role}.label`)}</Badge> : null}
          {isMock ? <Badge tone="neutral">{tCommon("demoBadge")}</Badge> : null}
        </div>
      </section>

      <form onSubmit={onSaveProfile} className="space-y-3">
        <GroupedList header={t("accountSection")} footer={t("accountSectionHint")}>
          <GroupedListItem className="block py-3">
            <Field id="profile-username" label={t("username")} hint={t("usernameHint")}>
              <IconInput
                id="profile-username"
                icon={<AtSign className="size-4 stroke-[1.75]" />}
                value={user?.username ?? ""}
                readOnly
                disabled
                autoComplete="username"
              />
            </Field>
          </GroupedListItem>

          <GroupedListItem className="block py-3">
            <Field
              id="profile-display-name"
              label={t("displayName")}
              error={profileErrors.displayName}
            >
              <IconInput
                id="profile-display-name"
                icon={<IdCard className="size-4 stroke-[1.75]" />}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                invalid={Boolean(profileErrors.displayName)}
                autoComplete="name"
              />
            </Field>
          </GroupedListItem>

          <GroupedListItem className="block py-3">
            <Field id="profile-email" label={t("email")} error={profileErrors.email}>
              <IconInput
                id="profile-email"
                type="email"
                icon={<Mail className="size-4 stroke-[1.75]" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                invalid={Boolean(profileErrors.email)}
                autoComplete="email"
              />
            </Field>
          </GroupedListItem>

          <GroupedListItem className="block py-3">
            <Field id="profile-role" label={t("role")}>
              <IconInput
                id="profile-role"
                icon={<Shield className="size-4 stroke-[1.75]" />}
                value={role ? tRoles(`${role}.label`) : "—"}
                readOnly
                disabled
              />
            </Field>
          </GroupedListItem>
        </GroupedList>

        <div className="flex justify-end px-1">
          <Button type="submit" loading={savingProfile} disabled={!profileDirty && !savingProfile}>
            {tCommon("save")}
          </Button>
        </div>
      </form>

      <form onSubmit={onChangePassword} className="space-y-3">
        <GroupedList header={t("passwordSection")} footer={t("passwordSectionHint")}>
          <GroupedListItem className="block py-3">
            <Field
              id="profile-current-password"
              label={tAuth("currentPassword")}
              error={passwordErrors.currentPassword}
            >
              <IconInput
                id="profile-current-password"
                type="password"
                icon={<LockKeyhole className="size-4 stroke-[1.75]" />}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                invalid={Boolean(passwordErrors.currentPassword)}
                autoComplete="current-password"
              />
            </Field>
          </GroupedListItem>

          <GroupedListItem className="block py-3">
            <Field
              id="profile-new-password"
              label={tAuth("newPassword")}
              hint={t("passwordHint")}
              error={passwordErrors.newPassword}
            >
              <IconInput
                id="profile-new-password"
                type="password"
                icon={<KeyRound className="size-4 stroke-[1.75]" />}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                invalid={Boolean(passwordErrors.newPassword)}
                autoComplete="new-password"
              />
            </Field>
          </GroupedListItem>

          <GroupedListItem className="block py-3">
            <Field
              id="profile-confirm-password"
              label={tAuth("confirmPassword")}
              error={passwordErrors.confirmPassword}
            >
              <IconInput
                id="profile-confirm-password"
                type="password"
                icon={<KeyRound className="size-4 stroke-[1.75]" />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                invalid={Boolean(passwordErrors.confirmPassword)}
                autoComplete="new-password"
              />
            </Field>
          </GroupedListItem>
        </GroupedList>

        <div className="flex justify-end px-1">
          <Button
            type="submit"
            loading={savingPassword}
            disabled={!passwordDirty && !savingPassword}
          >
            {tAuth("changePasswordSubmit")}
          </Button>
        </div>
      </form>
    </div>
  );
}
