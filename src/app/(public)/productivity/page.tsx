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

const heroViews: Record<
  HeroViewKey,
  {
    kicker: string;
    title: string;
    description: string;
    cta: string;
  }
> = {
  sprint: {
    kicker: "Ops teams",
    title: "One kanban, calendar, and automation brain",
    description:
      "Lock creative ops, client services, and product pods into the same ritual. Priorities, blockers, and approvals stay in sync the instant you step inside the app.",
    cta: "Launch the sprint hub"
  },
  campaign: {
    kicker: "Studios & agencies",
    title: "Package your entire campaign story before kickoff",
    description:
      "Demo stakeholder-ready roadmaps with live card previews, role-based sharing, and instant workspace duplication once the project is funded.",
    cta: "Build campaign room"
  }
};

const boardColumns: Record<HeroViewKey, ColumnPreview[]> = {
  sprint: [
    {
      title: "Briefing",
      accent: "text-accent",
      tasks: [
        { title: "Launch narrative draft", badge: "Copy", assignee: "Noah", due: "Due Today" },
        { title: "Moodboard sourcing", badge: "Design", assignee: "Mika", due: "Tomorrow" }
      ]
    },
    {
      title: "In build",
      accent: "text-emerald-300",
      tasks: [
        { title: "Prototype QA", badge: "Review", assignee: "Sasha", due: "Fri" },
        { title: "Promo renders", badge: "3D", assignee: "Elle", due: "Mon" }
      ]
    },
    {
      title: "Launch prep",
      accent: "text-amber-300",
      tasks: [
        { title: "Client approvals", badge: "Stakeholder", assignee: "Rae", due: "Next Wed" },
        { title: "Creator payouts", badge: "Ops", assignee: "Dev", due: "Scheduled" }
      ]
    }
  ],
  campaign: [
    {
      title: "Discovery",
      accent: "text-accent",
      tasks: [
        { title: "Talent shortlist", badge: "Hiring", assignee: "Jon", due: "Due Today" },
        { title: "Budget rev 02", badge: "Finance", assignee: "Ivy", due: "Tomorrow" }
      ]
    },
    {
      title: "Production",
      accent: "text-emerald-300",
      tasks: [
        { title: "Studio booking", badge: "Logistics", assignee: "Abi", due: "Fri" },
        { title: "Shot sequencing", badge: "Creative", assignee: "Zee", due: "Sun" }
      ]
    },
    {
      title: "Delivery",
      accent: "text-amber-300",
      tasks: [
        { title: "Client deck", badge: "Review", assignee: "Kai", due: "Next Tue" },
        { title: "Paid placement", badge: "Media", assignee: "June", due: "Queued" }
      ]
    }
  ]
};

const featureHighlights = [
  {
    title: "Tile-based kanban",
    description: "Drag instantly, peek todos in a tray, and snapshot every move without leaving the board.",
    icon: Workflow
  },
  {
    title: "Calendar focus",
    description: "Auto-group cards and todos by due date with lane heatmaps that warn before anything slips.",
    icon: CalendarClock
  },
  {
    title: "Signal alerts",
    description: "Pulse notifications tie back to the exact card view, not just another inbox ping.",
    icon: BellRing
  }
];

const workflowMoments = [
  {
    id: "plan",
    title: "Plan",
    detail: "Clone proven templates, drop briefs, and preassign workflows for each collaborator.",
    stats: "Templates launch in 32s"
  },
  {
    id: "execute",
    title: "Execute",
    detail: "Inline todos and comment digests keep teammates focused in the right column.",
    stats: "84% fewer status pings"
  },
  {
    id: "review",
    title: "Review",
    detail: "Approvers see change diffs, due dates, and blockers without jumping into screenshare hell.",
    stats: "Decisions logged in 1 click"
  }
] as const;

const automationHighlights = [
  {
    title: "Presence aware",
    copy: "Know who touched what and roll back with timed snapshots.",
    icon: LayoutDashboard
  },
  {
    title: "Latency proof",
    copy: "Realtime Supabase sync keeps every surface aligned under 150ms.",
    icon: AlarmClock
  },
  {
    title: "Roster smart",
    copy: "Auto-invite vendors as viewers, promote once work begins.",
    icon: UserRound
  }
];

