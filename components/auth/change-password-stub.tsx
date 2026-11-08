"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";

/** Stub UI — branchement API change-password à venir. */
export function ChangePasswordStub() {
  const t = useTranslations("auth");
  const router = useRouter();
  const setMustChangePassword = useAuthStore((s) => s.setMustChangePassword);

  function handleContinue() {
    setMustChangePassword(false);
    router.replace("/");
  }

  return (
    <form
      className="flex w-full flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        handleContinue();
      }}
    >
      <div>
        <Label htmlFor="currentPassword">{t("currentPassword")}</Label>
        <Input id="currentPassword" type="password" autoComplete="current-password" />
      </div>
      <div>
        <Label htmlFor="newPassword">{t("newPassword")}</Label>
        <Input id="newPassword" type="password" autoComplete="new-password" />
      </div>
      <div>
        <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
        <Input id="confirmPassword" type="password" autoComplete="new-password" />
      </div>
      <Button type="submit" size="lg" className="mt-2 w-full">
        {t("changePasswordSubmit")}
      </Button>
    </form>
  );
}
