import { getTranslations } from "next-intl/server";

type AppFooterProps = {
  className?: string;
};

/** Pied de page léger — copyright école / SMELS. */
export async function AppFooter({ className }: AppFooterProps) {
  const t = await getTranslations("common");
  const year = new Date().getFullYear();

  return (
    <footer
      className={
        className ??
        "relative z-10 px-5 pb-6 pt-2 text-center text-[var(--text-caption)] leading-relaxed text-[var(--ios-tertiary-label)]"
      }
    >
      <p>
        {t("copyright", {
          year,
          school: t("schoolName"),
          app: t("appName"),
        })}
      </p>
    </footer>
  );
}
