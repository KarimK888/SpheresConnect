"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GateMessage } from "@/components/gates/GateMessage";
import { useSessionState } from "@/context/session";
import { useI18n } from "@/context/i18n";
import { getBackend } from "@/lib/backend";
import type { Order } from "@/lib/types";
import { OrdersClient } from "@/components/marketplace/OrdersClient";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export const OrdersGate = () => {
  const router = useRouter();
  const { t } = useI18n();
  const sessionUser = useSessionState((state) => state.user);
  const sessionLoading = useSessionState((state) => state.loading);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const realtimeDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (sessionLoading || !sessionUser) return;
    let cancelled = false;
    const backend = getBackend();
    const load = async () => {
      setLoading(true);
      try {
        const items = await backend.orders.listForUser({ userId: sessionUser.userId });
        if (!cancelled) {
          setOrders(items);
          setError(null);
        }
      } catch (err) {
        console.error("[orders] unable to load data", err);
        if (!cancelled) {
          setError(t("marketplace_orders_error"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionLoading, sessionUser, reloadToken, t]);

  const scheduleRealtimeRefresh = useCallback(() => {
    if (typeof window === "undefined") return;
    if (realtimeDebounceRef.current) {
      window.clearTimeout(realtimeDebounceRef.current);
    }
    realtimeDebounceRef.current = window.setTimeout(() => {
      realtimeDebounceRef.current = null;
      setReloadToken((token) => token + 1);
    }, 400);
  }, []);

  useEffect(() => {
    if (!sessionUser) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;

    const tables = ["orders", "order_milestones", "payouts"];
    const channel = client.channel(`orders:${sessionUser.userId}`);
    tables.forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        if (table === "orders") {
          const record = (payload.new ?? payload.old) as { buyer_id?: string | null; seller_id?: string | null } | null;
          if (record && (record.buyer_id === sessionUser.userId || record.seller_id === sessionUser.userId)) {
            scheduleRealtimeRefresh();
          }
          return;
        }
        scheduleRealtimeRefresh();
      });
    });
    void channel.subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [scheduleRealtimeRefresh, sessionUser]);

  useEffect(() => {
    return () => {
      if (realtimeDebounceRef.current) {
        window.clearTimeout(realtimeDebounceRef.current);
      }
    };
  }, []);

  if (sessionLoading) {
    return <OrdersSkeleton />;
  }

  if (!sessionUser) {
    return (
      <GateMessage
        title={t("marketplace_orders_title")}
        body={t("profile_login_required")}
        actionLabel={t("profile_go_to_login")}
        onAction={() => router.push("/login")}
      />
    );
  }

  if (loading) {
    return <OrdersSkeleton />;
  }

  if (error) {
    return (
      <GateMessage
        title={t("marketplace_orders_title")}
        body={error}
        actionLabel={t("generic_retry")}
        onAction={() => setReloadToken((token) => token + 1)}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <OrdersClient orders={orders} currentUserId={sessionUser.userId} />
    </div>
  );
};

const OrdersSkeleton = () => (
  <div className="mx-auto w-full max-w-5xl space-y-4 px-6 py-10">
    <div className="space-y-2">
      <div className="h-8 w-48 animate-pulse rounded-full bg-border/30" />
      <div className="h-4 w-72 animate-pulse rounded-full bg-border/20" />
    </div>
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="h-20 animate-pulse rounded-2xl border border-border/20 bg-border/10" />
    ))}
  </div>
);
