"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/context/i18n";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { t } = useI18n();
  const { login, loginWithOAuth, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      const signedInUser = await login(email, password);
      setError(null);
      const hasProfile =
        Boolean(signedInUser.profile) ||
        Boolean(signedInUser.bio?.trim()) ||
        (signedInUser.skills?.length ?? 0) > 0 ||
        Boolean(signedInUser.profilePictureUrl);
      if (!hasProfile) {
        try {
          const response = await fetch("/api/profile-invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name: signedInUser.displayName ?? undefined })
          });
          const payload = await response.json().catch(() => null);
          if (response.ok && payload?.token) {
            router.push(`/create-profile?invite=${encodeURIComponent(payload.token)}`);
            return;
          }
        } catch (error) {
          console.warn("[login] unable to issue profile invite", error);
        }
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth_login_error"));
    }
  });

  const handleOAuth = useCallback(
    async (provider: "google" | "apple" | "github") => {
      const token = window.prompt(t("auth_oauth_prompt"));
      if (!token) return;
      try {
        await loginWithOAuth(provider, token);
        setError(null);
        router.push("/");
      } catch (err) {
        setError(err instanceof Error ? err.message : t("auth_login_error"));
      }
    },
    [loginWithOAuth, router, t]
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <h1 className="text-4xl font-semibold text-white">{t("auth_login_heading")}</h1>
        <p className="max-w-lg text-sm text-muted-foreground">{t("auth_login_subheading")}</p>
        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div className="rounded-2xl border border-border/60 bg-border/20 p-4">
            <p className="text-3xl font-semibold text-white">{t("auth_login_stat_connections_value")}</p>
            <p>{t("auth_login_stat_connections_caption")}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-border/20 p-4">
            <p className="text-3xl font-semibold text-white">{t("auth_login_stat_events_value")}</p>
            <p>{t("auth_login_stat_events_caption")}</p>
          </div>
        </div>
      </div>
      <Card className="border-border/60 bg-card/90 shadow-2xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-white">{t("auth_login_card_title")}</CardTitle>
          <CardDescription>{t("auth_login_card_description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <OAuthButton provider="google" onClick={() => handleOAuth("google")} />
            <OAuthButton provider="apple" onClick={() => handleOAuth("apple")} />
            <OAuthButton provider="github" onClick={() => handleOAuth("github")} />
          </div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <Separator className="flex-1" />
            <span>{t("generic_or")}</span>
            <Separator className="flex-1" />
          </div>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">{t("generic_email_label")}</Label>
              <Input id="email" type="email" placeholder={t("generic_email_placeholder")} {...register("email")} />
              {errors.email && <p className="text-xs text-accent">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("generic_password_label")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("generic_password_placeholder")}
                {...register("password")}
              />
              {errors.password && <p className="text-xs text-accent">{errors.password.message}</p>}
              <div className="text-right text-xs">
                <Link href="/forgot-password" className="text-primary hover:underline">
                  {t("auth_login_forgot_link")}
                </Link>
              </div>
            </div>
            {error && <p className="text-xs text-accent">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {t("auth_login_submit")}
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground">
            {t("auth_login_signup_prompt")} {" "}
            <Link href="/signup" className="text-primary hover:underline">
              {t("auth_login_signup_link")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
