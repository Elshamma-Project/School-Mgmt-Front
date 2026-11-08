import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type AlertTone = "info" | "success" | "warning" | "danger";

type AlertProps = {
  title: string;
  description?: string;
  tone?: AlertTone;
  action?: ReactNode;
  className?: string;
};

const toneClasses: Record<AlertTone, string> = {
  info: "bg-[var(--ios-info-soft)] text-[var(--ios-blue)]",
  success: "bg-[var(--ios-success-soft)] text-[var(--ios-success)]",
  warning: "bg-[var(--ios-warning-soft)] text-[var(--ios-warning)]",
  danger: "bg-[var(--ios-danger-soft)] text-[var(--ios-danger)]",
};

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle,
} as const;

/** Bandeau d’alerte inline (dans une page / formulaire). */
export function Alert({
  title,
  description,
  tone = "info",
  action,
  className,
}: AlertProps) {
  const Icon = icons[tone];

  return (
    <div
      role="status"
      className={cn(
        "flex gap-3 rounded-[var(--radius-md)] px-3.5 py-3 fade-in",
        toneClasses[tone],
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0 stroke-[1.75]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[var(--text-subhead)] font-semibold text-[var(--ios-label)]">
          {title}
        </p>
        {description ? (
          <p className="mt-0.5 text-[var(--text-footnote)] leading-snug text-[var(--ios-secondary-label)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}
