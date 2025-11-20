"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Crown, Gift, Medal, Sparkles, Trophy, Wand2 } from "lucide-react";
import { useSessionState } from "@/context/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tierData = [
  {
    id: "signal",
    label: "Signal tier",
    points: "0-499",
    perks: ["Priority matching", "Hub boosts"],
    gradient: "from-emerald-400/30 to-transparent"
  },
  {
    id: "impact",
    label: "Impact tier",
    points: "500-1499",
    perks: ["Merch drops", "Studio credits"],
    gradient: "from-amber-400/30 to-transparent"
  },
  {
    id: "legend",
    label: "Legend tier",
    points: "1500+",
    perks: ["Profit share", "Early product votes"],
    gradient: "from-rose-400/30 to-transparent"
  }
];

const automationPills = ["Presence", "Marketplace", "Events", "Referrals"];

const perks = [
  {
    icon: Trophy,
    title: "Stacked rituals",
    copy: "Reward streaks, attendance, and submissions automatically."
  },
  {
    icon: Gift,
    title: "Fulfillment",
    copy: "Ship merch or digital perks straight from Supabase triggers."
  },
  {
    icon: Wand2,
    title: "Customization",
    copy: "Blend manual drops with automated leaderboards per cohort."
  }
];

export default function RewardsLandingPage() {
  const sessionUser = useSessionState((state) => state.user);
  const [activeTier, setActiveTier] = useState(tierData[0].id);
  const [activeAutomation, setActiveAutomation] = useState(automationPills[0]);

  const tier = useMemo(() => tierData.find((entry) => entry.id === activeTier) ?? tierData[0], [activeTier]);
  const primaryCtaHref = sessionUser ? "/rewards/workspace" : "/signup";
  const primaryCtaLabel = sessionUser ? "Manage rewards" : "Join rewards";

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-gradient-to-b from-accent/30 via-transparent to-transparent blur-3xl" />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-border/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <Crown className="h-4 w-4" /> Rewards
            </div>
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit bg-accent/20 text-accent">
                Loyalty preview
              </Badge>
              <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl font-semibold text-white sm:text-5xl">
                Let partners browse your loyalty engine without logging in
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                This landing simulates tier unlocks, automation lanes, and perk catalogs while the actual reward
                workflows stay behind the authenticated wall.
              </p>
            </div>
            <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-border/20 p-2 text-sm text-muted-foreground">
              {tierData.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={cn(
                    "rounded-xl px-3 py-2 font-semibold transition",
                    entry.id === activeTier ? "bg-background/80 text-white" : "hover:text-white"
                  )}
                  onClick={() => setActiveTier(entry.id)}
                >
                  {entry.label}
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
              <Button asChild size="lg" variant="outline">
                <Link href="/rewards/workspace">Enter reward HQ</Link>
              </Button>
            </div>
          </div>
          <TierPreview tier={tier} />
        </div>

        <section className="grid gap-6 md:grid-cols-3">
          {perks.map((perk) => (
            <Card
              key={perk.title}
              className="border border-border/50 bg-card/50 transition duration-300 hover:-translate-y-1 hover:border-accent"
            >
              <CardContent className="flex flex-col gap-4 p-6">
                <perk.icon className="h-8 w-8 text-accent" />
                <h3 className="text-lg font-semibold text-white">{perk.title}</h3>
                <p className="text-sm text-muted-foreground">{perk.copy}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl border border-border/50 bg-card/40 p-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex-1 space-y-4">
              <Badge variant="secondary" className="bg-accent/20 text-accent">
                Automation lanes
              </Badge>
              <h2 className="text-3xl font-semibold text-white">Preview every trigger before you flip rewards live</h2>
              <p className="text-base text-muted-foreground">
                Give leadership or partners a transparent peek at how members earn perks from other system pillars—no
                credentials required.
              </p>
              <div className="flex flex-wrap gap-3">
                {automationPills.map((pill) => (
                  <button
                    key={pill}
                    type="button"
                    className={cn(
                      "rounded-full border px-4 py-1 text-sm uppercase tracking-[0.3em]",
                      pill === activeAutomation ? "border-accent text-white" : "border-border/50 text-muted-foreground"
                    )}
                    onClick={() => setActiveAutomation(pill)}
                  >
                    {pill}
                  </button>
                ))}
              </div>
            </div>
            <Card className="flex-1 border border-border/40 bg-background/80">
              <CardContent className="space-y-4 p-6">
                <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{activeAutomation} lane</p>
                <div className="rounded-2xl border border-border/40 bg-border/10 p-4 text-sm text-muted-foreground">
                  <p className="text-white">Trigger: {activeAutomation} milestone</p>
                  <p>Reward: +120 points • Send merch voucher</p>
                  <p>Fallback: DM if unclaimed in 72h</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  This is the exact messaging users will feel once they hit the metric inside the authenticated app.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="rounded-3xl border border-border/50 bg-gradient-to-br from-border/40 via-background to-background p-8 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Reward preview</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Invite anyone to explore your loyalty engine, risk-free</h2>
          <p className="mt-2 text-base text-muted-foreground">
            When you are ready, point them to the authenticated workspace powering all the automation.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href={primaryCtaHref}>
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/rewards/workspace">Open rewards workspace</Link>
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}

const TierPreview = ({ tier }: { tier: (typeof tierData)[number] }) => {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
      <div className={cn("rounded-2xl border border-border/40 bg-gradient-to-br p-6 text-white", tier.gradient)}>
        <p className="text-xs uppercase tracking-[0.3em] text-white/80">{tier.points} pts</p>
        <h3 className="mt-2 text-2xl font-semibold">{tier.label}</h3>
        <ul className="mt-3 space-y-2 text-sm text-white/80">
          {tier.perks.map((perk) => (
            <li key={perk} className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> {perk}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="border border-border/40 bg-background/70">
          <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
            <p className="text-xs uppercase tracking-[0.3em]">Members in tier</p>
            <p className="text-lg font-semibold text-white">48</p>
            <p>Auto-updated hourly</p>
          </CardContent>
        </Card>
        <Card className="border border-border/40 bg-background/70">
          <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
            <p className="text-xs uppercase tracking-[0.3em]">Upcoming drops</p>
            <p className="text-lg font-semibold text-white">3</p>
            <p>Merch • Travel • Credits</p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-4 rounded-2xl border border-border/40 bg-border/10 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Medal className="h-4 w-4 text-amber-300" />
          Members stay here for 42 days on average
        </div>
      </div>
    </div>
  );
};
