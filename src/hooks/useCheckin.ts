"use client";

import { useCallback, useEffect, useState } from "react";
import type { Checkin } from "../lib/types";
import { getBackend } from "../lib/backend";

export const useCheckin = (options?: { autoRefreshMs?: number }) => {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const backend = getBackend();
      const result = await backend.checkins.listActive({});
      setCheckins(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load check-ins");
    } finally {
      setLoading(false);
    }
  }, []);

  const checkIn = useCallback(
    async (input: { userId: string; hubId?: string; location: { lat: number; lng: number }; status: "online" | "offline" }) => {
      const backend = getBackend();
      const created = await backend.checkins.create(input);
      await refresh();
      return created;
    },
    [refresh]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!options?.autoRefreshMs) return;
    const id = window.setInterval(() => {
      void refresh();
    }, options.autoRefreshMs);
    return () => window.clearInterval(id);
  }, [options?.autoRefreshMs, refresh]);

  return { checkins, loading, error, refresh, checkIn };
};
