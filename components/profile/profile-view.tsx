"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AtSign,
  Building2,
  IdCard,
  KeyRound,
  LockKeyhole,
  Phone,
  RefreshCw,
  Shield,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { ProfileSecurityPanel } from "@/components/profile/profile-security-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailRow } from "@/components/ui/detail-row";
import { Field } from "@/components/ui/field";
import { GroupedList, GroupedListItem } from "@/components/ui/grouped-list";
import { IconInput } from "@/components/ui/icon-input";
import { changePassword, fetchMe } from "@/lib/api/auth";
import { getStaff, updateStaffIdentity, type StaffResponse } from "@/lib/api/staff";
import { notify } from "@/lib/ui/notify";
import {
  INPUT_LIMITS,
  validatePassword as validatePasswordLib,
  validatePasswordConfirm,
  validatePersonName,
  validatePhone,
  validationMessage,
} from "@/lib/validation/input";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/types/api";
import { primaryRole } from "@/types/auth";

type PasswordErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

type IdentityErrors = {
  lastName?: string;
  firstName?: string;
  phone?: string;
};

/** Indicatif Cameroun — affiché fixe ; stocké avec le numéro à l’enregistrement. */
const CM_DIAL = "+237";

function toNationalPhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+237")) return digits.slice(4).replace(/\D/g, "");
  if (digits.startsWith("237") && digits.length > 9) return digits.slice(3).replace(/\D/g, "");
  if (digits.startsWith("00237")) return digits.slice(5).replace(/\D/g, "");
  return digits.replace(/\D/g, "");
}

function toE164Cm(national: string): string | null {
  const digits = national.replace(/\D/g, "");
  if (!digits) return null;
  return `${CM_DIAL}${digits}`;
}

/**
 * Profil compte (module user) + identité fiche liée (Staff pour le personnel).
 */
