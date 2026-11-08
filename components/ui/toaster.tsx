"use client";

import { Toaster as SonnerToaster } from "sonner";

/** Toaster global SMELS — style iOS, texte centré. */
export function AppToaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      offset={24}
      mobileOffset={88}
      gap={8}
      duration={3200}
      closeButton
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "!flex !min-h-[48px] !w-auto !max-w-[min(356px,calc(100vw-32px))] !items-center !justify-center !gap-0 !rounded-[var(--radius-md)] !border-0 !bg-[var(--ios-card)] !px-5 !py-3.5 !text-center !shadow-[var(--ios-shadow-md)] !font-[family-name:var(--font-ios)]",
          title:
            "!m-0 !w-full !text-center !text-[var(--text-subhead)] !font-semibold !leading-snug !tracking-[-0.01em]",
          description:
            "!mt-1 !w-full !text-center !text-[var(--text-footnote)] !leading-snug !text-[var(--ios-secondary-label)]",
          success: "[&_[data-title]]:!text-[var(--ios-success)]",
          error: "[&_[data-title]]:!text-[var(--ios-danger)]",
          warning: "[&_[data-title]]:!text-[var(--ios-warning)]",
          content: "!m-0 !flex !w-full !flex-col !items-center !justify-center !gap-0 !text-center",
          icon: "!hidden",
          closeButton:
            "!left-auto !right-1.5 !top-1.5 !translate-x-0 !translate-y-0 !border-0 !bg-[var(--ios-fill)] !text-[var(--ios-secondary-label)] hover:!bg-[var(--ios-fill-secondary)]",
        },
      }}
    />
  );
}
