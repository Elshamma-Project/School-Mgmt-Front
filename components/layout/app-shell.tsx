"use client";

import { useEffect } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useAuthStore } from "@/stores/auth-store";
import { useSchoolBrandStore } from "@/stores/school-brand-store";

type AppShellProps = {
  children: React.ReactNode;
};

/**
 * Shell app : sidebar + header stables.
 * Ne démonte plus `children` à chaque navigation (évite flash / perte d’état) —
 * les `loading.tsx` Next gèrent le suspense de route.
 */
export function AppShell({ children }: AppShellProps) {
  const schoolId = useAuthStore((s) => s.user?.schoolId ?? null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrateSchool = useSchoolBrandStore((s) => s.hydrate);
  const clearSchool = useSchoolBrandStore((s) => s.clear);

  useEffect(() => {
    if (!accessToken) {
      clearSchool();
      return;
    }
    void hydrateSchool(schoolId);
  }, [accessToken, schoolId, hydrateSchool, clearSchool]);

  return (
    <div className="min-h-dvh bg-[var(--ios-bg)] text-[var(--ios-label)]">
      <div className="flex min-h-dvh">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="fade-in flex-1 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 md:px-8 md:pb-8 md:pt-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
