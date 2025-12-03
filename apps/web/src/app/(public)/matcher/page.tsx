"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Heart, MapPin, MessageCircle, Sparkles, Star, Users, Zap } from "lucide-react";
import { useSessionState } from "@/context/session";
import { useI18n } from "@/context/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  buildLandingHeroCopy,
  buildLandingPreviewCopy,
  translateCollection
} from "@/lib/landing-copy";
import type { TranslationKey } from "@/lib/landing-copy";

type TranslateFn = ReturnType<typeof useI18n>["t"];

type MatcherCopy = {
  heroTag: string;
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  filters: { id: (typeof vibeFilters)[number]; label: string }[];
  candidateStories: Array<
    (typeof candidateBase)[number] & {
      role: string;
      quote: string;
    }
  >;
  stats: { label: string; value: string; detail: string }[];
  benefits: { title: string; copy: string; Icon: typeof Users }[];
  conversionBadge: string;
  conversionHeading: string;
  conversionBody: string;
  conversionBullets: { Icon: typeof Heart; text: string }[];
  primaryCtaAuthed: string;
  primaryCtaGuest: string;
  secondaryCta: string;
  previewBadge: string;
  previewHeading: string;
  previewBody: string;
  previewSecondary: string;
  spotlightLabel: string;
  stackFallback: string;
};

const candidateBase = [
  {
    id: "jamie",
    name: "Jamie Rivera",
    hub: "Brooklyn Wave",
    skills: ["Spatial", "Motion", "XR"],
    vibe: "creative"
  },
  {
    id: "marlow",
    name: "Marlow Ahn",
    hub: "Seoul Heights",
    skills: ["Modular", "Field", "Mix"],
    vibe: "technical"
  },
  {
    id: "isha",
    name: "Isha Patel",
    hub: "Lisbon Atlantic",
    skills: ["Curation", "BD", "Ops"],
    vibe: "ops"
  }
] as const;

const vibeFilters = ["creative", "technical", "ops"] as const;
const matcherStatsBase: { labelKey: TranslationKey; detailKey: TranslationKey; value: string }[] = [
  { labelKey: "matcher_stat_match_rate_label", detailKey: "matcher_stat_match_rate_detail", value: "87%" },
  { labelKey: "matcher_stat_reply_label", detailKey: "matcher_stat_reply_detail", value: "12m" },
  { labelKey: "matcher_stat_bridges_label", detailKey: "matcher_stat_bridges_detail", value: "421" }
];
const matcherBenefitsBase: { titleKey: TranslationKey; copyKey: TranslationKey; Icon: typeof Users }[] = [
  { titleKey: "matcher_benefit_cohorts_title", copyKey: "matcher_benefit_cohorts_copy", Icon: Users },
  { titleKey: "matcher_benefit_intros_title", copyKey: "matcher_benefit_intros_copy", Icon: MessageCircle },
  { titleKey: "matcher_benefit_refresh_title", copyKey: "matcher_benefit_refresh_copy", Icon: Zap }
];
const conversionBulletBase: { Icon: typeof Heart; textKey: TranslationKey }[] = [
  { Icon: Heart, textKey: "matcher_conversion_sentiment" },
  { Icon: MapPin, textKey: "matcher_conversion_hubs" },
  { Icon: Star, textKey: "matcher_conversion_priority" }
];


