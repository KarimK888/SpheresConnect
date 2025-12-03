"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GateMessage } from "@/components/gates/GateMessage";
import { useSessionState } from "@/context/session";
import { useI18n } from "@/context/i18n";
import { getBackend } from "@/lib/backend";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { Hub, Checkin, User, Event } from "@/lib/types";
import { HubMapClient } from "./HubMapClient";
import type { ReactNode } from "react";
import { readCache, writeCache } from "@spheresconnect/offline";

export const HubMapGate = () => {
  const router = useRouter();
  const { t } = useI18n();
  const sessionUser = useSessionState((state) => state.user);
  const sessionLoading = useSessionState((state) => state.loading);

  const [payload, setPayload] = useState<
    { hubs: Hub[]; checkins: Checkin[]; profiles: User[]; rewardTotals: Record<string, number>; events: Event[] } | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [cacheHydrated, setCacheHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const hydrate = async () => {
      try {
        const [cachedHubs, cachedCheckins, cachedProfiles, cachedEvents, cachedRewards] = await Promise.all([
          readCache("hubs"),
          readCache("checkins"),
          readCache("profiles"),
          readCache("events"),
          readCache("rewards")
        ]);
        if (cancelled) return;
        if (cachedHubs.length || cachedCheckins.length || cachedProfiles.length || cachedEvents.length) {
          const rewardTotals = cachedRewards.reduce<Record<string, number>>((acc, entry) => {
            acc[entry.userId] = entry.total;
            return acc;
          }, {});
          setPayload((current) =>
            current ?? {
              hubs: cachedHubs,
              checkins: cachedCheckins,
              profiles: cachedProfiles,
              events: cachedEvents,
              rewardTotals
            }
          );
        }
      } catch (error) {
        console.warn("[hub-map] unable to hydrate offline cache", error);
      } finally {
        if (!cancelled) setCacheHydrated(true);
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (sessionLoading || !cacheHydrated) return;
    if (!sessionUser) {
      setPayload(null);
      setError(null);
      return;
    }
    let cancelled = false;
    const backend = getBackend();

    const load = async () => {
      setLoading(true);
      try {
        const [hubs, checkins, users, events] = await Promise.all([
          backend.hubs.list(),
          backend.checkins.listActive({}),
          backend.users.list({}),
          backend.events.list()
        ]);
        const directory = new Map(users.map((user) => [user.userId, user]));
        const filteredCheckins = checkins.filter((entry) => directory.has(entry.userId));
        const normalizedCheckins = filteredCheckins.map((entry) => ({ ...entry, syncState: "synced" as const }));
        const rewardTotals: Record<string, number> = {};
        await Promise.all(
          users.map(async (user) => {
            try {
              const summary = await backend.rewards.summary({ userId: user.userId });
              rewardTotals[user.userId] = summary.total ?? 0;
            } catch (err) {
              console.warn("[hub-map] reward summary failed", err);
              rewardTotals[user.userId] = 0;
            }
          })
        );
        if (!cancelled) {
          setPayload({ hubs, checkins: normalizedCheckins, profiles: users, rewardTotals, events });
          setError(null);
        }
        const stamp = Date.now();
        await Promise.all([
          writeCache("hubs", hubs),
          writeCache("checkins", normalizedCheckins),
          writeCache("profiles", users),
          writeCache("events", events),
          writeCache(
            "rewards",
            Object.entries(rewardTotals).map(([userId, total]) => ({
              userId,
              total,
              updatedAt: stamp
            }))
          )
        ]);
      } catch (err) {
        console.error("[hub-map] unable to load data", err);
        if (!cancelled) {
          setError(t("generic_error_loading"));
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
  }, [sessionLoading, sessionUser, reloadToken, t, cacheHydrated]);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const channel = client
      .channel("hub-map-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "checkins" }, () =>
        setReloadToken((token) => token + 1)
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () =>
        setReloadToken((token) => token + 1)
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, []);

  if (sessionLoading) {
    return (
      <WorkspaceWrapper>
        <HubMapSkeleton />
      </WorkspaceWrapper>
    );
  }

  if (!sessionUser) {
    return (
      <WorkspaceWrapper>
        <GateMessage
          title={t("hub_title")}
          body={t("profile_login_required")}
          actionLabel={t("profile_go_to_login")}
          onAction={() => router.push("/login")}
        />
      </WorkspaceWrapper>
    );
  }

  if (loading || !payload) {
    return (
      <WorkspaceWrapper>
        <HubMapSkeleton />
      </WorkspaceWrapper>
    );
  }

  if (error) {
    return (
      <WorkspaceWrapper>
        <GateMessage
          title={t("hub_title")}
          body={error}
          actionLabel={t("generic_retry")}
          onAction={() => setReloadToken((token) => token + 1)}
        />
      </WorkspaceWrapper>
    );
  }

  return (
    <WorkspaceWrapper>
      <HubMapClient
        hubs={payload.hubs}
        initialCheckins={payload.checkins}
        profiles={payload.profiles}
        rewardTotals={payload.rewardTotals}
        events={payload.events}
      />
    </WorkspaceWrapper>
  );
};

const WorkspaceWrapper = ({ children }: { children: ReactNode }) => (
  <div className="mx-auto w-full max-w-7xl px-6 py-10">
    <div className="space-y-6 rounded-[40px] border border-border/40 bg-slate-950/70 p-6 shadow-[0_40px_90px_rgba(15,23,42,0.8)] backdrop-blur">
      {children}
    </div>
  </div>
);

const HubMapSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-4 rounded-[32px] border border-border/50 bg-slate-900/30 p-6">
      <div className="h-6 w-40 animate-pulse rounded-full bg-border/30" />
      <div className="h-12 w-64 animate-pulse rounded-full bg-border/20" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-2xl bg-border/20" />
        ))}
      </div>
    </div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <div className="h-80 animate-pulse rounded-3xl bg-border/20" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-2xl bg-border/15" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-52 animate-pulse rounded-3xl bg-border/20" />
        <div className="h-[280px] animate-pulse rounded-3xl bg-border/20" />
      </div>
    </div>
    <div className="space-y-4">
      <div className="h-8 w-40 animate-pulse rounded-full bg-border/30" />
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-2xl bg-border/20" />
      ))}
    </div>
  </div>
);
