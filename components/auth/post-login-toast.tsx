"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { consumePostLoginFlash } from "@/lib/ui/post-login-flash";
import { notify } from "@/lib/ui/notify";

/**
 * Affiche le toast de connexion une fois le shell app monté (dashboard prêt).
 */
export function PostLoginToast() {
  const t = useTranslations("auth");

  useEffect(() => {
    const flash = consumePostLoginFlash();
    if (!flash) return;

    // Laisse le premier paint du dashboard se stabiliser avant le toast.
    const timer = window.setTimeout(() => {
      if (flash.kind === "loginSuccessDemo") {
        notify.success(t("loginSuccessDemo"), {
          description: flash.roleLabel,
        });
      } else {
        notify.success(t("loginSuccess"));
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [t]);

  return null;
}
