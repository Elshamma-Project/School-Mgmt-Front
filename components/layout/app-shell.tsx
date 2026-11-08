"use client";

import { AppHeader } from "@/components/layout/app-header";
import { MobileTabBar } from "@/components/layout/app-nav";
import { AppSidebar } from "@/components/layout/app-sidebar";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-[var(--ios-bg)] text-[var(--ios-label)]">
      <div className="flex min-h-dvh">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="fade-in flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-8 md:pt-6">
            {children}
          </main>
          <MobileTabBar />
        </div>
      </div>
    </div>
  );
}
