"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, LifeBuoy, Lock, MessageSquare, ShieldCheck, Sparkles } from "lucide-react";
import { useSessionState } from "@/context/session";
import { useI18n } from "@/context/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const statValues = [
  { value: "148", labelKey: "help_center_stat_requests_label", detailKey: "help_center_stat_requests_detail" },
  { value: "72", labelKey: "help_center_stat_helpers_label", detailKey: "help_center_stat_helpers_detail" },
  { value: "94%", labelKey: "help_center_stat_resolution_label", detailKey: "help_center_stat_resolution_detail" }
];

export default function HelpCenterPage() {
  const { t } = useI18n();
  const sessionUser = useSessionState((state) => state.user);
  const primaryHref = sessionUser ? "/help-center/workspace" : "/signup";
  const primaryLabel = sessionUser ? t("help_center_primary_cta_authed") : t("help_center_primary_cta_guest");

  const features = useMemo(
    () => [
      { icon: LifeBuoy, title: t("help_center_feature_requests_title"), copy: t("help_center_feature_requests_copy") },
      { icon: MessageSquare, title: t("help_center_feature_messaging_title"), copy: t("help_center_feature_messaging_copy") },
      { icon: ShieldCheck, title: t("help_center_feature_moderation_title"), copy: t("help_center_feature_moderation_copy") }
    ],
    [t]
  );

  const guardrails = useMemo(
    () => [t("help_center_guardrail_audit"), t("help_center_guardrail_verification"), t("help_center_guardrail_isolation")],
    [t]
  );

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-gradient-to-b from-accent/30 via-transparent to-transparent blur-3xl" />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-border/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <Sparkles className="h-4 w-4" /> {t("help_center_landing_tag")}
            </div>
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit bg-accent/20 text-accent">
                {t("help_center_landing_badge")}
              </Badge>
              <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl font-semibold text-white sm:text-5xl">
                {t("help_center_landing_title")}
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">{t("help_center_landing_description")}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href={primaryHref}>
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/help-center/workspace">{t("help_center_secondary_cta")}</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {statValues.map((item) => (
                <Card key={item.labelKey} className="border border-border/40 bg-card/50">
                  <CardContent className="space-y-1 p-4">
                    <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{t(item.labelKey)}</p>
                    <p className="text-2xl font-semibold text-white">{item.value}</p>
                    <p className="text-xs text-accent">{t(item.detailKey)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <Card className="border border-border/60 bg-card/70 p-6">
            <CardContent className="space-y-5">
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{t("help_center_preview_badge")}</p>
              <h2 className="text-2xl font-semibold text-white">{t("help_center_preview_heading")}</h2>
              <p className="text-sm text-muted-foreground">{t("help_center_preview_body")}</p>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>{t("help_center_preview_item_one")}</p>
                <p>{t("help_center_preview_item_two")}</p>
                <p>{t("help_center_preview_item_three")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border border-border/50 bg-card/50">
              <CardContent className="flex flex-col gap-4 p-6">
                <feature.icon className="h-8 w-8 text-accent" />
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.copy}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-8 rounded-3xl border border-border/50 bg-card/40 p-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <Badge variant="secondary" className="bg-accent/20 text-accent">
              {t("help_center_guardrail_badge")}
            </Badge>
            <h2 className="text-3xl font-semibold text-white">{t("help_center_guardrail_heading")}</h2>
            <p className="text-base text-muted-foreground">{t("help_center_guardrail_body")}</p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {guardrails.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-emerald-300" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <Card className="border border-border/40 bg-background/80">
            <CardContent className="space-y-4 p-6">
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{t("help_center_marquee_title")}</p>
              <div className="rounded-2xl border border-border/40 bg-border/10 p-4 text-sm text-muted-foreground">
                <p className="text-white">{t("help_center_marquee_primary")}</p>
                <p>{t("help_center_marquee_secondary")}</p>
              </div>
              <p className="text-sm text-muted-foreground">{t("help_center_marquee_body")}</p>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-3xl border border-border/50 bg-gradient-to-br from-border/40 via-background to-background p-8 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{t("help_center_preview_footer_badge")}</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">{t("help_center_preview_footer_heading")}</h2>
          <p className="mt-2 text-base text-muted-foreground">{t("help_center_preview_footer_body")}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href={primaryHref}>
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/help-center/workspace">{t("help_center_preview_footer_secondary")}</Link>
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}