export default function MatcherLandingPage() {
  const { t } = useI18n();
  const sessionUser = useSessionState((state) => state.user);
  const copy = useMemo(() => buildMatcherCopy(t), [t]);
  const [activeFilter, setActiveFilter] = useState<(typeof vibeFilters)[number]>(copy.filters[0]?.id ?? "creative");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveFilter(copy.filters[0]?.id ?? "creative");
    setActiveIndex(0);
  }, [copy.filters]);

  const filteredDeck = useMemo(
    () => copy.candidateStories.filter((story) => story.vibe === activeFilter),
    [copy.candidateStories, activeFilter]
  );

  const primaryCtaHref = sessionUser ? "/matcher/workspace" : "/signup";
  const primaryCtaLabel = sessionUser ? copy.primaryCtaAuthed : copy.primaryCtaGuest;

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
              <Sparkles className="h-4 w-4" /> {copy.heroTag}
            </div>
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit bg-accent/20 text-accent">
                {copy.heroBadge}
              </Badge>
              <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl font-semibold text-white sm:text-5xl">
                {copy.heroTitle}
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">{copy.heroDescription}</p>
            </div>
            <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-border/20 p-2 text-sm text-muted-foreground">
              {copy.filters.map((filter) => (
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
                  aria-pressed={activeFilter === filter.id}
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
                  {copy.secondaryCta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {copy.stats.map((point) => (
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
          <CandidateStack stories={filteredDeck} activeStory={activeStory} copy={copy} />
        </div>

        <section className="grid gap-6 md:grid-cols-3">
          {copy.benefits.map((benefit) => (
            <Card
              key={benefit.title}
              className="border border-border/50 bg-card/50 transition duration-300 hover:-translate-y-1 hover:border-accent"
            >
              <CardContent className="flex flex-col gap-4 p-6">
                <benefit.Icon className="h-8 w-8 text-accent" />
                <h3 className="text-lg font-semibold text-white">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.copy}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-8 rounded-3xl border border-border/50 bg-card/40 p-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <Badge variant="secondary" className="bg-accent/20 text-accent">
              {copy.conversionBadge}
            </Badge>
            <h2 className="text-3xl font-semibold text-white">{copy.conversionHeading}</h2>
            <p className="text-base text-muted-foreground">{copy.conversionBody}</p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {copy.conversionBullets.map((bullet) => (
                <li key={bullet.text} className="flex items-center gap-2">
                  <bullet.Icon className="h-4 w-4 text-accent" /> {bullet.text}
                </li>
              ))}
            </ul>
          </div>
          <Card className="border border-border/40 bg-background/80">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{copy.spotlightLabel}</p>
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
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{copy.previewBadge}</p>
          <h2 className="mt-4 text-3xl font-semibold text-white">{copy.previewHeading}</h2>
          <p className="mt-2 text-base text-muted-foreground">{copy.previewBody}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href={primaryCtaHref}>
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/matcher/workspace">{copy.previewSecondary}</Link>
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}

const CandidateStack = ({
  stories,
  activeStory,
  copy
}: {
  stories: MatcherCopy["candidateStories"];
  activeStory: MatcherCopy["candidateStories"][number];
  copy: MatcherCopy;
}) => {
  if (!stories.length || !activeStory) {
    return (
      <Card className="border border-border/60 bg-card/60">
        <CardContent className="p-6 text-sm text-muted-foreground">{copy.stackFallback}</CardContent>
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

const buildMatcherCopy = (t: TranslateFn): MatcherCopy => {
  const hero = buildLandingHeroCopy(t, "matcher");
  const preview = buildLandingPreviewCopy(t, "matcher");
  const filters = vibeFilters.map((id) => ({ id, label: t(`matcher_filter_${id}` as const) }));
  const stats = translateCollection(matcherStatsBase, { label: "labelKey", detail: "detailKey" }, t);
  const benefits = translateCollection(matcherBenefitsBase, { title: "titleKey", copy: "copyKey" }, t);
  const conversionBullets = translateCollection(conversionBulletBase, { text: "textKey" }, t);
  const candidateStories = candidateBase.map((story) => ({
    ...story,
    role: t(`matcher_story_${story.id}_role` as const),
    quote: t(`matcher_story_${story.id}_quote` as const)
  }));

  return {
    ...hero,
    filters,
    candidateStories,
    stats,
    benefits,
    conversionBadge: t("matcher_conversion_badge"),
    conversionHeading: t("matcher_conversion_heading"),
    conversionBody: t("matcher_conversion_body"),
    conversionBullets,
    ...preview,
    spotlightLabel: t("matcher_spotlight_label"),
    stackFallback: t("matcher_stack_fallback")
  };
};
