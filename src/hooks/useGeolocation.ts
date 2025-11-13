"use client";

import { useCallback, useEffect, useState } from "react";

type Coordinates = { lat: number; lng: number; accuracy?: number };

type GeolocationState = {
  supported: boolean;
  permission: PermissionState | "unknown";
  coords: Coordinates | null;
  loading: boolean;
  error: string | null;
  request: () => void;
};

export const useGeolocation = (): GeolocationState => {
  const [supported] = useState(() => typeof window !== "undefined" && Boolean(navigator.geolocation));
  const [permission, setPermission] = useState<PermissionState | "unknown">("unknown");
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supported || typeof navigator.permissions === "undefined") return;
    let cancelled = false;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (!cancelled) {
          setPermission(status.state);
          status.addEventListener("change", () => setPermission(status.state));
        }
      })
      .catch(() => {
        if (!cancelled) setPermission("unknown");
      });
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const capture = useCallback(() => {
    if (!supported) {
      setError("Geolocation is not supported in this browser.");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setLoading(false);
      },
      (geoError) => {
        setError(geoError.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }, [supported]);

  return {
    supported,
    permission,
    coords,
    loading,
    error,
    request: capture
  };
};
