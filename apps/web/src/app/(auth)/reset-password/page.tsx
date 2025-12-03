"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/context/i18n";
import { useAuth } from "@/hooks/useAuth";
import { getBackend } from "@/lib/backend";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type FormValues = {
  password: string;
  confirmPassword: string;
};

const buildSchema = (mismatchMessage: string) =>
  z
    .object({
      password: z.string().min(6),
      confirmPassword: z.string().min(6)
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: mismatchMessage,
      path: ["confirmPassword"]
    });

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const { refresh } = useAuth();
  const router = useRouter();
  const backend = getBackend();
  const schema = useMemo(() => buildSchema(t("auth_reset_match_error")), [t]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setInitialized(true);
      return;
    }
    void client.auth.getSession().then(({ data }) => {
      setInitialized(true);
      if (!data.session) {
        setLinkInvalid(true);
        setError(t("auth_reset_invalid_link"));
      }
    });
  }, [t]);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async ({ password }) => {
    setPending(true);
    setError(null);
    try {
      await backend.auth.resetPassword({ password });
      await refresh();
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth_reset_error");
      setError(message);
      if (message.toLowerCase().includes("invalid")) {
        setLinkInvalid(true);
      }
    } finally {
      setPending(false);
    }
  });

  if (!initialized) {
    return (
      <div className="mx-auto w-full max-w-xl px-6 py-16">
        <Card className="border-border/60 bg-card/90 shadow-2xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl text-white">{t("auth_reset_title")}</CardTitle>
            <CardDescription>{t("auth_reset_description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("generic_loading")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16">
      <Card className="border-border/60 bg-card/90 shadow-2xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-white">{t("auth_reset_title")}</CardTitle>
          <CardDescription>{t("auth_reset_description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {success ? (
            <div className="space-y-4 rounded-2xl border border-primary/40 bg-primary/5 p-4 text-sm text-primary">
              <p>{t("auth_reset_success_title")}</p>
              <p>{t("auth_reset_success_body")}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild size="sm">
                  <Link href="/">{t("auth_reset_success_cta")}</Link>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => router.push("/login")}>
                  {t("auth_login_card_title")}
                </Button>
              </div>
            </div>
          ) : linkInvalid ? (
            <div className="space-y-4 rounded-2xl border border-border/60 bg-border/10 p-4 text-sm text-muted-foreground">
              <p>{t("auth_reset_invalid_link")}</p>
              <Button asChild variant="secondary" size="sm">
                <Link href="/forgot-password">{t("auth_reset_request_new_link")}</Link>
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth_reset_password_label")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("generic_password_placeholder")}
                  {...register("password")}
                />
                {errors.password && <p className="text-xs text-accent">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("auth_reset_confirm_label")}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t("generic_password_placeholder")}
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && <p className="text-xs text-accent">{errors.confirmPassword.message}</p>}
              </div>
              {error && <p className="text-xs text-accent">{error}</p>}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? t("generic_loading") : t("auth_reset_submit")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
