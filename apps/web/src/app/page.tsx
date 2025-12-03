"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Crown,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Sparkles,
  Store,
  Users,
  Workflow
} from "lucide-react";
import { UiButton } from "@spheresconnect/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarCard } from "@/components/AvatarCard";
import { ArtworkCard } from "@/components/ArtworkCard";
import { useI18n } from "@/context/i18n";
import { useSessionState } from "@/context/session";
import { getBackend } from "@/lib/backend";
import type { Artwork, User } from "@/lib/types";
import { cn } from "@/lib/utils";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function Home() {
  const { t } = useI18n();
  const sessionUser = useSessionState((state) => state.user);
  const router = useRouter();

  const [creatives, setCreatives] = useState<User[]>([]);
  const [creativesLoading, setCreativesLoading] = useState(true);
  const [creativeError, setCreativeError] = useState<string | null>(null);

  const [listings, setListings] = useState<Artwork[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingError, setListingError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const backend = getBackend();
        const users = await backend.users.list({});
        if (!active) return;
        const curated = users
          .filter((user) => UUID_PATTERN.test(user.userId))
          .sort((a, b) => b.joinedAt - a.joinedAt)
          .slice(0, 3);
        setCreatives(curated);
      } catch (error) {
        console.error("[home] failed to load creatives", error);
        if (active) setCreativeError(t("profiles_error"));
      } finally {
        if (active) setCreativesLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const backend = getBackend();
        const artworkEntries = await backend.marketplace.list({});
        if (!active) return;
        const curated = artworkEntries
          .filter((artwork) => UUID_PATTERN.test(artwork.artworkId))
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 3);
        setListings(curated);
      } catch (error) {
        console.error("[home] failed to load listings", error);
        if (active) setListingError(t("marketplace_error_loading"));
      } finally {
        if (active) setListingsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [t]);

  const heroFlows = useMemo(
    () => [
      {
        id: "network",
        kicker: t("home_flow_network_kicker"),
        title: t("home_flow_network_title"),
        description: t("home_flow_network_description"),
        ctaLabel: sessionUser ? t("home_flow_network_cta_authed") : t("home_flow_network_cta_guest"),
        primaryHref: sessionUser ? "/profiles/workspace" : "/signup",
        secondaryHref: "/hub-map",
        stats: [{ label: t("home_flow_network_stat_label"), value: "2,941" }]
      },
      {
        id: "ops",
        kicker: t("home_flow_ops_kicker"),
        title: t("home_flow_ops_title"),
        description: t("home_flow_ops_description"),
        ctaLabel: sessionUser ? t("home_flow_ops_cta_authed") : t("home_flow_ops_cta_guest"),
        primaryHref: sessionUser ? "/productivity/workspace" : "/productivity",
        secondaryHref: "/events",
        stats: [{ label: t("home_flow_ops_stat_label"), value: "146" }]
      }
    ],
    [sessionUser, t]
  );

  const [activeFlowId, setActiveFlowId] = useState(heroFlows[0]?.id ?? "network");
  const activeFlow = heroFlows.find((flow) => flow.id === activeFlowId) ?? heroFlows[0];

  const landingRoutes = useMemo(
    () => [
      {
        title: t("home_routes_productivity_title"),
        copy: t("home_routes_productivity_copy"),
        href: "/productivity",
        icon: Workflow
      },
      {
        title: t("home_routes_matcher_title"),
        copy: t("home_routes_matcher_copy"),
        href: "/matcher",
        icon: Users
      },
      {
        title: t("home_routes_marketplace_title"),
        copy: t("home_routes_marketplace_copy"),
        href: "/marketplace",
        icon: Store
      },
      {
        title: t("home_routes_profiles_title"),
        copy: t("home_routes_profiles_copy"),
        href: "/profiles",
        icon: LayoutDashboard
      },
      {
        title: t("home_routes_messages_title"),
        copy: t("home_routes_messages_copy"),
        href: "/messages",
        icon: MessageSquare
      },
      {
        title: t("home_routes_rewards_title"),
        copy: t("home_routes_rewards_copy"),
        href: "/rewards",
        icon: Crown
      }
    ],
    [t]
  );

  return (
    <div className="flex min-h-screen flex-col gap-16 px-6 py-12">
      <header className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col gap-6 text-left">
          <div className="inline-flex w-full items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-border/30 px-4 py-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <Sparkles size={12} /> {t("home_tagline")}
            </div>
            <div className="inline-flex rounded-full border border-border/50 bg-border/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {activeFlow.kicker}
            </div>
          </div>
          <h1 className="max-w-3xl text-balance font-[family-name:var(--font-display)] text-4xl font-bold leading-tight sm:text-5xl">
            {activeFlow.title}
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">{activeFlow.description}</p>
          <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-border/20 p-2 text-sm text-muted-foreground">
            {heroFlows.map((flow) => (
              <button
                key={flow.id}
                type="button"
                className={cn(
                  "rounded-xl px-3 py-2 font-semibold transition",
                  activeFlowId === flow.id ? "bg-background/80 text-white" : "hover:text-white"
                )}
                onClick={() => setActiveFlowId(flow.id)}
              >
                {flow.kicker}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <UiButton
              type="button"
              className="gap-2 px-6 py-3 text-base font-semibold"
              onClick={() => router.push(activeFlow.primaryHref)}
            >
              {activeFlow.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </UiButton>
            <Button variant="outline" asChild size="lg">
              <Link href={activeFlow.secondaryHref}>
                {t("cta_explore")}
                <MapPin className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="rounded-2xl border border-border/50 bg-border/20 px-4 py-3 text-sm text-muted-foreground">
            {activeFlow.stats.map((stat) => (
              <span key={stat.label} className="mr-4 inline-flex items-center gap-2 text-white">
                <span className="text-lg font-semibold">{stat.value}</span>
                <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{stat.label}</span>
              </span>
            ))}
          </div>
        </div>
        <LandingRouteGrid routes={landingRoutes} />
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("home_creatives_badge")}</p>
            <h2 className="text-3xl font-semibold text-white">{t("profiles_section_heading")}</h2>
          </div>
          <Button variant="link" asChild>
            <Link href="/profiles">{t("home_creatives_link")}</Link>
          </Button>
        </div>
        <div className="flex min-h-[200px] flex-wrap gap-6">
          {creativesLoading && <p className="text-sm text-muted-foreground">{t("home_creatives_loading")}</p>}
          {!creativesLoading && creativeError && <p className="text-sm text-destructive">{creativeError}</p>}
          {!creativesLoading && !creativeError && creatives.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("home_creatives_empty")}</p>
          )}
          {!creativesLoading &&
            !creativeError &&
            creatives.map((user) => <AvatarCard key={user.userId} user={user} />)}
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("home_marketplace_badge")}</p>
            <h2 className="text-3xl font-semibold text-white">{t("nav_marketplace")}</h2>
          </div>
          <Button variant="link" asChild>
            <Link href="/marketplace">{t("home_marketplace_link")}</Link>
          </Button>
        </div>
        <div className="grid min-h-[220px] gap-6 md:grid-cols-3">
          {listingsLoading && <p className="text-sm text-muted-foreground">{t("home_marketplace_loading")}</p>}
          {!listingsLoading && listingError && <p className="text-sm text-destructive">{listingError}</p>}
          {!listingsLoading && !listingError && listings.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("home_marketplace_empty")}</p>
          )}
          {!listingsLoading &&
            !listingError &&
            listings.map((artwork) => <ArtworkCard key={artwork.artworkId} artwork={artwork} />)}
        </div>
      </section>

        <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 rounded-3xl border border-border/60 bg-card/40 p-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("home_launch_badge")}</p>
        <h2 className="text-3xl font-semibold text-white">{t("home_launch_title")}</h2>
        <p className="text-base text-muted-foreground">{t("home_launch_body")}</p>
        <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="gap-2">
            <Link href={sessionUser ? "/productivity/workspace" : "/signup"}>
              {sessionUser ? t("home_launch_primary_authed") : t("home_launch_primary_guest")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/productivity">{t("home_launch_secondary")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

const LandingRouteGrid = ({
  routes
}: {
  routes: {
    title: string;
    copy: string;
    href: string;
    icon: typeof Workflow;
  }[];
}) => {
  const { t } = useI18n();
  return (
  <div className="grid gap-4 rounded-3xl border border-border/60 bg-card/70 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] md:grid-cols-2">
    {routes.map((route) => (
      <Card
        key={route.href}
        className="border border-border/40 bg-background/80 transition duration-300 hover:-translate-y-1 hover:border-accent"
      >
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center gap-3">
            <route.icon className="h-6 w-6 text-accent" />
            <p className="text-lg font-semibold text-white">{route.title}</p>
          </div>
          <p className="text-sm text-muted-foreground">{route.copy}</p>
          <Button asChild variant="ghost" className="justify-start gap-2 px-0 text-sm text-accent">
            <Link href={route.href}>
              {t("home_routes_cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    ))}
  </div>
  );
};
