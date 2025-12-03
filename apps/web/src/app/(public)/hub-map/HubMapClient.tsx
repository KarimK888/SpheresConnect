"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Map as HubMapView } from "@/components/Map";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useCheckin } from "@/hooks/useCheckin";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useI18n } from "@/context/i18n";
import type { Hub, Checkin, User, Event } from "@/lib/types";
import { adjustCachedRewardTotal } from "@/lib/offline/rewards";
import { cn } from "@/lib/utils";

interface HubMapClientProps {
  hubs: Hub[];
  initialCheckins: Checkin[];
  profiles: User[];
  rewardTotals: Record<string, number>;
  events: Event[];
}

type DecoratedCheckin = Checkin & {
  profile: User;
  hubName?: string | null;
  distanceKm?: number | null;
};

type HubStory = {
  tag: string;
  title: string;
  detail: string;
  highlight: string;
  cta: string;
  ctaLink?: string;
};

const FALLBACK_COORDS = { lat: 45.5017, lng: -73.5673 };
const HUB_RADIUS_KM = 1.2;
const HUB_PRESENCE_AVATAR_LIMIT = 4;

const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
};

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).slice(0, 2);
  if (!parts.length) return value.slice(0, 2).toUpperCase();
  return parts.map((segment) => segment[0]?.toUpperCase() ?? "").join("") || value.slice(0, 2).toUpperCase();
};

const PresenceAvatar = ({ profile, size = 28 }: { profile: User; size?: number }) => {
  const initials = getInitials(profile.displayName ?? profile.email);
  return (
    <div
      className="relative overflow-hidden rounded-full border border-border/60 bg-background/60 text-[0.55rem] font-semibold uppercase text-white"
      style={{ width: size, height: size }}
      title={profile.displayName ?? profile.email}
    >
      {profile.profilePictureUrl ? (
        <Image
          src={profile.profilePictureUrl}
          alt={profile.displayName ?? profile.email}
          fill
          sizes={`${size}px`}
          className="object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          unoptimized
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center">{initials}</span>
      )}
    </div>
  );
};

