"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass, MapPin, MoveRight, Radar, RadioTower, Users } from "lucide-react";
import { useSessionState } from "@/context/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const demoHubs = [
  {
    name: "Lisbon Atlantic",
    city: "Lisbon, PT",
    members: 182,
    checkins: 742,
    coords: { x: "35%", y: "42%" },
    color: "from-emerald-400/50 to-emerald-900/10"
  },
  {
    name: "Brooklyn Wave",
    city: "New York, US",
    members: 264,
    checkins: 1_104,
    coords: { x: "22%", y: "28%" },
    color: "from-amber-400/50 to-amber-900/10"
  },
  {
    name: "Seoul Heights",
    city: "Seoul, KR",
    members: 118,
    checkins: 508,
    coords: { x: "70%", y: "33%" },
    color: "from-violet-400/60 to-indigo-900/10"
  }
];

const coverageStats = [
  { label: "Active hubs", value: "38", delta: "+6 this quarter" },
  { label: "Daily check-ins", value: "2,817", delta: "41% lift" },
  { label: "Average dwell", value: "3h 12m", delta: "+27m YoY" }
];

const signalStories = [
  {
    title: "On-the-minute presence",
    copy: "Members light up the map seconds after tapping the in-hub beacon.",
    icon: Radar
  },
  {
    title: "Roster-grade filters",
    copy: "Drill into collectors, curators, or builders with layered search.",
    icon: Users
  },
  {
    title: "Zero-config zones",
    copy: "Spin up pop-up hubs with saved layouts and airing schedules.",
    icon: RadioTower
  }
];

export default function HubMapLandingPage() {
  const sessionUser = useSessionState((state) => state.user);
  const [activeHubIndex, setActiveHubIndex] = useState(0);
  const [view, setView] = useState<"global" | "local">("global");

  const activeHub = useMemo(() => demoHubs[activeHubIndex], [activeHubIndex]);
  const primaryCtaHref = sessionUser ? "/hub-map/workspace" : "/signup";
  const primaryCtaLabel = sessionUser ? "Launch live map" : "Join hubs";

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-gradient-to-b from-accent/30 via-transparent to-transparent blur-3xl" />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-border/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <MapPin className="h-4 w-4" /> Hub map
            </div>
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit bg-accent/20 text-accent">
                {view === "global" ? "Worldwide heat" : "Local heartbeat"}
              </Badge>
              <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl font-semibold text-white sm:text-5xl">
                See every creator hub pulse before you drop in
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                Share this map-first landing with investors or collaborators to demonstrate reach. Toggle between global
                presence and zoomed local insights, then open the realtime workspace when it is action time.
              </p>
            </div>
            <div className="inline-grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-border/20 p-2 text-sm text-muted-foreground">
              {(["global", "local"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={cn(
                    "rounded-xl px-4 py-2 text-left font-semibold transition",
                    view === mode ? "bg-background/80 text-white" : "hover:text-white"
                  )}
                  onClick={() => setView(mode)}
                >
                  {mode === "global" ? "Planet-wide signals" : "Per-hub deep dive"}
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
                <Link href="/hub-map/workspace">
                  Preview live layer
                  <MoveRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {coverageStats.map((stat) => (
                <Card key={stat.label} className="border border-border/40 bg-card/50">
                  <CardContent className="space-y-1 p-4">
                    <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-semibold text-white">{stat.value}</p>
                    <p className="text-xs text-accent">{stat.delta}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <HubMapPreview hubs={demoHubs} activeHub={activeHub} onSelectHub={setActiveHubIndex} view={view} />
        </div>

        <section className="grid gap-6 md:grid-cols-3">
          {signalStories.map((story) => (
            <Card
              key={story.title}
              className="border border-border/50 bg-card/50 transition duration-300 hover:-translate-y-1 hover:border-accent"
            >
              <CardContent className="flex flex-col gap-4 p-6">
                <story.icon className="h-8 w-8 text-accent" />
                <h3 className="text-lg font-semibold text-white">{story.title}</h3>
                <p className="text-sm text-muted-foreground">{story.copy}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 rounded-3xl border border-border/50 bg-card/40 p-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <Badge variant="secondary" className="bg-accent/20 text-accent">
              Signal intelligence
            </Badge>
            <h2 className="text-3xl font-semibold text-white">Turn check-ins into proof of community</h2>
            <p className="text-base text-muted-foreground">
              This landing shows your hub velocity before anyone opens the authenticated app. Embed it in investor decks,
              newsletters, or local screens to broadcast momentum.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {demoHubs.map((hub, index) => (
                <button
                  type="button"
                  key={hub.name}
                  onMouseEnter={() => setActiveHubIndex(index)}
                  className={cn(
                    "rounded-2xl border px-4 py-4 text-left transition",
                    activeHubIndex === index ? "border-accent bg-border/30 text-white" : "border-border/40 bg-border/10 text-muted-foreground"
                  )}
                >
                  <p className="text-xs uppercase tracking-[0.3em]">{hub.city}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{hub.name}</p>
                  <p className="mt-3 text-sm">{hub.members} members</p>
                </button>
              ))}
            </div>
          </div>
          <Card className="border border-border/40 bg-background/70">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-3">
                <Compass className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Zoomed insight</p>
                  <p className="text-lg font-semibold text-white">{activeHub.name}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border/40 bg-border/10 p-4">
                <p className="text-sm text-muted-foreground">{activeHub.city}</p>
                <p className="mt-3 text-sm text-white">{activeHub.members} verified members</p>
                <p className="text-sm text-white">{activeHub.checkins} lifetime check-ins</p>
              </div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Shareable insight</p>
              <p className="text-sm text-muted-foreground">
                Export this panel as an image or embed link before inviting external partners to the live workspace.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-3xl border border-border/50 bg-gradient-to-br from-border/40 via-background to-background p-8 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Open access preview</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Drop investors into the map without requiring a login</h2>
          <p className="mt-3 text-base text-muted-foreground">
            When they are ready to go deeper, invite them to the authenticated hub map workspace.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href={primaryCtaHref}>
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/hub-map/workspace">Open realtime board</Link>
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}

const HubMapPreview = ({
  hubs,
  activeHub,
  onSelectHub,
  view
}: {
  hubs: typeof demoHubs;
  activeHub: (typeof demoHubs)[number];
  onSelectHub: (index: number) => void;
  view: "global" | "local";
}) => {
  return (
    <div className="relative grid rounded-3xl border border-border/60 bg-card/70 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
      <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-muted-foreground">
        <span>{view === "global" ? "Planet coverage" : "Local lens"}</span>
        <span>Realtime</span>
      </div>
      <div className="relative h-80 overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-background via-border/10 to-background">
        {hubs.map((hub, index) => (
          <button
            key={hub.name}
            type="button"
            className={cn(
              "group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-full px-2 py-1 text-center text-xs font-medium",
              `bg-gradient-to-br ${hub.color}`,
              activeHub.name === hub.name ? "text-white" : "text-muted-foreground"
            )}
            style={{ left: hub.coords.x, top: hub.coords.y }}
            onMouseEnter={() => onSelectHub(index)}
          >
            <span>{hub.name}</span>
            <span className="rounded-full border border-white/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.4em] text-white">
              {hub.members}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border border-border/40 bg-border/10 p-4 text-sm">
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Now showing</p>
        <p className="mt-2 text-lg font-semibold text-white">{activeHub.name}</p>
        <p className="text-sm text-muted-foreground">{activeHub.city}</p>
      </div>
    </div>
  );
};
