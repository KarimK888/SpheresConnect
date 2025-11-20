"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Award, Eye, Filter, Map, Sparkles, Star, Users } from "lucide-react";
import { useSessionState } from "@/context/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const industries = [
  { id: "visuals", label: "Visuals" },
  { id: "sound", label: "Sound" },
  { id: "collectors", label: "Collectors" },
  { id: "ops", label: "Ops" }
] as const;

const hubs = ["Lisbon", "Brooklyn", "Seoul", "Nairobi"] as const;

const spotlightProfiles = [
  {
    name: "Mila Torres",
    craft: "Creative director",
    hub: "Brooklyn",
    industry: "visuals",
    tags: ["Brand", "Motion", "XR"]
  },
  {
    name: "Jae Yoon",
    craft: "Sound strategist",
    hub: "Seoul",
    industry: "sound",
    tags: ["Spatial", "Mix", "Install"]
  },
  {
    name: "Amara Gichuru",
    craft: "Collector-in-residence",
    hub: "Nairobi",
    industry: "collectors",
    tags: ["Curation", "Startups", "Studio"]
  }
] as const;

const metrics = [
  { label: "Verified creatives", value: "2,941" },
  { label: "Collector seats", value: "411" },
  { label: "Studios plugged in", value: "118" }
];

const proofPoints = [
  { icon: Filter, title: "Precision filters", copy: "Stack filters by hub, vibe, or service tier before inviting." },
  { icon: Users, title: "Warm intros", copy: "Generate context cards that plug straight into matcher flows." },
  { icon: Eye, title: "Read-only views", copy: "Hand investors an auto-refreshing feed without credentials." }
];

export default function ProfilesLandingPage() {
  const sessionUser = useSessionState((state) => state.user);
  const [activeIndustry, setActiveIndustry] = useState<(typeof industries)[number]["id"]>("visuals");
  const [activeHub, setActiveHub] = useState<(typeof hubs)[number]>("Lisbon");

  const primaryCtaHref = sessionUser ? "/profiles/workspace" : "/signup";
  const primaryCtaLabel = sessionUser ? "Open directory" : "Preview directory";

  const visibleProfiles = useMemo(
    () =>
      spotlightProfiles.filter(
        (profile) => profile.industry === activeIndustry || profile.hub === activeHub
      ),
    [activeIndustry, activeHub]
  );

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-accent/30 via-transparent to-transparent blur-3xl" />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16">
        <header className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-border/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <Sparkles className="h-4 w-4" /> Profiles
            </div>
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit bg-accent/20 text-accent">
                Verified gallery preview
              </Badge>
              <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl font-semibold text-white sm:text-5xl">
                Share your member directory without exposing the whole app
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                Investors and collaborators can explore live profiles, filters, and credentials on this landing page.
                When it is time to go deeper, route them into the authenticated profiles workspace.
              </p>
            </div>
            <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-border/20 p-2 text-sm text-muted-foreground">
              {industries.map((industry) => (
                <button
                  key={industry.id}
                  type="button"
                  className={cn(
                    "rounded-xl px-4 py-2 font-semibold transition",
                    activeIndustry === industry.id ? "bg-background/80 text-white" : "hover:text-white"
                  )}
                  onClick={() => setActiveIndustry(industry.id)}
                >
                  {industry.label}
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
                <Link href="/profiles/workspace">Go to verified grid</Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {metrics.map((metric) => (
                <Card key={metric.label} className="border border-border/40 bg-card/50">
                  <CardContent className="space-y-1 p-4">
                    <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{metric.label}</p>
                    <p className="text-2xl font-semibold text-white">{metric.value}</p>
                    <p className="text-xs text-muted-foreground">Auto-refreshing snapshot</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <ProfilesPreview hub={activeHub} onHubChange={setActiveHub} profiles={visibleProfiles} />
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {proofPoints.map((point) => (
            <Card
              key={point.title}
              className="border border-border/50 bg-card/50 transition duration-300 hover:-translate-y-1 hover:border-accent"
            >
              <CardContent className="flex flex-col gap-4 p-6">
                <point.icon className="h-8 w-8 text-accent" />
                <h3 className="text-lg font-semibold text-white">{point.title}</h3>
                <p className="text-sm text-muted-foreground">{point.copy}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-8 rounded-3xl border border-border/50 bg-card/40 p-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <Badge variant="secondary" className="bg-accent/20 text-accent">
              Confidence layer
            </Badge>
            <h2 className="text-3xl font-semibold text-white">Let guests see endorsements, stats, and vibes</h2>
            <p className="text-base text-muted-foreground">
              Showcase the real directory data, complete with vibe tags and endorsement counts, while the edit controls
              stay locked down for verified members.
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-300" /> Public badges mirror the live app
              </li>
              <li className="flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-300" /> Scores and achievements auto refresh
              </li>
              <li className="flex items-center gap-2">
                <Map className="h-4 w-4 text-violet-300" /> Hub context pins right to the profile card
              </li>
            </ul>
          </div>
          <Card className="border border-border/40 bg-background/80">
            <CardContent className="space-y-4 p-6">
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Live profile spotlight</p>
              {visibleProfiles.slice(0, 2).map((profile) => (
                <div key={profile.name} className="rounded-2xl border border-border/40 bg-border/10 p-4">
                  <p className="text-sm font-semibold text-white">{profile.name}</p>
                  <p className="text-xs text-muted-foreground">{profile.craft}</p>
                  <p className="text-xs text-muted-foreground">Hub: {profile.hub}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="rounded-3xl border border-border/50 bg-gradient-to-br from-border/40 via-background to-background p-8 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Directory preview</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Turn this into the front door for your member roster</h2>
          <p className="mt-2 text-base text-muted-foreground">
            Once stakeholders know the value, bring them into the fully authenticated SpheresConnect directory.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href={primaryCtaHref}>
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/profiles/workspace">Jump to verified view</Link>
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}

const ProfilesPreview = ({
  hub,
  onHubChange,
  profiles
}: {
  hub: (typeof hubs)[number];
  onHubChange: (next: (typeof hubs)[number]) => void;
  profiles: Array<(typeof spotlightProfiles)[number]>;
}) => (
  <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
    <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-muted-foreground">
      <span>Hub preview</span>
      <span>Realtime</span>
    </div>
    <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-border/40 bg-border/10 p-2 text-sm text-muted-foreground">
      {hubs.map((option) => (
        <button
          key={option}
          type="button"
          className={cn(
            "rounded-xl px-3 py-2 font-semibold transition",
            hub === option ? "bg-background/80 text-white" : "hover:text-white"
          )}
          onClick={() => onHubChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
    <div className="mt-5 space-y-3">
      {profiles.length === 0 && (
        <Card className="border border-border/40 bg-background/70">
          <CardContent className="p-4 text-sm text-muted-foreground">No preview for this filter yet.</CardContent>
        </Card>
      )}
      {profiles.map((profile) => (
        <Card key={profile.name} className="border border-border/40 bg-background/80">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Hub · {profile.hub}</span>
              <span>{profile.industry}</span>
            </div>
            <p className="text-lg font-semibold text-white">{profile.name}</p>
            <p className="text-sm text-muted-foreground">{profile.craft}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              {profile.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);
