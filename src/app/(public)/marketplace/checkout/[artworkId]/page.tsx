import { notFound } from "next/navigation";
import { getBackend } from "@/lib/backend";
import { MarketplaceCheckoutClient } from "@/components/marketplace/MarketplaceCheckoutClient";

type CheckoutPageProps = {
  params: Promise<{ artworkId: string }>;
};

export default async function MarketplaceCheckoutPage({ params }: CheckoutPageProps) {
  const { artworkId } = await params;
  const backend = getBackend();
  const listings = await backend.marketplace.list({ tag: undefined, priceMin: undefined, priceMax: undefined });
  const artwork = listings.find((entry) => entry.artworkId === artworkId);
  if (!artwork) {
    notFound();
  }
  const seller = await backend.users.get(artwork.artistId);
  const sellerName = seller?.displayName ?? seller?.email ?? artwork.artistId;

  return (
    <main className="container mx-auto max-w-5xl px-4 py-10">
      <MarketplaceCheckoutClient artwork={artwork} sellerName={sellerName} />
    </main>
  );
}
