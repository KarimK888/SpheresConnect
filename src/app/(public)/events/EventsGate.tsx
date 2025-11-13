"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GateMessage } from "@/components/gates/GateMessage";
import { useSessionState } from "@/context/session";
import { useI18n } from "@/context/i18n";
import { getBackend } from "@/lib/backend";
import type { Event } from "@/lib/types";
import { EventsClient } from "./EventsClient";

type EventsPayload = {
  upcoming: Event[];
  past: Event[];
};

export const EventsGate = () => {
  const router = useRouter();
  const { t } = useI18n();
  const sessionUser = useSessionState((state) => state.user);
  const sessionLoading = useSessionState((state) => state.loading);

  const [payload, setPayload] = useState<EventsPayload | null>(null);
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
        const events = await backend.events.list();
        const now = Date.now();
        const upcoming = events.filter((event) => event.startsAt >= now);
        const past = events.filter((event) => event.startsAt < now);
        if (!cancelled) {
          setPayload({ upcoming, past });
          setError(null);
        }
      } catch (err) {
        console.error("[events] unable to load data", err);
        if (!cancelled) {
          setError(t("events_alert_error"));
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
    return <EventsSkeleton />;
  }

  if (!sessionUser) {
    return (
      <GateMessage
        title={t("events_title")}
        body={t("profile_login_required")}
        actionLabel={t("profile_go_to_login")}
        onAction={() => router.push("/login")}
      />
    );
  }

  if (loading || !payload) {
    return <EventsSkeleton />;
  }

  if (error) {
    return (
      <GateMessage
        title={t("events_title")}
        body={error}
        actionLabel={t("generic_retry")}
        onAction={() => setReloadToken((token) => token + 1)}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <EventsClient upcoming={payload.upcoming} past={payload.past} />
    </div>
  );
};

const EventsSkeleton = () => (
  <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10">
    <div className="space-y-2">
      <div className="h-8 w-40 animate-pulse rounded-full bg-border/30" />
      <div className="h-4 w-64 animate-pulse rounded-full bg-border/20" />
    </div>
    <div className="space-y-4 rounded-3xl border border-border/40 bg-border/10 p-6">
      <div className="h-6 w-48 animate-pulse rounded-full bg-border/20" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-12 animate-pulse rounded-full bg-border/20" />
        <div className="h-12 animate-pulse rounded-full bg-border/20" />
        <div className="h-12 animate-pulse rounded-full bg-border/20" />
        <div className="h-12 animate-pulse rounded-full bg-border/20" />
      </div>
      <div className="h-24 animate-pulse rounded-3xl bg-border/20" />
    </div>
    <div className="space-y-3">
      <div className="h-12 animate-pulse rounded-3xl bg-border/20" />
      <div className="h-12 animate-pulse rounded-3xl bg-border/20" />
      <div className="h-12 animate-pulse rounded-3xl bg-border/20" />
    </div>
  </div>
);
