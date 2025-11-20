"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Heart, MapPin, MessageCircle, Sparkles, Star, Users, Zap } from "lucide-react";
import { useSessionState } from "@/context/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const candidateStories = [
  {
    name: "Jamie Rivera",
    role: "Experiential designer",
    hub: "Brooklyn Wave",
    skills: ["Spatial", "Motion", "XR"],
    vibe: "creative",
    quote: "Needed a 3D-first stylist in 24h and matched on the first swipe."
  },
  {
    name: "Marlow Ahn",
    role: "Sound scenographer",
    hub: "Seoul Heights",
    skills: ["Modular", "Field", "Mix"],
    vibe: "technical",
    quote: "Genkit prompts gave me collaborators that actually get hybrid sets."
  },
  {
    name: "Isha Patel",
    role: "Creator partnerships",
    hub: "Lisbon Atlantic",
    skills: ["Curation", "BD", "Ops"],
    vibe: "ops",
    quote: "Routed investor intros straight from the matcher page as proof of fit."
  }
];

const vibeFilters = [
  { id: "creative", label: "Creative" },
  { id: "technical", label: "Technical" },
  { id: "ops", label: "Ops" }
] as const;

const benefits = [
  {
    icon: Users,
    title: "Taste-based cohorts",
    copy: "Stack members by skills, vibes, or hubs before they ever log in."
  },
  {
    icon: MessageCircle,
    title: "Warm intros",
    copy: "Auto-suggest DM scripts personalized with context from both sides."
  },
  {
    icon: Zap,
    title: "Instant refresh",
    copy: "Swipe deck rebuilds nightly based on attendance, sentiment, and pipeline."
  }
];

const proofPoints = [
  { label: "Match rate", value: "87%", detail: "within 3 swipes" },
  { label: "Avg. DM reply", value: "12m", detail: "after connection" },
  { label: "Cross-hub bridges", value: "421", detail: "last quarter" }
];

export default function MatcherLandingPage() {
  const sessionUser = useSessionState((state) => state.user);
  const [activeFilter, setActiveFilter] = useState<(typeof vibeFilters)[number]["id"]>("creative");
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredDeck = useMemo(
    () => candidateStories.filter((story) => story.vibe === activeFilter),
    [activeFilter]
  );

  const primaryCtaHref = sessionUser ? "/matcher/workspace" : "/signup";
  const primaryCtaLabel = sessionUser ? "Start matching" : "Join matcher";

  useEffect(() => {
    if (!filteredDeck.length) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % filteredDeck.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [filteredDeck.length]);

  const activeStory = filteredDeck[activeIndex] ?? filteredDeck[0];

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-gradient-to-b from-accent/30 via-transparent to-transparent blur-3xl" />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-border/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <Sparkles className="h-4 w-4" /> Matcher
            </div>
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit bg-accent/20 text-accent">
                Swipe deck preview
              </Badge>
              <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl font-semibold text-white sm:text-5xl">
                Show the chemistry before members ever sign in
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                Drop this landing page in sales materials to prove your matchmaking engine works. Swipe-ready cards,
                vibe filters, and sentiment stats move even the most skeptical operators.
              </p>
            </div>
            <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-border/20 p-2 text-sm text-muted-foreground">
              {vibeFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={cn(
                    "rounded-xl px-3 py-2 font-semibold transition",
                    activeFilter === filter.id ? "bg-background/80 text-white" : "hover:text-white"
                  )}
                  onClick={() => {
                    setActiveFilter(filter.id);
                    setActiveIndex(0);
                  }}
                >
                  {filter.label}
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
                <Link href="/matcher/workspace">
                  Enter swipe room
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {proofPoints.map((point) => (
                <Card key={point.label} className="border border-border/40 bg-card/50">
                  <CardContent className="space-y-1 p-4">
                    <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{point.label}</p>
                    <p className="text-2xl font-semibold text-white">{point.value}</p>
                    <p className="text-xs text-accent">{point.detail}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <CandidateStack stories={filteredDeck} activeStory={activeStory} />
        </div>

        <section className="grid gap-6 md:grid-cols-3">
          {benefits.map((benefit) => (
            <Card
              key={benefit.title}
              className="border border-border/50 bg-card/50 transition duration-300 hover:-translate-y-1 hover:border-accent"
            >
              <CardContent className="flex flex-col gap-4 p-6">
                <benefit.icon className="h-8 w-8 text-accent" />
                <h3 className="text-lg font-semibold text-white">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.copy}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-8 rounded-3xl border border-border/50 bg-card/40 p-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <Badge variant="secondary" className="bg-accent/20 text-accent">
              Conversion lift
            </Badge>
            <h2 className="text-3xl font-semibold text-white">Use this landing to prove you can curate the right matches</h2>
            <p className="text-base text-muted-foreground">
              Stakeholders swipe through living profiles with hover states, badges, and context-rich stats. When they are
              convinced, the live matcher workspace is one click away.
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-400" /> Sentiment tagging from every swipe
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-400" /> Hub-based multipliers with travel heat
              </li>
              <li className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-300" /> Priority boosts for curated members
              </li>
            </ul>
          </div>
          <Card className="border border-border/40 bg-background/80">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Current spotlight</p>
                  <p className="text-lg font-semibold text-white">{activeStory?.name}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{activeStory?.quote}</p>
              <div className="rounded-2xl border border-border/40 bg-border/10 p-4 text-sm">
                <p className="text-white">{activeStory?.role}</p>
                <p className="text-muted-foreground">{activeStory?.hub}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeStory?.skills.map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-3xl border border-border/50 bg-gradient-to-br from-border/40 via-background to-background p-8 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Swipe-ready preview</p>
          <h2 className="mt-4 text-3xl font-semibold text-white">Set the tone with a no-login matcher teaser</h2>
          <p className="mt-2 text-base text-muted-foreground">
            Keep operators engaged with a living deck, then route them directly to the authenticated swipe room.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href={primaryCtaHref}>
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/matcher/workspace">Open the live matcher</Link>
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}

const CandidateStack = ({
  stories,
  activeStory
}: {
  stories: typeof candidateStories;
  activeStory: (typeof candidateStories)[number];
}) => {
  if (!stories.length || !activeStory) {
    return (
      <Card className="border border-border/60 bg-card/60">
        <CardContent className="p-6 text-sm text-muted-foreground">No preview available for this filter.</CardContent>
      </Card>
    );
  }

  return (
    <div className="relative h-[420px]">
      {stories.map((story, index) => {
        const depth = stories.length - index;
        return (
          <div
            key={story.name}
            className={cn(
              "absolute inset-0 transition duration-300",
              depth === stories.length ? "z-30" : depth === stories.length - 1 ? "z-20" : "z-10"
            )}
            style={{ transform: `translateY(${index * 12}px) scale(${1 - index * 0.03})`, opacity: 1 - index * 0.15 }}
          >
            <Card className="h-full border border-border/50 bg-card/80 shadow-2xl">
              <CardContent className="flex h-full flex-col gap-4 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{story.hub}</p>
                    <p className="text-2xl font-semibold text-white">{story.name}</p>
                    <p className="text-sm text-muted-foreground">{story.role}</p>
                  </div>
                  <Heart className="h-6 w-6 text-rose-400" />
                </div>
                <p className="text-sm text-muted-foreground">{story.quote}</p>
                <div className="flex flex-wrap gap-2">
                  {story.skills.map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
};
