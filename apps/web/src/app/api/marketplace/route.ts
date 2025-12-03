import { NextResponse } from "next/server";
import { z } from "zod";
import { getBackend } from "@/lib/backend";
import { ArtworkSchema } from "@/lib/validation";

const listSchema = z.object({
  tag: z.string().optional(),
  priceMin: z.coerce.number().optional(),
  priceMax: z.coerce.number().optional()
});

export async function GET(request: Request) {
  const backend = getBackend();
  const url = new URL(request.url);
  const filters = listSchema.parse({
    tag: url.searchParams.get("tag") ?? undefined,
    priceMin: url.searchParams.get("priceMin") ?? undefined,
    priceMax: url.searchParams.get("priceMax") ?? undefined
  });
  const artworks = await backend.marketplace.list(filters);
  return NextResponse.json({ items: artworks });
}

export async function POST(request: Request) {
  const backend = getBackend();
  const payload = ArtworkSchema.partial({ artworkId: true }).parse(await request.json());
  const listing = await backend.marketplace.createListing({
    ...payload,
    artworkId: payload.artworkId ?? "",
    artistId: payload.artistId ?? "",
    createdAt: payload.createdAt ?? Date.now(),
    isSold: payload.isSold ?? false,
    status: payload.status ?? (payload.isSold ? "sold" : "listed"),
    currency: payload.currency ?? "usd",
    mediaUrls: payload.mediaUrls ?? [],
    tags: payload.tags ?? []
  });
  return NextResponse.json(listing, { status: 201 });
}
