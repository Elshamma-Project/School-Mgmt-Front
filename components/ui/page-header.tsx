type PageHeaderProps = {
  title: string;
  description?: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="mb-6">
      <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[var(--ios-label)]">
        {title}
      </h1>
      {description ? (
        <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-[var(--ios-secondary-label)]">
          {description}
        </p>
      ) : null}
    </header>
  );
}
