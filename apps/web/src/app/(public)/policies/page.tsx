"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, FileText, Lock, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useI18n } from "@/context/i18n";
import { useSessionState } from "@/context/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PoliciesPage() {
  const { t } = useI18n();
  const sessionUser = useSessionState((state) => state.user);
  const primaryHref = sessionUser ? "/help-center/workspace" : "/signup";
  const primaryLabel = sessionUser ? t("policies_primary_cta_authed") : t("policies_primary_cta_guest");

  const policyPillars = useMemo(
    () => [
      {
        icon: FileText,
        title: t("policies_listing_review_title"),
        copy: t("policies_listing_review_copy")
      },
      {
        icon: Users,
        title: t("policies_listing_conduct_title"),
        copy: t("policies_listing_conduct_copy")
      },
      {
        icon: AlertTriangle,
        title: t("policies_listing_enforcement_title"),
        copy: t("policies_listing_enforcement_copy")
      }
    ],
    [t]
  );

  const securityLayers = useMemo(
    () => [
      {
        icon: Lock,
        title: t("policies_security_auth_title"),
        copy: t("policies_security_auth_copy")
      },
      {
        icon: ShieldCheck,
        title: t("policies_security_defense_title"),
        copy: t("policies_security_defense_copy")
      },
      {
        icon: Sparkles,
        title: t("policies_security_observability_title"),
        copy: t("policies_security_observability_copy")
      }
    ],
    [t]
  );

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-accent/30 via-transparent to-transparent blur-3xl" />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16">
        <header className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-border/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <Sparkles className="h-4 w-4" /> {t("policies_landing_tag")}
            </div>
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit bg-accent/20 text-accent">
                {t("policies_landing_badge")}
              </Badge>
              <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl font-semibold text-white sm:text-5xl">
                {t("policies_landing_title")}
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">{t("policies_landing_description")}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href={primaryHref}>{primaryLabel}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/help-center">{t("policies_secondary_cta")}</Link>
              </Button>
            </div>
          </div>

          <Card className="border border-border/60 bg-card/70">
            <CardContent className="space-y-4 p-6 text-sm text-muted-foreground">
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                {t("policies_listing_panel_badge")}
              </p>
              <p className="text-base text-white">{t("policies_listing_panel_heading")}</p>
              <p>{t("policies_listing_panel_body")}</p>
              <ul className="space-y-2 text-xs">
                <li>• {t("policies_listing_panel_point_one")}</li>
                <li>• {t("policies_listing_panel_point_two")}</li>
                <li>• {t("policies_listing_panel_point_three")}</li>
              </ul>
            </CardContent>
          </Card>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {policyPillars.map((item) => (
            <Card key={item.title} className="border border-border/50 bg-card/50">
              <CardContent className="flex flex-col gap-4 p-6">
                <item.icon className="h-8 w-8 text-accent" />
                <h2 className="text-lg font-semibold text-white">{item.title}</h2>
                <p className="text-sm text-muted-foreground">{item.copy}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-8 rounded-3xl border border-border/50 bg-card/40 p-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <Badge variant="secondary" className="bg-accent/20 text-accent">
              {t("policies_security_badge")}
            </Badge>
            <h2 className="text-3xl font-semibold text-white">{t("policies_security_heading")}</h2>
            <p className="text-base text-muted-foreground">{t("policies_security_body")}</p>
            <div className="grid gap-4 md:grid-cols-3">
              {securityLayers.map((layer) => (
                <div key={layer.title} className="space-y-2 text-sm text-muted-foreground">
                  <layer.icon className="h-5 w-5 text-accent" />
                  <p className="font-semibold text-white">{layer.title}</p>
                  <p>{layer.copy}</p>
                </div>
              ))}
            </div>
          </div>
          <Card className="border border-border/40 bg-background/80">
            <CardContent className="space-y-4 p-6 text-sm text-muted-foreground">
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                {t("policies_audience_badge")}
              </p>
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-white">{t("policies_audience_users_title")}</h3>
                <p>{t("policies_audience_users_body")}</p>
              </div>
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-white">{t("policies_audience_devs_title")}</h3>
                <p>{t("policies_audience_devs_body")}</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </section>
    </div>
  );
}
