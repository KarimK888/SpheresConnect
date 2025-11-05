"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArtworkCard } from "@/components/ArtworkCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/context/i18n";
import type { Artwork } from "@/lib/types";

interface MarketplaceClientProps {
  artworks: Artwork[];
  featuredTags: string[];
}

export const MarketplaceClient = ({ artworks, featuredTags }: MarketplaceClientProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [priceRange, setPriceRange] = useState(() => ({
    min: Number(searchParams.get("priceMin") ?? 0),
    max: Number(searchParams.get("priceMax") ?? 100000)
  }));

  const selectedTag = searchParams.get("tag") ?? "";

  const filtered = useMemo(() => {
    return artworks.filter((artwork) => {
      const price = artwork.price / 100;
      const withinRange = price >= priceRange.min && price <= priceRange.max;
      const matchesTag = selectedTag ? artwork.tags.includes(selectedTag) : true;
      return withinRange && matchesTag;
    });
  }, [artworks, priceRange, selectedTag]);

  const updateParams = (params: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });
    startTransition(() => {
      router.replace(`?${next.toString()}`);
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="flex flex-col gap-6">
        <Card className="border-border/60 bg-card/80 p-6">
          <h2 className="text-sm font-semibold text-white">{t("marketplace_filter_tag_title")}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge
              variant={selectedTag ? "outline" : "default"}
              className="cursor-pointer"
              onClick={() => updateParams({ tag: undefined })}
            >
              {t("generic_all")}
            </Badge>
            {featuredTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTag === tag ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => updateParams({ tag })}
              >
                #{tag}
              </Badge>
            ))}
          </div>
        </Card>

        <Card className="border-border/60 bg-card/80 p-6">
          <h2 className="text-sm font-semibold text-white">{t("marketplace_price_title")}</h2>
          <div className="mt-4 space-y-4 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>${priceRange.min}</span>
              <span>${priceRange.max}</span>
            </div>
            <input
              type="range"
              min={0}
              max={5000}
              step={50}
              value={priceRange.min}
              onChange={(event) => setPriceRange((range) => ({ ...range, min: Number(event.target.value) }))}
              className="w-full accent-primary"
            />
            <input
              type="range"
              min={priceRange.min}
              max={8000}
              step={50}
              value={priceRange.max}
              onChange={(event) => setPriceRange((range) => ({ ...range, max: Number(event.target.value) }))}
              className="w-full accent-accent"
            />
            <Button
              variant="outline"
              className="w-full"
              disabled={isPending}
              onClick={() =>
                updateParams({
                  priceMin: Math.round(priceRange.min * 100),
                  priceMax: Math.round(priceRange.max * 100)
                })
              }
            >
              {t("generic_apply")}
            </Button>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/80 p-6 text-sm text-muted-foreground">
          <h2 className="text-sm font-semibold text-white">{t("marketplace_seller_tips_title")}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-4">
            <li>{t("marketplace_seller_tip_one")}</li>
            <li>{t("marketplace_seller_tip_two")}</li>
            <li>{t("marketplace_seller_tip_three")}</li>
          </ul>
        </Card>
      </aside>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">{t("marketplace_heading")}</h1>
            <p className="text-sm text-muted-foreground">{t("marketplace_subheading")}</p>
          </div>
          <Button variant="accent" asChild>
            <Link href="/marketplace/dashboard">{t("marketplace_open_dashboard")}</Link>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((artwork) => (
            <ArtworkCard key={artwork.artworkId} artwork={artwork} />
          ))}
          {filtered.length === 0 && (
            <Card className="border-dashed bg-border/10 p-6 text-sm text-muted-foreground">
              {t("marketplace_empty")}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
