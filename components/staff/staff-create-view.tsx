"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { IconInput } from "@/components/ui/icon-input";
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
import { useAuthStore } from "@/stores/auth-store";
import { usePageHeadingStore } from "@/stores/page-heading-store";
import { ApiError, isAuthFailure } from "@/types/api";
import { primaryRole } from "@/types/auth";

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
  const isDirector =
    role === "DIRECTOR" || role === "SUPER_ADMIN";
  /** ADMINISTRATION : TEACHER | OTHER uniquement (docs/05). */
  type CreateKind = "TEACHER" | "OTHER" | "HEAD_OF_SCHOOL" | "SECRETARY";
  const [staffKind, setStaffKind] = useState<CreateKind>("TEACHER");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
    if (!lastName.trim()) {
      setFormError(t("lastNameRequired"));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const created = await createStaff({
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        contact: {
          email: email.trim() || null,
          phones: phone.trim() ? [phone.trim()] : [],
        },
        functions: [staffKind],
        schoolId,
      });
      notify.success(t("created"));
      router.replace(
        staffDetailPath(workspaceHome, staffTypeSlug(created.functions), created.id),
      );
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) setFormError(error.message);
      else setFormError(t("createError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 slide-up">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
          {t("createTitle")}
        </h1>
      </div>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]"
      >
        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="staff-create-last-name" label={t("lastName")} error={formError ?? undefined}>
              <IconInput
                id="staff-create-last-name"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (formError) setFormError(null);
                }}
                autoComplete="family-name"
                invalid={Boolean(formError)}
                autoFocus
              />
            </Field>
            <Field id="staff-create-first-name" label={t("firstName")}>
              <IconInput
                id="staff-create-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </Field>
          </div>

          <Field id="staff-create-email" label={t("email")}>
            <IconInput
              id="staff-create-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>

          <Field id="staff-create-phone" label={t("phone")}>
            <IconInput
              id="staff-create-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </Field>

          <fieldset className="space-y-2">
            <legend className="text-[12px] font-medium text-[var(--ios-secondary-label)]">
              {t("createKindLabel")}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {kindOptions.map((option) => {
                const selected = staffKind === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStaffKind(option.value)}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-[var(--radius-md)] border px-3 py-2.5 text-left text-[13px] font-medium transition-colors focus-visible:shadow-[var(--focus-ring)]",
                      selected
                        ? "border-[color-mix(in_srgb,var(--ios-blue)_45%,transparent)] bg-[var(--ios-info-soft)] text-[var(--ios-blue)]"
                        : "border-[var(--ios-separator)]/70 bg-[var(--ios-card)] text-[var(--ios-label)] hover:bg-[var(--ios-fill)]/40",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--ios-separator)]/70 px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => router.push(listHref)}
          >
            {tCommon("cancel")}
          </Button>
          <Button type="submit" loading={saving}>
            {t("createSubmit")}
          </Button>
        </div>
      </form>
    </div>
  );
}
