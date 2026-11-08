"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AtSign,
  Building2,
  IdCard,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Shield,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { GroupedList, GroupedListItem } from "@/components/ui/grouped-list";
import { IconInput } from "@/components/ui/icon-input";
import { changePassword, fetchMe } from "@/lib/api/auth";
import { notify } from "@/lib/ui/notify";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/types/api";
import { primaryRole } from "@/types/auth";

type PasswordErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

/**
 * Profil compte (module user).
 * displayName / e-mail métier viennent des fiches Staff/Student/Guardian — étape suivante.
 * Ici : synchronisation `/me` + changement de mot de passe API.
 */
export function ProfileView() {
  const t = useTranslations("profile");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const tRoles = useTranslations("roles");
  const user = useAuthStore((s) => s.user);
  const isMock = useAuthStore((s) => s.isMock);
  const syncFromAccount = useAuthStore((s) => s.syncFromAccount);
  const setMustChangePassword = useAuthStore((s) => s.setMustChangePassword);
  const role = primaryRole(user);

  const [refreshing, setRefreshing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [savingPassword, setSavingPassword] = useState(false);

  const refreshAccount = useCallback(async () => {
    if (isMock || !user) return;
    setRefreshing(true);
    try {
      const account = await fetchMe();
      syncFromAccount(account);
      notify.success(t("accountSynced"));
    } catch (error) {
      if (error instanceof ApiError) {
        notify.error(error.message);
      } else {
        notify.error(tAuth("networkError"));
      }
    } finally {
      setRefreshing(false);
    }
  }, [isMock, syncFromAccount, t, tAuth, user]);

  useEffect(() => {
    if (!isMock && user) {
      void fetchMe()
        .then((account) => syncFromAccount(account))
        .catch(() => {
          /* session invalide gérée par le client HTTP */
        });
    }
    // Sync initiale une fois à l’ouverture du profil
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const passwordDirty =
    currentPassword.length > 0 || newPassword.length > 0 || confirmPassword.length > 0;

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

  async function onChangePassword(event: FormEvent) {
    event.preventDefault();
    const errors = validatePassword();
    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingPassword(true);
    try {
      if (isMock) {
        setMustChangePassword(false);
        notify.success(t("passwordSaved"), { description: t("mockHint") });
      } else {
        const account = await changePassword({
          currentPassword,
          newPassword,
          confirmPassword,
        });
        syncFromAccount(account);
        setMustChangePassword(false);
        notify.success(t("passwordSaved"));
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordErrors({});
    } catch (error) {
      if (error instanceof ApiError) {
        notify.error(error.message);
      } else {
        notify.error(tAuth("networkError"));
      }
    } finally {
      setSavingPassword(false);
    }
  }

  const title = user?.displayName?.trim() || user?.username || "—";
  const schoolLabel = user?.schoolId ?? t("platformAccount");

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
          {title}
        </h2>
        <p className="mt-1 text-[var(--text-subhead)] text-[var(--ios-secondary-label)]">
          {schoolLabel}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {role ? <Badge tone="blue">{tRoles(`${role}.label`)}</Badge> : null}
          {isMock ? <Badge tone="neutral">{tCommon("demoBadge")}</Badge> : null}
          {user?.status ? <Badge tone="neutral">{user.status}</Badge> : null}
        </div>
      </section>

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
          <Field id="profile-school" label={t("schoolId")}>
            <IconInput
              id="profile-school"
              icon={<Building2 className="size-4 stroke-[1.75]" />}
              value={user?.schoolId ?? "—"}
              readOnly
              disabled
            />
          </Field>
        </GroupedListItem>

        <GroupedListItem className="block py-3">
          <Field id="profile-role" label={t("role")}>
            <IconInput
              id="profile-role"
              icon={<Shield className="size-4 stroke-[1.75]" />}
              value={
                user?.roles?.length
                  ? user.roles.map((r) => tRoles(`${r}.label`)).join(", ")
                  : role
                    ? tRoles(`${role}.label`)
                    : "—"
              }
              readOnly
              disabled
            />
          </Field>
        </GroupedListItem>

        <GroupedListItem className="block py-3">
          <Field id="profile-type" label={t("profileType")} hint={t("profileTypeHint")}>
            <IconInput
              id="profile-type"
              icon={<IdCard className="size-4 stroke-[1.75]" />}
              value={`${user?.profileType ?? "—"} · ${user?.profileId ?? "—"}`}
              readOnly
              disabled
            />
          </Field>
        </GroupedListItem>
      </GroupedList>

      {!isMock ? (
        <div className="flex justify-end px-1">
          <Button
            type="button"
            variant="secondary"
            loading={refreshing}
            onClick={() => void refreshAccount()}
          >
            <RefreshCw className="size-4 stroke-[1.75]" aria-hidden />
            {t("syncAccount")}
          </Button>
        </div>
      ) : null}

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
