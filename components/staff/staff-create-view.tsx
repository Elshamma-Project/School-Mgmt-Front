"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import {
  Briefcase,
  Check,
  Mail,
  Phone,
  Shield,
  User,
  UserRound,
  Users,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { IconInput } from "@/components/ui/icon-input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { createStaff } from "@/lib/api/staff";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import {
  staffDetailPath,
  staffListPath,
  staffTypeSlug,
} from "@/lib/staff/routes";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import {
  INPUT_LIMITS,
  validateEmail,
  validatePersonName,
  validatePhone,
  validationMessage,
} from "@/lib/validation/input";
import { useAuthStore } from "@/stores/auth-store";
import { usePageHeadingStore } from "@/stores/page-heading-store";
import { ApiError, isAuthFailure } from "@/types/api";
import { primaryRole } from "@/types/auth";

type FieldErrors = {
  lastName?: string;
  firstName?: string;
  email?: string;
  phone?: string;
};

type CreateKind = "TEACHER" | "OTHER" | "HEAD_OF_SCHOOL" | "SECRETARY";

function createInitials(lastName: string, firstName: string): string {
  const last = lastName.trim().charAt(0);
  const first = firstName.trim().charAt(0);
  return `${last}${first}`.toUpperCase();
}

const KIND_VISUAL: Record<
  CreateKind,
  {
    icon: typeof UserRound;
    soft: string;
    ink: string;
    ring: string;
  }
> = {
  TEACHER: {
    icon: UserRound,
    soft: "bg-[var(--ios-success-soft)]",
    ink: "text-[var(--ios-success)]",
    ring: "ring-[color-mix(in_srgb,var(--ios-success)_28%,transparent)]",
  },
  OTHER: {
    icon: Briefcase,
    soft: "bg-[var(--ios-fill)]",
    ink: "text-[var(--ios-secondary-label)]",
    ring: "ring-[var(--ios-separator)]",
  },
  HEAD_OF_SCHOOL: {
    icon: Shield,
    soft: "bg-[var(--ios-warning-soft)]",
    ink: "text-[var(--ios-warning)]",
    ring: "ring-[color-mix(in_srgb,var(--ios-warning)_30%,transparent)]",
  },
  SECRETARY: {
    icon: Users,
    soft: "bg-[var(--ios-info-soft)]",
    ink: "text-[var(--ios-blue)]",
    ring: "ring-[color-mix(in_srgb,var(--ios-blue)_28%,transparent)]",
  },
};

