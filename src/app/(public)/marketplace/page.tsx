import { getBackend } from "@/lib/backend";
import { MarketplaceClient } from "./MarketplaceClient";

interface MarketplaceProps {
  searchParams: {
    tag?: string;
    priceMin?: string;
    priceMax?: string;
  };
}

export default async function MarketplacePage({ searchParams }: MarketplaceProps) {
  const backend = getBackend();
  const artworks = await backend.marketplace.list({
    tag: searchParams.tag,
    priceMin: searchParams.priceMin ? Number(searchParams.priceMin) : undefined,
    priceMax: searchParams.priceMax ? Number(searchParams.priceMax) : undefined
  });

  const featuredTags = Array.from(new Set(artworks.flatMap((art) => art.tags))).slice(0, 8);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <MarketplaceClient artworks={artworks} featuredTags={featuredTags} />
    </div>
  );
}
