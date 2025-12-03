"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getBackend } from "@/lib/backend";
import { useI18n } from "@/context/i18n";

type FormValues = {
  email: string;
};

const buildSchema = () =>
  z.object({
    email: z.string().email()
  });

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const backend = getBackend();
  const schema = useMemo(() => buildSchema(), []);
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async ({ email }) => {
    setPending(true);
    setError(null);
    setSubmittedEmail(null);
    try {
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
      await backend.auth.requestPasswordReset({ email, redirectTo });
      setSubmittedEmail(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth_forgot_error"));
    } finally {
      setPending(false);
    }
  });

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16">
      <Card className="border-border/60 bg-card/90 shadow-2xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-white">{t("auth_forgot_title")}</CardTitle>
          <CardDescription>{t("auth_forgot_description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {submittedEmail ? (
            <div className="space-y-4 rounded-2xl border border-primary/40 bg-primary/5 p-4 text-sm text-primary">
              <p>{t("auth_forgot_success_title")}</p>
              <p>{t("auth_forgot_success_body", { email: submittedEmail })}</p>
              <Button asChild variant="secondary" size="sm">
                <Link href="/login">{t("auth_forgot_success_cta")}</Link>
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">{t("generic_email_label")}</Label>
                <Input id="email" type="email" placeholder={t("generic_email_placeholder")} {...register("email")} />
                {errors.email && <p className="text-xs text-accent">{errors.email.message}</p>}
              </div>
              {error && <p className="text-xs text-accent">{error}</p>}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? t("generic_loading") : t("auth_forgot_submit")}
              </Button>
            </form>
          )}
          {!submittedEmail && (
            <p className="text-center text-xs text-muted-foreground">
              {t("auth_forgot_back_to_login")}{" "}
              <Link href="/login" className="text-primary hover:underline">
                {t("auth_login_card_title")}
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
