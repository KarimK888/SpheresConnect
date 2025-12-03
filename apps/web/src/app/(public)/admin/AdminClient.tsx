"use client";

import { useCallback, useMemo, useState } from "react";
import { ShieldAlert, ShieldCheck, Users, DollarSign, Search, Trash2, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/context/i18n";
import { getBackend } from "@/lib/backend";
import type { Artwork, Event, Order, User } from "@/lib/types";

interface AdminClientProps {
  unverified: User[];
  verified: User[];
  listings: Artwork[];
  orders: Order[];
  events: Event[];
  totalUsers: number;
}

const formatCurrency = (currency: string, amount: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase()
  }).format(amount / 100);

export const AdminClient = ({ unverified, verified, listings, orders, events, totalUsers }: AdminClientProps) => {
  const { t } = useI18n();
  const backend = useMemo(() => getBackend(), []);
  const [pending, setPending] = useState(unverified);
  const [approved, setApproved] = useState(verified);
  const [activeListings, setActiveListings] = useState(listings);
  const recentOrders = useMemo(() => orders, [orders]);
  const [upcomingEvents, setUpcomingEvents] = useState(events);
  const [search, setSearch] = useState("");
  const [userBusy, setUserBusy] = useState<Record<string, boolean>>({});
  const [listingBusy, setListingBusy] = useState<Record<string, boolean>>({});
  const [eventBusy, setEventBusy] = useState<Record<string, boolean>>({});
  const [flash, setFlash] = useState<string | null>(null);

  const totalVerified = approved.length;
  const totalPending = pending.length;
  const totalGmv = useMemo(
    () => recentOrders.reduce((sum, order) => sum + order.amount, 0),
    [recentOrders]
  );
  const primaryCurrency = recentOrders[0]?.currency ?? "usd";

  const directory = useMemo(() => {
    const all = [...pending, ...approved];
    const query = search.trim().toLowerCase();
    if (!query) return all.slice(0, 8);
    return all.filter(
      (user) =>
        user.displayName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.skills.some((skill) => skill.toLowerCase().includes(query))
    );
  }, [approved, pending, search]);

  const stats = [
    { label: t("admin_stats_total_users"), value: totalUsers.toLocaleString(), icon: Users },
    { label: t("admin_stats_verified"), value: totalVerified.toLocaleString(), icon: ShieldCheck },
    { label: t("admin_stats_pending"), value: totalPending.toLocaleString(), icon: ShieldAlert },
    { label: t("admin_stats_gmv"), value: formatCurrency(primaryCurrency, totalGmv), icon: DollarSign }
  ];

  const handleVerify = useCallback(
    async (userId: string) => {
      setUserBusy((prev) => ({ ...prev, [userId]: true }));
      try {
        const response = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, action: "verify" })
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error ?? "verify_failed");
        setPending((prev) => prev.filter((user) => user.userId !== userId));
        setApproved((prev) => [payload as User, ...prev]);
        setFlash(t("admin_flash_verified"));
      } catch (error) {
        console.error("[admin] verify", error);
        setFlash(t("admin_flash_error"));
      } finally {
        setUserBusy((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    },
    [t]
  );

  const handleRemoveListing = useCallback(
    async (artworkId: string) => {
      setListingBusy((prev) => ({ ...prev, [artworkId]: true }));
      try {
        await backend.marketplace.removeListing({ artworkId });
        setActiveListings((prev) => prev.filter((listing) => listing.artworkId !== artworkId));
        setFlash(t("admin_flash_listing_removed"));
      } catch (error) {
        console.error("[admin] listing", error);
        setFlash(t("admin_flash_error"));
      } finally {
        setListingBusy((prev) => {
          const next = { ...prev };
          delete next[artworkId];
          return next;
        });
      }
    },
    [backend, t]
  );

  const handleCancelEvent = useCallback(
    async (eventId: string) => {
      setEventBusy((prev) => ({ ...prev, [eventId]: true }));
      try {
        await backend.events.remove({ eventId });
        setUpcomingEvents((prev) => prev.filter((event) => event.eventId !== eventId));
        setFlash(t("admin_flash_event_removed"));
      } catch (error) {
        console.error("[admin] event", error);
        setFlash(t("admin_flash_error"));
      } finally {
        setEventBusy((prev) => {
          const next = { ...prev };
          delete next[eventId];
          return next;
        });
      }
    },
    [backend, t]
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold text-white">{t("admin_title")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin_subtitle")}</p>
      </div>

      {flash && (
        <div className="rounded-2xl border border-border/60 bg-border/20 px-4 py-3 text-sm text-muted-foreground">
          {flash}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-semibold text-white">{stat.value}</p>
            </div>
            <div className="rounded-full border border-border/40 bg-border/10 p-3 text-muted-foreground">
              <stat.icon className="h-5 w-5" />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{t("admin_pending_title")}</h2>
            <Badge variant="outline">{pending.length}</Badge>
          </div>
          {pending.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("admin_all_verified")}</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {pending.slice(0, 8).map((user) => (
                <li key={user.userId} className="rounded-2xl border border-border/40 p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-white">{user.displayName}</p>
                      <p className="text-xs">{user.email}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {user.skills.slice(0, 4).map((skill) => (
                          <Badge key={skill} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => handleVerify(user.userId)}
                      disabled={userBusy[user.userId]}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {t("admin_verify_user")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{t("admin_user_directory_title")}</h2>
            <Badge variant="outline">{directory.length}</Badge>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t("admin_user_search_placeholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {directory.map((user) => (
              <li key={user.userId} className="flex items-center justify-between rounded-2xl border border-border/40 px-3 py-2">
                <div>
                  <p className="text-white">{user.displayName}</p>
                  <p className="text-xs">{user.email}</p>
                </div>
                <Badge variant={user.isVerified ? "default" : "secondary"}>
                  {user.isVerified ? t("admin_badge_verified") : t("admin_badge_pending")}
                </Badge>
              </li>
            ))}
            {directory.length === 0 && <p className="text-xs">{t("admin_user_search_empty")}</p>}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{t("admin_orders_title")}</h2>
            <Badge variant="outline">{recentOrders.length}</Badge>
          </div>
          {recentOrders.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("admin_orders_empty")}</p>
          ) : (
            <div className="mt-4 space-y-3 text-sm">
              {recentOrders.slice(0, 6).map((order) => (
                <div key={order.orderId} className="rounded-2xl border border-border/40 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-white">{order.orderId.slice(-8)}</p>
                    <Badge variant={order.status === "paid" ? "default" : "secondary"} className="uppercase">
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("admin_orders_amount")}: {formatCurrency(order.currency, order.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("admin_orders_buyer")}: {order.buyerId}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{t("admin_listings_title")}</h2>
            <Badge variant="outline">{activeListings.length}</Badge>
          </div>
          {activeListings.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("admin_listings_empty")}</p>
          ) : (
            <div className="mt-4 space-y-3 text-sm">
              {activeListings.slice(0, 6).map((listing) => (
                <div key={listing.artworkId} className="rounded-2xl border border-border/40 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white">{listing.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(listing.currency, listing.price)} · {listing.status}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveListing(listing.artworkId)}
                      disabled={listingBusy[listing.artworkId]}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{t("admin_events_title")}</h2>
          <Badge variant="outline">{upcomingEvents.length}</Badge>
        </div>
        {upcomingEvents.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("admin_events_empty")}</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {upcomingEvents.slice(0, 6).map((event) => (
              <div key={event.eventId} className="rounded-2xl border border-border/40 p-4 text-sm">
                <p className="text-white">{event.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(event.startsAt).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  {t("admin_events_host")}: {event.hostUserId}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => handleCancelEvent(event.eventId)}
                  disabled={eventBusy[event.eventId]}
                >
                  {t("admin_events_remove")}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
