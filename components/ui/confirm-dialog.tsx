"use client";

import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { Dialog, type DialogAction } from "@/components/ui/dialog";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  /** destructive = rouge (déconnexion, suppression…) */
  tone?: "default" | "destructive";
  /** Pastille d’icône ; défaut = `tone`. */
  iconTone?: "default" | "destructive";
  /** Disposition des boutons ; défaut auto (voir Dialog). */
  actionsLayout?: "auto" | "row" | "stack";
  icon?: ReactNode;
};

/** Boîte de confirmation prête à l’emploi pour les actions critiques. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  tone = "destructive",
  iconTone,
  actionsLayout,
  icon,
}: ConfirmDialogProps) {
  const actions: DialogAction[] = [
    {
      label: cancelLabel,
      variant: "cancel",
      onClick: () => undefined,
      autoFocus: true,
    },
    {
      label: confirmLabel,
      variant: tone === "destructive" ? "destructive" : "default",
      onClick: onConfirm,
    },
  ];

  const resolvedIcon =
    icon ??
    (tone === "destructive" || iconTone === "destructive" ? (
      <LogOut className="size-5 stroke-[1.75]" aria-hidden />
    ) : null);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      actions={actions}
      tone={tone}
      iconTone={iconTone}
      actionsLayout={actionsLayout}
      icon={resolvedIcon}
    />
  );
}