const shippingMetrics = [
  { label: "Time to kickoff", value: "2.4d", delta: "3x faster" },
  { label: "Sprint predictability", value: "94%", delta: "+12 pts" },
  { label: "Approvals cleared", value: "148", delta: "weekly" }
];

const trustSignals = [
  "SOC2-ready guardrails",
  "Realtime Supabase storage",
  "Role-based sharing links"
];

export default function ProductivityLandingPage() {
  const sessionUser = useSessionState((state) => state.user);
  const [activeHeroView, setActiveHeroView] = useState<HeroViewKey>("sprint");
  const [activeMoment, setActiveMoment] = useState<(typeof workflowMoments)[number]["id"]>("plan");
  const [metricIndex, setMetricIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setMetricIndex((prev) => (prev + 1) % shippingMetrics.length);
    }, 3800);
    return () => window.clearInterval(id);
  }, []);

  const heroView = heroViews[activeHeroView];
  const columns = boardColumns[activeHeroView];
  const activeMetric = shippingMetrics[metricIndex];
  const activeMomentCopy = useMemo(
    () => workflowMoments.find((moment) => moment.id === activeMoment) ?? workflowMoments[0],
    [activeMoment]
  );

  const primaryCtaHref = sessionUser ? "/productivity/workspace" : "/signup";
  const primaryCtaLabel = sessionUser ? "Enter workspace" : "Get started";

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-accent/30 via-transparent to-transparent blur-3xl" />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-20 px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-border/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="h-4 w-4" /> Productivity hub
            </div>
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">{heroView.kicker}</p>
              <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl font-semibold text-white sm:text-5xl">
                {heroView.title}
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">{heroView.description}</p>
            </div>
            <div className="inline-grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-border/20 p-2 text-sm shadow-inner shadow-black/40 sm:max-w-md">
              {(Object.keys(heroViews) as HeroViewKey[]).map((key) => (
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
                  View product tour
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
              End-to-end flow
            </Badge>
            <h2 className="text-3xl font-semibold text-white">Preview every sprint step before granting access</h2>
            <p className="text-base text-muted-foreground">
              Hand clients or execs a living plan view with timelines, assignments, and focus filters. When they approve,
              invite them into the exact same workspace already staged.
            </p>
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
            <h3 className="text-lg font-semibold text-white">Live moment</h3>
            <p className="text-sm text-muted-foreground">{activeMomentCopy.detail}</p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Snapshot compare + undo for every column
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Priority heat map surfaces blockers early
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Native Supabase auth + realtime presence
              </li>
            </ul>
            <Card className="border-dashed border-border/40 bg-background/80">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-accent" /> Guardrails
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
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Insights</p>
                  <h3 className="text-xl font-semibold text-white">Know what is trending before standup</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Intelligent due date grouping and focus filters expose overdue blockers directly from the landing page so
                leadership can course-correct early.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border/40 bg-card/60">
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-10 w-10 text-accent" />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Workflow sync</p>
                  <h3 className="text-xl font-semibold text-white">Invite anyone, keep permissions tight</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Share this landing view with vendors or clients using temporary tokens. Full edit access only unlocks
                once they step inside the authenticated workspace.
              </p>
              <Button asChild variant="outline" className="self-start">
                <Link href="/productivity/workspace">Preview authenticated view</Link>
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
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Upgrade flow</p>
          <h2 className="mt-4 text-3xl font-semibold text-white">Make this landing the new front door to your workspace</h2>
          <p className="mt-3 text-base text-muted-foreground">
            Showcase the experience, then open the door to the exact same kanban + calendar engine that powers SpheresConnect.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href={primaryCtaHref}>
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/productivity/workspace">Jump straight in</Link>
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}

const BoardPreview = ({ columns }: { columns: ColumnPreview[] }) => {
  return (
    <div className="relative rounded-3xl border border-border/60 bg-card/70 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-muted-foreground">
        <span>Live board preview</span>
        <span>Realtime</span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((column) => (
          <div key={column.title} className="rounded-2xl border border-border/40 bg-background/60 p-4">
            <div className="flex items-center justify-between">
              <p className={cn("text-sm font-semibold text-white", column.accent)}>{column.title}</p>
              <span className="text-xs text-muted-foreground">{column.tasks.length} cards</span>
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
