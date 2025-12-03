"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MatchSuggestion } from "../lib/types";
import { getBackend } from "../lib/backend";
import { useI18n } from "@/context/i18n";
import { enqueueNotification } from "@/context/notifications";

export const useMatch = (userId: string | null | undefined) => {
  const [matches, setMatches] = useState<MatchSuggestion[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, "connected" | "skipped">>({});
  const { t } = useI18n();

  const fetchMatches = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const backend = getBackend();
      const result = await backend.matches.suggest({ userId });
      setMatches(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load matches");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setMatches([]);
      setHistory({});
      setLoading(false);
    }
  }, [userId]);

  const fetchHistory = useCallback(async () => {
    if (!userId) {
      setHistory({});
      return;
    }
    try {
      const backend = getBackend();
      const entries = await backend.matches.history({ userId });
      const mapped = entries.reduce<Record<string, "connected" | "skipped">>((acc, entry) => {
        acc[entry.targetId] = entry.action;
        return acc;
      }, {});
      setHistory(mapped);
    } catch (err) {
      console.warn("[useMatch] history fetch failed", err);
    }
  }, [userId]);

  useEffect(() => {
    void fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const visibleMatches = useMemo(
    () => matches.filter((candidate) => !history[candidate.userId]),
    [matches, history]
  );
  const current = useMemo(() => visibleMatches[0], [visibleMatches]);

  const persistDecision = useCallback(
    async (candidateId: string, action: "connected" | "skipped") => {
      if (!userId) return;
      setHistory((state) => ({ ...state, [candidateId]: action }));
      try {
        const backend = getBackend();
        const result = await backend.matches.recordAction({ userId, targetId: candidateId, action });
        if (result?.match) {
          enqueueNotification({
            kind: "system",
            title: t("notifications_profile_match_title"),
            body: t("notifications_profile_match_body", { name: result.match.user.displayName }),
            link: result.match.chatId ? `/messages?chat=${result.match.chatId}` : "/messages"
          });
        }
      } catch (err) {
        console.warn("[useMatch] unable to persist match action", err);
      }
    },
    [t, userId]
  );

  const onConnect = useCallback(
    (candidateId: string) => {
      void persistDecision(candidateId, "connected");
    },
    [persistDecision]
  );

  const onSkip = useCallback(
    (candidateId: string) => {
      void persistDecision(candidateId, "skipped");
    },
    [persistDecision]
  );

  return {
    matches: visibleMatches,
    rawMatches: matches,
    loading,
    error,
    current,
    refresh: fetchMatches,
    onConnect,
    onSkip
  };
};
