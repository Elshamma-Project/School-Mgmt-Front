"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import { useAuthStore } from "@/stores/auth-store";
import { primaryRole } from "@/types/auth";

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((s) => s.accessToken);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const user = useAuthStore((s) => s.user);
  const role = primaryRole(user);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated());
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!accessToken || !role) {
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
      <div className="flex min-h-dvh items-center justify-center bg-[var(--ios-bg)] text-[var(--ios-secondary-label)]">
        <span className="text-[var(--text-subhead)]">…</span>
      </div>
    );
  }

  return children;
}
