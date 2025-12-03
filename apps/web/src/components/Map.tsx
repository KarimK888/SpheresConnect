"use client";

import { useEffect, useMemo, useRef } from "react";
import { useI18n } from "@/context/i18n";
import type { Hub, Checkin, User } from "@/lib/types";
import { getMapboxToken } from "@/lib/mapbox";

type MapCheckin = Checkin & { profile?: User; distanceKm?: number | null };

interface MapProps {
  hubs: Hub[];
  checkins: MapCheckin[];
  viewerLocation?: { lat: number; lng: number } | null;
}

const ensureHubMarkerStyles = () => {
  if (typeof document === "undefined" || document.getElementById("hub-marker-styles")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "hub-marker-styles";
  style.textContent = `
.hub-marker {
  width: 28px;
  height: 28px;
  border-radius: 9999px;
  background: radial-gradient(circle at 40% 30%, rgba(16,185,129,1), rgba(5,150,105,0.8) 60%);
  box-shadow: 0 0 0 5px rgba(37,99,235,0.2), 0 10px 20px -10px rgba(15,23,42,0.8);
  position: relative;
  animation: hubPulse 2.4s ease-out infinite;
}
.hub-marker::after {
  content: "";
  position: absolute;
  inset: 6px;
  border-radius: inherit;
  border: 2px solid rgba(255,255,255,0.6);
}
@keyframes hubPulse {
  0% { transform: scale(0.9); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.8; }
}
.hub-tooltip {
  font-size: 0.8rem;
  line-height: 1.1;
  color: #f4f4f5;
  background: rgba(2,6,23,0.95);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 0.4rem 0.75rem;
  border-radius: 0.75rem;
  text-align: left;
}
.hub-tooltip strong {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 0.3rem;
}
.hub-tooltip span {
  display: block;
  color: rgba(255,255,255,0.6);
  font-size: 0.7rem;
}
`;
  document.head.appendChild(style);
};

export const Map = ({ hubs, checkins, viewerLocation }: MapProps) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const { t } = useI18n();

  const token = useMemo(() => getMapboxToken(), []);
  const checkinGeoJson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: checkins.map((checkin) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [checkin.location.lng, checkin.location.lat]
        },
        properties: {
          status: checkin.status,
          weight: 1
        }
      }))
    }),
    [checkins]
  );

  useEffect(() => {
    if (!mapContainerRef.current || !token) return;

    let map: import("mapbox-gl").Map | null = null;

    ensureHubMarkerStyles();

    const hubMarkers: import("mapbox-gl").Marker[] = [];
    const init = async () => {
      const { default: mapboxgl } = await import("mapbox-gl");
      mapboxgl.accessToken = token;
      map = new mapboxgl.Map({
        container: mapContainerRef.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [-73.5673, 45.5017],
        zoom: 2.5
      });

      map.on("load", () => {
        if (!map) return;
        map.addSource("checkins-heat", {
          type: "geojson",
          data: checkinGeoJson
        });
        map.addLayer({
          id: "checkins-heat",
          type: "heatmap",
          source: "checkins-heat",
          maxzoom: 14,
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 1, 1],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.5, 9, 2],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(37,99,235,0)",
              0.2,
              "rgba(16,185,129,0.3)",
              0.4,
              "rgba(59,130,246,0.45)",
              0.6,
              "rgba(236,72,153,0.65)",
              0.8,
              "rgba(252,211,77,0.8)"
            ],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 20, 9, 60]
          }
        });
        map.addLayer({
          id: "checkins-circle",
          type: "circle",
          source: "checkins-heat",
          minzoom: 10,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 4, 14, 12],
            "circle-color": ["match", ["get", "status"], "online", "#34d399", "offline", "#f87171", "#38bdf8"],
            "circle-stroke-color": "rgba(255,255,255,0.3)",
            "circle-stroke-width": 1
          }
        });

        hubs.forEach((hub) => {
          const markerEl = document.createElement("div");
          markerEl.className = "hub-marker";
          const popup = new mapboxgl.Popup({ offset: 20, closeButton: false, closeOnClick: false }).setHTML(`
            <div class="hub-tooltip">
              <strong>${hub.name}</strong>
              <span>${hub.activeUsers.length} creators live · ${hub.location.lat.toFixed(2)}, ${hub.location.lng.toFixed(2)}</span>
            </div>
          `);
          const marker = new mapboxgl.Marker(markerEl)
            .setLngLat([hub.location.lng, hub.location.lat])
            .setPopup(popup)
            .addTo(map!);
          markerEl.addEventListener("mouseenter", () => popup.addTo(map!));
          markerEl.addEventListener("mouseleave", () => popup.remove());
          hubMarkers.push(marker);
        });

        checkins.forEach((checkin) => {
          const profile = checkin.profile;
          const popupContent = profile
            ? `<strong>${profile.displayName}</strong><br/><small>${checkin.status.toUpperCase()}</small>`
            : `<strong>${checkin.userId}</strong>`;
          new mapboxgl.Marker({ color: "#F06292" })
            .setLngLat([checkin.location.lng, checkin.location.lat])
            .setPopup(new mapboxgl.Popup().setHTML(popupContent))
            .addTo(map!);
        });

        if (viewerLocation) {
          new mapboxgl.Marker({ color: "#5AC8FA" })
            .setLngLat([viewerLocation.lng, viewerLocation.lat])
            .setPopup(new mapboxgl.Popup().setHTML(`<strong>${t("hub_geo_you_are_here")}</strong>`))
            .addTo(map!);
        }
      });
    };

    void init();

    return () => {
      hubMarkers.forEach((marker) => marker.remove());
      map?.remove();
    };
  }, [token, hubs, checkins, checkinGeoJson, viewerLocation, t]);

  if (!token) {
    return (
      <div className="flex h-96 w-full items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
        {t("map_missing_token")}
      </div>
    );
  }

  return <div ref={mapContainerRef} className="h-96 w-full overflow-hidden rounded-2xl border border-border" />;
};
