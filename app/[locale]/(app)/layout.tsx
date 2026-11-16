import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { PostLoginToast } from "@/components/auth/post-login-toast";
import { RoleGuard } from "@/components/auth/role-guard";
import { AppShell } from "@/components/layout/app-shell";
import { PageSkeleton } from "@/components/ui/page-skeleton";

type AppLayoutProps = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-[var(--ios-bg)] px-5 py-8 md:px-8">
          <PageSkeleton variant="home" />
        </div>
      }
    >
      <AuthGuard>
        <RoleGuard>
          <PostLoginToast />
          <AppShell>{children}</AppShell>
        </RoleGuard>
      </AuthGuard>
    </Suspense>
  );
}
