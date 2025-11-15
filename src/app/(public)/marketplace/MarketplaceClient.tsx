"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Sparkles, Search, PlusCircle, XCircle, Trash2 } from "lucide-react";
import { ArtworkCard } from "@/components/ArtworkCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/context/i18n";
import { useSessionState } from "@/context/session";
import { getBackend } from "@/lib/backend";
import { uploadFileToTarget } from "@/lib/upload-client";
import type { Artwork } from "@/lib/types";

const DEFAULT_PRICE_RANGE = { min: 0, max: 8000 };
const INITIAL_FORM = { title: "", description: "", price: "", tags: "", imageUrl: "" };

const createListingId = () => {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `listing_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
};

export const MarketplaceClient = () => {
  const { t } = useI18n();
  const sessionUser = useSessionState((state) => state.user);
  const sessionLoading = useSessionState((state) => state.loading);

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Artwork["status"]>("all");
  const [priceRange, setPriceRange] = useState(DEFAULT_PRICE_RANGE);
  const [formOpen, setFormOpen] = useState(false);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState(INITIAL_FORM);
  const [uploading, setUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [detail, setDetail] = useState<Artwork | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [artistDirectory, setArtistDirectory] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fetchedArtistIds = useRef(new Set<string>());

  const featuredTags = useMemo(() => {
    const tally = new Map<string, number>();
    artworks.forEach((art) => {
      art.tags.forEach((tag) => {
        if (!tag) return;
        tally.set(tag, (tally.get(tag) ?? 0) + 1);
      });
    });
    return Array.from(tally.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
      .slice(0, 12);
  }, [artworks]);

  const filteredArtworks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return artworks.filter((art) => {
      const price = art.price / 100;
      const matchesPrice = price >= priceRange.min && price <= priceRange.max;
      const matchesTag = selectedTag ? art.tags.includes(selectedTag) : true;
      const matchesStatus = statusFilter === "all" ? true : art.status === statusFilter;
      const matchesQuery = query
        ? art.title.toLowerCase().includes(query) ||
          art.description?.toLowerCase().includes(query) ||
          art.tags.some((tag) => tag.toLowerCase().includes(query))
        : true;
      return matchesPrice && matchesTag && matchesStatus && matchesQuery;
    });
  }, [artworks, priceRange, selectedTag, statusFilter, search]);

  const ensureArtistDirectory = useCallback(
    async (items: Artwork[]) => {
      if (!items.length) return;
      const uniqueIds = Array.from(new Set(items.map((art) => art.artistId))).filter(
        (artistId) => !fetchedArtistIds.current.has(artistId)
      );
      if (!uniqueIds.length) return;
      uniqueIds.forEach((id) => fetchedArtistIds.current.add(id));
      try {
        const backend = getBackend();
        const entries = await Promise.all(
          uniqueIds.map(async (artistId) => {
            try {
              const user = await backend.users.get(artistId);
              return { artistId, displayName: user?.displayName ?? artistId };
            } catch (error) {
              console.warn("[marketplace] failed to load artist profile", artistId, error);
              return { artistId, displayName: artistId };
            }
          })
        );
        setArtistDirectory((prev) => {
          const next = { ...prev };
          entries.forEach(({ artistId, displayName }) => {
            next[artistId] = displayName;
          });
          return next;
        });
      } catch (error) {
        console.warn("[marketplace] ensureArtistDirectory failed", error);
      }
    },
    []
  );

  const loadArtworks = useCallback(async () => {
    if (!sessionUser) return;
    setLoading(true);
    setError(null);
    try {
      const backend = getBackend();
      const items = await backend.marketplace.list({});
      setArtworks(items);
      void ensureArtistDirectory(items);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("marketplace_error_loading");
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [sessionUser, t, ensureArtistDirectory]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!sessionUser) {
      setLoading(false);
      setArtworks([]);
      return;
    }
    void loadArtworks();
  }, [sessionLoading, sessionUser, loadArtworks]);

  useEffect(() => {
    return () => {
      if (filePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  useEffect(() => {
    if (!sessionUser) return;
    setArtistDirectory((prev) => {
      if (prev[sessionUser.userId]) return prev;
      return { ...prev, [sessionUser.userId]: sessionUser.displayName };
    });
    fetchedArtistIds.current.add(sessionUser.userId);
  }, [sessionUser]);

  const resolveOwnerName = useCallback(
    (art: Artwork) =>
      artistDirectory[art.artistId] ??
      (art.artistId === sessionUser?.userId ? sessionUser.displayName : art.artistId),
    [artistDirectory, sessionUser]
  );

  useEffect(() => {
    if (!detail) return;
    void ensureArtistDirectory([detail]);
  }, [detail, ensureArtistDirectory]);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const updatePreview = (source: string, revokePrevious = true) => {
    setFilePreview((prev) => {
      if (revokePrevious && prev?.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return source;
    });
  };

  const handleMediaUpload = async (file: File) => {
    setMediaError(null);
    setUploading(true);
    try {
      const backend = getBackend();
      const extension = file.name.split(".").pop() ?? "jpg";
      const target = await backend.uploads.createSignedUrl({
        mimeType: file.type || "application/octet-stream",
        extension
      });
      const response = await uploadFileToTarget(file, target);
      if (!response.ok) {
        throw new Error("upload_failed");
      }
      const blobUrl = URL.createObjectURL(file);
      updatePreview(blobUrl);
      setFormValues((prev) => ({ ...prev, imageUrl: target.fileUrl }));
    } catch (err) {
      console.warn("[marketplace] upload failed, falling back to data URL", err);
      try {
        const dataUrl = await readFileAsDataUrl(file);
        updatePreview(dataUrl, false);
        setFormValues((prev) => ({ ...prev, imageUrl: dataUrl }));
        setMediaError(null);
      } catch (readerError) {
        console.error("[marketplace] unable to read file", readerError);
        setMediaError(t("marketplace_upload_error"));
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleMediaUpload(file);
    event.target.value = "";
  };

  const handleCreateListing = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!sessionUser) return;
    if (!formValues.title.trim() || !formValues.price.trim() || !formValues.imageUrl.trim()) {
      setFormError(t("marketplace_form_error_required"));
      return;
    }
    const priceNumber = Number(formValues.price);
    if (Number.isNaN(priceNumber) || priceNumber <= 0) {
      setFormError(t("marketplace_form_error_price"));
      return;
    }
    setFormBusy(true);
    setFormError(null);
    try {
      const backend = getBackend();
      const listing = await backend.marketplace.createListing({
        artworkId: createListingId(),
        artistId: sessionUser.userId,
        title: formValues.title.trim(),
        description: formValues.description.trim() || undefined,
        mediaUrls: [formValues.imageUrl.trim()],
        price: Math.round(priceNumber * 100),
        currency: "usd",
        tags: formValues.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        createdAt: Date.now(),
        isSold: false,
        status: "listed"
      });
      setArtworks((prev) => [listing, ...prev]);
      setArtistDirectory((prev) => ({
        ...prev,
        [sessionUser.userId]: sessionUser.displayName
      }));
      setDetail(listing);
      setFormValues(INITIAL_FORM);
      setFilePreview((prev) => {
        if (prev?.startsWith("blob:")) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      setFormOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("marketplace_error_loading");
      setFormError(message);
    } finally {
      setFormBusy(false);
    }
  };

  const handleStatusChange = async (target: Artwork, status: Artwork["status"]) => {
    setStatusBusy(true);
    try {
      const backend = getBackend();
      const updated = await backend.marketplace.updateStatus({
        artworkId: target.artworkId,
        status
      });
      setArtworks((prev) => prev.map((art) => (art.artworkId === updated.artworkId ? updated : art)));
      setDetail((current) => (current && current.artworkId === updated.artworkId ? updated : current));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("marketplace_error_loading");
      setError(message);
    } finally {
      setStatusBusy(false);
    }
  };

  const handleDelete = async (target: Artwork) => {
    setDeleteBusy(true);
    try {
      const backend = getBackend();
      await backend.marketplace.removeListing({ artworkId: target.artworkId });
      setArtworks((prev) => prev.filter((art) => art.artworkId !== target.artworkId));
      setDetail((current) => (current && current.artworkId === target.artworkId ? null : current));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("marketplace_error_loading");
      setError(message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedTag("");
    setStatusFilter("all");
    setPriceRange(DEFAULT_PRICE_RANGE);
  };

  if (sessionLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-3xl bg-border/20" />
        <div className="h-64 animate-pulse rounded-3xl bg-border/20" />
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <Card className="flex flex-col items-center gap-4 border-border/60 bg-card/70 px-8 py-16 text-center">
        <Sparkles className="h-8 w-8 text-accent" />
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">{t("marketplace_gate_heading")}</h1>
          <p className="text-sm text-muted-foreground">{t("marketplace_gate_body")}</p>
        </div>
        <Button size="lg" asChild>
          <Link href="/login?redirect=/marketplace">{t("marketplace_cta_sign_in")}</Link>
        </Button>
      </Card>
    );
  }

  const resultLabel = t("marketplace_results").replace("{count}", String(filteredArtworks.length));
  const statusFilters = [
    { label: t("generic_all"), value: "all" as const },
    { label: t("marketplace_status_listed"), value: "listed" as const },
    { label: t("marketplace_status_negotiation"), value: "negotiation" as const },
    { label: t("marketplace_status_sold"), value: "sold" as const }
  ];

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-border/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          <Sparkles className="h-4 w-4 text-accent" />
          {t("nav_marketplace")}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white">{t("marketplace_heading")}</h1>
            <p className="text-sm text-muted-foreground">{t("marketplace_subheading")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={loadArtworks} disabled={loading}>
              {loading ? t("generic_loading") : t("generic_refresh")}
            </Button>
            <Button variant="accent" onClick={() => setFormOpen((open) => !open)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t("marketplace_new_listing")}
            </Button>
          </div>
        </div>
      </header>

      {error && (
        <Card className="border-destructive/60 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </Card>
      )}

      {formOpen && (
        <Card className="border-border/60 bg-card/80 p-6">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateListing}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">{t("marketplace_field_title")}</label>
              <Input
                value={formValues.title}
                onChange={(event) => setFormValues((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">{t("marketplace_field_price")}</label>
              <Input
                type="number"
                min="1"
                step="1"
                value={formValues.price}
                onChange={(event) => setFormValues((prev) => ({ ...prev, price: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">{t("marketplace_field_tags")}</label>
              <Input
                value={formValues.tags}
                onChange={(event) => setFormValues((prev) => ({ ...prev, tags: event.target.value }))}
                placeholder="painting, portrait"
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium text-white">{t("marketplace_field_media")}</label>
              <Input
                type="url"
                placeholder="https://"
                value={formValues.imageUrl}
                onChange={(event) => setFormValues((prev) => ({ ...prev, imageUrl: event.target.value }))}
                required
              />
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? t("marketplace_uploading") : t("marketplace_field_media_upload")}
                </Button>
                <span className="text-xs text-muted-foreground">{t("marketplace_field_media_helper")}</span>
              </div>
              {(filePreview || formValues.imageUrl) && (
                <div className="overflow-hidden rounded-xl border border-border/40">
                  <Image
                    src={filePreview ?? formValues.imageUrl}
                    alt={formValues.title || "Preview"}
                    width={480}
                    height={320}
                    className="h-48 w-full object-cover"
                    unoptimized
                  />
                </div>
              )}
              {mediaError && <p className="text-xs text-destructive">{mediaError}</p>}
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-white">{t("marketplace_field_description")}</label>
              <Textarea
                rows={4}
                value={formValues.description}
                onChange={(event) => setFormValues((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
            {formError && (
              <p className="md:col-span-2 text-sm text-destructive">{formError}</p>
            )}
            <div className="md:col-span-2 flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setFormOpen(false);
                  setFormError(null);
                  setFormValues(INITIAL_FORM);
                }}
              >
                {t("marketplace_listings_cancel")}
              </Button>
              <Button type="submit" disabled={formBusy}>
                {formBusy ? t("generic_loading") : t("marketplace_listings_submit")}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <section className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="flex flex-col gap-6">
          <Card className="border-border/60 bg-card/80 p-6 space-y-4">
            <label className="text-sm font-semibold text-white" htmlFor="marketplace-search">
              {t("marketplace_search_placeholder")}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="marketplace-search"
                className="pl-9"
                placeholder={t("marketplace_search_placeholder")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </Card>

          <Card className="border-border/60 bg-card/80 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">{t("marketplace_filter_tag_title")}</h2>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={selectedTag ? "outline" : "default"}
                className="cursor-pointer"
                onClick={() => setSelectedTag("")}
              >
                {t("generic_all")}
              </Badge>
              {featuredTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedTag((current) => (current === tag ? "" : tag))}
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          </Card>

          <Card className="border-border/60 bg-card/80 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">{t("marketplace_filter_status_title")}</h2>
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((option) => (
                <Badge
                  key={option.value}
                  variant={statusFilter === option.value ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setStatusFilter(option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </Card>

          <Card className="border-border/60 bg-card/80 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">{t("marketplace_price_title")}</h2>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>${priceRange.min}</span>
              <span>${priceRange.max}</span>
            </div>
            <input
              type="range"
              min={0}
              max={8000}
              step={50}
              value={priceRange.min}
              onChange={(event) => setPriceRange((prev) => ({ ...prev, min: Number(event.target.value) }))}
              className="w-full accent-primary"
            />
            <input
              type="range"
              min={priceRange.min}
              max={10000}
              step={50}
              value={priceRange.max}
              onChange={(event) => setPriceRange((prev) => ({ ...prev, max: Number(event.target.value) }))}
              className="w-full accent-accent"
            />
          </Card>

          <Button variant="ghost" onClick={resetFilters}>
            {t("marketplace_filter_clear")}
          </Button>
        </aside>

        <div className="space-y-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{resultLabel}</span>
            {loading && <span className="animate-pulse">{t("generic_loading")}</span>}
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredArtworks.map((artwork) => (
              <ArtworkCard
                key={artwork.artworkId}
                artwork={artwork}
                onSelect={setDetail}
                onAction={() => setDetail(artwork)}
                actionLabel={t("marketplace_detail_heading")}
              />
            ))}
            {!filteredArtworks.length && (
              <Card className="border-dashed border-border/60 bg-border/10 p-6 text-sm text-muted-foreground">
                {t("marketplace_empty")}
              </Card>
            )}
          </div>
        </div>
      </section>
      {detail && (
        <ListingDetailOverlay
          artwork={detail}
          sessionUserId={sessionUser.userId}
          ownerName={resolveOwnerName(detail)}
          onClose={() => setDetail(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          statusBusy={statusBusy}
          deleteBusy={deleteBusy}
        />
      )}
    </div>
  );
};

interface ListingDetailOverlayProps {
  artwork: Artwork;
  sessionUserId: string;
  ownerName: string;
  onClose: () => void;
  onStatusChange: (artwork: Artwork, status: Artwork["status"]) => void;
  onDelete: (artwork: Artwork) => void;
  statusBusy: boolean;
  deleteBusy: boolean;
}

const ListingDetailOverlay = ({
  artwork,
  sessionUserId,
  ownerName,
  onClose,
  onStatusChange,
  onDelete,
  statusBusy,
  deleteBusy
}: ListingDetailOverlayProps) => {
  const { t } = useI18n();
  const router = useRouter();
  const isOwner = artwork.artistId === sessionUserId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <Card
        className="relative z-10 max-h-[90vh] w-full max-w-5xl overflow-y-auto border-border/80 bg-background/95 p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("marketplace_detail_heading")}</p>
            <h2 className="text-2xl font-semibold text-white">{artwork.title}</h2>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <XCircle className="mr-2 h-4 w-4" />
            {t("marketplace_detail_close")}
          </Button>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black/20">
              <Image
                src={artwork.mediaUrls[0] ?? "https://placehold.co/800x600?text=Artwork"}
                alt={artwork.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <p className="text-sm text-muted-foreground">{artwork.description ?? t("marketplace_detail_description")}</p>
            <div className="flex flex-wrap gap-2">
              {artwork.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-5 rounded-2xl border border-border/60 bg-background/40 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("marketplace_detail_price")}</p>
              <p className="text-3xl font-semibold text-white">
                {(artwork.price / 100).toLocaleString(undefined, {
                  style: "currency",
                  currency: artwork.currency.toUpperCase()
                })}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("marketplace_detail_status")}</p>
              <p className="text-base font-medium text-white">{t(`marketplace_status_${artwork.status}`)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("marketplace_detail_owner")}</p>
              <p className="text-base font-medium text-white">{ownerName}</p>
            </div>
            {isOwner ? (
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  {t("marketplace_detail_owner_actions")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={artwork.status === "listed" ? "default" : "outline"}
                    disabled={statusBusy}
                    onClick={() => onStatusChange(artwork, "listed")}
                  >
                    {t("marketplace_status_action_listed")}
                  </Button>
                  <Button
                    size="sm"
                    variant={artwork.status === "negotiation" ? "default" : "outline"}
                    disabled={statusBusy}
                    onClick={() => onStatusChange(artwork, "negotiation")}
                  >
                    {t("marketplace_status_action_negotiation")}
                  </Button>
                  <Button
                    size="sm"
                    variant={artwork.status === "sold" ? "default" : "outline"}
                    disabled={statusBusy}
                    onClick={() => onStatusChange(artwork, "sold")}
                  >
                    {t("marketplace_status_action_sold")}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-destructive text-destructive hover:bg-destructive/10"
                  disabled={deleteBusy}
                  onClick={() => onDelete(artwork)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteBusy ? t("generic_loading") : t("marketplace_detail_delete")}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {artwork.status === "sold" ? (
                  <p className="text-sm text-muted-foreground">{t("marketplace_detail_sold")}</p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">{t("marketplace_detail_checkout_hint")}</p>
                    <Button className="w-full" onClick={() => router.push(`/marketplace/checkout/${artwork.artworkId}`)}>
                      {t("checkout_cta_buy")}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
