import { cn } from "@/lib/utils/cn";

type BrandMarkProps = {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  alt?: string;
};

const SIZE_CLASS = {
  sm: "size-8",
  md: "size-10",
  lg: "size-[72px]",
  xl: "size-24",
} as const;

/**
 * Logo école. Chemin : `NEXT_PUBLIC_SCHOOL_LOGO_URL` ou `/brand/el-shammah-logo.svg`.
 * Remplacer le fichier dans `public/brand/` par le logo officiel dès qu’il est disponible.
 */
export function BrandMark({
  className,
  size = "md",
  alt = "El Shammah",
}: BrandMarkProps) {
  const src =
    process.env.NEXT_PUBLIC_SCHOOL_LOGO_URL?.trim() || "/brand/el-shammah-logo.svg";

  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG / URL branding déployable sans config remote
    <img
      src={src}
      alt={alt}
      width={size === "xl" ? 96 : size === "lg" ? 72 : size === "md" ? 40 : 32}
      height={size === "xl" ? 96 : size === "lg" ? 72 : size === "md" ? 40 : 32}
      decoding="async"
      className={cn(
        "shrink-0 rounded-full bg-[var(--ios-card)] object-cover shadow-[var(--ios-shadow-sm)] ring-1 ring-[var(--ios-separator)]",
        SIZE_CLASS[size],
        className,
      )}
    />
  );
}
