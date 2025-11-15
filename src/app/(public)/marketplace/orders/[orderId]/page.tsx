import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, CreditCard, DollarSign, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { getBackend } from "@/lib/backend";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type OrderParams = Promise<{ orderId: string }>;

const formatPrice = (amount: number, currency: string) =>
  (amount / 100).toLocaleString(undefined, {
    style: "currency",
    currency: currency.toUpperCase()
  });

const formatTimestamp = (value: number, withTime = true) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: withTime ? "2-digit" : undefined,
    minute: withTime ? "2-digit" : undefined
  }).format(value);

const statusVariant = (status: string) => {
  switch (status) {
    case "paid":
    case "approved":
      return "accent" as const;
    case "submitted":
    case "in_progress":
      return "secondary" as const;
    case "failed":
    case "rejected":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
};

export default async function MarketplaceOrderDetailPage({ params }: { params: OrderParams }) {
  const { orderId } = await params;
  const backend = getBackend();
  const order = await backend.orders.get(orderId);
  if (!order) {
    notFound();
  }

  const [[artwork], milestones, payouts, buyer, seller] = await Promise.all([
    backend.marketplace
      .list({ tag: undefined, priceMin: undefined, priceMax: undefined })
      .then((items) => items.filter((item) => item.artworkId === order.artworkId)),
    backend.orderMilestones.milestones.list(orderId),
    backend.orderMilestones.payouts.list(orderId),
    backend.users.get(order.buyerId),
    backend.users.get(order.sellerId)
  ]);

  const paidPayouts = payouts.filter((payout) => payout.status === "paid");
  const totalReleased = paidPayouts.reduce((sum, payout) => sum + payout.amount, 0);
  const pendingMilestones = milestones.filter((milestone) => milestone.status !== "paid");

  return (
    <main className="container mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/marketplace/orders"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {order.status === "paid" ? "Back to orders" : "Back to marketplace"}
        </Link>
        <Badge variant={statusVariant(order.status)} className="px-4 py-1 text-xs uppercase tracking-[0.3em]">
          {order.status}
        </Badge>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Order</p>
        <h1 className="text-3xl font-semibold text-white">Order #{order.orderId.slice(0, 8).toUpperCase()}</h1>
        <p className="text-sm text-muted-foreground">
          Track fulfilment and payouts for this artwork. Both parties receive realtime notifications as milestones move forward.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr,1fr]">
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5 text-accent" />
              Artwork
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-[1fr,1fr]">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black/20">
                <Image
                  src={artwork?.mediaUrls?.[0] ?? "https://placehold.co/800x600?text=Artwork"}
                  alt={artwork?.title ?? "Artwork"}
                  fill
                  className="object-cover"
                  sizes="(max-width:768px) 100vw, 50vw"
                />
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Title</p>
                  <p className="text-xl font-semibold text-white">{artwork?.title ?? "Unavailable"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Artist</p>
                  <p className="text-base font-medium text-white">{seller?.displayName ?? seller?.email ?? order.sellerId}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Collector</p>
                  <p className="text-base font-medium text-white">{buyer?.displayName ?? buyer?.email ?? order.buyerId}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {artwork?.tags?.map((tag) => (
                    <Badge key={tag} variant="outline">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{artwork?.description ?? "No description provided."}</p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CreditCard className="h-5 w-5 text-accent" />
                Payment summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="text-lg font-semibold text-white">{formatPrice(order.amount, order.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Released</span>
                <span className="text-white">{formatPrice(totalReleased, order.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-white">{formatTimestamp(order.createdAt)}</span>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/60 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-white">
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  Protected checkout
                </div>
                <p className="mt-2">
                  Funds stay in escrow until all milestones are complete. You can message the artist anytime from your inbox.
                </p>
              </div>
              <div className="space-y-3 rounded-2xl border border-border/40 bg-background/40 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Quick actions</p>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/messages"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black"
                  >
                    Message artist
                  </Link>
                  <Link
                    href="/support"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-border/40 px-4 py-2 text-sm text-white"
                  >
                    Contact support
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Calendar className="h-5 w-5 text-accent" />
                Delivery details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {(() => {
                const metadata = (order.metadata ?? {}) as {
                  buyerName?: string;
                  buyerEmail?: string;
                  buyerPhone?: string;
                  notes?: string;
                  shippingAddress?: {
                    line1?: string;
                    line2?: string;
                    city?: string;
                    region?: string;
                    country?: string;
                    postalCode?: string;
                  };
                };
                const address = metadata.shippingAddress;
                const hasAddress = address && (address.line1 || address.city || address.country);
                return (
                  <>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Collector</p>
                      <p className="text-white">{metadata.buyerName ?? metadata.buyerEmail ?? "N/A"}</p>
                      {metadata.buyerEmail && <p>{metadata.buyerEmail}</p>}
                      {metadata.buyerPhone && <p>{metadata.buyerPhone}</p>}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Shipping address</p>
                      {hasAddress ? (
                        <div className="text-white">
                          <p>{address?.line1}</p>
                          {address?.line2 && <p>{address.line2}</p>}
                          <p>
                            {[address?.city, address?.region, address?.postalCode].filter(Boolean).join(", ")}
                          </p>
                          <p>{address?.country}</p>
                        </div>
                      ) : (
                        <p>No address provided</p>
                      )}
                    </div>
                    {metadata.notes && (
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Collector notes</p>
                        <p className="text-white">{metadata.notes}</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr,1fr]">
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5 text-accent" />
              Milestones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {milestones.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border/40 p-4 text-sm text-muted-foreground">
                No milestones have been added to this order yet.
              </p>
            ) : (
              <ol className="space-y-3">
                {milestones.map((milestone, index) => (
                  <li
                    key={milestone.milestoneId}
                    className="flex flex-col gap-2 rounded-2xl border border-border/40 bg-background/40 p-4 text-sm text-muted-foreground"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-white">
                        <span className="text-xs text-muted-foreground">#{index + 1}</span>
                        <span className="font-semibold">{milestone.title}</span>
                      </div>
                      <Badge variant={statusVariant(milestone.status)}>{milestone.status}</Badge>
                    </div>
                    <p>{formatPrice(milestone.amount, order.currency)}</p>
                    {milestone.dueDate && (
                      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em]">
                        <Calendar className="h-3 w-3" />
                        Due {formatTimestamp(milestone.dueDate, false)}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <DollarSign className="h-5 w-5 text-accent" />
              Payouts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {payouts.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border/40 p-4 text-center text-muted-foreground">
                No payouts have been scheduled yet.
              </p>
            ) : (
              <div className="space-y-3">
                {payouts.map((payout) => (
                  <div
                    key={payout.payoutId}
                    className="flex flex-col gap-1 rounded-2xl border border-border/40 bg-background/40 px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{formatPrice(payout.amount, order.currency)}</span>
                      <Badge variant={statusVariant(payout.status)}>{payout.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {payout.milestoneId ? `Linked to milestone ${payout.milestoneId.slice(0, 6)}` : "Standalone payout"}
                    </p>
                    <span className="text-[11px] text-muted-foreground">
                      {formatTimestamp(payout.createdAt ?? Date.now())}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {pendingMilestones.length > 0 && (
              <div className="rounded-2xl border border-border/40 bg-background/40 p-4 text-xs text-muted-foreground">
                <p className="text-white">
                  {pendingMilestones.length} milestone{pendingMilestones.length > 1 ? "s" : ""} remaining
                </p>
                <p className="mt-1">
                  Once marked complete, funds will automatically move to the next payout queue.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
