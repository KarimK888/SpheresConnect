"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GateMessage } from "@/components/gates/GateMessage";
import { useSessionState } from "@/context/session";
import { useI18n } from "@/context/i18n";
import type { RewardLog } from "@/lib/types";
import { RewardsClient } from "./RewardsClient";

type RewardsPayload = {
  total: number;
  logs: RewardLog[];
};

export const RewardsGate = () => {
  const router = useRouter();
  const { t } = useI18n();
  const sessionUser = useSessionState((state) => state.user);
  const sessionLoading = useSessionState((state) => state.loading);

  const [payload, setPayload] = useState<RewardsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (sessionLoading) return;
    if (!sessionUser) {
      setPayload(null);
      setError(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/rewards?userId=${encodeURIComponent(sessionUser.userId)}`, {
          method: "GET",
          headers: { Accept: "application/json" }
        });
        if (!response.ok) {
          const message = await response.text().catch(() => response.statusText);
          throw new Error(message || "Failed to load rewards");
        }
        const summary = (await response.json()) as RewardsPayload;
        if (!cancelled) {
          setPayload(summary);
          setError(null);
        }
      } catch (err) {
        console.error("[rewards] unable to load data", err);
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
  }, [sessionLoading, sessionUser, reloadToken, t]);

  if (sessionLoading) {
    return <RewardsSkeleton />;
  }

  if (!sessionUser) {
    return (
      <GateMessage
        title={t("rewards_title")}
        body={t("profile_login_required")}
        actionLabel={t("profile_go_to_login")}
        onAction={() => router.push("/login")}
      />
    );
  }

  if (loading || !payload) {
    return <RewardsSkeleton />;
  }

  if (error) {
    return (
      <GateMessage
        title={t("rewards_title")}
        body={error}
        actionLabel={t("generic_retry")}
        onAction={() => setReloadToken((token) => token + 1)}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <RewardsClient summary={payload} userId={sessionUser.userId} onRefresh={() => setReloadToken((token) => token + 1)} />
    </div>
  );
};

const RewardsSkeleton = () => (
  <div className="mx-auto w-full max-w-4xl space-y-4 px-6 py-10">
    <div className="h-8 w-40 animate-pulse rounded-full bg-border/30" />
    <div className="h-4 w-72 animate-pulse rounded-full bg-border/20" />
    <div className="h-32 animate-pulse rounded-3xl bg-border/20" />
    <div className="space-y-3">
      <div className="h-14 animate-pulse rounded-3xl bg-border/20" />
      <div className="h-14 animate-pulse rounded-3xl bg-border/20" />
      <div className="h-14 animate-pulse rounded-3xl bg-border/20" />
    </div>
  </div>
);
