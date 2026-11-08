"use client";

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

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      actions={actions}
    />
  );
}