export function ProfileView() {
  const t = useTranslations("profile");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const tRoles = useTranslations("roles");
  const user = useAuthStore((s) => s.user);
  const isMock = useAuthStore((s) => s.isMock);
  const syncFromAccount = useAuthStore((s) => s.syncFromAccount);
  const updateUser = useAuthStore((s) => s.updateUser);
  const applyTokens = useAuthStore((s) => s.applyTokens);
  const setMustChangePassword = useAuthStore((s) => s.setMustChangePassword);
  const role = primaryRole(user);

  const [refreshing, setRefreshing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [savingPassword, setSavingPassword] = useState(false);

  const [staff, setStaff] = useState<StaffResponse | null>(null);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [identityErrors, setIdentityErrors] = useState<IdentityErrors>({});
  const [savingIdentity, setSavingIdentity] = useState(false);

  /** Élèves / tuteurs : noms figés (bulletins). Personnel STAFF uniquement. */
  const canEditStaffIdentity =
    user?.profileType === "STAFF" && (isMock || Boolean(user.profileId));

  const applyStaffToForm = useCallback(
    (member: StaffResponse) => {
      setStaff(member);
      setLastName(member.lastName);
      setFirstName(member.firstName);
      setPhone(toNationalPhone(member.contact.phones[0] ?? ""));
      updateUser({ displayName: member.fullName });
    },
    [updateUser],
  );

  const refreshAccount = useCallback(async () => {
    if (isMock || !user) return;
    setRefreshing(true);
    try {
      const account = await fetchMe();
      syncFromAccount(account);
      if (account.profileType === "STAFF" && account.profileId) {
        const member = await getStaff(account.profileId, account.schoolId);
        applyStaffToForm(member);
      }
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
  }, [applyStaffToForm, isMock, syncFromAccount, t, tAuth, user]);

  useEffect(() => {
    if (!user) return;
    if (isMock) {
      const parts = (user.displayName ?? "").trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        setLastName(parts[0] ?? "");
        setFirstName(parts.slice(1).join(" "));
      } else {
        setLastName(user.displayName ?? "");
        setFirstName("");
      }
      return;
    }
    void fetchMe()
      .then((account) => {
        syncFromAccount(account);
        if (account.profileType === "STAFF" && account.profileId) {
          return getStaff(account.profileId, account.schoolId).then(applyStaffToForm);
        }
        return undefined;
      })
      .catch((error) => {
        // Ne pas laisser un échec staff / réseau faire croire à une déconnexion UX :
        // clearSession n’intervient que via le client HTTP sur 401 auth définitif.
        if (error instanceof ApiError && error.status === 401) return;
        console.warn("[profile] sync account failed", error);
      });
    // Sync initiale une fois à l’ouverture du profil
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const passwordDirty =
    currentPassword.length > 0 || newPassword.length > 0 || confirmPassword.length > 0;

  const identityDirty =
    staff != null
      ? lastName.trim() !== staff.lastName ||
        firstName.trim() !== staff.firstName ||
        toNationalPhone(phone) !== toNationalPhone(staff.contact.phones[0] ?? "")
      : lastName.trim().length > 0 || firstName.trim().length > 0;

  function validatePassword(): PasswordErrors {
    const next: PasswordErrors = {};
    if (!currentPassword) next.currentPassword = tAuth("requiredField");
    else if (currentPassword.length > INPUT_LIMITS.passwordMax) {
      next.currentPassword = tCommon("validation.tooLong", {
        max: INPUT_LIMITS.passwordMax,
      });
    }
    const pwd = validatePasswordLib(newPassword);
    if (!pwd.ok) next.newPassword = validationMessage(tCommon, pwd);
    const confirm = validatePasswordConfirm(newPassword, confirmPassword);
    if (!confirm.ok) next.confirmPassword = validationMessage(tCommon, confirm);
    return next;
  }

  function validateIdentity(): IdentityErrors {
    const next: IdentityErrors = {};
    const last = validatePersonName(lastName, { required: true });
    const first = validatePersonName(firstName, { required: false });
    const tel = validatePhone(phone ? `${CM_DIAL}${toNationalPhone(phone)}` : "", {
      required: false,
    });
    if (!last.ok) next.lastName = validationMessage(tCommon, last);
    if (!first.ok) next.firstName = validationMessage(tCommon, first);
    if (!tel.ok) next.phone = validationMessage(tCommon, tel);
    return next;
  }

  async function onSaveIdentity(event: FormEvent) {
    event.preventDefault();
    const last = validatePersonName(lastName, { required: true });
    const first = validatePersonName(firstName, { required: false });
    const tel = validatePhone(phone ? `${CM_DIAL}${toNationalPhone(phone)}` : "", {
      required: false,
    });
    const errors: IdentityErrors = {};
    if (!last.ok) errors.lastName = validationMessage(tCommon, last);
    if (!first.ok) errors.firstName = validationMessage(tCommon, first);
    if (!tel.ok) errors.phone = validationMessage(tCommon, tel);
    setIdentityErrors(errors);
    if (!last.ok || !first.ok || !tel.ok) return;

    setSavingIdentity(true);
    try {
      if (isMock || user?.profileType !== "STAFF" || !user.profileId) {
        const displayName = [last.value, first.value].filter(Boolean).join(" ");
        updateUser({ displayName });
        notify.success(t("profileSaved"), {
          description: isMock ? t("mockHint") : t("identityLocalOnlyHint"),
        });
      } else {
        const primary = toE164Cm(phone);
        const phones = [
          ...(primary ? [primary] : []),
          ...(staff?.contact.phones.slice(1) ?? []),
        ].filter(Boolean);
        const member = await updateStaffIdentity(
          user.profileId,
          {
            lastName: last.value,
            firstName: first.value,
            civility: staff?.civility ?? null,
            contact: {
              phones,
              // E-mail = compte de connexion : on conserve celui de la fiche, jamais modifié ici.
              email: staff?.contact.email ?? user.username,
              address: staff?.contact.address ?? null,
              city: staff?.contact.city ?? null,
            },
          },
          user.schoolId,
        );
        applyStaffToForm(member);
        notify.success(t("profileSaved"));
      }
    } catch (error) {
      if (error instanceof ApiError) {
        notify.error(error.message);
      } else {
        notify.error(tAuth("networkError"));
      }
    } finally {
      setSavingIdentity(false);
    }
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
        const tokens = await changePassword({
          currentPassword,
          newPassword,
          confirmPassword,
        });
        applyTokens(tokens);
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

  const title =
    user?.displayName?.trim() ||
    staff?.fullName ||
    [lastName, firstName].filter((p) => p.trim()).join(" ") ||
    user?.username ||
    "—";
  const schoolLabel = user?.schoolId ?? t("platformAccount");

  const statusTone =
    user?.status === "ACTIVE"
      ? "success"
      : user?.status === "PENDING"
        ? "warning"
        : user?.status === "LOCKED" || user?.status === "DISABLED"
          ? "danger"
          : "neutral";

  const statusLabel =
    user?.status &&
    (["ACTIVE", "PENDING", "LOCKED", "DISABLED"] as const).includes(
      user.status as "ACTIVE" | "PENDING" | "LOCKED" | "DISABLED",
    )
      ? t(`accountStatus.${user.status as "ACTIVE" | "PENDING" | "LOCKED" | "DISABLED"}`)
      : user?.status;

  return (
    <div className="mx-auto w-full max-w-[560px] space-y-6 slide-up lg:max-w-5xl">
      {/* En-tête identité : toujours centré, largeur carte inchangée */}
      <section className="mx-auto flex w-full max-w-[560px] flex-col items-center text-center">
        <ProfileAvatar />
        <div className="mt-4 w-full overflow-hidden rounded-[var(--radius-md)] bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
          <div className="px-5 pb-3 pt-5">
            <h2 className="text-[var(--text-title2)] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
              {title}
            </h2>
            <p className="mt-1.5 truncate text-[var(--text-footnote)] text-[var(--ios-secondary-label)]">
              {schoolLabel}
            </p>
          </div>
          <div className="mx-5 border-t border-[var(--ios-separator)]" />
          <div className="flex flex-wrap items-center justify-center gap-2 px-5 py-3.5">
            {role ? (
              <Badge tone="blue" className="gap-1.5 pl-1.5">
                <Shield className="size-3 stroke-[2]" aria-hidden />
                {tRoles(`${role}.label`)}
              </Badge>
            ) : null}
            {statusLabel ? (
              <Badge tone={statusTone} className="gap-1.5 pl-1.5">
                <span
                  className="size-1.5 shrink-0 rounded-full bg-current opacity-90"
                  aria-hidden
                />
                {statusLabel}
              </Badge>
            ) : null}
            {isMock ? <Badge tone="neutral">{tCommon("demoBadge")}</Badge> : null}
          </div>
        </div>
      </section>

      {/* 4 sections → grille 2×2 sur grand écran ; en-tête reste centré */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="space-y-3 lg:col-span-2">
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
            <GroupedList header={t("accountSection")} className="h-full">
              <GroupedListItem>
                <DetailRow
                  label={t("username")}
                  value={user?.username ?? "—"}
                  icon={<AtSign className="size-4 stroke-[1.75]" />}
                  stacked
                />
              </GroupedListItem>

              <GroupedListItem>
                <DetailRow
                  label={t("schoolId")}
                  value={user?.schoolId ?? "—"}
                  icon={<Building2 className="size-4 stroke-[1.75]" />}
                />
              </GroupedListItem>

              <GroupedListItem>
                <DetailRow
                  label={t("role")}
                  value={
                    user?.roles?.length
                      ? user.roles.map((r) => tRoles(`${r}.label`)).join(", ")
                      : role
                        ? tRoles(`${role}.label`)
                        : "—"
                  }
                  icon={<Shield className="size-4 stroke-[1.75]" />}
                />
              </GroupedListItem>

              <GroupedListItem>
                <DetailRow
                  label={t("profileType")}
                  value={
                    user?.profileId
                      ? `${user.profileType} · ${user.profileId}`
                      : (user?.profileType ?? "—")
                  }
                  icon={<IdCard className="size-4 stroke-[1.75]" />}
                  stacked
                />
              </GroupedListItem>
            </GroupedList>

            {canEditStaffIdentity ? (
              <form
                id="profile-identity-form"
                onSubmit={onSaveIdentity}
                className="contents"
              >
                <GroupedList header={t("identitySection")} className="h-full">
                  <GroupedListItem className="block py-3">
                    <Field
                      id="profile-last-name"
                      label={t("lastName")}
                      error={identityErrors.lastName}
                    >
                      <IconInput
                        id="profile-last-name"
                        icon={<UserRound className="size-4 stroke-[1.75]" />}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        invalid={Boolean(identityErrors.lastName)}
                        autoComplete="family-name"
                        maxLength={INPUT_LIMITS.personName}
                        disabled={savingIdentity || identityLoading}
                      />
                    </Field>
                  </GroupedListItem>

                  <GroupedListItem className="block py-3">
                    <Field
                      id="profile-first-name"
                      label={t("firstName")}
                      error={identityErrors.firstName}
                    >
                      <IconInput
                        id="profile-first-name"
                        icon={<UserRound className="size-4 stroke-[1.75]" />}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        invalid={Boolean(identityErrors.firstName)}
                        autoComplete="given-name"
                        maxLength={INPUT_LIMITS.personName}
                        disabled={savingIdentity || identityLoading}
                      />
                    </Field>
                  </GroupedListItem>

                  <GroupedListItem className="block py-3">
                    <Field
                      id="profile-phone"
                      label={t("phone")}
                      error={identityErrors.phone}
                    >
                      <IconInput
                        id="profile-phone"
                        type="tel"
                        inputMode="tel"
                        icon={<Phone className="size-4 stroke-[1.75]" />}
                        leadingAddon={CM_DIAL}
                        value={phone}
                        onChange={(e) => setPhone(toNationalPhone(e.target.value))}
                        placeholder="6XX XXX XXX"
                        autoComplete="tel-national"
                        maxLength={15}
                        invalid={Boolean(identityErrors.phone)}
                        disabled={savingIdentity || identityLoading}
                      />
                    </Field>
                  </GroupedListItem>
                </GroupedList>
              </form>
            ) : (
              <GroupedList header={t("identitySection")} className="h-full">
                <GroupedListItem className="block py-3">
                  <p className="text-[var(--text-subhead)] text-[var(--ios-secondary-label)]">
                    {t("identityUnavailableBody")}
                  </p>
                </GroupedListItem>
              </GroupedList>
            )}
          </div>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            {!isMock ? (
              <GroupedList>
                <GroupedListItem className="p-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    className="h-12 w-full justify-center gap-2.5 rounded-none font-medium text-[var(--ios-blue)] hover:bg-[color-mix(in_srgb,var(--ios-blue)_8%,transparent)] active:bg-[color-mix(in_srgb,var(--ios-blue)_14%,transparent)]"
                    loading={refreshing || identityLoading}
                    leadingIcon={
                      <RefreshCw
                        className="size-4 stroke-[1.75] text-[var(--ios-blue)]"
                        aria-hidden
                      />
                    }
                    onClick={() => void refreshAccount()}
                  >
                    {t("syncAccount")}
                  </Button>
                </GroupedListItem>
              </GroupedList>
            ) : (
              <div className="hidden lg:block" aria-hidden />
            )}

            {canEditStaffIdentity ? (
              <div className="flex justify-end px-1">
                <Button
                  type="submit"
                  form="profile-identity-form"
                  loading={savingIdentity}
                  disabled={(!identityDirty && !savingIdentity) || identityLoading}
                >
                  {t("saveIdentity")}
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <form onSubmit={onChangePassword} className="space-y-3">
          <GroupedList header={t("passwordSection")}>
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
                  placeholder="••••••••"
                  invalid={Boolean(passwordErrors.currentPassword)}
                  autoComplete="current-password"
                  maxLength={INPUT_LIMITS.passwordMax}
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
                  maxLength={INPUT_LIMITS.passwordMax}
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
                  maxLength={INPUT_LIMITS.passwordMax}
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

        <ProfileSecurityPanel
          lastLoginAt={user?.lastLoginAt}
          accountStatus={user?.status}
        />
      </div>
    </div>
  );
}
