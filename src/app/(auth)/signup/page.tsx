"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { OAuthButton } from "@/components/auth/OAuthButton";
import { getBackend } from "@/lib/backend";
import { useI18n } from "@/context/i18n";

type FormValues = {
  email: string;
  password: string;
  name: string;
};

export default function SignupPage() {
  const { t } = useI18n();
  const router = useRouter();
  const backend = getBackend();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(2, t("auth_signup_name_error"))
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async ({ email, password, name }) => {
    setSendingInvite(true);
    setError(null);
    setSuccess(false);
    setInviteEmail(null);
    setInviteToken(null);
    try {
      const session = await backend.auth.signup({ email, password });
      await backend.users.update(session.user.userId, {
        displayName: name
      });
      const response = await fetch("/api/profile-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.token) {
        throw new Error(payload?.error ?? t("auth_signup_invite_error"));
      }
      setInviteEmail(email);
      setInviteToken(payload.token);
      setSuccess(true);
      setError(null);
    } catch (err) {
      setSuccess(false);
      setError(err instanceof Error ? err.message : t("auth_signup_error"));
    } finally {
      setSendingInvite(false);
    }
  });

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-12 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="border-border/60 bg-card/90 shadow-2xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-white">{t("auth_signup_title")}</CardTitle>
          <CardDescription>{t("auth_signup_description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <OAuthButton provider="google" onClick={() => console.log("google oauth")} />
            <OAuthButton provider="apple" onClick={() => console.log("apple oauth")} />
            <OAuthButton provider="linkedin" onClick={() => console.log("linkedin oauth")} />
          </div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <Separator className="flex-1" />
            <span>{t("generic_or")}</span>
            <Separator className="flex-1" />
          </div>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">{t("auth_signup_display_label")}</Label>
              <Input id="name" placeholder={t("generic_display_name_placeholder")} {...register("name")} />
              {errors.name && <p className="text-xs text-accent">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth_signup_email_label")}</Label>
              <Input id="email" type="email" placeholder={t("generic_email_placeholder")} {...register("email")} />
              {errors.email && <p className="text-xs text-accent">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth_signup_password_label")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("generic_password_placeholder")}
                {...register("password")}
              />
              {errors.password && <p className="text-xs text-accent">{errors.password.message}</p>}
            </div>
            {error && <p className="text-xs text-accent">{error}</p>}
            {success && inviteEmail && (
              <div className="space-y-3 rounded-2xl border border-primary/40 bg-primary/5 p-3 text-xs text-primary">
                <p>{t("auth_signup_invite_sent", { email: inviteEmail })}</p>
                <p>{t("auth_signup_invite_help")}</p>
                {inviteToken && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => router.push(`/create-profile?invite=${encodeURIComponent(inviteToken)}`)}
                  >
                    {t("auth_signup_invite_cta")}
                  </Button>
                )}
                <Button variant="link" className="p-0 text-xs" asChild>
                  <Link href="/login">{t("auth_signup_login_link")}</Link>
                </Button>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={sendingInvite}>
              {t("auth_signup_submit")}
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground">
            {t("auth_signup_login_prompt")} {" "}
            <Link href="/login" className="text-primary hover:underline">
              {t("auth_signup_login_link")}
            </Link>
          </p>
        </CardContent>
      </Card>
      <div className="space-y-6 lg:pt-10">
        <h2 className="text-4xl font-semibold text-white">{t("auth_signup_title")}</h2>
        <ul className="space-y-4 text-sm text-muted-foreground">
          <li className="rounded-2xl border border-border/60 bg-border/20 p-4">
            <p className="text-white">{t("auth_signup_highlight_onboarding_title")}</p>
            <p>{t("auth_signup_highlight_onboarding_body")}</p>
          </li>
          <li className="rounded-2xl border border-border/60 bg-border/20 p-4">
            <p className="text-white">{t("auth_signup_highlight_ai_title")}</p>
            <p>{t("auth_signup_highlight_ai_body")}</p>
          </li>
          <li className="rounded-2xl border border-border/60 bg-border/20 p-4">
            <p className="text-white">{t("auth_signup_highlight_hubs_title")}</p>
            <p>{t("auth_signup_highlight_hubs_body")}</p>
          </li>
        </ul>
      </div>
    </div>
  );
}
