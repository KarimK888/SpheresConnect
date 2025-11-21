"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Award, Eye, Filter, Map, Sparkles, Star, Users } from "lucide-react";
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

type ProfilesCopy = {
  heroTag: string;
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  filters: { id: (typeof industryIds)[number]; label: string }[];
  metrics: { label: string; value: string; caption: string }[];
  proofPoints: { icon: typeof Filter; title: string; copy: string }[];
  primaryCtaAuthed: string;
  primaryCtaGuest: string;
  secondaryCta: string;
  previewBadge: string;
  previewHeading: string;
  previewBody: string;
  previewSecondary: string;
  confidenceBadge: string;
  confidenceHeading: string;
  confidenceBody: string;
  confidenceBullets: { icon: typeof Star; text: string }[];
  spotlightHeading: string;
  spotlightHubLabel: string;
  cards: Array<
    (typeof spotlightBase)[number] & {
      craft: string;
    }
  >;
  fallbackText: string;
  previewHeader: string;
  previewStatus: string;
};

type TranslateFn = ReturnType<typeof useI18n>["t"];

const industryIds = ["visuals", "sound", "collectors", "ops"] as const;

const hubs = ["Lisbon", "Brooklyn", "Seoul", "Nairobi"] as const;

const spotlightBase = [
  {
    id: "mila",
    name: "Mila Torres",
    hub: "Brooklyn",
    industry: "visuals",
    tags: ["Brand", "Motion", "XR"]
  },
  {
    id: "jae",
    name: "Jae Yoon",
    hub: "Seoul",
    industry: "sound",
    tags: ["Spatial", "Mix", "Install"]
  },
  {
    id: "amara",
    name: "Amara Gichuru",
    hub: "Nairobi",
    industry: "collectors",
    tags: ["Curation", "Startups", "Studio"]
  }
] as const;

type ProfilesMetricKey = "profiles_metric_verified" | "profiles_metric_collectors" | "profiles_metric_studios";
type ProfilesProofTitle =
  | "profiles_benefit_filters_title"
  | "profiles_benefit_intros_title"
  | "profiles_benefit_views_title";
type ProfilesProofBody =
  | "profiles_benefit_filters_body"
  | "profiles_benefit_intros_body"
  | "profiles_benefit_views_body";
type ProfilesConfidenceKey =
  | "profiles_confidence_badges"
  | "profiles_confidence_scores"
  | "profiles_confidence_hubs";

const metricBase: { labelKey: ProfilesMetricKey; value: string }[] = [
  { labelKey: "profiles_metric_verified", value: "2,941" },
  { labelKey: "profiles_metric_collectors", value: "411" },
  { labelKey: "profiles_metric_studios", value: "118" }
];

const proofBase: { icon: typeof Filter; titleKey: ProfilesProofTitle; bodyKey: ProfilesProofBody }[] = [
  { icon: Filter, titleKey: "profiles_benefit_filters_title", bodyKey: "profiles_benefit_filters_body" },
  { icon: Users, titleKey: "profiles_benefit_intros_title", bodyKey: "profiles_benefit_intros_body" },
  { icon: Eye, titleKey: "profiles_benefit_views_title", bodyKey: "profiles_benefit_views_body" }
];

const confidenceBullets: { icon: typeof Star; textKey: ProfilesConfidenceKey }[] = [
  { icon: Star, textKey: "profiles_confidence_badges" },
  { icon: Award, textKey: "profiles_confidence_scores" },
  { icon: Map, textKey: "profiles_confidence_hubs" }
];

