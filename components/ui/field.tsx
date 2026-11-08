import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

type FieldProps = {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

/** Champ formulaire standard : label + contrôle + hint/erreur. */
export function Field({ id, label, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn("w-full", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[var(--text-footnote)] text-[var(--ios-danger)]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[var(--text-footnote)] text-[var(--ios-secondary-label)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
