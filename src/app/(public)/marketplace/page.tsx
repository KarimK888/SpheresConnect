"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeDollarSign, Boxes, CreditCard, Gift, ShoppingBag, Sparkles, Star } from "lucide-react";
import { useSessionState } from "@/context/session";
import { useI18n } from "@/context/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const carouselCreators = ["Neo Atelier", "Studio Prism", "PolyChroma", "Sundial", "Amber Lane", "Constellation"];

type TranslateFn = ReturnType<typeof useI18n>["t"];

type DropConfig = {
  id: string;
  price: string;
  color: string;
  titleKey: string;
  subtitleKey: string;
  perkKeys: [string, string, string];
};

const dropConfig: DropConfig[] = [
  {
    id: "digital",
    price: "2.4 ETH",
    color: "from-emerald-400/40 to-transparent",
    titleKey: "marketplace_drop_digital_title",
    subtitleKey: "marketplace_drop_digital_subtitle",
    perkKeys: [
      "marketplace_drop_digital_perk_one",
      "marketplace_drop_digital_perk_two",
      "marketplace_drop_digital_perk_three"
    ]
  },
  {
    id: "physical",
    price: "$3,800",
    color: "from-amber-400/40 to-transparent",
    titleKey: "marketplace_drop_physical_title",
    subtitleKey: "marketplace_drop_physical_subtitle",
    perkKeys: [
      "marketplace_drop_physical_perk_one",
      "marketplace_drop_physical_perk_two",
      "marketplace_drop_physical_perk_three"
    ]
  }
];

const logisticsBase = [
  { icon: ShoppingBag, titleKey: "marketplace_logistics_checkout_title", copyKey: "marketplace_logistics_checkout_copy" },
  { icon: CreditCard, titleKey: "marketplace_logistics_split_title", copyKey: "marketplace_logistics_split_copy" },
  { icon: Boxes, titleKey: "marketplace_logistics_inventory_title", copyKey: "marketplace_logistics_inventory_copy" }
];

const proofBase = [
  { labelKey: "marketplace_proof_gmv", value: "$8.2M", detailKey: "marketplace_proof_gmv_detail" },
  { labelKey: "marketplace_proof_checkout", value: "58s", detailKey: "marketplace_proof_checkout_detail" },
  { labelKey: "marketplace_proof_revenue", value: "72%", detailKey: "marketplace_proof_revenue_detail" }
];

type MarketplaceCopy = {
  heroTag: string;
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  drops: {
    id: string;
    title: string;
    subtitle: string;
    price: string;
    perks: string[];
    color: string;
  }[];
  primaryCtaAuthed: string;
  primaryCtaGuest: string;
  secondaryCta: string;
  logistics: { icon: typeof ShoppingBag; title: string; copy: string }[];
  proof: { label: string; value: string; detail: string }[];
  merchBadge: string;
  merchHeading: string;
  merchBody: string;
  merchBullets: [string, string, string];
  marqueeTitle: string;
  marqueeBody: string;
  previewBadge: string;
  previewHeading: string;
  previewBody: string;
  previewSecondary: string;
};

const buildMarketplaceCopy = (t: TranslateFn): MarketplaceCopy => {
  const drops = dropConfig.map((drop) => ({
    id: drop.id,
    title: t(drop.titleKey),
    subtitle: t(drop.subtitleKey),
    price: drop.price,
    perks: drop.perkKeys.map((key) => t(key)),
    color: drop.color
  }));

  const logistics = logisticsBase.map((item) => ({
    icon: item.icon,
    title: t(item.titleKey),
    copy: t(item.copyKey)
  }));

  const proof = proofBase.map((entry) => ({
    label: t(entry.labelKey),
    value: entry.value,
    detail: t(entry.detailKey)
  }));

  return {
    heroTag: t("marketplace_landing_tag"),
    heroBadge: t("marketplace_landing_badge"),
    heroTitle: t("marketplace_landing_title"),
    heroDescription: t("marketplace_landing_description"),
    drops,
    primaryCtaAuthed: t("marketplace_primary_cta_authed"),
    primaryCtaGuest: t("marketplace_primary_cta_guest"),
    secondaryCta: t("marketplace_secondary_cta"),
    logistics,
    proof,
    merchBadge: t("marketplace_merch_badge"),
    merchHeading: t("marketplace_merch_heading"),
    merchBody: t("marketplace_merch_body"),
    merchBullets: [
      t("marketplace_merch_bullet_one"),
      t("marketplace_merch_bullet_two"),
      t("marketplace_merch_bullet_three")
    ],
    marqueeTitle: t("marketplace_marquee_title"),
    marqueeBody: t("marketplace_marquee_body"),
    previewBadge: t("marketplace_preview_badge"),
    previewHeading: t("marketplace_preview_heading"),
    previewBody: t("marketplace_preview_body"),
    previewSecondary: t("marketplace_preview_secondary")
  };
};