export function StaffCreateView() {
  const t = useTranslations("staff");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const schoolId = useAuthStore((s) => s.user?.schoolId);
  const role = primaryRole(useAuthStore((s) => s.user));
  const workspaceHome = role ? getRoleHomePath(role) : "/administration";
  const setCrumbs = usePageHeadingStore((s) => s.setCrumbs);
  const setBackHref = usePageHeadingStore((s) => s.setBackHref);
  const clearOverride = usePageHeadingStore((s) => s.clearOverride);

  const listHref = staffListPath(workspaceHome);

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [createLoginAccount, setCreateLoginAccount] = useState(true);
  const isDirector = role === "DIRECTOR" || role === "SUPER_ADMIN";
  const [staffKind, setStaffKind] = useState<CreateKind>("TEACHER");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const kindOptions: { value: CreateKind; label: string }[] = [
    { value: "TEACHER", label: t("functions.TEACHER") },
    { value: "OTHER", label: t("functions.OTHER") },
    ...(isDirector
      ? ([
          { value: "HEAD_OF_SCHOOL", label: t("functions.HEAD_OF_SCHOOL") },
          { value: "SECRETARY", label: t("functions.SECRETARY") },
        ] as const)
      : []),
  ];

  useEffect(() => {
    setBackHref(listHref);
    setCrumbs([
      { label: tNav("staff"), href: listHref },
      { label: t("createTitle") },
    ]);
    return () => clearOverride();
  }, [clearOverride, listHref, setBackHref, setCrumbs, t, tNav]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;

    const last = validatePersonName(lastName, { required: true });
    const first = validatePersonName(firstName, { required: false });
    const mail = validateEmail(email, { required: createLoginAccount });
    const tel = validatePhone(phone, { required: false });

    const nextErrors: FieldErrors = {};
    if (!last.ok) nextErrors.lastName = validationMessage(tCommon, last);
    if (!first.ok) nextErrors.firstName = validationMessage(tCommon, first);
    if (!mail.ok) {
      nextErrors.email = createLoginAccount && !email.trim()
        ? t("emailRequiredForLogin")
        : validationMessage(tCommon, mail);
    }
    if (!tel.ok) nextErrors.phone = validationMessage(tCommon, tel);
    setFieldErrors(nextErrors);
    setFormError(null);
    if (!last.ok || !first.ok || !mail.ok || !tel.ok) return;

    setSaving(true);
    try {
      const created = await createStaff({
        lastName: last.value,
        firstName: first.value,
        contact: {
          email: mail.value || null,
          phones: tel.value ? [tel.value] : [],
        },
        functions: [staffKind],
        schoolId,
        createLoginAccount,
      });
      if (created.temporaryPassword && created.loginUsername) {
        notify.success(t("createdWithAccount"), {
          description: t("temporaryPasswordHint", {
            email: created.loginUsername,
            password: created.temporaryPassword,
          }),
          duration: 12_000,
        });
      } else {
        notify.success(t("created"));
      }
      router.replace(
        staffDetailPath(workspaceHome, staffTypeSlug(created.functions), created.id),
      );
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) setFormError(error.message);
      else setFormError(t("createError"));
      setSaving(false);
    }
  }

  function clearFieldError(key: keyof FieldErrors) {
    if (!fieldErrors[key] && !formError) return;
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (formError) setFormError(null);
  }

  const initials = createInitials(lastName, firstName);
  const previewName = [lastName.trim(), firstName.trim()].filter(Boolean).join(" ");
  const kindVisual = KIND_VISUAL[staffKind];
  const KindIcon = kindVisual.icon;

  return (
    <div className="relative mx-auto w-full max-w-[420px] slide-up">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -top-10 h-56 rounded-[40%] bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--ios-blue)_18%,transparent),_transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 top-24 size-40 rounded-full bg-[radial-gradient(circle,_color-mix(in_srgb,var(--ios-success)_14%,transparent),_transparent_70%)] blur-sm"
      />

      <div className="relative flex flex-col items-center">
        <div className="relative mb-3">
          <div
            aria-hidden
            className={cn(
              "absolute -inset-3 rounded-full opacity-80 blur-[10px] transition-colors duration-300",
              kindVisual.soft,
            )}
          />
          <div
            className={cn(
              "relative flex size-[88px] items-center justify-center rounded-full text-[24px] font-semibold tracking-[-0.03em] shadow-[var(--ios-shadow-md)] ring-2 transition-[background-color,color,box-shadow] duration-300",
              kindVisual.soft,
              kindVisual.ink,
              kindVisual.ring,
            )}
            aria-hidden
          >
            {initials ? initials : <KindIcon className="size-10 stroke-[1.4]" />}
          </div>
        </div>

        <p
          className={cn(
            "mb-5 min-h-[1.25rem] text-center text-[13px] font-medium tracking-[-0.01em] transition-opacity duration-200",
            previewName
              ? "text-[var(--ios-label)] opacity-100"
              : "text-[var(--ios-tertiary-label)] opacity-70",
          )}
        >
          {previewName || t("createPreviewHint")}
        </p>

        <div className="w-full overflow-hidden rounded-[var(--radius-xl)] bg-[var(--ios-card)] shadow-[var(--ios-shadow-lg)] ring-1 ring-[var(--ios-separator)]/50">
          <div className="border-b border-[var(--ios-separator)]/60 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ios-fill)_55%,var(--ios-card)),var(--ios-card))] px-6 pb-4 pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ios-secondary-label)]">
              {tNav("staff")}
            </p>
            <h1 className="mt-1 text-[var(--text-title2)] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
              {t("createTitle")}
            </h1>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--ios-secondary-label)]">
              {t("createDescription")}
            </p>
          </div>

          <form
            onSubmit={(e) => void onSubmit(e)}
            className="flex w-full flex-col gap-5 px-6 py-5"
            noValidate
          >
            <div className="flex flex-col gap-4">
              <Field
                id="staff-create-last-name"
                label={t("lastName")}
                error={fieldErrors.lastName}
              >
                <IconInput
                  id="staff-create-last-name"
                  icon={<User className="size-4 stroke-[1.75]" />}
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    clearFieldError("lastName");
                  }}
                  autoComplete="family-name"
                  maxLength={INPUT_LIMITS.personName}
                  invalid={Boolean(fieldErrors.lastName)}
                  disabled={saving}
                  autoFocus
                />
              </Field>

              <Field
                id="staff-create-first-name"
                label={t("firstName")}
                error={fieldErrors.firstName}
              >
                <IconInput
                  id="staff-create-first-name"
                  icon={<User className="size-4 stroke-[1.75]" />}
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    clearFieldError("firstName");
                  }}
                  autoComplete="given-name"
                  maxLength={INPUT_LIMITS.personName}
                  invalid={Boolean(fieldErrors.firstName)}
                  disabled={saving}
                />
              </Field>

              <Field
                id="staff-create-email"
                label={createLoginAccount ? t("emailRequiredLabel") : t("email")}
                error={fieldErrors.email}
              >
                <IconInput
                  id="staff-create-email"
                  type="email"
                  icon={<Mail className="size-4 stroke-[1.75]" />}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError("email");
                  }}
                  autoComplete="email"
                  inputMode="email"
                  maxLength={INPUT_LIMITS.email}
                  invalid={Boolean(fieldErrors.email)}
                  disabled={saving}
                />
              </Field>

              <Field
                id="staff-create-phone"
                label={t("phone")}
                error={fieldErrors.phone}
              >
                <IconInput
                  id="staff-create-phone"
                  type="tel"
                  icon={<Phone className="size-4 stroke-[1.75]" />}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    clearFieldError("phone");
                  }}
                  autoComplete="tel"
                  maxLength={INPUT_LIMITS.phone}
                  invalid={Boolean(fieldErrors.phone)}
                  disabled={saving}
                />
              </Field>
            </div>

            <fieldset disabled={saving}>
              <Label id="staff-kind-label">{t("createKindLabel")}</Label>
              <div
                role="radiogroup"
                aria-labelledby="staff-kind-label"
                className="mt-2 grid gap-2 sm:grid-cols-2"
              >
                {kindOptions.map((option) => {
                  const selected = staffKind === option.value;
                  const visual = KIND_VISUAL[option.value];
                  const OptionIcon = visual.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setStaffKind(option.value)}
                      className={cn(
                        "pressable flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border px-3 py-3 text-left transition-[border-color,background-color,box-shadow] duration-200",
                        selected
                          ? "border-[color-mix(in_srgb,var(--ios-blue)_40%,transparent)] bg-[var(--ios-info-soft)] shadow-[var(--ios-shadow-sm)]"
                          : "border-[var(--ios-separator)]/70 bg-[var(--ios-fill)]/40 hover:bg-[var(--ios-fill)]/70",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full",
                          visual.soft,
                          visual.ink,
                        )}
                        aria-hidden
                      >
                        <OptionIcon className="size-4 stroke-[1.75]" />
                      </span>
                      <span className="min-w-0 flex-1 text-[13px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
                        {option.label}
                      </span>
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                          selected
                            ? "border-[var(--ios-blue)] bg-[var(--ios-blue)] text-white"
                            : "border-[var(--ios-fill-secondary)] bg-transparent text-transparent",
                        )}
                        aria-hidden
                      >
                        <Check className="size-3 stroke-[2.5]" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="rounded-[var(--radius-md)] border border-dashed border-[color-mix(in_srgb,var(--ios-blue)_28%,var(--ios-separator))] bg-[color-mix(in_srgb,var(--ios-info-soft)_55%,var(--ios-card))] px-3.5 py-3">
              <Checkbox
                id="staff-create-login"
                checked={createLoginAccount}
                disabled={saving}
                onChange={(e) => {
                  setCreateLoginAccount(e.target.checked);
                  if (formError) setFormError(null);
                }}
                label={t("createLoginAccount")}
              />
              <p className="mt-1.5 pl-7 text-[var(--text-footnote)] leading-snug text-[var(--ios-secondary-label)]">
                {t("createLoginAccountHint")}
              </p>
            </div>

            {formError ? <Alert tone="danger" title={formError} /> : null}

            <div className="flex flex-col gap-2.5 pt-1">
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={saving}
                loading={saving}
              >
                {t("createSubmit")}
              </Button>
              <button
                type="button"
                disabled={saving}
                onClick={() => router.push(listHref)}
                className="pressable cursor-pointer py-2 text-center text-[13px] font-medium text-[var(--ios-danger)] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {tCommon("cancel")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
