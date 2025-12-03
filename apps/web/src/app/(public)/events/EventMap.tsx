"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Checkin, Event, Hub, User } from "@/lib/types";
import { getMapboxToken } from "@/lib/mapbox";
import { useI18n } from "@/context/i18n";

interface EventMapProps {
  events: Event[];
  focusEventId?: string | null;
  onSelect?: (eventId: string) => void;
  directory?: Record<string, User>;
  hubs?: Record<string, Hub>;
  presence?: Record<string, Checkin[]>;
}

type Coordinates = { lat: number; lng: number };

const HUB_DISTANCE_THRESHOLD_KM = 120;
const EARTH_RADIUS_KM = 6371;

const toRadians = (value: number) => (value * Math.PI) / 180;

const hasEventCoords = (event: Event): event is Event & { location: Coordinates } =>
  Boolean(
    event.location &&
      typeof event.location.lat === "number" &&
      typeof event.location.lng === "number"
  );

const distanceInKm = (a: Coordinates, b: Coordinates) => {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const haversine =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
};

export const EventMap = ({ events, focusEventId, onSelect, directory, hubs, presence }: EventMapProps) => {
  const token = getMapboxToken();
  const { t } = useI18n();
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const markersRef = useRef<import("mapbox-gl").Marker[]>([]);

  const eventsWithLocation = useMemo(() => events.filter(hasEventCoords), [events]);

  const hubList = useMemo(() => Object.values(hubs ?? {}), [hubs]);
  const presenceByHub = useMemo(() => presence ?? {}, [presence]);

  const eventHubMap = useMemo(() => {
    if (!eventsWithLocation.length || !hubList.length) {
      return {};
    }
    return eventsWithLocation.reduce<Record<string, Hub | null>>((acc, event) => {
      const location = event.location;
      let closest: { hub: Hub; distance: number } | null = null;
      for (const hub of hubList) {
        const distance = distanceInKm(location, hub.location);
        if (closest === null || distance < closest.distance) {
          closest = { hub, distance };
        }
      }
      if (closest && closest.distance <= HUB_DISTANCE_THRESHOLD_KM) {
        acc[event.eventId] = closest.hub;
      } else {
        acc[event.eventId] = null;
      }
      return acc;
    }, {});
  }, [eventsWithLocation, hubList]);

  const focusedEvent = useMemo(
    () => eventsWithLocation.find((event) => event.eventId === focusEventId) ?? eventsWithLocation[0] ?? null,
    [eventsWithLocation, focusEventId]
  );

  useEffect(() => {
    if (!token || !mapNodeRef.current) {
      return;
    }
    let cancelled = false;
    const init = async () => {
      const { default: mapboxgl } = await import("mapbox-gl");
      if (cancelled || !mapNodeRef.current) return;
      mapboxgl.accessToken = token;
      mapRef.current = new mapboxgl.Map({
        container: mapNodeRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [-73.5673, 45.5017],
        zoom: 2.5
      });
    };
    void init();
    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    void import("mapbox-gl").then(({ default: mapboxgl }) => {
      eventsWithLocation.forEach((event) => {
        const hub = eventHubMap[event.eventId];
        const hubPresence = hub ? presenceByHub[hub.hubId] ?? [] : [];
        const hostProfile = directory?.[event.hostUserId];
        const hostName = hostProfile?.displayName ?? hostProfile?.email ?? event.hostUserId;
        const attendeeLabel = t("events_manage_attendees", { count: event.attendees.length });
        const hubLabel = hub ? t("events_hub_label", { name: hub.name }) : t("events_filter_virtual");
        const checkedInSet = new Set<string>([
          ...(hub?.activeUsers ?? []),
          ...hubPresence.map((entry) => entry.userId)
        ]);
        const checkedInLabel = checkedInSet.size
          ? t("events_presence_active", { count: checkedInSet.size })
          : t("events_presence_none");

        const marker = new mapboxgl.Marker({
          color: event.eventId === focusEventId ? "#A389D4" : "#F06292"
        })
          .setLngLat([event.location!.lng, event.location!.lat])
          .setPopup(
            new mapboxgl.Popup().setHTML(
              [
                `<strong>${event.title}</strong>`,
                event.location?.address ? `<small>${event.location.address}</small>` : null,
                `<small>${t("events_manage_host_badge")}: ${hostName}</small>`,
                hub ? `<small>${hubLabel}</small>` : null,
                `<small>${attendeeLabel}</small>`,
                `<small>${checkedInLabel}</small>`
              ]
                .filter(Boolean)
                .join("<br/>")
            )
          )
          .addTo(mapRef.current!);
        const element = marker.getElement();
        element.style.cursor = "pointer";
        element.addEventListener("click", () => onSelect?.(event.eventId));
        markersRef.current.push(marker);
      });

      if (eventsWithLocation.length) {
        const bounds = new mapboxgl.LngLatBounds();
        eventsWithLocation.forEach((event) => bounds.extend([event.location!.lng, event.location!.lat]));
        mapRef.current!.fitBounds(bounds, { padding: 60, maxZoom: 9, duration: 600 });
      }
    });
  }, [directory, eventHubMap, eventsWithLocation, focusEventId, onSelect, presenceByHub, t]);

  useEffect(() => {
    if (!mapRef.current || !focusedEvent?.location) return;
    mapRef.current.flyTo({
      center: [focusedEvent.location.lng, focusedEvent.location.lat],
      zoom: 9,
      essential: true
    });
  }, [focusedEvent]);

  if (!token) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
        {t("map_missing_token")}
      </div>
    );
  }

  if (!eventsWithLocation.length) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
        {t("events_map_empty")}
      </div>
    );
  }

  return <div ref={mapNodeRef} className="h-80 w-full overflow-hidden rounded-2xl border border-border" />;
};
