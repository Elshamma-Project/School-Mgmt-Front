type PageHeaderProps = {
  /** Sous-titre / intro sous le header de page (le titre est dans AppHeader). */
  description?: string;
  className?: string;
};

export function PageHeader({ description, className }: PageHeaderProps) {
  if (!description) return null;

  return (
    <p
      className={
        className ??
        "mb-6 max-w-2xl text-[15px] leading-relaxed text-[var(--ios-secondary-label)]"
      }
    >
      {description}
    </p>
  );
}
