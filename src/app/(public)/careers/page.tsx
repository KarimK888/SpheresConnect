"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Globe2, HeartHandshake, MapPin, Sparkles, Trophy, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useI18n } from "@/context/i18n";

const tracks = [
  {
    id: "product",
    label: "Product",
    copy: "Shape the productivity OS powering hybrid studios worldwide."
  },
  {
    id: "community",
    label: "Community",
    copy: "Curate talent, hosts, and collectors across every Spheres hub."
  },
  {
    id: "go-to-market",
    label: "Go-to-market",
    copy: "Run demand programs that bring on new partners and brands."
  }
] as const;

const openings = [
  {
    title: "Founding Product Designer",
    track: "product",
    location: "Lisbon or remote",
    tags: ["Design systems", "Zero-to-one"]
  },
  {
    title: "Marketplace Success Lead",
    track: "community",
    location: "Brooklyn hybrid",
    tags: ["Commerce", "Creator ops"]
  },
  {
    title: "Strategic Partnerships",
    track: "go-to-market",
    location: "Remote (AMER/EU)",
    tags: ["Growth", "Studios"]
  }
] as const;

const benefits = [
  { icon: Trophy, title: "Builder-grade equity", copy: "Every core teammate has upside in the network we are building." },
  { icon: Globe2, title: "Global hubs", copy: "Spend time in any Spheres city and host your own satellite events." },
  { icon: HeartHandshake, title: "Deep care", copy: "Premium healthcare, break rituals, and annual creative grants." }
];

export default function CareersPage() {
  const { t } = useI18n();
  const [activeTrack, setActiveTrack] = useState<(typeof tracks)[number]["id"]>("product");

  const visibleOpenings = useMemo(
    () => openings.filter((role) => role.track === activeTrack),
    [activeTrack]
  );

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[400px] bg-gradient-to-b from-accent/30 via-transparent to-transparent blur-3xl" />
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16">
        <header className="space-y-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-border/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <Sparkles className="h-4 w-4" /> {t("careers_title")}
          </div>
          <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl font-semibold text-white sm:text-5xl">
            {t("careers_subtitle")}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            We are assembling a distributed team of multi-hyphenates—designers, ops leads, engineers, and storytellers—who
            obsess over building hybrid creative ecosystems.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Users2 className="h-4 w-4 text-accent" /> 32 teammates across 6 hubs
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" /> HQ: Lisbon, Brooklyn, Seoul
            </span>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="mailto:careers@spheresconnect.com">
                Send your deck
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/profiles">Meet future teammates</Link>
            </Button>
          </div>
        </header>

        <section className="rounded-3xl border border-border/60 bg-card/50 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Open roles</p>
              <h2 className="text-2xl font-semibold text-white">Choose a track</h2>
            </div>
            <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-border/50 bg-border/20 p-2 text-sm text-muted-foreground">
              {tracks.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  className={cn("rounded-xl px-3 py-2 font-semibold transition", activeTrack === track.id ? "bg-background/80 text-white" : "hover:text-white")}
                  onClick={() => setActiveTrack(track.id)}
                >
                  {track.label}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {tracks.find((track) => track.id === activeTrack)?.copy}
          </p>
          <div className="mt-6 space-y-4">
            {visibleOpenings.map((role) => (
              <Card key={role.title} className="border border-border/40 bg-background/80">
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">{role.title}</p>
                    <p className="text-sm text-muted-foreground">{role.location}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {role.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button asChild variant="ghost" className="self-start text-accent hover:text-white">
                    <Link href="mailto:careers@spheresconnect.com?subject=SpheraConnect%20Role">{t("careers_apply_cta") ?? "Pitch yourself"}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
            {visibleOpenings.length === 0 && (
              <Card className="border border-dashed border-border/40 bg-border/10">
                <CardContent className="p-5 text-sm text-muted-foreground">
                  {t("careers_coming_soon")}
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {benefits.map((benefit) => (
            <Card key={benefit.title} className="border border-border/50 bg-card/50">
              <CardContent className="flex flex-col gap-3 p-6">
                <benefit.icon className="h-8 w-8 text-accent" />
                <h3 className="text-lg font-semibold text-white">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.copy}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-border/30 via-background to-background p-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Future teammates</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">No resume drop—send proof you care about creative systems</h2>
          <p className="mt-2 text-base text-muted-foreground">
            Share a zine, deck, repo, or product teardown. Every candidate gets a response within a week.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="mailto:careers@spheresconnect.com">
                Drop your work
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/profiles">Browse profiles</Link>
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}
