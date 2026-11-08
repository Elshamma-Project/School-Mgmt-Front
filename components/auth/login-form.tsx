"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/api/auth";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/types/api";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  schoolId: z.string().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "", schoolId: "" },
  });

  async function onSubmit(values: LoginValues) {
    setSubmitting(true);
    try {
      const payload = {
        username: values.username.trim(),
        password: values.password,
        ...(values.schoolId?.trim()
          ? { schoolId: values.schoolId.trim() }
          : {}),
      };

      const response = await login(payload);
      setSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: response.user,
        mustChangePassword: response.mustChangePassword,
      });

      if (response.mustChangePassword) {
        router.replace("/change-password");
      } else {
        router.replace("/");
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        toast.error(t("invalidCredentials"));
      } else if (error instanceof ApiError && error.message === "network") {
        toast.error(tErrors("network"));
      } else {
        toast.error(tErrors("generic"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-4" noValidate>
      <div>
        <Label htmlFor="username">{t("username")}</Label>
        <Input
          id="username"
          autoComplete="username"
          aria-invalid={Boolean(errors.username)}
          {...register("username")}
        />
        {errors.username ? (
          <p className="mt-1 text-[13px] text-[var(--ios-danger)]">{t("requiredField")}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password ? (
          <p className="mt-1 text-[13px] text-[var(--ios-danger)]">{t("requiredField")}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="schoolId">{t("schoolId")}</Label>
        <Input
          id="schoolId"
          autoComplete="organization"
          placeholder={t("schoolIdPlaceholder")}
          {...register("schoolId")}
        />
      </div>

      <Button type="submit" size="lg" className="mt-2 w-full" disabled={submitting}>
        {submitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
