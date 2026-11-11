"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { usePathname } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useSchoolBrandStore } from "@/stores/school-brand-store";

type AppShellProps = {
  children: React.ReactNode;
};

function skeletonVariantForPath(pathname: string) {
  if (pathname.startsWith("/profile")) return "form" as const;
  if (pathname.startsWith("/settings")) return "settings" as const;
  if (pathname.startsWith("/notifications")) return "module" as const;
  const depth = pathname.split("/").filter(Boolean).length;
  if (depth >= 2) return "module" as const;
  return "home" as const;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [showSkeleton, setShowSkeleton] = useState(false);
  const schoolId = useAuthStore((s) => s.user?.schoolId ?? null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrateSchool = useSchoolBrandStore((s) => s.hydrate);
  const clearSchool = useSchoolBrandStore((s) => s.clear);

  useEffect(() => {
    setShowSkeleton(true);
    const timer = window.setTimeout(() => setShowSkeleton(false), 320);
    return () => window.clearTimeout(timer);
  }, [pathname]);

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
            {showSkeleton ? (
              <PageSkeleton variant={skeletonVariantForPath(pathname)} />
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
