"use client";

import { useMemo, useState } from "react";
import { Map as HubMapView } from "@/components/Map";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useCheckin } from "@/hooks/useCheckin";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useI18n } from "@/context/i18n";
import type { Hub, Checkin, User } from "@/lib/types";

interface HubMapClientProps {
  hubs: Hub[];
  initialCheckins: Checkin[];
  profiles: User[];
}

type DecoratedCheckin = Checkin & {
  profile: User;
  hubName?: string | null;
  distanceKm?: number | null;
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
      className="overflow-hidden rounded-full border border-border/60 bg-background/60 text-[0.55rem] font-semibold uppercase text-white"
      style={{ width: size, height: size }}
      title={profile.displayName ?? profile.email}
    >
      {profile.profilePictureUrl ? (
        <img
          src={profile.profilePictureUrl}
          alt={profile.displayName ?? profile.email}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center">{initials}</span>
      )}
    </div>
  );
};

export const HubMapClient = ({ hubs, initialCheckins, profiles }: HubMapClientProps) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const { checkins, checkIn } = useCheckin({ autoRefreshMs: 15000 });
  const geolocation = useGeolocation();
  const [online, setOnline] = useState(true);
  const [focusMode, setFocusMode] = useState<"global" | "nearby">("global");
  const [manualHubId, setManualHubId] = useState<string>(() => hubs[0]?.hubId ?? "");
  const [rewardFlash, setRewardFlash] = useState<string | null>(null);

  const profilesById = useMemo(() => new Map(profiles.map((profile) => [profile.userId, profile])), [profiles]);
  const hubsById = useMemo(() => new Map(hubs.map((hub) => [hub.hubId, hub])), [hubs]);

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

  const presenceByHub = useMemo(() => {
    const map = new Map<string, DecoratedCheckin[]>();
    enrichedCheckins.forEach((entry) => {
      if (!entry.hubId) return;
      const bucket = map.get(entry.hubId) ?? [];
      bucket.push(entry);
      map.set(entry.hubId, bucket);
    });
    return map;
  }, [enrichedCheckins]);

  const filteredCheckins = useMemo(() => {
    if (focusMode === "nearby" && viewerLocation) {
      return enrichedCheckins
        .filter((entry) => typeof entry.distanceKm === "number" && entry.distanceKm <= 100)
        .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    }
    return enrichedCheckins;
  }, [enrichedCheckins, focusMode, viewerLocation]);

  const checkinsForStats =
    focusMode === "nearby" && !viewerLocation
      ? enrichedCheckins
      : filteredCheckins.length
        ? filteredCheckins
        : enrichedCheckins;

  const handleCheckIn = async () => {
    if (!user || !effectiveHub) return;
    const location = viewerLocation ?? effectiveHub.location ?? FALLBACK_COORDS;
    await checkIn({
      userId: user.userId,
      status: online ? "online" : "offline",
      location,
      hubId: effectiveHub.hubId
    });
    try {
      await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.userId,
          action: "checkin",
          points: 10
        })
      });
      setRewardFlash(t("hub_reward_checkin_success"));
      setTimeout(() => setRewardFlash(null), 4000);
    } catch (error) {
      console.warn("[hub-map] reward log failed", error);
    }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">{t("hub_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("hub_subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Switch checked={online} onCheckedChange={setOnline} aria-label={t("hub_presence_toggle")} />
          <span className="text-sm text-muted-foreground">{online ? t("generic_online") : t("generic_offline")}</span>
          <Button disabled={!canSharePresence} onClick={handleCheckIn}>
            {user ? (canSharePresence ? t("hub_check_in_cta") : t("hub_check_in_disabled")) : t("generic_login_to_check_in")}
          </Button>
        </div>
      </div>

      {rewardFlash && (
        <div className="rounded-2xl border border-border/60 bg-border/20 px-4 py-3 text-sm text-muted-foreground">
          {rewardFlash}
        </div>
      )}

      <Card className="border-border/60 bg-card/80">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("hub_geo_status_label")}</p>
            <p className="text-sm text-white">{locationStatusCopy}</p>
            {geolocation.error && <p className="text-xs text-accent">{geolocation.error}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={geolocation.request} disabled={!geolocation.supported || geolocation.loading}>
              {geolocation.loading ? t("generic_loading") : t("hub_geo_use_location")}
            </Button>
            <div className="rounded-full border border-border/60 bg-background/40 p-1 text-xs">
              <Button
                size="sm"
                variant={focusMode === "global" ? "default" : "ghost"}
                className="px-4"
                onClick={() => setFocusMode("global")}
              >
                {t("hub_filter_global")}
              </Button>
              <Button
                size="sm"
                variant={focusMode === "nearby" ? "default" : "ghost"}
                className="px-4"
                onClick={() => viewerLocation && setFocusMode("nearby")}
                disabled={!viewerLocation}
              >
                {t("hub_filter_nearby")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/70">
        <CardContent className="space-y-2 p-5">
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
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-3xl border border-border/60 bg-border/10 p-4">
          <HubMapView
            hubs={hubs}
            checkins={filteredCheckins}
            viewerLocation={viewerLocation ?? effectiveHub?.location ?? null}
          />
        </div>

        <div className="flex flex-col gap-4">
          <Card className="border-border/60 bg-card/80">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {focusMode === "nearby" ? t("hub_nearby_creatives_label") : t("hub_live_creatives_label")}
                  </p>
                  <p className="text-2xl font-semibold text-white">{checkinsForStats.length}</p>
                </div>
                <Badge>{t("hub_live_creatives_delta")}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {focusMode === "nearby" ? t("hub_nearby_creatives_description") : t("hub_live_creatives_description")}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80">
            <CardContent className="space-y-2 p-5">
              <h2 className="text-sm font-semibold text-white">{t("hub_active_hubs_title")}</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {hubs.map((hub) => {
                  const livePresence = presenceByHub.get(hub.hubId) ?? [];
                  const label = livePresence.length
                    ? t("hub_presence_live_label", { count: livePresence.length })
                    : t("hub_active_hubs_count", { count: hub.activeUsers.length });
                  return (
                    <li
                      key={hub.hubId}
                      className="flex flex-col gap-2 rounded-lg border border-border/30 bg-background/40 px-3 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white">{hub.name}</span>
                        <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{label}</span>
                      </div>
                      {livePresence.length ? (
                        <div className="flex items-center gap-2">
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
                        <span className="text-xs text-muted-foreground">{t("hub_presence_empty")}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border/60 bg-card/80">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">{t("hub_recent_activity_title")}</h2>
            <Badge variant="outline">{filteredCheckins.length}</Badge>
          </div>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {filteredCheckins.map((entry) => (
              <li
                key={entry.checkinId}
                className="flex items-center justify-between rounded-xl border border-border/40 bg-background/40 px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="text-white">{entry.profile.displayName}</span>
                  <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{entry.status.toUpperCase()}</span>
                  <span className="text-2xs text-muted-foreground">
                    {entry.hubName ? t("hub_recent_activity_hub", { hub: entry.hubName }) : t("hub_unknown_hub")}
                  </span>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  {typeof entry.distanceKm === "number" && (
                    <p>{t("hub_recent_activity_distance", { distance: Math.round(entry.distanceKm) })}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {filteredCheckins.length === 0 && (
            <p className="rounded-xl border border-dashed border-border/40 p-4 text-center text-xs text-muted-foreground">
              {focusMode === "nearby" && viewerLocation
                ? t("hub_recent_activity_nearby_empty")
                : t("hub_recent_activity_empty")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