export default function ProfilesLandingPage() {
  const { t } = useI18n();
  const copy = useMemo(() => buildProfilesCopy(t), [t]);
  const sessionUser = useSessionState((state) => state.user);
  const [activeIndustry, setActiveIndustry] = useState(copy.filters[0]?.id ?? "visuals");
  const [activeHub, setActiveHub] = useState<(typeof hubs)[number]>("Lisbon");

  useEffect(() => {
    setActiveIndustry(copy.filters[0]?.id ?? "visuals");
  }, [copy.filters]);

  const primaryCtaHref = sessionUser ? "/profiles/workspace" : "/signup";
  const primaryCtaLabel = sessionUser ? copy.primaryCtaAuthed : copy.primaryCtaGuest;

  const visibleProfiles = useMemo(
    () =>
      copy.cards.filter(
        (profile) => profile.industry === activeIndustry || profile.hub === activeHub
      ),
    [copy.cards, activeIndustry, activeHub]
  );

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-accent/30 via-transparent to-transparent blur-3xl" />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16">
        <header className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
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
              {copy.filters.map((industry) => (
                <button
                  key={industry.id}
                  type="button"
                  className={cn(
                    "rounded-xl px-4 py-2 font-semibold transition",
                    activeIndustry === industry.id ? "bg-background/80 text-white" : "hover:text-white"
                  )}
                  onClick={() => setActiveIndustry(industry.id)}
                  aria-pressed={activeIndustry === industry.id}
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
                <Link href="/profiles/workspace">{copy.secondaryCta}</Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {copy.metrics.map((metric) => (
                <Card key={metric.label} className="border border-border/40 bg-card/50">
                  <CardContent className="space-y-1 p-4">
                    <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{metric.label}</p>
                    <p className="text-2xl font-semibold text-white">{metric.value}</p>
                    <p className="text-xs text-muted-foreground">{metric.caption}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <ProfilesPreview hub={activeHub} onHubChange={setActiveHub} profiles={visibleProfiles} copy={copy} />
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {copy.proofPoints.map((point) => (
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
              {copy.confidenceBadge}
            </Badge>
            <h2 className="text-3xl font-semibold text-white">{copy.confidenceHeading}</h2>
            <p className="text-base text-muted-foreground">{copy.confidenceBody}</p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {copy.confidenceBullets.map((bullet) => (
                <li key={bullet.text} className="flex items-center gap-2">
                  <bullet.icon className="h-4 w-4 text-accent" /> {bullet.text}
                </li>
              ))}
            </ul>
          </div>
          <Card className="border border-border/40 bg-background/80">
            <CardContent className="space-y-4 p-6">
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{copy.spotlightHeading}</p>
              {visibleProfiles.slice(0, 2).map((profile) => (
                <div key={profile.name} className="rounded-2xl border border-border/40 bg-border/10 p-4">
                  <p className="text-sm font-semibold text-white">{profile.name}</p>
                  <p className="text-xs text-muted-foreground">{profile.craft}</p>
                  <p className="text-xs text-muted-foreground">{copy.spotlightHubLabel.replace("{hub}", profile.hub)}</p>
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
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{copy.previewBadge}</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">{copy.previewHeading}</h2>
          <p className="mt-2 text-base text-muted-foreground">{copy.previewBody}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href={primaryCtaHref}>
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/profiles/workspace">{copy.previewSecondary}</Link>
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
  profiles,
  copy
}: {
  hub: (typeof hubs)[number];
  onHubChange: (next: (typeof hubs)[number]) => void;
  profiles: ProfilesCopy["cards"];
  copy: ProfilesCopy;
}) => (
  <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
    <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-muted-foreground">
      <span>{copy.previewHeader}</span>
      <span>{copy.previewStatus}</span>
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
          aria-pressed={hub === option}
          aria-label={copy.previewHeader ? `${copy.previewHeader}: ${option}` : option}
        >
          {option}
        </button>
      ))}
    </div>
    <div className="mt-5 space-y-3">
      {profiles.length === 0 && (
        <Card className="border border-border/40 bg-background/70">
          <CardContent className="p-4 text-sm text-muted-foreground">{copy.fallbackText}</CardContent>
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

const buildProfilesCopy = (t: TranslateFn): ProfilesCopy => {
  const filters = industryIds.map((id) => ({ id, label: t(`profiles_filter_${id}` as const) }));
  const metrics = metricBase.map((metric) => ({
    label: t(metric.labelKey as TranslationKey),
    value: metric.value,
    caption: t("profiles_metric_caption")
  }));
  const proofPoints = translateCollection(proofBase, { title: "titleKey", copy: "bodyKey" }, t);
  const confidence = translateCollection(confidenceBullets, { text: "textKey" }, t);
  const cards = spotlightBase.map((profile) => ({
    ...profile,
    craft: t(`profiles_spotlight_${profile.id}_craft` as const)
  }));
  const hero = buildLandingHeroCopy(t, "profiles");
  const preview = buildLandingPreviewCopy(t, "profiles");

  return {
    ...hero,
    filters,
    metrics,
    proofPoints,
    ...preview,
    confidenceBadge: t("profiles_confidence_badge"),
    confidenceHeading: t("profiles_confidence_heading"),
    confidenceBody: t("profiles_confidence_body"),
    confidenceBullets: confidence,
    spotlightHeading: t("profiles_spotlight_heading"),
    spotlightHubLabel: t("profiles_spotlight_hub_label"),
    cards,
    fallbackText: t("profiles_preview_fallback"),
    previewHeader: t("profiles_preview_header"),
    previewStatus: t("profiles_preview_status")
  };
};
