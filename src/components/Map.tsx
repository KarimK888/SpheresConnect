"use client";

import { useEffect, useMemo, useRef } from "react";
import { useI18n } from "@/context/i18n";
import type { Hub, Checkin } from "@/lib/types";
import { getMapboxToken } from "@/lib/mapbox";

interface MapProps {
  hubs: Hub[];
  checkins: Checkin[];
}

export const Map = ({ hubs, checkins }: MapProps) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const { t } = useI18n();

  const token = useMemo(() => getMapboxToken(), []);

  useEffect(() => {
    if (!mapContainerRef.current || !token) return;

    let map: import("mapbox-gl").Map | null = null;

    const init = async () => {
      const { default: mapboxgl } = await import("mapbox-gl");
      mapboxgl.accessToken = token;
      map = new mapboxgl.Map({
        container: mapContainerRef.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [-73.5673, 45.5017],
        zoom: 2.5
      });

      hubs.forEach((hub) => {
        new mapboxgl.Marker({ color: "#A389D4" })
          .setLngLat([hub.location.lng, hub.location.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>${hub.name}</strong>`))
          .addTo(map!);
      });

      checkins.forEach((checkin) => {
        new mapboxgl.Marker({ color: "#F06292" })
          .setLngLat([checkin.location.lng, checkin.location.lat])
          .addTo(map!);
      });
    };

    void init();

    return () => {
      map?.remove();
    };
  }, [token, hubs, checkins]);

  if (!token) {
    return (
      <div className="flex h-96 w-full items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
        {t("map_missing_token")}
      </div>
    );
  }

  return <div ref={mapContainerRef} className="h-96 w-full overflow-hidden rounded-2xl border border-border" />;
};
