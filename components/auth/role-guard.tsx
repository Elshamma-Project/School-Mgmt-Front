"use client";

import { useEffect } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  canRoleAccessPath,
  getRoleHomePath,
} from "@/lib/auth/workspaces";
import { useAuthStore } from "@/stores/auth-store";
import { primaryRole } from "@/types/auth";

type RoleGuardProps = {
  children: React.ReactNode;
};

/** Empêche un rôle d’entrer dans l’espace URL d’un autre. */
export function RoleGuard({ children }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const role = primaryRole(user);

  useEffect(() => {
    if (!role) return;

    if (pathname === "/") {
      router.replace(getRoleHomePath(role));
      return;
    }

    if (!canRoleAccessPath(role, pathname)) {
      router.replace(getRoleHomePath(role));
    }
  }, [pathname, role, router]);

  if (!role || pathname === "/" || !canRoleAccessPath(role, pathname)) {
    return (
      <div className="min-h-dvh bg-[var(--ios-bg)] px-5 py-8 md:px-8">
        <PageSkeleton variant="home" />
      </div>
    );
  }

  return children;
}
