"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, ClipboardCheck, LockKeyhole, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useSessionState } from "@/context/session";
import { cn } from "@/lib/utils";

const oversightModes = [
  {
    id: "trust",
    title: "Trust & Safety",
    description: "Queue verification requests, disputes, and moderation decisions in one view.",
    stats: "82 tickets cleared weekly"
  },
  {
    id: "commerce",
    title: "Commerce",
    description: "Track payouts, refunds, and order statuses across all drops in real time.",
    stats: "$1.2M GMV monitored"
  },
  {
    id: "events",
    title: "Events",
    description: "Approve programming, talent contracts, and attendance goals every sprint.",
    stats: "64 live activations"
  }
] as const;

const insights = [
  { icon: Activity, title: "Live dashboards", copy: "Pulse charts show member growth, drop revenue, and hub activity." },
  { icon: LockKeyhole, title: "Role-aware", copy: "Share read-only oversight views without exposing sensitive data." },
  { icon: ClipboardCheck, title: "Action engine", copy: "Kick off audits, send alerts, and schedule payouts from one queue." }
];

export default function AdminLandingPage() {
  const sessionUser = useSessionState((state) => state.user);
  const [activeMode, setActiveMode] = useState<(typeof oversightModes)[number]["id"]>("trust");
  const modeCopy = useMemo(() => oversightModes.find((mode) => mode.id === activeMode) ?? oversightModes[0], [activeMode]);

  const primaryHref = sessionUser ? "/admin/workspace" : "/signup";
  const primaryLabel = sessionUser ? "Open admin workspace" : "Request access";

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-accent/30 via-transparent to-transparent blur-3xl" />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16">
        <header className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-border/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <Sparkles className="h-4 w-4" /> Admin command
            </div>
            <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl font-semibold text-white sm:text-5xl">
              Oversee every hub, drop, and workflow from one cockpit
            </h1>
            <p className="text-lg text-muted-foreground">
              This landing mirrors the live Admin workspace—triage queues, audit member requests, and monitor marketplace
              revenue before you ever log in.
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
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Now showing</p>
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
                <Link href="/hub-map">See hub telemetry</Link>
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
                Org view
              </Badge>
              <h2 className="text-3xl font-semibold text-white">Hand investors or operators a safe admin preview</h2>
              <p className="text-base text-muted-foreground">
                Share this page to prove your house is in order—queues, approvals, payouts, and compliance summaries are
                all mirrored from the realtime workspace.
              </p>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" /> SOC2-ready audit logs
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-300" /> Role-based queue access
                </li>
                <li className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-violet-300" /> Live revenue + hub signals
                </li>
              </ul>
            </div>
            <Card className="flex-1 border border-border/40 bg-background/80">
              <CardContent className="space-y-4 p-6">
                <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Ops snapshot</p>
                <div className="rounded-2xl border border-border/40 bg-border/10 p-4 text-sm text-muted-foreground">
                  <p className="text-white">Pending verifications: 18</p>
                  <p>Escalated disputes: 3</p>
                  <p>Marketplace payout queue: $182k</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  When stakeholders need deeper control, invite them into the authenticated workspace. All actions carry
                  over instantly.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-border/40 via-background to-background p-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Admin preview</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Turn this into your diligence link</h2>
          <p className="mt-2 text-base text-muted-foreground">
            Share the landing, then unlock /admin/workspace once you are ready to collaborate.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href={primaryHref}>
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/admin/workspace">Open authenticated view</Link>
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}

const AdminPreview = ({ modeId }: { modeId: (typeof oversightModes)[number]["id"] }) => {
  const cards = {
    trust: [
      { label: "Verification queue", detail: "12 awaiting review" },
      { label: "Disputes", detail: "3 escalated" }
    ],
    commerce: [
      { label: "Orders today", detail: "148" },
      { label: "Payout batch", detail: "$182k" }
    ],
    events: [
      { label: "Programs live", detail: "8 this week" },
      { label: "Talent contracts", detail: "4 awaiting" }
    ]
  } as const;

  const items = cards[modeId];

  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-muted-foreground">
        <span>Live admin preview</span>
        <span>Realtime</span>
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
