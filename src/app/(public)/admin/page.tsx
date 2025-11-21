"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, ClipboardCheck, LockKeyhole, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useSessionState } from "@/context/session";
import { useI18n } from "@/context/i18n";
import { cn } from "@/lib/utils";

type TranslateFn = ReturnType<typeof useI18n>["t"];

export default function AdminLandingPage() {
  const { t } = useI18n();
  const sessionUser = useSessionState((state) => state.user);
  const oversightModes = useMemo(() => buildOversightModes(t), [t]);
  const insights = useMemo(() => buildAdminInsights(t), [t]);
  const bullets = useMemo(() => buildAdminBullets(t), [t]);
  const snapshotMetrics = useMemo(() => buildAdminSnapshotMetrics(t), [t]);
  const [activeMode, setActiveMode] = useState(oversightModes[0]?.id ?? "trust");
  const modeCopy = useMemo(
    () => oversightModes.find((mode) => mode.id === activeMode) ?? oversightModes[0],
    [activeMode, oversightModes]
  );

  const primaryHref = sessionUser ? "/admin/workspace" : "/signup";
  const primaryLabel = sessionUser ? t("admin_landing_primary_authed") : t("admin_landing_primary_guest");

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-accent/30 via-transparent to-transparent blur-3xl" />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16">
        <header className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-border/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <Sparkles className="h-4 w-4" /> {t("admin_landing_tag")}
            </div>
            <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl font-semibold text-white sm:text-5xl">
              {t("admin_landing_title")}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t("admin_landing_description")}
            </p>
            <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-border/20 p-2 text-sm text-muted-foreground">
              {oversightModes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={cn(
                    "rounded-xl px-3 py-2 font-semibold transition",
                    activeMode === mode.id ? "bg-background/80 text-white" : "hover:text-white"
                  )}
                  onClick={() => setActiveMode(mode.id)}
                >
                  {mode.title}
                </button>
              ))}
            </div>
            <div className="rounded-2xl border border-border/40 bg-border/10 p-4 text-sm text-muted-foreground">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("admin_mode_panel_label")}</p>
              <p className="text-lg font-semibold text-white">{modeCopy.title}</p>
              <p>{modeCopy.description}</p>
              <p className="mt-2 text-xs text-accent">{modeCopy.stats}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href={primaryHref}>
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/hub-map">{t("admin_landing_secondary")}</Link>
              </Button>
            </div>
          </div>
          <AdminPreview modeId={activeMode} />
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {insights.map((insight) => (
            <Card key={insight.title} className="border border-border/50 bg-card/50">
              <CardContent className="flex flex-col gap-4 p-6">
                <insight.icon className="h-8 w-8 text-accent" />
                <h3 className="text-lg font-semibold text-white">{insight.title}</h3>
                <p className="text-sm text-muted-foreground">{insight.copy}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl border border-border/50 bg-card/40 p-8">
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="space-y-4 lg:w-1/2">
              <Badge variant="secondary" className="bg-accent/20 text-accent">
                {t("admin_org_badge")}
              </Badge>
              <h2 className="text-3xl font-semibold text-white">{t("admin_org_heading")}</h2>
              <p className="text-base text-muted-foreground">{t("admin_org_body")}</p>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {bullets.map((bullet) => (
                  <li key={bullet.copy} className="flex items-center gap-2">
                    <bullet.icon className={cn("h-4 w-4", bullet.color)} /> {bullet.copy}
                  </li>
                ))}
              </ul>
            </div>
            <Card className="flex-1 border border-border/40 bg-background/80">
              <CardContent className="space-y-4 p-6">
                <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{t("admin_org_snapshot_label")}</p>
                <div className="rounded-2xl border border-border/40 bg-border/10 p-4 text-sm text-muted-foreground">
                  {snapshotMetrics.map((metric) => (
                    <p key={metric} className="text-white">
                      {metric}
                    </p>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{t("admin_org_snapshot_body")}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-border/40 via-background to-background p-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("admin_footer_badge")}</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">{t("admin_footer_heading")}</h2>
          <p className="mt-2 text-base text-muted-foreground">{t("admin_footer_body")}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href={primaryHref}>
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/admin/workspace">{t("admin_landing_primary_authed")}</Link>
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}

const AdminPreview = ({ modeId }: { modeId: string }) => {
  const { t } = useI18n();
  const cards = useMemo(() => buildAdminPreviewCards(t), [t]);
  const items = cards[modeId as keyof typeof cards] ?? cards.trust;

  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-muted-foreground">
        <span>{t("admin_preview_title")}</span>
        <span>{t("admin_preview_status")}</span>
      </div>
      <div className="grid gap-4">
        {items.map((item) => (
          <Card key={item.label} className="border border-border/40 bg-background/80">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{item.label}</p>
              <p className="text-lg font-semibold text-white">{item.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const buildOversightModes = (t: TranslateFn) => [
  {
    id: "trust",
    title: t("admin_mode_trust_title"),
    description: t("admin_mode_trust_description"),
    stats: t("admin_mode_trust_stats")
  },
  {
    id: "commerce",
    title: t("admin_mode_commerce_title"),
    description: t("admin_mode_commerce_description"),
    stats: t("admin_mode_commerce_stats")
  },
  {
    id: "events",
    title: t("admin_mode_events_title"),
    description: t("admin_mode_events_description"),
    stats: t("admin_mode_events_stats")
  }
];

const buildAdminInsights = (t: TranslateFn) => [
  { icon: Activity, title: t("admin_insight_dashboards"), copy: t("admin_insight_dashboards_copy") },
  { icon: LockKeyhole, title: t("admin_insight_roleaware"), copy: t("admin_insight_roleaware_copy") },
  { icon: ClipboardCheck, title: t("admin_insight_actions"), copy: t("admin_insight_actions_copy") }
];

const buildAdminBullets = (t: TranslateFn) => [
  { icon: ShieldCheck, copy: t("admin_org_bullet_audit"), color: "text-emerald-300" },
  { icon: Users, copy: t("admin_org_bullet_roles"), color: "text-amber-300" },
  { icon: Activity, copy: t("admin_org_bullet_signals"), color: "text-violet-300" }
];

const buildAdminSnapshotMetrics = (t: TranslateFn) => [
  t("admin_org_snapshot_pending"),
  t("admin_org_snapshot_disputes"),
  t("admin_org_snapshot_payout")
];

const buildAdminPreviewCards = (t: TranslateFn) => ({
  trust: [
    { label: t("admin_preview_trust_queue_label"), detail: t("admin_preview_trust_queue_detail") },
    { label: t("admin_preview_trust_disputes_label"), detail: t("admin_preview_trust_disputes_detail") }
  ],
  commerce: [
    { label: t("admin_preview_commerce_orders_label"), detail: t("admin_preview_commerce_orders_detail") },
    { label: t("admin_preview_commerce_payout_label"), detail: t("admin_preview_commerce_payout_detail") }
  ],
  events: [
    { label: t("admin_preview_events_programs_label"), detail: t("admin_preview_events_programs_detail") },
    { label: t("admin_preview_events_contracts_label"), detail: t("admin_preview_events_contracts_detail") }
  ]
});
