"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeDollarSign, Boxes, CreditCard, Gift, ShoppingBag, Sparkles, Star } from "lucide-react";
import { useSessionState } from "@/context/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const dropTabs = [
  {
    id: "digital",
    title: "Digital drop",
    subtitle: "Smart contracts",
    price: "2.4 ETH",
    perks: ["Chain-proof provenance", "Collector packs", "Unlockable files"],
    color: "from-emerald-400/40 to-transparent"
  },
  {
    id: "physical",
    title: "Physical drop",
    subtitle: "Made-to-order",
    price: "$3,800",
    perks: ["2-week lead", "Insured shipping", "Split payouts"],
    color: "from-amber-400/40 to-transparent"
  }
] as const;

const logisticsHighlights = [
  {
    icon: ShoppingBag,
    title: "One-click checkout",
    copy: "Stripe-native checkout flows branded to your hub aesthetic."
  },
  {
    icon: CreditCard,
    title: "Split payouts",
    copy: "Creator, curator, and hub splits run automatically."
  },
  {
    icon: Boxes,
    title: "Inventory sync",
    copy: "Realtime counts keep drops scarce but fair across audiences."
  }
];

const proof = [
  { label: "GMV ready", value: "$8.2M", detail: "annualized" },
  { label: "Average checkout", value: "58s", detail: "mobile" },
  { label: "Creator revenue", value: "72%", detail: "of GMV" }
];

const carouselCreators = [
  "Neo Atelier",
  "Studio Prism",
  "PolyChroma",
  "Sundial",
  "Amber Lane",
  "Constellation"
];

export default function MarketplaceLandingPage() {
  const sessionUser = useSessionState((state) => state.user);
  const [activeDrop, setActiveDrop] = useState<(typeof dropTabs)[number]["id"]>("digital");
  const [carouselIndex, setCarouselIndex] = useState(0);

  const drop = useMemo(() => dropTabs.find((item) => item.id === activeDrop) ?? dropTabs[0], [activeDrop]);
  const primaryCtaHref = sessionUser ? "/marketplace/workspace" : "/signup";
  const primaryCtaLabel = sessionUser ? "Open marketplace" : "Launch drops";

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % carouselCreators.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-gradient-to-b from-accent/30 via-transparent to-transparent blur-3xl" />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-border/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <Sparkles className="h-4 w-4" /> Marketplace
            </div>
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit bg-accent/20 text-accent">
                Drop gallery preview
              </Badge>
              <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl font-semibold text-white sm:text-5xl">
                Put every curated drop on a shareable landing
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                Showcase digital and physical inventory, price logic, and fulfillment guardrails before granting sellers
                access to the live marketplace console.
              </p>
            </div>
            <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-border/20 p-2 text-sm text-muted-foreground">
              {dropTabs.map((tab) => (
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
                <Link href="/marketplace/workspace">Preview commerce hub</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {proof.map((item) => (
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
          <DropShowcase drop={drop} carouselIndex={carouselIndex} />
        </div>

        <section className="grid gap-6 md:grid-cols-3">
          {logisticsHighlights.map((highlight) => (
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
              Merch flow
            </Badge>
            <h2 className="text-3xl font-semibold text-white">Win trust before the first cart goes live</h2>
            <p className="text-base text-muted-foreground">
              The landing walks through payouts, security holds, and product tiers so your marketplace looks buttoned up
              even before launch.
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <BadgeDollarSign className="h-4 w-4 text-emerald-400" /> Escrow + release schedules
              </li>
              <li className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-amber-300" /> Loyalty perks per cohort
              </li>
              <li className="flex items-center gap-2">
                <Star className="h-4 w-4 text-violet-300" /> Editorial slots for hero drops
              </li>
            </ul>
          </div>
          <Card className="border border-border/40 bg-background/80">
            <CardContent className="space-y-4 p-6">
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Creator marquee</p>
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
              <p className="text-sm text-muted-foreground">
                Pin top creators, show payout splits, and display waitlists before they enter the live dashboard.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-3xl border border-border/50 bg-gradient-to-br from-border/40 via-background to-background p-8 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Commerce preview</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Turn this link into your marketplace teaser</h2>
          <p className="mt-2 text-base text-muted-foreground">
            When sellers want the deeper tooling, route them straight into the fully authenticated workspace.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href={primaryCtaHref}>
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/marketplace/workspace">Enter live marketplace</Link>
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}

const DropShowcase = ({
  drop,
  carouselIndex
}: {
  drop: (typeof dropTabs)[number];
  carouselIndex: number;
}) => {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
      <div className={cn("rounded-2xl border border-border/40 bg-gradient-to-br p-6", drop.color)}>
        <p className="text-xs uppercase tracking-[0.3em] text-white/80">{drop.subtitle}</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">{drop.title}</h3>
        <p className="mt-1 text-sm text-white/70">Starting at {drop.price}</p>
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
            <p className="text-xs uppercase tracking-[0.3em]">Cart preview</p>
            <p className="text-lg font-semibold text-white">Edition #{carouselIndex + 48}</p>
            <p>Reserved for Neo Atelier collectors</p>
          </CardContent>
        </Card>
        <Card className="border border-border/40 bg-background/70">
          <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
            <p className="text-xs uppercase tracking-[0.3em]">Inventory</p>
            <p className="text-lg font-semibold text-white">14 / 120 left</p>
            <p>Soft hold expires in 06:00</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
