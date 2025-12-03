"use client";

import { useCallback, useEffect, useState } from "react";
import type { Checkin } from "../lib/types";
import { getBackend } from "../lib/backend";
import { enqueueMutation, readCache, upsertCacheItem, writeCache, type StoredCheckin } from "@spheresconnect/offline";
import { OFFLINE_SYNC_EVENT } from "./useOfflineSync";

export const useCheckin = (options?: { autoRefreshMs?: number }) => {
  const [checkins, setCheckins] = useState<StoredCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheHydrated, setCacheHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const hydrate = async () => {
      try {
        const cached = await readCache("checkins");
        if (!cancelled && cached.length) {
          setCheckins(cached);
        }
      } catch (error) {
        console.warn("[useCheckin] unable to hydrate cache", error);
      } finally {
        if (!cancelled) {
          setCacheHydrated(true);
        }
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    setLoading(true);
    setError(null);
    try {
      const backend = getBackend();
      const result = await backend.checkins.listActive({});
      const normalized = result.map((entry) => ({ ...entry, syncState: "synced" } as StoredCheckin));
      setCheckins(normalized);
      await writeCache("checkins", normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load check-ins");
    } finally {
      setLoading(false);
    }
  }, []);

  const checkIn = useCallback(
    async (
      input: { userId: string; hubId?: string; location: { lat: number; lng: number }; status: "online" | "offline" }
    ): Promise<StoredCheckin> => {
      if (typeof window !== "undefined") {
        const { userId, hubId, location, status } = input;
        const payload = { userId, hubId, location, status };
        const response = await fetch("/api/checkin", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const responseBody = (await response.json().catch(() => null)) as Checkin | { error?: { message?: string } } | null;
        if (!response.ok || !responseBody || "error" in responseBody) {
          const message =
            responseBody && "error" in responseBody && responseBody.error
              ? responseBody.error.message
              : "Unable to share presence right now";
          throw new Error(message);
        }
        const created: StoredCheckin = { ...(responseBody as Checkin), syncState: "synced" };
        setCheckins((prev) => {
          const next = prev.filter((entry) => entry.userId !== created.userId);
          next.push(created);
          return next;
        });
        await upsertCacheItem("checkins", created);
        await refresh();
        return created;
      }
      const backend = getBackend();
      const created = await backend.checkins.create(input);
      const normalized: StoredCheckin = { ...created, syncState: "synced" };
      setCheckins((prev) => {
        const next = prev.filter((entry) => entry.userId !== normalized.userId);
        next.push(normalized);
        return next;
      });
      await upsertCacheItem("checkins", normalized);
      await refresh();
      return normalized;
    },
    [refresh]
  );

  const checkInWithOffline = useCallback(
    async (
      input: { userId: string; hubId?: string; location: { lat: number; lng: number }; status: "online" | "offline" }
    ): Promise<StoredCheckin> => {
      try {
        return await checkIn(input);
      } catch (error) {
        const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
        if (!isOffline) throw error;
        const now = Date.now();
        const offlineEntry: StoredCheckin = {
          checkinId: `offline-${now}`,
          userId: input.userId,
          hubId: input.hubId,
          location: input.location,
          status: input.status,
          createdAt: now,
          expiresAt: now + 60 * 60 * 1000,
          syncState: "pending"
        };
        setCheckins((prev) => {
          const next = prev.filter((entry) => entry.userId !== offlineEntry.userId);
          next.push(offlineEntry);
          return next;
        });
        await upsertCacheItem("checkins", offlineEntry);
        await enqueueMutation({
          endpoint: "/api/checkin",
          method: "POST",
          body: input
        });
        return offlineEntry;
      }
    },
    [checkIn]
  );

  useEffect(() => {
    if (!cacheHydrated) return;
    void refresh();
  }, [refresh, cacheHydrated]);

  useEffect(() => {
    if (!options?.autoRefreshMs) return;
    const id = window.setInterval(() => {
      void refresh();
    }, options.autoRefreshMs);
    return () => window.clearInterval(id);
  }, [options?.autoRefreshMs, refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleSync = () => {
      void refresh();
    };
    window.addEventListener(OFFLINE_SYNC_EVENT, handleSync);
    return () => {
      window.removeEventListener(OFFLINE_SYNC_EVENT, handleSync);
    };
  }, [refresh]);

  return { checkins, loading, error, refresh, checkIn: checkInWithOffline };
};
