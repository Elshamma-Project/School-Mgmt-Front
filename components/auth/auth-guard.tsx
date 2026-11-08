"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const accessToken = useAuthStore((s) => s.accessToken);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated());
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!accessToken) {
      router.replace("/login");
      return;
    }

    if (mustChangePassword && pathname !== "/change-password") {
      router.replace("/change-password");
    }
  }, [accessToken, hydrated, locale, mustChangePassword, pathname, router]);

  if (!hydrated || !accessToken || (mustChangePassword && pathname !== "/change-password")) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--ios-bg)] text-[var(--ios-secondary-label)]">
        <span className="text-[15px]">…</span>
      </div>
    );
  }

  return children;
}
