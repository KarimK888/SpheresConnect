"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GateMessage } from "@/components/gates/GateMessage";
import { useSessionState } from "@/context/session";
import { useI18n } from "@/context/i18n";
import { getBackend } from "@/lib/backend";
import type { Hub, Checkin, User } from "@/lib/types";
import { HubMapClient } from "./HubMapClient";

export const HubMapGate = () => {
  const router = useRouter();
  const { t } = useI18n();
  const sessionUser = useSessionState((state) => state.user);
  const sessionLoading = useSessionState((state) => state.loading);

  const [payload, setPayload] = useState<{ hubs: Hub[]; checkins: Checkin[]; profiles: User[] } | null>(null);
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
    const backend = getBackend();

    const load = async () => {
      setLoading(true);
      try {
        const [hubs, checkins, users] = await Promise.all([
          backend.hubs.list(),
          backend.checkins.listActive({}),
          backend.users.list({})
        ]);
        const directory = new Map(users.map((user) => [user.userId, user]));
        const filteredCheckins = checkins.filter((entry) => directory.has(entry.userId));
        if (!cancelled) {
          setPayload({ hubs, checkins: filteredCheckins, profiles: users });
          setError(null);
        }
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
  }, [sessionLoading, sessionUser, reloadToken, t]);

  if (sessionLoading) {
    return <HubMapSkeleton />;
  }

  if (!sessionUser) {
    return (
      <GateMessage
        title={t("hub_title")}
        body={t("profile_login_required")}
        actionLabel={t("profile_go_to_login")}
        onAction={() => router.push("/login")}
      />
    );
  }

  if (loading || !payload) {
    return <HubMapSkeleton />;
  }

  if (error) {
    return (
      <GateMessage
        title={t("hub_title")}
        body={error}
        actionLabel={t("generic_retry")}
        onAction={() => setReloadToken((token) => token + 1)}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <HubMapClient hubs={payload.hubs} initialCheckins={payload.checkins} profiles={payload.profiles} />
    </div>
  );
};

const HubMapSkeleton = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-10">
    <div className="h-8 w-48 animate-pulse rounded-full bg-border/30" />
    <div className="h-6 w-64 animate-pulse rounded-full bg-border/20" />
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="h-80 animate-pulse rounded-3xl bg-border/20" />
      <div className="flex flex-col gap-4">
        <div className="h-32 animate-pulse rounded-3xl bg-border/20" />
        <div className="h-32 animate-pulse rounded-3xl bg-border/20" />
      </div>
    </div>
  </div>
);
