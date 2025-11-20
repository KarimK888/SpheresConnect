"use client";

import { useState } from "react";
import Link from "next/link";
import { AlarmClock, ArrowRight, CalendarDays, Clock4, Mic2, Ticket } from "lucide-react";
import { useSessionState } from "@/context/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const eventStages = [
  {
    id: "ideate",
    title: "Ideate",
    detail: "Collect pitches, score them, and auto-build run-of-show.",
    metric: "36h approvals"
  },
  {
    id: "promote",
    title: "Promote",
    detail: "Issue waitlist invites, push SMS reminders, and embed RSVP widgets.",
    metric: "92% show-up"
  },
  {
    id: "recap",
    title: "Recap",
    detail: "Publish highlights, payouts, and attendee analytics instantly.",
    metric: "Ready in 10m"
  }
] as const;

const spotlightEvents = [
  {
    name: "Creator Salon 004",
    time: "Thu 7PM",
    location: "Lisbon Atlantic",
    tags: ["Salon", "Hybrid"],
    color: "text-emerald-300"
  },
  {
    name: "Metropolis Listening Lab",
    time: "Sat 9PM",
    location: "Brooklyn Wave",
    tags: ["Music", "Immersive"],
    color: "text-amber-300"
  },
  {
    name: "Studio Tours",
    time: "Sun 1PM",
    location: "Seoul Heights",
    tags: ["Open", "IRL"],
    color: "text-violet-300"
  }
];

const logistics = [
  {
    icon: CalendarDays,
    title: "Stacked agenda",
    copy: "Back-to-back scheduling with travel buffers built-in."
  },
  {
    icon: Ticket,
    title: "Badging",
    copy: "Generate NFC badges and QR wristbands directly from the landing."
  },
  {
    icon: Mic2,
    title: "Talent ops",
    copy: "Brief hosts with scripts, payments, and shared files."
  }
];

export default function EventsLandingPage() {
  const sessionUser = useSessionState((state) => state.user);
  const [activeStage, setActiveStage] = useState<(typeof eventStages)[number]["id"]>("ideate");

  const primaryCtaHref = sessionUser ? "/events/workspace" : "/signup";
  const primaryCtaLabel = sessionUser ? "Open run of show" : "Plan events";

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-gradient-to-b from-accent/30 via-transparent to-transparent blur-3xl" />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-border/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <CalendarDays className="h-4 w-4" /> Events
            </div>
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit bg-accent/20 text-accent">
                Run of show preview
              </Badge>
              <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl font-semibold text-white sm:text-5xl">
                Sell your calendar before the doors even open
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                Offer partners a clear, interactive overview of your programming cadence. Every element mirrors the live
                events workspace waiting behind the login.
              </p>
            </div>
            <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-border/20 p-2 text-sm text-muted-foreground">
              {eventStages.map((stage) => (
                <button
                  key={stage.id}
                  type="button"
                  className={cn(
                    "rounded-xl px-3 py-2 font-semibold transition",
                    activeStage === stage.id ? "bg-background/80 text-white" : "hover:text-white"
                  )}
                  onClick={() => setActiveStage(stage.id)}
                >
                  {stage.title}
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
                <Link href="/events/workspace">Enter live calendar</Link>
              </Button>
            </div>
          </div>
          <SchedulePreview activeStage={activeStage} />
        </div>

        <section className="grid gap-6 md:grid-cols-3">
          {logistics.map((item) => (
            <Card
              key={item.title}
              className="border border-border/50 bg-card/50 transition duration-300 hover:-translate-y-1 hover:border-accent"
            >
              <CardContent className="flex flex-col gap-4 p-6">
                <item.icon className="h-8 w-8 text-accent" />
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.copy}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl border border-border/50 bg-card/40 p-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex-1 space-y-4">
              <Badge variant="secondary" className="bg-accent/20 text-accent">
                Spotlight nights
              </Badge>
              <h2 className="text-3xl font-semibold text-white">Highlight programming cadence without a login</h2>
              <p className="text-base text-muted-foreground">
                Share this living calendar with sponsors, partners, and talent scouts. They see real data—attendance,
                host readiness, and payout tiers—without needing credentials.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {spotlightEvents.map((event) => (
                  <div key={event.name} className="rounded-2xl border border-border/40 bg-border/10 p-4">
                    <p className={cn("text-xs uppercase tracking-[0.3em]", event.color)}>{event.time}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{event.name}</p>
                    <p className="text-sm text-muted-foreground">{event.location}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                      {event.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Card className="flex-1 border border-border/40 bg-background/80">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-3">
                  <Clock4 className="h-8 w-8 text-accent" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Average prep window</p>
                    <p className="text-lg font-semibold text-white">3.6 days</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Auto-generated run of show, vendor list, and tech checks keep every event consistent. When teams need
                  deeper controls they jump straight into the authenticated workspace.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="rounded-3xl border border-border/50 bg-gradient-to-br from-border/40 via-background to-background p-8 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Run of show preview</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Let partners live inside your calendar without credentials</h2>
          <p className="mt-2 text-base text-muted-foreground">
            When it is time to produce, unlock the full events workspace with one invite.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href={primaryCtaHref}>
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/events/workspace">Open live scheduler</Link>
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}

const SchedulePreview = ({ activeStage }: { activeStage: (typeof eventStages)[number]["id"] }) => {
  const stage = eventStages.find((entry) => entry.id === activeStage) ?? eventStages[0];

  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-muted-foreground">
        <span>Stage preview</span>
        <span>Realtime</span>
      </div>
      <div className="rounded-2xl border border-border/40 bg-background/70 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{stage.title}</p>
        <p className="mt-2 text-lg font-semibold text-white">{stage.detail}</p>
        <p className="text-sm text-accent">{stage.metric}</p>
      </div>
      <div className="mt-5 space-y-3">
        {spotlightEvents.map((event) => (
          <div key={event.name} className="rounded-2xl border border-border/40 bg-border/10 p-4">
            <p className="text-sm font-semibold text-white">{event.name}</p>
            <p className="text-xs text-muted-foreground">{event.time} • {event.location}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-border/40 bg-border/10 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <AlarmClock className="h-4 w-4 text-accent" />
          Reminder workflow ready once attendees RSVP.
        </div>
      </div>
    </div>
  );
};
