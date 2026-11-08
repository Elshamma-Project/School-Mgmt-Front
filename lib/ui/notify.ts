import { toast } from "sonner";

type NotifyOptions = {
  description?: string;
  duration?: number;
};

const centeredClassNames = {
  toast: "!justify-center !text-center",
  title: "!w-full !text-center",
  description: "!w-full !text-center",
  content: "!items-center !text-center",
};

/** API toast unifiée (Sonner + style iOS, texte centré). */
export const notify = {
  success(message: string, options?: NotifyOptions) {
    return toast.success(message, {
      description: options?.description,
      duration: options?.duration ?? 3200,
      classNames: centeredClassNames,
    });
  },
  error(message: string, options?: NotifyOptions) {
    return toast.error(message, {
      description: options?.description,
      duration: options?.duration ?? 4200,
      classNames: centeredClassNames,
    });
  },
  warning(message: string, options?: NotifyOptions) {
    return toast.warning(message, {
      description: options?.description,
      duration: options?.duration ?? 3600,
      classNames: centeredClassNames,
    });
  },
  info(message: string, options?: NotifyOptions) {
    return toast.message(message, {
      description: options?.description,
      duration: options?.duration ?? 3200,
      classNames: centeredClassNames,
    });
  },
  dismiss(id?: string | number) {
    toast.dismiss(id);
  },
};
