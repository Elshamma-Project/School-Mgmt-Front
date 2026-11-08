"use client";

import { Toaster as SonnerToaster } from "sonner";

/** Toaster global SMELS — style iOS discret. */
export function AppToaster() {
  return (
    <SonnerToaster
      position="top-center"
      offset={16}
      gap={8}
      duration={3200}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "!rounded-[var(--radius-md)] !border-0 !bg-[var(--ios-card)] !text-[var(--ios-label)] !shadow-[var(--ios-shadow-md)] !font-[family-name:var(--font-ios)]",
          title: "!text-[var(--text-subhead)] !font-semibold",
          description: "!text-[var(--text-footnote)] !text-[var(--ios-secondary-label)]",
          success: "!text-[var(--ios-success)]",
          error: "!text-[var(--ios-danger)]",
          warning: "!text-[var(--ios-warning)]",
          closeButton:
            "!bg-[var(--ios-fill)] !border-0 !text-[var(--ios-secondary-label)] hover:!bg-[var(--ios-fill-secondary)]",
        },
      }}
    />
  );
}
