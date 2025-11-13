"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarCard } from "@/components/AvatarCard";
import { ArtworkCard } from "@/components/ArtworkCard";
import { useI18n } from "@/context/i18n";
import { useSessionState } from "@/context/session";
import { getBackend } from "@/lib/backend";
import type { Artwork, User } from "@/lib/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function Home() {
  const { t } = useI18n();
  const sessionUser = useSessionState((state) => state.user);

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
        if (active) setCreativeError("Unable to load member profiles right now.");
      } finally {
        if (active) setCreativesLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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
        if (active) setListingError("Unable to load marketplace listings right now.");
      } finally {
        if (active) setListingsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col gap-16 px-6 py-12">
      <header className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-border/30 px-4 py-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          <Sparkles size={12} /> AI-matched network for creatives
        </div>
        <h1 className="max-w-4xl text-balance font-[family-name:var(--font-display)] text-4xl font-bold leading-tight sm:text-5xl">
          {t("hero_title")}
        </h1>
        <p className="max-w-3xl text-lg text-muted-foreground">{t("hero_subtitle")}</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {sessionUser ? (
            <Button disabled className="cursor-not-allowed opacity-60">
              {t("cta_join")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button asChild>
              <Link href="/signup">
                {t("cta_join")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/hub-map">
              <MapPin className="mr-2 h-4 w-4" />
              {t("cta_explore")}
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-6 md:grid-cols-[1.5fr_1fr]">
        <Card className="bg-card/70">
          <CardContent className="grid gap-4 p-6">
            <h2 className="text-xl font-semibold text-white">Core flows in one dashboard</h2>
            <ul className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
              <li>�o. Verified profiles & portfolios</li>
              <li>�o. Mapbox-powered hub map</li>
              <li>�o. AI smart matching with Genkit stubs</li>
              <li>�o. Stripe-ready marketplace</li>
              <li>�o. Real-time messaging scaffolding</li>
              <li>�o. Events, rewards, and admin queues</li>
            </ul>
            <Button variant="ghost" className="w-fit" asChild>
              <Link href="/matcher">
                See the matcher flow
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/70">
          <CardContent className="flex h-full flex-col justify-between p-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Live presence</h3>
              <p className="text-sm text-muted-foreground">
                Check-ins update within seconds across hubs and reward members for showing up.
              </p>
            </div>
            <Button variant="outline" asChild className="mt-6">
              <Link href="/rewards">Review rewards</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">{t("profiles_section_heading")}</h2>
          <Button variant="link" asChild>
            <Link href="/profiles">{t("profiles_view_all")}</Link>
          </Button>
        </div>
        <div className="flex min-h-[180px] flex-wrap gap-6">
          {creativesLoading && <p className="text-sm text-muted-foreground">Loading verified creatives...</p>}
          {!creativesLoading && creativeError && <p className="text-sm text-destructive">{creativeError}</p>}
          {!creativesLoading && !creativeError && creatives.length === 0 && (
            <p className="text-sm text-muted-foreground">No member profiles are live yet.</p>
          )}
          {!creativesLoading &&
            !creativeError &&
            creatives.map((user) => <AvatarCard key={user.userId} user={user} />)}
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">{t("nav_marketplace")}</h2>
          <Button variant="link" asChild>
            <Link href="/marketplace">Browse marketplace</Link>
          </Button>
        </div>
        <div className="grid min-h-[220px] gap-6 md:grid-cols-3">
          {listingsLoading && <p className="text-sm text-muted-foreground">Loading marketplace listings...</p>}
          {!listingsLoading && listingError && <p className="text-sm text-destructive">{listingError}</p>}
          {!listingsLoading && !listingError && listings.length === 0 && (
            <p className="text-sm text-muted-foreground">No marketplace drops have been published yet.</p>
          )}
          {!listingsLoading &&
            !listingError &&
            listings.map((artwork) => <ArtworkCard key={artwork.artworkId} artwork={artwork} />)}
        </div>
      </section>
    </div>
  );
}