export default function MarketplaceLandingPage() {
  const { t } = useI18n();
  const copy = useMemo(() => buildMarketplaceCopy(t), [t]);
  const sessionUser = useSessionState((state) => state.user);
  const [activeDrop, setActiveDrop] = useState(copy.drops[0]?.id ?? "digital");
  const [carouselIndex, setCarouselIndex] = useState(0);

  const drop = useMemo(() => copy.drops.find((item) => item.id === activeDrop) ?? copy.drops[0], [copy.drops, activeDrop]);
  const primaryCtaHref = sessionUser ? "/marketplace/workspace" : "/signup";
  const primaryCtaLabel = sessionUser ? copy.primaryCtaAuthed : copy.primaryCtaGuest;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % carouselCreators.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!copy.drops.some((item) => item.id === activeDrop)) {
      setActiveDrop(copy.drops[0]?.id ?? "digital");
    }
  }, [copy.drops, activeDrop]);

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
              {copy.drops.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={cn(
                    "rounded-xl px-3 py-2 font-semibold transition",
                    tab.id === activeDrop ? "bg-background/80 text-white" : "hover:text-white"
                  )}
                  onClick={() => setActiveDrop(tab.id)}
                >
                  {tab.title}
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
                <Link href="/marketplace/workspace">{copy.secondaryCta}</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {copy.proof.map((item) => (
                <Card key={item.label} className="border border-border/40 bg-card/50">
                  <CardContent className="space-y-1 p-4">
                    <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{item.label}</p>
                    <p className="text-2xl font-semibold text-white">{item.value}</p>
                    <p className="text-xs text-accent">{item.detail}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <DropShowcase drop={drop} carouselIndex={carouselIndex} t={t} />
        </div>

        <section className="grid gap-6 md:grid-cols-3">
          {copy.logistics.map((highlight) => (
            <Card
              key={highlight.title}
              className="border border-border/50 bg-card/50 transition duration-300 hover:-translate-y-1 hover:border-accent"
            >
              <CardContent className="flex flex-col gap-4 p-6">
                <highlight.icon className="h-8 w-8 text-accent" />
                <h3 className="text-lg font-semibold text-white">{highlight.title}</h3>
                <p className="text-sm text-muted-foreground">{highlight.copy}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-8 rounded-3xl border border-border/50 bg-card/40 p-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <Badge variant="secondary" className="bg-accent/20 text-accent">
              {copy.merchBadge}
            </Badge>
            <h2 className="text-3xl font-semibold text-white">{copy.merchHeading}</h2>
            <p className="text-base text-muted-foreground">{copy.merchBody}</p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <BadgeDollarSign className="h-4 w-4 text-emerald-400" /> {copy.merchBullets[0]}
              </li>
              <li className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-amber-300" /> {copy.merchBullets[1]}
              </li>
              <li className="flex items-center gap-2">
                <Star className="h-4 w-4 text-violet-300" /> {copy.merchBullets[2]}
              </li>
            </ul>
          </div>
          <Card className="border border-border/40 bg-background/80">
            <CardContent className="space-y-4 p-6">
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{copy.marqueeTitle}</p>
              <div className="overflow-hidden rounded-2xl border border-border/40 bg-border/10">
                <div
                  className="flex flex-col"
                  style={{ transform: `translateY(-${carouselIndex * 40}px)`, transition: "transform 0.4s ease" }}
                >
                  {carouselCreators.concat(carouselCreators).map((creator, index) => (
                    <div key={`${creator}-${index}`} className="border-b border-border/20 px-4 py-2 text-sm text-white">
                      {creator}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{copy.marqueeBody}</p>
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
              <Link href="/marketplace/workspace">{copy.previewSecondary}</Link>
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}

const DropShowcase = ({
  drop,
  carouselIndex,
  t
}: {
  drop: MarketplaceCopy["drops"][number];
  carouselIndex: number;
  t: TranslateFn;
}) => {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
      <div className={cn("rounded-2xl border border-border/40 bg-gradient-to-br p-6", drop.color)}>
        <p className="text-xs uppercase tracking-[0.3em] text-white/80">{drop.subtitle}</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">{drop.title}</h3>
        <p className="mt-1 text-sm text-white/70">{t("marketplace_drop_price", { price: drop.price })}</p>
        <ul className="mt-4 space-y-2 text-sm text-white/80">
          {drop.perks.map((perk) => (
            <li key={perk} className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> {perk}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="border border-border/40 bg-background/70">
          <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
            <p className="text-xs uppercase tracking-[0.3em]">{t("marketplace_showcase_cart")}</p>
            <p className="text-lg font-semibold text-white">Edition #{carouselIndex + 48}</p>
            <p>{t("marketplace_showcase_reserved")}</p>
          </CardContent>
        </Card>
        <Card className="border border-border/40 bg-background/70">
          <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
            <p className="text-xs uppercase tracking-[0.3em]">{t("marketplace_showcase_inventory")}</p>
            <p className="text-lg font-semibold text-white">14 / 120 {t("marketplace_showcase_left")}</p>
            <p>{t("marketplace_showcase_hold")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
