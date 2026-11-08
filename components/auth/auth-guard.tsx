"use client";

import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { usePathname, useRouter } from "@/i18n/navigation";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import { syncAuthCookie, useAuthStore } from "@/stores/auth-store";
import { primaryRole } from "@/types/auth";

type AuthGuardProps = {
  children: React.ReactNode;
};

/**
 * Toujours le même HTML au 1er rendu (SSR + client) → skeleton.
 * Réhydratation uniquement après montage (évite mismatch hydration).
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((s) => s.accessToken);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const user = useAuthStore((s) => s.user);
  const role = primaryRole(user);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (!cancelled) setHydrated(true);
    };

    if (useAuthStore.persist.hasHydrated()) {
      finish();
      return () => {
        cancelled = true;
      };
    }

    const unsub = useAuthStore.persist.onFinishHydration(finish);
    void useAuthStore.persist.rehydrate().then(finish);
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!accessToken) {
      syncAuthCookie(false);
      router.replace("/login");
      return;
    }

    syncAuthCookie(true);

    if (!role) {
      router.replace("/login");
      return;
    }

    if (mustChangePassword && pathname !== "/change-password") {
      router.replace("/change-password");
      return;
    }

    if (pathname === "/") {
      router.replace(getRoleHomePath(role));
    }
  }, [accessToken, hydrated, mustChangePassword, pathname, role, router]);

  if (
    !hydrated ||
    !accessToken ||
    !role ||
    (mustChangePassword && pathname !== "/change-password") ||
    pathname === "/"
  ) {
    return (
      <div className="min-h-dvh bg-[var(--ios-bg)] px-5 py-8 md:px-8">
        <PageSkeleton variant="home" />
      </div>
    );
  }

  return children;
}
