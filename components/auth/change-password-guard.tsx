"use client";

import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";

type ChangePasswordGuardProps = {
  children: React.ReactNode;
};

/** Exige une session hydratée pour /change-password. */
export function ChangePasswordGuard({ children }: ChangePasswordGuardProps) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const finish = () => setHydrated(true);
    if (useAuthStore.persist.hasHydrated()) {
      finish();
      return;
    }
    return useAuthStore.persist.onFinishHydration(finish);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
    }
  }, [accessToken, hydrated, router]);

  if (!hydrated || !accessToken) {
    return (
      <div className="min-h-dvh bg-[var(--ios-bg)] px-5 py-8 md:px-8">
        <PageSkeleton variant="home" />
      </div>
    );
  }

  return children;
}
