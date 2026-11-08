import { AuthGuard } from "@/components/auth/auth-guard";
import { PostLoginToast } from "@/components/auth/post-login-toast";
import { RoleGuard } from "@/components/auth/role-guard";
import { AppShell } from "@/components/layout/app-shell";

type AppLayoutProps = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <AuthGuard>
      <RoleGuard>
        <PostLoginToast />
        <AppShell>{children}</AppShell>
      </RoleGuard>
    </AuthGuard>
  );
}
