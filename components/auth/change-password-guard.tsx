"use client";

import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { useRouter } from "@/i18n/navigation";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import { useAuthStore } from "@/stores/auth-store";
import { primaryRole } from "@/types/auth";

type ChangePasswordGuardProps = {
  children: React.ReactNode;
};

/** Exige une session hydratée ; renvoie à l’espace rôle si le changement n’est plus requis. */
export function ChangePasswordGuard({ children }: ChangePasswordGuardProps) {
  const router = useRouter();
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
      router.replace("/login");
      return;
    }
    if (!mustChangePassword) {
      router.replace(role ? getRoleHomePath(role) : "/");
    }
  }, [accessToken, hydrated, mustChangePassword, role, router]);

  if (!hydrated || !accessToken || !mustChangePassword) {
    return (
      <div className="min-h-dvh bg-[var(--ios-bg)] px-5 py-8 md:px-8">
        <PageSkeleton variant="home" />
      </div>
    );
  }

  return children;
}
