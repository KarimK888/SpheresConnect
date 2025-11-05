"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArtworkCard } from "@/components/ArtworkCard";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/context/i18n";
import { getBackend } from "@/lib/backend";
import type { Artwork, Order } from "@/lib/types";

interface DashboardData {
  listings: Artwork[];
  orders: Order[];
}

export const MarketplaceDashboardClient = () => {
  const router = useRouter();
  const { t } = useI18n();
  const { user, loading, refresh } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?redirect=/marketplace/dashboard");
      return;
    }
    let active = true;
    const fetchDashboard = async () => {
      setBusy(true);
      const backend = getBackend();
      try {
        const result = await backend.marketplace.getDashboard(user.userId);
        if (!active) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : t("generic_unknown");
        setError(message);
      } finally {
        if (active) {
          setBusy(false);
        }
      }
    };
    void fetchDashboard();
    return () => {
      active = false;
    };
  }, [loading, user, router, t]);

  const refreshDashboard = async () => {
    if (!user) return;
    const backend = getBackend();
    setBusy(true);
    setError(null);
    try {
      const next = await backend.marketplace.getDashboard(user.userId);
      setData(next);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("generic_unknown");
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const revenue = useMemo(() => {
    if (!data) return 0;
    return data.orders.reduce((total, order) => total + order.amount, 0);
  }, [data]);

  if (loading || (user && !data && busy && !error)) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-10">
        <Card className="border-border/60 bg-card/80 p-6 text-sm text-muted-foreground">
          {t("generic_loading")}
        </Card>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-white">{t("marketplace_dashboard_title")}</h1>
        <Button variant="outline" disabled={busy} onClick={refreshDashboard}>
          {busy ? t("generic_loading") : t("generic_refresh")}
        </Button>
      </div>
      {error && (
        <Card className="border-destructive/60 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </Card>
      )}
      {data && (
        <>
          <Card className="flex flex-wrap gap-6 border-border/60 bg-card/80 p-6 text-sm text-muted-foreground">
            <div>
              <p className="text-xs uppercase tracking-[0.3em]">{t("marketplace_dashboard_revenue")}</p>
              <p className="text-2xl font-semibold text-white">
                {(revenue / 100).toLocaleString(undefined, { style: "currency", currency: "USD" })}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em]">
                {t("marketplace_dashboard_active_listings")}
              </p>
              <p className="text-2xl font-semibold text-white">
                {data.listings.filter((listing) => !listing.isSold).length}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em]">
                {t("marketplace_dashboard_total_orders")}
              </p>
              <p className="text-2xl font-semibold text-white">{data.orders.length}</p>
            </div>
          </Card>
          <div className="grid gap-6 md:grid-cols-3">
            {data.listings.map((listing) => (
              <ArtworkCard key={listing.artworkId} artwork={listing} />
            ))}
            {data.listings.length === 0 && (
              <Card className="border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
                {t("marketplace_dashboard_empty")}
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
};

