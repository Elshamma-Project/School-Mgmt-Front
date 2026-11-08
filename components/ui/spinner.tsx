import { cn } from "@/lib/utils/cn";

type SpinnerProps = {
  size?: "sm" | "md" | "lg";
  tone?: "default" | "inverse" | "blue";
  className?: string;
  label?: string;
};

const sizeMap = {
  sm: "size-4 border-[1.5px]",
  md: "size-5 border-2",
  lg: "size-8 border-2",
} as const;

const toneMap = {
  default: "border-[var(--ios-fill-tertiary)] border-t-[var(--ios-secondary-label)]",
  inverse: "border-white/25 border-t-white",
  blue: "border-[var(--ios-blue)]/20 border-t-[var(--ios-blue)]",
} as const;

export function Spinner({
  size = "md",
  tone = "default",
  className,
  label = "Loading",
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block animate-[smels-spin_0.7s_linear_infinite] rounded-full",
        sizeMap[size],
        toneMap[tone],
        className,
      )}
    />
  );
}
