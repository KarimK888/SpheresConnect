"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Clipboard, Clock3, Download, Filter, ShoppingBag, Store } from "lucide-react";
import type { Order, OrderMetadata, OrderShippingStatus } from "@/lib/types";
import type { TranslationKey } from "@/lib/landing-copy";
import type { Database } from "@/lib/supabase-database";
import { useI18n } from "@/context/i18n";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getBackend } from "@/lib/backend";

const shippingStatusLabels: Record<OrderShippingStatus, TranslationKey> = {
  processing: "marketplace_orders_shipping_processing",
  preparing: "marketplace_orders_shipping_preparing",
  in_transit: "marketplace_orders_shipping_in_transit",
  delivered: "marketplace_orders_shipping_delivered",
  refunded: "marketplace_orders_shipping_refunded"
};

interface OrdersClientProps {
  orders: Order[];
  currentUserId: string;
}

type TranslateFn = ReturnType<typeof useI18n>["t"];

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
  const [statusFilter, setStatusFilter] = useState<"all" | "in_progress" | "completed" | "refunded">("all");
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<OrderMetadata>({
    shippingStatus: "processing",
    trackingNumber: "",
    downloadUrl: "",
    note: ""
  });
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
    const matchesStatus = (order: Order) => {
      const shippingStatus =
        order.metadata?.shippingStatus ??
        (order.status === "refunded" ? "refunded" : order.status === "paid" ? "processing" : "processing");
      if (statusFilter === "completed") {
        return shippingStatus === "delivered";
      }
      if (statusFilter === "in_progress") {
        return shippingStatus !== "delivered" && shippingStatus !== "refunded" && order.status !== "refunded";
      }
      if (statusFilter === "refunded") {
        return order.status === "refunded" || shippingStatus === "refunded";
      }
      return true;
    };
    return liveOrders
      .filter((order) => {
        if (role === "buyer" && order.buyerId !== currentUserId) return false;
        if (role === "seller" && order.sellerId !== currentUserId) return false;
        if (!matchesStatus(order)) return false;
        if (!query) return true;
        return order.orderId.toLowerCase().includes(query);
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [liveOrders, role, search, currentUserId, statusFilter]);

  const totalVolume = useMemo(
    () =>
      filteredOrders.reduce(
        (acc, order) => acc + (order.sellerId === currentUserId ? order.amount : 0),
        0
      ),
    [filteredOrders, currentUserId]
  );

  const openEditPanel = (order: Order) => {
    const shippingStatus: OrderShippingStatus =
      order.metadata?.shippingStatus ??
      (order.status === "refunded"
        ? "refunded"
        : order.status === "paid"
          ? "processing"
          : "processing");
    setEditingOrderId(order.orderId);
    setEditForm({
      shippingStatus,
      trackingNumber: order.metadata?.trackingNumber ?? "",
      downloadUrl: order.metadata?.downloadUrl ?? "",
      note: order.metadata?.note ?? ""
    });
    setActionError(null);
  };

  const closeEditor = () => {
    setEditingOrderId(null);
    setActionError(null);
  };

  const applyMetadata = async (orderId: string, metadata: Order["metadata"]) => {
    const backend = getBackend();
    setUpdatingOrderId(orderId);
    try {
      const updated = await backend.orders.updateMetadata({
        orderId,
        metadata
      });
      setLiveOrders((prev) => prev.map((order) => (order.orderId === orderId ? updated : order)));
      setActionError(null);
      return updated;
    } catch (error) {
      console.error("Failed to update order metadata", error);
      setActionError(t("marketplace_orders_action_error"));
      throw error;
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleSaveMetadata = async (order: Order) => {
    const merged: Order["metadata"] = {
      ...(order.metadata ?? {}),
      ...editForm,
      lastUpdatedAt: Date.now(),
      lastUpdatedBy: currentUserId
    };
    await applyMetadata(order.orderId, merged);
    closeEditor();
  };

  const handleMarkDelivered = async (order: Order) => {
    const merged: Order["metadata"] = {
      ...(order.metadata ?? {}),
      shippingStatus: "delivered",
      lastUpdatedAt: Date.now(),
      lastUpdatedBy: currentUserId
    };
    await applyMetadata(order.orderId, merged);
  };

  const handleDownloadReceipt = (order: Order) => {
    const amountLabel = (order.amount / 100).toLocaleString(undefined, {
      style: "currency",
      currency: order.currency.toUpperCase()
    });
    const content = [
      `Order: ${order.orderId}`,
      `Buyer: ${order.buyerId}`,
      `Seller: ${order.sellerId}`,
      `Amount: ${amountLabel}`,
      `Status: ${order.status}`,
      `Updated: ${new Date().toLocaleString()}`
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `spheraconnect_order_${order.orderId}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyTracking = async (trackingNumber?: string) => {
    if (!trackingNumber) return;
    await navigator.clipboard.writeText(trackingNumber);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {t("marketplace_orders_label")}
        </p>
        <h1 className="text-3xl font-semibold text-white">{t("marketplace_orders_title")}</h1>
        <p className="text-sm text-muted-foreground">{t("marketplace_orders_subtitle")}</p>
      </header>

      <div className="rounded-3xl border border-[#1d2233] bg-[#080d18] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.5)]">
        <div className="flex flex-wrap gap-2">
          {(["all", "buyer", "seller"] as const).map((key) => (
            <Button
              key={key}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRole(key)}
              className={`rounded-full border px-4 ${
                role === key ? "border-accent bg-accent/10 text-white" : "border-transparent bg-transparent text-[#9ca3c9]"
              }`}
            >
              {key === "all" && <Filter className="mr-2 h-4 w-4" />}
              {key === "buyer" && <ShoppingBag className="mr-2 h-4 w-4" />}
              {key === "seller" && <Store className="mr-2 h-4 w-4" />}
              {t(`marketplace_orders_role_${key}`)}
            </Button>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {t("marketplace_orders_stat_total")}
            </p>
            <p className="text-2xl font-semibold text-white">
              {(totalVolume / 100).toLocaleString(undefined, { style: "currency", currency: "USD" })}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {t("marketplace_orders_stat_count")}
            </p>
            <p className="text-2xl font-semibold text-white">{filteredOrders.length}</p>
          </div>
          <input
            type="search"
            className="w-full rounded-full border border-[#23293d] bg-[#050816] px-4 py-2 text-sm text-white placeholder:text-[#5c637a] md:w-64"
            placeholder={t("marketplace_orders_search")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {(["all", "in_progress", "completed", "refunded"] as const).map((key) => (
            <Button
              key={key}
              type="button"
              variant="ghost"
              size="sm"
              className={`rounded-full px-4 ${
                statusFilter === key ? "bg-[#1d9bf0]/20 text-white" : "text-[#9ca3c9]"
              }`}
              onClick={() => setStatusFilter(key)}
            >
              {t(`marketplace_orders_status_${key}`)}
            </Button>
          ))}
        </div>
      </div>

      {actionError && (
        <Card className="border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {actionError}
        </Card>
      )}

      {filteredOrders.length === 0 ? (
        <Card className="border-dashed border-border/50 bg-transparent p-6 text-center text-sm text-muted-foreground">
          {t("marketplace_orders_empty")}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const shippingStatus =
              order.metadata?.shippingStatus ??
              (order.status === "refunded" ? "refunded" : order.status === "paid" ? "processing" : "processing");
            const timeline = buildTimeline(order, shippingStatus, t);
            const recentlyUpdated =
              activityMap[order.orderId] && Date.now() - activityMap[order.orderId] < ACTIVITY_WINDOW_MS;
            const isSeller = order.sellerId === currentUserId;
            const isBuyer = order.buyerId === currentUserId;
            const editing = editingOrderId === order.orderId;
            const saving = updatingOrderId === order.orderId;
            const trackingNumber = order.metadata?.trackingNumber;
            const downloadUrl = order.metadata?.downloadUrl;

            return (
              <div
                key={order.orderId}
                className="rounded-[28px] border border-[#1d2233] bg-gradient-to-b from-[#111a2a] via-[#0b1220] to-[#050812] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.6)]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      #{order.orderId.slice(0, 8).toUpperCase()}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-white">
                      {(order.amount / 100).toLocaleString(undefined, {
                        style: "currency",
                        currency: order.currency.toUpperCase()
                      })}
                    </h3>
                    <p className="text-sm text-[#8e95b0]">
                      {t("marketplace_orders_ordered_on", {
                        date: new Date(order.createdAt).toLocaleDateString()
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {recentlyUpdated && <Badge variant="accent">{t("marketplace_orders_updated")}</Badge>}
                    <Badge variant={order.status === "paid" ? "accent" : "outline"}>{order.status}</Badge>
                    <Badge variant="outline">{t(`marketplace_orders_shipping_${shippingStatus}`)}</Badge>
                  </div>
                </div>

                {typeof order.metadata?.progressPercent === "number" && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-[#7b8196]">
                      <span>{t("marketplace_orders_progress_label")}</span>
                      <span>{order.metadata.progressPercent}%</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-[#1f2638]">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${order.metadata.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-4">
                  {timeline.map((step, index) => (
                    <div key={step.key} className="flex gap-4">
                      <div className="relative flex flex-col items-center">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full ${
                            step.completed ? "bg-accent text-white" : "border border-[#2c3344] text-[#7b8196]"
                          }`}
                        >
                          {step.completed ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                        </div>
                        {index < timeline.length - 1 && (
                          <div className="h-10 w-px bg-gradient-to-b from-transparent via-[#1f2638] to-transparent" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{step.title}</p>
                        <p className="text-xs text-[#9ca3c9]">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {(trackingNumber || downloadUrl) && (
                  <div className="mt-4 rounded-2xl border border-[#1f2233] bg-[#050816] p-4 text-sm text-[#9ca3c9]">
                    {trackingNumber && (
                      <p>
                        {t("marketplace_orders_tracking_label")}: <span className="font-medium text-white">{trackingNumber}</span>
                      </p>
                    )}
                    {downloadUrl && (
                      <p className="mt-2">
                        {t("marketplace_orders_downloads_label")}:{" "}
                        <Link href={downloadUrl} className="text-accent underline" target="_blank">
                          {downloadUrl}
                        </Link>
                      </p>
                    )}
                    {order.metadata?.note && (
                      <p className="mt-2 text-xs text-[#7b8196]">{order.metadata.note}</p>
                    )}
                  </div>
                )}

                {isSeller && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      className="w-full rounded-full border-[#2b3044] py-3 text-sm text-white"
                      onClick={() => (editing ? closeEditor() : openEditPanel(order))}
                    >
                      {editing ? t("generic_cancel") : t("marketplace_orders_update_fulfillment")}
                    </Button>
                  </div>
                )}

                {editing && (
                  <div className="mt-4 rounded-2xl border border-[#1f2233] bg-[#050816] p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          {t("marketplace_orders_shipping_status_label")}
                        </p>
                        <select
                          className="mt-1 w-full rounded-xl border border-[#23293d] bg-transparent px-3 py-2 text-sm text-white"
                          value={editForm.shippingStatus}
                          onChange={(event) =>
                            setEditForm((prev) => ({
                              ...prev,
                              shippingStatus: event.target.value as OrderShippingStatus
                            }))
                          }
                        >
                          {(Object.keys(shippingStatusLabels) as OrderShippingStatus[]).map((value) => (
                            <option key={value} value={value} className="bg-[#050816] text-black">
                              {t(shippingStatusLabels[value])}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          {t("marketplace_orders_tracking_label")}
                        </p>
                        <Input
                          value={editForm.trackingNumber}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, trackingNumber: event.target.value }))}
                          placeholder={t("marketplace_orders_tracking_placeholder")}
                        />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          {t("marketplace_orders_downloads_label")}
                        </p>
                        <Input
                          value={editForm.downloadUrl}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, downloadUrl: event.target.value }))}
                          placeholder={t("marketplace_orders_download_placeholder")}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("marketplace_orders_note_label")}</p>
                        <Textarea
                          value={editForm.note}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, note: event.target.value }))}
                          placeholder={t("marketplace_orders_note_placeholder")}
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        className="rounded-full px-6"
                        disabled={saving}
                        onClick={() => handleSaveMetadata(order)}
                      >
                        {saving ? t("generic_loading") : t("marketplace_orders_save_changes")}
                      </Button>
                      <Button variant="ghost" className="rounded-full px-6 text-white" onClick={closeEditor}>
                        {t("generic_cancel")}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-3">
                  {isBuyer && shippingStatus === "in_transit" && (
                    <Button
                      variant="outline"
                      className="rounded-full border-[#2b3044] py-3 text-sm text-white"
                      onClick={() => handleMarkDelivered(order)}
                      disabled={saving}
                    >
                      {t("marketplace_orders_mark_delivered")}
                    </Button>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button asChild className="flex-1 rounded-full py-4 text-base">
                      <Link href={`/marketplace/orders/${order.orderId}`}>
                        {t("marketplace_orders_actions_primary")}
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 rounded-full border-[#2b3044] py-4 text-base text-white"
                      asChild
                    >
                      <Link href="mailto:support@spheraconnect.art">
                        {t("marketplace_orders_actions_secondary")}
                      </Link>
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      className="rounded-full border border-transparent px-4 text-sm text-white"
                      onClick={() => handleDownloadReceipt(order)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {t("marketplace_orders_download_receipt")}
                    </Button>
                    {trackingNumber && (
                      <Button
                        variant="ghost"
                        className="rounded-full border border-transparent px-4 text-sm text-white"
                        onClick={() => handleCopyTracking(trackingNumber)}
                      >
                        <Clipboard className="mr-2 h-4 w-4" />
                        {t("marketplace_orders_copy_tracking")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const buildTimeline = (order: Order, shippingStatus: OrderShippingStatus, t: TranslateFn) => {
  const createdDetail = new Date(order.createdAt).toLocaleDateString();
  const paymentComplete = order.status === "paid";
  const fulfillmentDetail = t(shippingStatusLabels[shippingStatus]);
  return [
    {
      key: "created",
      title: t("marketplace_orders_step_created_title"),
      detail: t("marketplace_orders_step_created_detail", { date: createdDetail }),
      completed: true
    },
    {
      key: "payment",
      title: paymentComplete
        ? t("marketplace_orders_step_payment_done")
        : t("marketplace_orders_step_payment_pending"),
      detail: paymentComplete
        ? t("marketplace_orders_step_payment_detail", { date: createdDetail })
        : t("marketplace_orders_step_payment_waiting"),
      completed: paymentComplete
    },
    {
      key: "fulfillment",
      title: t("marketplace_orders_step_fulfillment_title"),
      detail: fulfillmentDetail,
      completed: shippingStatus === "delivered"
    }
  ];
};
