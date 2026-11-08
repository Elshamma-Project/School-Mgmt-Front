import { toast } from "sonner";

type NotifyOptions = {
  description?: string;
  duration?: number;
};

/** API toast unifiée (Sonner + style iOS). */
export const notify = {
  success(message: string, options?: NotifyOptions) {
    return toast.success(message, {
      description: options?.description,
      duration: options?.duration ?? 3200,
    });
  },
  error(message: string, options?: NotifyOptions) {
    return toast.error(message, {
      description: options?.description,
      duration: options?.duration ?? 4200,
    });
  },
  warning(message: string, options?: NotifyOptions) {
    return toast.warning(message, {
      description: options?.description,
      duration: options?.duration ?? 3600,
    });
  },
  info(message: string, options?: NotifyOptions) {
    return toast.message(message, {
      description: options?.description,
      duration: options?.duration ?? 3200,
    });
  },
  dismiss(id?: string | number) {
    toast.dismiss(id);
  },
};
