"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { consumePostLoginFlash } from "@/lib/ui/post-login-flash";
import { notify } from "@/lib/ui/notify";

/**
 * Affiche le toast de connexion une fois le shell app monté (dashboard prêt).
 * Consomme le flash une seule fois au montage (deps stables — évite d’annuler le timer).
 */
export function PostLoginToast() {
  const t = useTranslations("auth");

  useEffect(() => {
    const flash = consumePostLoginFlash();
    if (!flash) return;

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
    // Une seule fois : le flash est déjà consommé ; [t] ferait perdre le toast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
