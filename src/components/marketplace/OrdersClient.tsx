"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Filter, ShoppingBag, Store } from "lucide-react";
import type { Order } from "@/lib/types";
import type { Database } from "@/lib/supabase-database";
import { useI18n } from "@/context/i18n";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

interface OrdersClientProps {
  orders: Order[];
  currentUserId: string;
}

const ACTIVITY_WINDOW_MS = 15_000;

const mapOrderFromRealtime = (
  row: Database["public"]["Tables"]["orders"]["Row"]
): Order => ({
  orderId: row.order_id,
  artworkId: row.artwork_id,
  buyerId: row.buyer_id,
  sellerId: row.seller_id,
  amount: row.amount,
  currency: row.currency,
  status: row.status as Order["status"],
  stripePaymentIntentId: row.stripe_payment_intent_id ?? undefined,
  createdAt: new Date(row.created_at).getTime()
});

export const OrdersClient = ({ orders, currentUserId }: OrdersClientProps) => {
  const { t } = useI18n();
  const [role, setRole] = useState<"buyer" | "seller" | "all">("all");
  const [search, setSearch] = useState("");
  const [liveOrders, setLiveOrders] = useState<Order[]>(orders);
  const [activityMap, setActivityMap] = useState<Record<string, number>>({});

  useEffect(() => {
    setLiveOrders(orders);
  }, [orders]);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;

    const channel = client.channel(`orders-client:${currentUserId}`);

    const markActivity = (orderId: string | null | undefined) => {
      if (!orderId) return;
      setActivityMap((prev) => ({ ...prev, [orderId]: Date.now() }));
    };

    const upsertOrder = (row: Database["public"]["Tables"]["orders"]["Row"] | null, removedId?: string) => {
      setLiveOrders((prev) => {
        if (row) {
          const mapped = mapOrderFromRealtime(row);
          const exists = prev.some((entry) => entry.orderId === mapped.orderId);
          if (exists) {
            return prev.map((entry) => (entry.orderId === mapped.orderId ? mapped : entry));
          }
          return [mapped, ...prev];
        }
        if (removedId) {
          return prev.filter((entry) => entry.orderId !== removedId);
        }
        return prev;
      });
    };

    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        const row = (payload.new ?? payload.old) as Database["public"]["Tables"]["orders"]["Row"] | null;
        if (!row) return;
        if (row.buyer_id !== currentUserId && row.seller_id !== currentUserId) return;
        if (payload.eventType === "DELETE") {
          upsertOrder(null, row.order_id);
          return;
        }
        upsertOrder(row);
        markActivity(row.order_id);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_milestones" }, (payload) => {
        const row = (payload.new ?? payload.old) as Database["public"]["Tables"]["order_milestones"]["Row"] | null;
        markActivity(row?.order_id);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "payouts" }, (payload) => {
        const row = (payload.new ?? payload.old) as Database["public"]["Tables"]["payouts"]["Row"] | null;
        markActivity(row?.order_id);
      });

    void channel.subscribe();

    const cleanupTimer = window.setInterval(() => {
      setActivityMap((prev) => {
        const now = Date.now();
        return Object.fromEntries(
          Object.entries(prev).filter(([, timestamp]) => now - timestamp < ACTIVITY_WINDOW_MS)
        );
      });
    }, 5000);

    return () => {
      channel.unsubscribe();
      window.clearInterval(cleanupTimer);
    };
  }, [currentUserId]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return liveOrders
      .filter((order) => {
        if (role === "buyer" && order.buyerId !== currentUserId) return false;
        if (role === "seller" && order.sellerId !== currentUserId) return false;
        if (!query) return true;
        return order.orderId.toLowerCase().includes(query);
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [liveOrders, role, search, currentUserId]);

  const totalVolume = useMemo(
    () =>
      filteredOrders.reduce(
        (acc, order) => acc + (order.sellerId === currentUserId ? order.amount : 0),
        0
      ),
    [filteredOrders, currentUserId]
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {t("marketplace_orders_label")}
        </p>
        <h1 className="text-3xl font-semibold text-white">{t("marketplace_orders_title")}</h1>
        <p className="text-sm text-muted-foreground">{t("marketplace_orders_subtitle")}</p>
      </header>

      <Card className="flex flex-col gap-3 border-border/60 bg-card/70 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Button
            variant={role === "all" ? "accent" : "outline"}
            size="sm"
            onClick={() => setRole("all")}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {t("marketplace_orders_role_all")}
          </Button>
          <Button
            variant={role === "buyer" ? "accent" : "outline"}
            size="sm"
            onClick={() => setRole("buyer")}
            className="gap-2"
          >
            <ShoppingBag className="h-4 w-4" />
            {t("marketplace_orders_role_buyer")}
          </Button>
          <Button
            variant={role === "seller" ? "accent" : "outline"}
            size="sm"
            onClick={() => setRole("seller")}
            className="gap-2"
          >
            <Store className="h-4 w-4" />
            {t("marketplace_orders_role_seller")}
          </Button>
        </div>
        <input
          type="search"
          className="w-full rounded-full border border-border/40 bg-background/50 px-4 py-2 text-sm text-white md:w-64"
          placeholder={t("marketplace_orders_search")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </Card>

      <Card className="flex flex-wrap gap-6 border-border/60 bg-card/70 p-4 text-sm text-muted-foreground">
        <div>
          <p className="text-xs uppercase tracking-[0.3em]">{t("marketplace_orders_stat_total")}</p>
          <p className="text-2xl font-semibold text-white">
            {(totalVolume / 100).toLocaleString(undefined, { style: "currency", currency: "USD" })}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em]">{t("marketplace_orders_stat_count")}</p>
          <p className="text-2xl font-semibold text-white">{filteredOrders.length}</p>
        </div>
      </Card>

      {filteredOrders.length === 0 ? (
        <Card className="border-dashed border-border/50 bg-transparent p-6 text-center text-sm text-muted-foreground">
          {t("marketplace_orders_empty")}
        </Card>
      ) : (
        <div className="space-y-3">
      {filteredOrders.map((order) => (
        <Card key={order.orderId} className="flex flex-col gap-3 border-border/50 bg-card/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              #{order.orderId.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-lg font-semibold text-white">
                  {(order.amount / 100).toLocaleString(undefined, {
                    style: "currency",
                    currency: order.currency.toUpperCase()
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {activityMap[order.orderId] && Date.now() - activityMap[order.orderId] < ACTIVITY_WINDOW_MS && (
              <Badge variant="accent">{t("marketplace_orders_updated")}</Badge>
            )}
            <Badge variant={order.status === "paid" ? "accent" : "outline"}>{order.status}</Badge>
            <Link
              href={`/marketplace/orders/${order.orderId}`}
              className="inline-flex items-center gap-2 rounded-full border border-border/50 px-4 py-2 text-sm text-white transition hover:border-accent hover:text-accent"
            >
                  {t("marketplace_orders_view")} <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
