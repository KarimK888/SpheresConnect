"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlarmClock,
  ArrowRight,
  BarChart3,
  BellRing,
  CalendarClock,
  CheckCircle2,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  UserRound,
  Workflow
} from "lucide-react";
import { useSessionState } from "@/context/session";
import { useI18n } from "@/context/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type HeroViewKey = "sprint" | "campaign";

interface ColumnPreview {
  title: string;
  accent: string;
  tasks: {
    title: string;
    badge: string;
    assignee: string;
    due: string;
  }[];
}

const HERO_VIEW_KEYS: HeroViewKey[] = ["sprint", "campaign"];
const WORKFLOW_MOMENT_IDS = ["plan", "execute", "review"] as const;
type WorkflowMomentId = (typeof WORKFLOW_MOMENT_IDS)[number];
type TranslateFn = ReturnType<typeof useI18n>["t"];


export default function ProductivityLandingPage() {
  const { t } = useI18n();
  const sessionUser = useSessionState((state) => state.user);

  const heroViews = useMemo(() => buildHeroViews(t), [t]);
  const boardColumns = useMemo(() => buildBoardColumns(t), [t]);
  const featureHighlights = useMemo(() => buildFeatureHighlights(t), [t]);
  const workflowMoments = useMemo(() => buildWorkflowMoments(t), [t]);
  const automationHighlights = useMemo(() => buildAutomationHighlights(t), [t]);
  const shippingMetrics = useMemo(() => buildShippingMetrics(t), [t]);
  const trustSignals = useMemo(() => buildTrustSignals(t), [t]);

  const [activeHeroView, setActiveHeroView] = useState<HeroViewKey>("sprint");
  const [activeMoment, setActiveMoment] = useState<WorkflowMomentId>("plan");
  const [metricIndex, setMetricIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setMetricIndex((prev) => (prev + 1) % shippingMetrics.length);
    }, 3800);
    return () => window.clearInterval(id);
  }, [shippingMetrics.length]);

  const heroView = heroViews[activeHeroView];
  const columns = boardColumns[activeHeroView];
  const activeMetric = shippingMetrics[metricIndex];
  const activeMomentCopy = useMemo(
    () => workflowMoments.find((moment) => moment.id === activeMoment) ?? workflowMoments[0],
    [activeMoment, workflowMoments]
  );

  const primaryCtaHref = sessionUser ? "/productivity/workspace" : "/signup";
  const primaryCtaLabel = sessionUser
    ? t("productivity_primary_cta_authenticated")
    : t("productivity_primary_cta_guest");

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-accent/30 via-transparent to-transparent blur-3xl" />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-20 px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-border/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="h-4 w-4" /> {t("productivity_tag_label")}
            </div>
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">{heroView.kicker}</p>
              <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl font-semibold text-white sm:text-5xl">
                {heroView.title}
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">{heroView.description}</p>
            </div>
            <div className="inline-grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-border/20 p-2 text-sm shadow-inner shadow-black/40 sm:max-w-md">
              {HERO_VIEW_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={cn(
                    "rounded-xl px-3 py-2 text-left font-medium transition hover:text-white",
                    activeHeroView === key ? "bg-background/80 text-white shadow-[0_0_20px_rgba(0,0,0,0.35)]" : "text-muted-foreground"
                  )}
                  onClick={() => setActiveHeroView(key)}
                >
                  {heroViews[key].cta}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href={primaryCtaHref}>
                  {primaryCtaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link href="/demo">
                  {t("productivity_secondary_cta_demo")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-3 rounded-2xl border border-border/40 bg-border/20 px-4 py-3 text-sm text-muted-foreground">
              <span className="text-white">{activeMetric.label}</span>
              <span className="font-semibold text-white">{activeMetric.value}</span>
              <span className="rounded-full border border-border/50 px-2 py-0.5 text-xs uppercase tracking-[0.3em] text-accent">
                {activeMetric.delta}
              </span>
            </div>
          </div>
          <BoardPreview columns={columns} />
        </div>

        <section className="grid gap-6 md:grid-cols-3">
          {featureHighlights.map((feature) => (
            <Card
              key={feature.title}
              className="border border-border/50 bg-card/50 transition duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-[0_15px_80px_rgba(0,0,0,0.45)]"
            >
              <CardContent className="flex flex-col gap-4 p-6">
                <feature.icon className="h-10 w-10 text-accent" />
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-8 rounded-3xl border border-border/50 bg-card/40 p-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Badge variant="secondary" className="bg-accent/20 text-accent">
              {t("productivity_flow_badge")}
            </Badge>
            <h2 className="text-3xl font-semibold text-white">{t("productivity_flow_heading")}</h2>
            <p className="text-base text-muted-foreground">{t("productivity_flow_body")}</p>
            <div className="grid gap-4 md:grid-cols-3">
              {workflowMoments.map((moment) => (
                <button
                  key={moment.id}
                  type="button"
                  onMouseEnter={() => setActiveMoment(moment.id)}
                  className={cn(
                    "rounded-2xl border px-4 py-5 text-left transition hover:border-accent hover:text-white",
                    activeMoment === moment.id ? "border-accent bg-border/30 text-white" : "border-border/40 bg-border/10 text-muted-foreground"
                  )}
                >
                  <p className="text-xs uppercase tracking-[0.3em]">{moment.title}</p>
                  <p className="mt-2 text-sm">{moment.detail}</p>
                  <p className="mt-3 text-sm font-semibold text-white">{moment.stats}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4 rounded-3xl border border-border/40 bg-gradient-to-b from-border/30 to-transparent p-6">
            <h3 className="text-lg font-semibold text-white">{t("productivity_live_moment_title")}</h3>
            <p className="text-sm text-muted-foreground">{activeMomentCopy.detail}</p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                {t("productivity_live_moment_point_snapshots")}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                {t("productivity_live_moment_point_heatmap")}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                {t("productivity_live_moment_point_presence")}
              </li>
            </ul>
            <Card className="border-dashed border-border/40 bg-background/80">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-accent" /> {t("productivity_guardrails_title")}
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {trustSignals.map((signal) => (
                    <li key={signal} className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-accent" /> {signal}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="border border-border/40 bg-card/60">
            <CardContent className="flex flex-col gap-5 p-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-10 w-10 text-accent" />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("productivity_insights_label")}</p>
                  <h3 className="text-xl font-semibold text-white">{t("productivity_insights_heading")}</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{t("productivity_insights_body")}</p>
            </CardContent>
          </Card>

          <Card className="border border-border/40 bg-card/60">
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-10 w-10 text-accent" />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("productivity_sync_label")}</p>
                  <h3 className="text-xl font-semibold text-white">{t("productivity_sync_heading")}</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{t("productivity_sync_body")}</p>
              <Button asChild variant="outline" className="self-start">
                <Link href="/productivity/workspace">{t("productivity_sync_cta")}</Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {automationHighlights.map((highlight) => (
            <Card
              key={highlight.title}
              className="border border-border/40 bg-card/50 transition duration-300 hover:-translate-y-1 hover:border-accent"
            >
              <CardContent className="flex flex-col gap-4 p-6">
                <highlight.icon className="h-8 w-8 text-accent" />
                <div>
                  <h3 className="text-lg font-semibold text-white">{highlight.title}</h3>
                  <p className="text-sm text-muted-foreground">{highlight.copy}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl border border-border/50 bg-gradient-to-br from-border/40 via-background to-background p-8 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{t("productivity_upgrade_label")}</p>
          <h2 className="mt-4 text-3xl font-semibold text-white">{t("productivity_upgrade_heading")}</h2>
          <p className="mt-3 text-base text-muted-foreground">{t("productivity_upgrade_body")}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href={primaryCtaHref}>
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/productivity/workspace">{t("productivity_secondary_cta_workspace")}</Link>
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}

const BoardPreview = ({ columns }: { columns: ColumnPreview[] }) => {
  const { t } = useI18n();
  return (
    <div className="relative rounded-3xl border border-border/60 bg-card/70 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-muted-foreground">
        <span>{t("productivity_board_preview_title")}</span>
        <span>{t("productivity_board_preview_status")}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((column) => (
          <div key={column.title} className="rounded-2xl border border-border/40 bg-background/60 p-4">
            <div className="flex items-center justify-between">
              <p className={cn("text-sm font-semibold text-white", column.accent)}>{column.title}</p>
              <span className="text-xs text-muted-foreground">
                {t("productivity_board_card_count", { count: column.tasks.length })}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {column.tasks.map((task) => (
                <div
                  key={task.title}
                  className="group rounded-2xl border border-border/50 bg-border/10 p-3 text-sm text-white transition hover:border-accent hover:bg-background/70"
                >
                  <p className="font-medium">{task.title}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="rounded-full border border-border/40 px-2 py-0.5 text-[11px] uppercase tracking-[0.3em]">
                      {task.badge}
                    </span>
                    <span className="text-white">{task.assignee}</span>
                  </div>
                  <p className="mt-1 text-xs text-amber-200">{task.due}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const buildHeroViews = (t: TranslateFn): Record<HeroViewKey, { kicker: string; title: string; description: string; cta: string }> => ({
  sprint: {
    kicker: t("productivity_hero_sprint_kicker"),
    title: t("productivity_hero_sprint_title"),
    description: t("productivity_hero_sprint_description"),
    cta: t("productivity_hero_sprint_cta")
  },
  campaign: {
    kicker: t("productivity_hero_campaign_kicker"),
    title: t("productivity_hero_campaign_title"),
    description: t("productivity_hero_campaign_description"),
    cta: t("productivity_hero_campaign_cta")
  }
});

const buildBoardColumns = (t: TranslateFn): Record<HeroViewKey, ColumnPreview[]> => ({
  sprint: [
    {
      title: t("productivity_board_sprint_briefing_title"),
      accent: "text-accent",
      tasks: [
        {
          title: t("productivity_task_launch_narrative_title"),
          badge: t("productivity_badge_copy"),
          assignee: "Noah",
          due: t("productivity_due_today")
        },
        {
          title: t("productivity_task_moodboard_title"),
          badge: t("productivity_badge_design"),
          assignee: "Mika",
          due: t("productivity_due_tomorrow")
        }
      ]
    },
    {
      title: t("productivity_board_sprint_build_title"),
      accent: "text-emerald-300",
      tasks: [
        {
          title: t("productivity_task_prototype_title"),
          badge: t("productivity_badge_review"),
          assignee: "Sasha",
          due: t("productivity_due_fri")
        },
        {
          title: t("productivity_task_promo_title"),
          badge: t("productivity_badge_3d"),
          assignee: "Elle",
          due: t("productivity_due_mon")
        }
      ]
    },
    {
      title: t("productivity_board_sprint_launch_title"),
      accent: "text-amber-300",
      tasks: [
        {
          title: t("productivity_task_client_approvals_title"),
          badge: t("productivity_badge_stakeholder"),
          assignee: "Rae",
          due: t("productivity_due_next_wed")
        },
        {
          title: t("productivity_task_creator_payouts_title"),
          badge: t("productivity_badge_ops"),
          assignee: "Dev",
          due: t("productivity_due_scheduled")
        }
      ]
    }
  ],
  campaign: [
    {
      title: t("productivity_board_campaign_discovery_title"),
      accent: "text-accent",
      tasks: [
        {
          title: t("productivity_task_talent_shortlist_title"),
          badge: t("productivity_badge_hiring"),
          assignee: "Jon",
          due: t("productivity_due_today")
        },
        {
          title: t("productivity_task_budget_title"),
          badge: t("productivity_badge_finance"),
          assignee: "Ivy",
          due: t("productivity_due_tomorrow")
        }
      ]
    },
    {
      title: t("productivity_board_campaign_production_title"),
      accent: "text-emerald-300",
      tasks: [
        {
          title: t("productivity_task_studio_booking_title"),
          badge: t("productivity_badge_logistics"),
          assignee: "Abi",
          due: t("productivity_due_fri")
        },
        {
          title: t("productivity_task_shot_sequencing_title"),
          badge: t("productivity_badge_creative"),
          assignee: "Zee",
          due: t("productivity_due_sun")
        }
      ]
    },
    {
      title: t("productivity_board_campaign_delivery_title"),
      accent: "text-amber-300",
      tasks: [
        {
          title: t("productivity_task_client_deck_title"),
          badge: t("productivity_badge_review"),
          assignee: "Kai",
          due: t("productivity_due_next_tue")
        },
        {
          title: t("productivity_task_paid_placement_title"),
          badge: t("productivity_badge_media"),
          assignee: "June",
          due: t("productivity_due_queued")
        }
      ]
    }
  ]
});

const buildFeatureHighlights = (
  t: TranslateFn
): { title: string; description: string; icon: typeof Workflow }[] => [
  {
    title: t("productivity_feature_tile_title"),
    description: t("productivity_feature_tile_body"),
    icon: Workflow
  },
  {
    title: t("productivity_feature_calendar_title"),
    description: t("productivity_feature_calendar_body"),
    icon: CalendarClock
  },
  {
    title: t("productivity_feature_signal_title"),
    description: t("productivity_feature_signal_body"),
    icon: BellRing
  }
];

const buildWorkflowMoments = (
  t: TranslateFn
): { id: WorkflowMomentId; title: string; detail: string; stats: string }[] => [
  {
    id: WORKFLOW_MOMENT_IDS[0],
    title: t("productivity_flow_plan_title"),
    detail: t("productivity_flow_plan_detail"),
    stats: t("productivity_flow_plan_stats")
  },
  {
    id: WORKFLOW_MOMENT_IDS[1],
    title: t("productivity_flow_execute_title"),
    detail: t("productivity_flow_execute_detail"),
    stats: t("productivity_flow_execute_stats")
  },
  {
    id: WORKFLOW_MOMENT_IDS[2],
    title: t("productivity_flow_review_title"),
    detail: t("productivity_flow_review_detail"),
    stats: t("productivity_flow_review_stats")
  }
];

const buildAutomationHighlights = (
  t: TranslateFn
): { title: string; copy: string; icon: typeof Workflow }[] => [
  {
    title: t("productivity_automation_presence_title"),
    copy: t("productivity_automation_presence_body"),
    icon: LayoutDashboard
  },
  {
    title: t("productivity_automation_latency_title"),
    copy: t("productivity_automation_latency_body"),
    icon: AlarmClock
  },
  {
    title: t("productivity_automation_roster_title"),
    copy: t("productivity_automation_roster_body"),
    icon: UserRound
  }
];

const buildShippingMetrics = (
  t: TranslateFn
): { label: string; value: string; delta: string }[] => [
  { label: t("productivity_metric_kickoff_label"), value: "2.4d", delta: t("productivity_metric_kickoff_delta") },
  { label: t("productivity_metric_predictability_label"), value: "94%", delta: t("productivity_metric_predictability_delta") },
  { label: t("productivity_metric_approvals_label"), value: "148", delta: t("productivity_metric_approvals_delta") }
];

const buildTrustSignals = (t: TranslateFn) => [
  t("productivity_guardrail_soc2"),
  t("productivity_guardrail_storage"),
  t("productivity_guardrail_links")
];