export const HubMapClient = ({ hubs, initialCheckins, profiles, rewardTotals, events }: HubMapClientProps) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const { checkins, checkIn } = useCheckin({ autoRefreshMs: 15000 });
  const geolocation = useGeolocation();
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [focusMode, setFocusMode] = useState<"global" | "nearby">("global");
  const [manualHubId, setManualHubId] = useState<string>(() => hubs[0]?.hubId ?? "");
  const [rewardFlash, setRewardFlash] = useState<string | null>(null);
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);
  const [filters, setFilters] = useState({ verified: false, rewarded: false });
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [liveRewardTotals, setLiveRewardTotals] = useState(rewardTotals);
  useEffect(() => {
    setLiveRewardTotals(rewardTotals);
  }, [rewardTotals]);

  const incrementRewardTotal = useCallback((userId: string, delta: number) => {
    setLiveRewardTotals((prev) => {
      const next = { ...prev };
      next[userId] = Math.max(0, (next[userId] ?? 0) + delta);
      return next;
    });
  }, []);

  const profilesById = useMemo(() => new Map(profiles.map((profile) => [profile.userId, profile])), [profiles]);
  const hubsById = useMemo(() => new Map(hubs.map((hub) => [hub.hubId, hub])), [hubs]);
  const rewardedUsers = useMemo(
    () =>
      new Set(
        Object.entries(liveRewardTotals)
          .filter(([, total]) => total > 0)
          .map(([userId]) => userId)
      ),
    [liveRewardTotals]
  );

  const activeCheckins = checkins.length ? checkins : initialCheckins;
  const viewerLocation = geolocation.coords ?? null;

  const autoHub = useMemo(() => {
    if (!viewerLocation) return null;
    let nearestHub: Hub | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const hub of hubs) {
      const distance = distanceKm(viewerLocation, hub.location);
      if (distance < nearestDistance) {
        nearestHub = hub;
        nearestDistance = distance;
      }
    }
    if (nearestHub && nearestDistance <= HUB_RADIUS_KM) {
      return nearestHub;
    }
    return null;
  }, [viewerLocation, hubs]);

  const manualHub = hubsById.get(manualHubId) ?? null;
  const effectiveHub = autoHub ?? manualHub ?? null;

  const enrichedCheckins = useMemo<DecoratedCheckin[]>(() => {
    const decorated: DecoratedCheckin[] = [];
    activeCheckins.forEach((entry) => {
      const profile = profilesById.get(entry.userId);
      if (!profile) return;
      const hub = entry.hubId ? hubsById.get(entry.hubId) : null;
      const distance = viewerLocation ? distanceKm(viewerLocation, entry.location) : null;
      decorated.push({ ...entry, profile, hubName: hub?.name ?? null, distanceKm: distance });
    });
    return decorated.sort((a, b) => b.createdAt - a.createdAt);
  }, [activeCheckins, profilesById, hubsById, viewerLocation]);

  const focusFilteredCheckins = useMemo(() => {
    if (focusMode === "nearby" && viewerLocation) {
      return enrichedCheckins
        .filter((entry) => typeof entry.distanceKm === "number" && entry.distanceKm <= 100)
        .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    }
    return enrichedCheckins;
  }, [enrichedCheckins, focusMode, viewerLocation]);

  const filteredCheckins = useMemo(() => {
    const source = focusFilteredCheckins.length ? focusFilteredCheckins : enrichedCheckins;
    return source.filter((entry) => {
      if (filters.verified && !entry.profile.isVerified) return false;
      if (filters.rewarded && !rewardedUsers.has(entry.userId)) return false;
      return true;
    });
  }, [focusFilteredCheckins, enrichedCheckins, filters.verified, filters.rewarded, rewardedUsers]);

  const presenceByHub = useMemo(() => {
    const map = new Map<string, DecoratedCheckin[]>();
    filteredCheckins.forEach((entry) => {
      if (!entry.hubId) return;
      const bucket = map.get(entry.hubId) ?? [];
      bucket.push(entry);
      map.set(entry.hubId, bucket);
    });
    return map;
  }, [filteredCheckins]);

  const hubStories = useMemo<HubStory[]>(() => {
    const stories: HubStory[] = [];
    const nearbyEvents = events
      .filter((event) => event.startsAt > Date.now())
      .sort((a, b) => a.startsAt - b.startsAt);
    const findNearestHub = (lat?: number, lng?: number) => {
      if (lat === undefined || lng === undefined) return null;
      let nearest: Hub | null = null;
      let distance = Number.POSITIVE_INFINITY;
      for (const hub of hubs) {
        const current = distanceKm({ lat, lng }, hub.location);
        if (current < distance) {
          nearest = hub;
          distance = current;
        }
      }
      return nearest;
    };
    if (nearbyEvents.length) {
      const nextEvent = nearbyEvents[0];
      const hubForEvent = findNearestHub(nextEvent.location?.lat, nextEvent.location?.lng);
      const eventTime = new Date(nextEvent.startsAt).toLocaleDateString(undefined, {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
      stories.push({
        tag: "Live stage",
        title: nextEvent.title,
        detail: `${hubForEvent?.name ?? "Global hub"} • ${eventTime}`,
        highlight: nextEvent.location?.address ?? nextEvent.description ?? "Drop-in RSVP",
        cta: "View event",
        ctaLink: `/events?eventId=${nextEvent.eventId}`
      });
    }

    const [topHubId] = [...presenceByHub.entries()].sort((a, b) => b[1].length - a[1].length)[0] ?? [];
    if (topHubId) {
      const hub = hubsById.get(topHubId);
      const entries = presenceByHub.get(topHubId) ?? [];
      stories.push({
        tag: "Hub pulse",
        title: hub?.name ?? "Live hub",
        detail: `${entries.length} creators streaming presence`,
        highlight: entries[0]
          ? `${entries[0].profile.displayName} leading the lounge`
          : "Heat up your crew",
        cta: "View hub",
        ctaLink: hub ? `/hub-map/workspace?hub=${hub.hubId}` : "/hub-map"
      });
    }

    const championEntry = filteredCheckins.reduce<{ entry: DecoratedCheckin; total: number } | null>(
      (acc, entry) => {
        const total = liveRewardTotals[entry.userId] ?? 0;
        if (!acc || total > acc.total) {
          return { entry, total };
        }
        return acc;
      },
      null
    );
    if (championEntry) {
      const mentionHub = championEntry.entry.hubName ?? t("hub_unknown_hub");
      stories.push({
        tag: "Spotlight creator",
        title: championEntry.entry.profile.displayName,
        detail: championEntry.entry.profile.profile?.headline ?? "Creative on the move",
        highlight: `Rewards ${championEntry.total} pts · ${mentionHub}`,
        cta: "Send a note",
        ctaLink: `/profile/${championEntry.entry.userId}`
      });
    }

    if (!stories.length && hubs.length) {
      stories.push({
        tag: "Hub scout",
        title: hubs[0].name,
        detail: "Momentum keeps building across your network",
        highlight: `${filteredCheckins.length} check-ins visible`,
        cta: "Refresh",
        ctaLink: "/hub-map/workspace"
      });
    }

    return stories;
  }, [events, hubs, presenceByHub, filteredCheckins, liveRewardTotals, t, hubsById]);

  useEffect(() => {
    setActiveStoryIndex(0);
  }, [hubStories.length]);

  useEffect(() => {
    if (!hubStories.length || typeof window === "undefined") return;
    const interval = window.setInterval(() => {
      setActiveStoryIndex((prev) => (prev + 1) % hubStories.length);
    }, 7000);
    return () => window.clearInterval(interval);
  }, [hubStories.length]);

  const handlePrevStory = () => {
    if (!hubStories.length) return;
    setActiveStoryIndex((prev) => (prev - 1 + hubStories.length) % hubStories.length);
  };

  const handleNextStory = () => {
    if (!hubStories.length) return;
    setActiveStoryIndex((prev) => (prev + 1) % hubStories.length);
  };

  const activeStory = hubStories.length ? hubStories[activeStoryIndex % hubStories.length] : null;

  const handleStoryCta = useCallback(() => {
    if (!activeStory) return;
    if (activeStory.ctaLink) {
      router.push(activeStory.ctaLink);
      return;
    }
    router.push("/hub-map/workspace");
  }, [activeStory, router]);

  const handleCheckIn = async () => {
    if (!user || !effectiveHub) return;
    const location = viewerLocation ?? effectiveHub.location ?? FALLBACK_COORDS;
    const created = await checkIn({
      userId: user.userId,
      status: online ? "online" : "offline",
      location,
      hubId: effectiveHub.hubId
    });
    const offline = created?.syncState === "pending" || (typeof navigator !== "undefined" && navigator.onLine === false);
    if (offline) {
      setWorkspaceNotice(t("hub_reward_queue_notice"));
      setTimeout(() => setWorkspaceNotice(null), 4000);
    }
    await adjustCachedRewardTotal(user.userId, 10);
    incrementRewardTotal(user.userId, 10);
    setRewardFlash(t("hub_reward_checkin_success"));
    setTimeout(() => setRewardFlash(null), 4000);
  };

  const canSharePresence = Boolean(user && effectiveHub);

  const locationStatusCopy = useMemo(() => {
    if (!geolocation.supported) return t("hub_geo_not_supported");
    if (geolocation.loading) return t("hub_geo_fetching");
    if (geolocation.permission === "denied") return t("hub_geo_denied");
    if (viewerLocation && autoHub) {
      return t("hub_geo_ready", {
        accuracy: Math.round(geolocation.coords?.accuracy ?? 0),
        hub: autoHub.name
      });
    }
    if (!viewerLocation && effectiveHub) {
      return t("hub_geo_manual", { hub: effectiveHub.name });
    }
    if (viewerLocation && !autoHub) {
      return t("hub_geo_outside_hub");
    }
    return t("hub_geo_request_hint");
  }, [autoHub, effectiveHub, geolocation, t, viewerLocation]);

  const uniqueCreatorsOnline = useMemo(() => new Set(filteredCheckins.map((entry) => entry.userId)).size, [filteredCheckins]);
  const activeHubCount = presenceByHub.size;
  const focusLabel = focusMode === "nearby" ? t("hub_filter_nearby") : t("hub_filter_global");
  const accuracyStatus = geolocation.loading
    ? t("generic_loading")
    : viewerLocation
      ? `${Math.round(geolocation.coords?.accuracy ?? 0)} m`
      : t("hub_geo_fetching");
  const locationModeLabel = autoHub
    ? `Auto · ${autoHub.name}`
    : manualHub
      ? `Manual · ${manualHub.name}`
      : t("hub_geo_request_hint");
  const latestPulse = filteredCheckins[0] ?? null;
  const latestHubName = latestPulse?.hubName ?? t("hub_unknown_hub");
  const latestPulseLabel = latestPulse
    ? `${latestHubName} • ${new Date(latestPulse.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : t("hub_recent_activity_empty");
  const flashWorkspaceNotice = useCallback((message: string) => {
    setWorkspaceNotice(message);
    if (typeof window !== "undefined") {
      window.setTimeout(() => setWorkspaceNotice(null), 4000);
    }
  }, []);
  const toggleFocusMode = useCallback(() => {
    if (focusMode === "global" && viewerLocation) {
      setFocusMode("nearby");
      return;
    }
    setFocusMode("global");
  }, [focusMode, viewerLocation]);
  const announceLocationStatus = useCallback(() => {
    flashWorkspaceNotice(locationStatusCopy);
  }, [flashWorkspaceNotice, locationStatusCopy]);
  const handleExportCsv = useCallback(() => {
    if (!filteredCheckins.length) {
      flashWorkspaceNotice(t("hub_recent_activity_empty"));
      return;
    }
    const header = ["Hub", "Creator", "Status", "Checked In"];
    const rows = filteredCheckins.map((entry) => {
      const hubName = entry.hubName ?? t("hub_unknown_hub");
      const creatorName = entry.profile.displayName ?? entry.profile.email;
      const status = entry.status.toUpperCase();
      const timestamp = new Date(entry.createdAt).toISOString();
      return [hubName, creatorName, status, timestamp];
    });
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "hub-checkins.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    flashWorkspaceNotice("CSV exported");
  }, [filteredCheckins, t, flashWorkspaceNotice]);
  const handleCopyInvite = useCallback(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      flashWorkspaceNotice("Unable to copy invite link");
      return;
    }
    const inviteUrl = `${window.location.origin}/signup`;
    navigator.clipboard
      ?.writeText(inviteUrl)
      .then(() => flashWorkspaceNotice("Invite link copied"))
      .catch(() => flashWorkspaceNotice("Unable to copy invite link"));
  }, [flashWorkspaceNotice]);
  const hourlyBuckets = useMemo(() => {
    const now = Date.now();
    const bucketMs = 1000 * 60 * 60;
    return Array.from({ length: 12 }, (_, index) => {
      const start = now - (11 - index) * bucketMs;
      const end = start + bucketMs;
      const count = filteredCheckins.filter((entry) => entry.createdAt >= start && entry.createdAt < end).length;
      const label = new Date(start).getHours().toString().padStart(2, "0");
      return { label, count };
    });
  }, [filteredCheckins]);
  const maxHourly = Math.max(...hourlyBuckets.map((bucket) => bucket.count), 1);
  const chatFreshThresholdMs = 1000 * 60 * 15;
  const getChatStatus = (entry: DecoratedCheckin) => {
    const ageMs = Date.now() - entry.createdAt;
    if (ageMs <= chatFreshThresholdMs) return "In conversation";
    if (ageMs <= chatFreshThresholdMs * 2) return "On standby";
    return "Idle";
  };
  const getProjectTag = (entry: DecoratedCheckin) => {
    const projectTitle = entry.profile.profile?.projects?.[0]?.title;
    if (projectTitle) return projectTitle;
    return entry.profile.profile?.headline ?? "Studio focus";
  };
  const getRewardBadge = (entry: DecoratedCheckin) => {
    const total = liveRewardTotals[entry.userId] ?? 0;
    if (total >= 250) return `Streak ${Math.floor(total / 50)}x`;
    if (total >= 150) return `${total} pts`;
    if (total > 0) return `Rewards ${total}`;
    return "Newcomer";
  };
  const heroStats = [
    {
      label: "Creators live",
      value: filteredCheckins.length.toString(),
      detail: `${uniqueCreatorsOnline} unique collaborators`
    },
    {
      label: "Active hubs",
      value: activeHubCount.toString(),
      detail: `${hubs.length} hubs in workspace`
    },
    {
      label: "Focus",
      value: focusLabel,
      detail: "Tap to change the feed"
    },
    {
      label: "Precision",
      value: accuracyStatus,
      detail: locationModeLabel
    }
  ];
  const mobileActionControls = useMemo(
    () => [
      {
        id: "focus",
        label: "Focus",
        value: focusLabel,
        action: toggleFocusMode,
        disabled: !viewerLocation && focusMode === "nearby"
      },
      {
        id: "precision",
        label: t("hub_geo_status_label"),
        value: accuracyStatus,
        action: announceLocationStatus
      },
      {
        id: "export",
        label: "Export",
        value: "CSV",
        action: handleExportCsv,
        disabled: filteredCheckins.length === 0
      },
      {
        id: "invite",
        label: "Invite",
        value: "Link",
        action: handleCopyInvite
      }
    ],
    [
      focusLabel,
      toggleFocusMode,
      viewerLocation,
      focusMode,
      t,
      accuracyStatus,
      announceLocationStatus,
      handleExportCsv,
      filteredCheckins.length,
      handleCopyInvite
    ]
  );
  const mapHeightClass = isMobile ? "h-[300px]" : "h-[420px]";

  return (
    <div className="space-y-6">
      <header className="rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/60 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.8)]">
        <div className={cn("flex flex-wrap items-start justify-between gap-6", isMobile && "flex-col-reverse")}>
          <div className={cn("space-y-2 min-w-[220px]", isMobile && "w-full min-w-0")}>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Workspace</p>
            <h1 className="text-3xl font-semibold">{t("hub_title")}</h1>
            <p className="text-sm text-white/70">{t("hub_subtitle")}</p>
            <div className="text-xs text-white/70">
              <span className="font-semibold text-white">{latestPulse ? latestPulse.profile.displayName : "N/A"}</span>
              <span className="ml-2 text-[0.7rem] lowercase tracking-[0.3em]">{latestPulseLabel}</span>
            </div>
          </div>

          <div className={cn("flex flex-col items-end gap-3 text-right", isMobile && "w-full items-stretch text-left")}>
            <div className={cn("flex items-center gap-2 text-sm", isMobile && "justify-between")}>
              <Switch checked={online} onCheckedChange={setOnline} aria-label={t("hub_presence_toggle")} />
              <span className="uppercase tracking-[0.3em] text-[0.65rem] text-white/70">{online ? t("generic_online") : t("generic_offline")}</span>
            </div>
            <Button
              type="button"
              disabled={!canSharePresence}
              onClick={handleCheckIn}
              className={cn(isMobile && "w-full rounded-2xl py-5 text-base font-semibold")}
            >
              {user ? (canSharePresence ? t("hub_check_in_cta") : t("hub_check_in_disabled")) : t("generic_login_to_check_in")}
            </Button>
            <p className={cn("text-xs uppercase tracking-[0.3em] text-white/60", isMobile && "text-left")}>{locationStatusCopy}</p>
          </div>
        </div>
        <div className={cn("mt-6 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4", isMobile && "grid-cols-2 gap-2 text-xs")}>
          {heroStats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-white/60">{stat.label}</p>
              <p className="text-xl font-semibold text-white">{stat.value}</p>
              <p className="text-[0.7rem] text-white/70">{stat.detail}</p>
            </div>
          ))}
        </div>
        {isMobile && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:hidden">
            {mobileActionControls.map((control) => (
              <button
                key={control.id}
                type="button"
                onClick={control.action}
                disabled={control.disabled}
                className="rounded-2xl border border-white/15 bg-white/5 p-3 text-left text-white/80 transition hover:bg-white/10 disabled:opacity-40"
              >
                <span className="text-[0.55rem] uppercase tracking-[0.3em] text-white/60">{control.label}</span>
                <span className="text-lg font-semibold text-white">{control.value}</span>
              </button>
            ))}
            <Button asChild variant="ghost" className="col-span-2 justify-center rounded-2xl py-4 text-base text-white">
              <Link href="/events">Schedule event</Link>
            </Button>
          </div>
        )}
      </header>

      {activeStory && (
        <section className="relative rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900/80 via-slate-900/70 to-slate-900/60 p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,0.85)]">
          <span className="text-[0.6rem] uppercase tracking-[0.4em] text-white/60">{activeStory.tag}</span>
          <div className="mt-2 flex items-start justify-between gap-6">
            <div className="min-w-0 space-y-2">
              <h3 className="text-xl font-semibold">{activeStory.title}</h3>
              <p className="text-sm text-white/70">{activeStory.detail}</p>
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">{activeStory.highlight}</p>
            </div>
              <div className="flex flex-col items-end gap-2">
                <Button size="sm" variant="outline" type="button" onClick={handleStoryCta}>
                  {activeStory.cta}
                </Button>
              <div className="flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.3em] text-white/60">
                <button
                  type="button"
                  className="rounded-full border border-white/30 px-3 py-1 text-xs transition hover:border-white"
                  onClick={handlePrevStory}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="rounded-full border border-white/30 px-3 py-1 text-xs transition hover:border-white"
                  onClick={handleNextStory}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1">
            {hubStories.map((story, index) => (
              <span
                key={`${story.title}-${index}`}
                className={`h-1.5 w-8 rounded-full transition ${
                  index === activeStoryIndex ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        </section>
      )}

      {rewardFlash && (
        <div className="rounded-2xl border border-border/60 bg-border/20 px-4 py-3 text-sm text-muted-foreground">
          {rewardFlash}
        </div>
      )}
      {workspaceNotice && (
        <div className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white/70">
          {workspaceNotice}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-border/10 p-5 shadow-lg shadow-slate-900/40">
            <div className={cn("relative overflow-hidden rounded-2xl border border-white/5 bg-background/30", mapHeightClass)}>
              <HubMapView
                hubs={hubs}
                checkins={filteredCheckins}
                viewerLocation={viewerLocation ?? effectiveHub?.location ?? null}
              />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(2,6,23,0.85))]" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[0.65rem] text-white/70">
                <span className="inline-flex h-2 w-2 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-emerald-400" />
                <span>Heat shows dense check-ins</span>
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-xs text-white/70 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/40 bg-background/60 p-3">
                <p className="uppercase tracking-[0.3em] text-[0.6rem] text-white/60">Focus</p>
                <p className="text-sm font-semibold text-white">{focusLabel}</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-background/60 p-3">
                <p className="uppercase tracking-[0.3em] text-[0.6rem] text-white/60">Hubs</p>
                <p className="text-sm font-semibold text-white">{activeHubCount} live</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-background/60 p-3">
                <p className="uppercase tracking-[0.3em] text-[0.6rem] text-white/60">Accuracy</p>
                <p className="text-sm font-semibold text-white">{accuracyStatus}</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-border/40 bg-slate-950/70 p-5 shadow-lg shadow-slate-900/40">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
              <span>Check-ins / hr</span>
              <span>{filteredCheckins.length} total</span>
            </div>
            <div className="mt-3 flex h-32 items-end justify-between gap-1">
              {hourlyBuckets.map((bucket) => {
                const heightPercent = Math.max((bucket.count / maxHourly) * 100, 4);
                return (
                  <div key={bucket.label} className="flex flex-1 flex-col items-center gap-1 last:flex-none">
                    <div
                      className="w-full rounded-full bg-gradient-to-t from-pink-500 via-purple-500 to-emerald-400 transition-all duration-200"
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-[0.55rem] uppercase tracking-[0.3em] text-white/40">{bucket.label}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[0.65rem] text-white/60">
              Layered heat and hourly pulses keep teams aware of real-time momentum.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="border-border/60 bg-card/80">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-2">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("hub_geo_status_label")}</p>
                <p className="text-sm text-white">{locationStatusCopy}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={geolocation.request}
                disabled={!geolocation.supported || geolocation.loading}
              >
                {geolocation.loading ? t("generic_loading") : t("hub_geo_use_location")}
              </Button>
              <Label htmlFor="manualHub" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {t("hub_manual_select_label")}
              </Label>
              <select
                id="manualHub"
                value={manualHubId}
                onChange={(event) => setManualHubId(event.target.value)}
                className="w-full rounded-xl border border-border/60 bg-background/80 p-3 text-sm text-white"
              >
                {hubs.map((hub) => (
                  <option key={hub.hubId} value={hub.hubId}>
                    {hub.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">{t("hub_manual_select_hint")}</p>
              <div className="space-y-3 rounded-2xl border border-border/50 bg-background/80 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant={focusMode === "global" ? "default" : "ghost"}
                    type="button"
                    onClick={() => setFocusMode("global")}
                  >
                    {t("hub_filter_global")}
                  </Button>
                  <Button
                    size="sm"
                    variant={focusMode === "nearby" ? "default" : "ghost"}
                    type="button"
                    onClick={() => viewerLocation && setFocusMode("nearby")}
                    disabled={!viewerLocation}
                  >
                    {t("hub_filter_nearby")}
                  </Button>
                </div>
                <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">Filters</p>
                <div className="flex flex-col gap-2 text-sm">
                  <label className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Verified creators</span>
                    <Switch
                      checked={filters.verified}
                      onCheckedChange={(value) => setFilters((prev) => ({ ...prev, verified: value }))}
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Rewarded creators</span>
                    <Switch
                      checked={filters.rewarded}
                      onCheckedChange={(value) => setFilters((prev) => ({ ...prev, rewarded: value }))}
                    />
                  </label>
                </div>
                {(filters.verified || filters.rewarded) && (
                  <p className="text-[0.65rem] text-muted-foreground">
                    Showing {filteredCheckins.length} creators after filters
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 overflow-x-auto">
                <Button type="button" variant="outline" size="sm" onClick={handleExportCsv}>
                  Export CSV
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleCopyInvite}>
                  Copy invite link
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/events">Schedule event</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">{t("hub_active_hubs_title")}</h2>
                <Badge variant="outline">{activeHubCount} live</Badge>
              </div>
              <div className={cn("space-y-3 text-sm text-muted-foreground", isMobile && "max-h-80 overflow-y-auto pr-1")}>
                {hubs.map((hub) => {
                  const livePresence = presenceByHub.get(hub.hubId) ?? [];
                  const label = livePresence.length
                    ? t("hub_presence_live_label", { count: livePresence.length })
                    : t("hub_active_hubs_count", { count: hub.activeUsers.length });
                  return (
                    <div
                      key={hub.hubId}
                      className="rounded-2xl border border-border/30 bg-background/40 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white">{hub.name}</span>
                        <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{label}</span>
                      </div>
                      {livePresence.length ? (
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex -space-x-2">
                            {livePresence.slice(0, HUB_PRESENCE_AVATAR_LIMIT).map((entry) => (
                              <PresenceAvatar key={entry.checkinId} profile={entry.profile} size={28} />
                            ))}
                          </div>
                          {livePresence.length > HUB_PRESENCE_AVATAR_LIMIT && (
                            <span className="text-xs text-muted-foreground">
                              +{livePresence.length - HUB_PRESENCE_AVATAR_LIMIT}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="mt-2 text-xs text-muted-foreground">{t("hub_presence_empty")}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border/60 bg-card/80">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">{t("hub_recent_activity_title")}</h2>
            <Badge variant="outline">{filteredCheckins.length}</Badge>
          </div>
          <div className="space-y-3">
            {filteredCheckins.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/40 p-4 text-center text-xs text-muted-foreground">
                {focusMode === "nearby" && viewerLocation
                  ? t("hub_recent_activity_nearby_empty")
                  : t("hub_recent_activity_empty")}
              </div>
            ) : (
              filteredCheckins.map((entry) => (
                <div
                  key={entry.checkinId}
                  className="flex items-center gap-3 rounded-2xl border border-border/40 bg-background/40 p-4"
                >
                  <PresenceAvatar profile={entry.profile} size={42} />
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{entry.profile.displayName}</span>
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1 text-[0.6rem] uppercase tracking-[0.3em]"
                      >
                        <span
                          className={`h-2 w-2 rounded-full border border-white/20 ${
                            entry.status === "online"
                              ? "bg-emerald-400 animate-pulse"
                              : entry.status === "offline"
                                ? "bg-rose-500 animate-ping"
                                : "bg-white/60"
                          }`}
                        />
                        {entry.status}
                      </Badge>
                    </div>
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
                      {entry.hubName ? t("hub_recent_activity_hub", { hub: entry.hubName }) : t("hub_unknown_hub")}
                    </p>
                    <div className="flex items-center gap-4 text-[0.7rem] text-muted-foreground">
                      <span>{new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {typeof entry.distanceKm === "number" && (
                        <span>{t("hub_recent_activity_distance", { distance: Math.round(entry.distanceKm) })}</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[0.55rem] uppercase tracking-[0.3em] text-white/70">
                      <span className="rounded-full border border-white/20 bg-white/5 px-2 py-1">
                        Chat · {getChatStatus(entry)}
                      </span>
                      <span className="rounded-full border border-white/20 bg-white/5 px-2 py-1">
                        Project · {getProjectTag(entry)}
                      </span>
                      <span className="rounded-full border border-white/20 bg-white/5 px-2 py-1">
                        Reward · {getRewardBadge(entry)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
