"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/context/i18n";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Wifi } from "lucide-react";
import type { Checkin, Event, Hub, User } from "@/lib/types";
import { EventMap } from "./EventMap";

interface EventsClientProps {
  upcoming: Event[];
  past: Event[];
  directory: Record<string, User>;
  hubs: Record<string, Hub>;
  presence: Record<string, Checkin[]>;
}

interface EventFormState {
  title: string;
  startsAt: string;
  endsAt: string;
  description: string;
  locationAddress: string;
  locationLat: string;
  locationLng: string;
}

const initialForm: EventFormState = {
  title: "",
  startsAt: "",
  endsAt: "",
  description: "",
  locationAddress: "",
  locationLat: "",
  locationLng: ""
};

const EARTH_RADIUS_KM = 6371;
const HUB_DISTANCE_THRESHOLD_KM = 120;

const distanceInKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const haversine =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
};

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).slice(0, 2);
  if (!parts.length) {
    return value.slice(0, 2).toUpperCase();
  }
  return parts.map((segment) => segment[0]?.toUpperCase() ?? "").join("") || value.slice(0, 2).toUpperCase();
};

const AvatarBubble = ({
  user,
  fallbackLabel,
  size = 40
}: {
  user?: User;
  fallbackLabel: string;
  size?: number;
}) => {
  const initials = getInitials(fallbackLabel);
  return (
    <div
      className="relative overflow-hidden rounded-full border border-border/60 bg-border/30 text-[0.65rem] font-semibold uppercase text-white"
      style={{ width: size, height: size }}
      title={fallbackLabel}
    >
      {user?.profilePictureUrl ? (
        <img
          src={user.profilePictureUrl}
          alt={fallbackLabel}
          loading="lazy"
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center">{initials}</span>
      )}
    </div>
  );
};

const AvatarStack = ({
  ids,
  directory,
  size = 36,
  limit = 4
}: {
  ids: string[];
  directory: Record<string, User>;
  size?: number;
  limit?: number;
}) => {
  const uniqueIds = Array.from(new Set(ids));
  const visibleIds = uniqueIds.slice(0, limit);
  const extraCount = Math.max(uniqueIds.length - visibleIds.length, 0);
  return (
    <div className="flex items-center">
      {visibleIds.map((userId, index) => {
        const profile = directory[userId];
        const label = profile?.displayName ?? profile?.email ?? userId;
        return (
          <div key={`${userId}-${index}`} className={index === 0 ? "" : "-ml-3"}>
            <AvatarBubble user={profile} fallbackLabel={label} size={size} />
          </div>
        );
      })}
      {extraCount > 0 && (
        <span className="ml-3 text-xs text-muted-foreground">+{extraCount}</span>
      )}
    </div>
  );
};

const toDateTimeLocal = (timestamp: number) => {
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset();
  const local = new Date(timestamp - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

export const EventsClient = ({ upcoming, past, directory, hubs, presence }: EventsClientProps) => {
  const { t } = useI18n();
  const { user, isAuthenticated, loading } = useAuth();
  const [events, setEvents] = useState<Event[]>(() =>
    [...upcoming, ...past].sort((a, b) => a.startsAt - b.startsAt)
  );
  const [directoryState, setDirectoryState] = useState(directory);
  const [hubDirectory, setHubDirectory] = useState(hubs);
  const [presenceState, setPresenceState] = useState(presence);
  const [search, setSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState<"all" | "virtual" | "in-person">("all");
  const [rsvpState, setRsvpState] = useState<Record<string, "interested" | "going">>({});
  const [focusEventId, setFocusEventId] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormState>({ ...initialForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDirectoryState(directory);
  }, [directory]);

  useEffect(() => {
    setHubDirectory(hubs);
  }, [hubs]);

  useEffect(() => {
    setPresenceState(presence);
  }, [presence]);

  const eventsWithLocation = useMemo(
    () =>
      events.filter(
        (event) => event.location && typeof event.location.lat === "number" && typeof event.location.lng === "number"
      ),
    [events]
  );

  const hubList = useMemo(() => Object.values(hubDirectory ?? {}), [hubDirectory]);
  const presenceByHub = presenceState ?? {};

  const eventHubMap = useMemo(() => {
    if (!hubList.length) return {};
    return events.reduce<Record<string, Hub | null>>((acc, event) => {
      const location = event.location;
      if (!location) {
        acc[event.eventId] = null;
        return acc;
      }
      let closest: { hub: Hub; distance: number } | null = null;
      hubList.forEach((candidate) => {
        const distance = distanceInKm(location, candidate.location);
        if (!closest || distance < closest.distance) {
          closest = { hub: candidate, distance };
        }
      });
      acc[event.eventId] = closest && closest.distance <= HUB_DISTANCE_THRESHOLD_KM ? closest.hub : null;
      return acc;
    }, {});
  }, [events, hubList]);

  const eventPresenceStats = useMemo(() => {
    return events.reduce<Record<string, { checkedInAttendees: string[]; totalActive: number }>>((acc, event) => {
      const hub = eventHubMap[event.eventId];
      if (!hub) {
        acc[event.eventId] = { checkedInAttendees: [], totalActive: 0 };
        return acc;
      }
      const hubPresenceEntries = presenceByHub[hub.hubId] ?? [];
      const checkedInAttendees = Array.from(
        new Set(
          hubPresenceEntries
            .map((entry) => entry.userId)
            .filter((userId) => event.attendees.includes(userId))
        )
      );
      const activeUsers = new Set<string>([...hub.activeUsers, ...hubPresenceEntries.map((entry) => entry.userId)]);
      acc[event.eventId] = {
        checkedInAttendees,
        totalActive: activeUsers.size
      };
      return acc;
    }, {});
  }, [events, eventHubMap, presenceByHub]);

  const refreshEvents = useCallback(async () => {
    setFetching(true);
    try {
      const response = await fetch("/api/events", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`);
      }
      const payload: {
        items: Event[];
        directory: Record<string, User>;
        hubs: Record<string, Hub>;
        presence: Record<string, Checkin[]>;
      } = await response.json();
      setEvents(payload.items.sort((a, b) => a.startsAt - b.startsAt));
      setDirectoryState(payload.directory);
      setHubDirectory(payload.hubs);
      setPresenceState(payload.presence);
      setError(null);
    } catch (err) {
      console.error("Failed to refresh events", err);
      setError(t("events_alert_error"));
    } finally {
      setFetching(false);
    }
  }, [t]);

  useEffect(() => {
    setEvents((previous) => {
      const dedup = new Map<string, Event>();
      [...previous, ...upcoming, ...past].forEach((event) => {
        dedup.set(event.eventId, event);
      });
      return Array.from(dedup.values()).sort((a, b) => a.startsAt - b.startsAt);
    });
  }, [upcoming, past]);

  useEffect(() => {
    void refreshEvents();
  }, [refreshEvents]);

  const visibleEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      const matchesQuery = query
        ? event.title.toLowerCase().includes(query) || event.description?.toLowerCase().includes(query)
        : true;
      const isVirtual = !event.location;
      const matchesFormat =
        formatFilter === "all" || (formatFilter === "virtual" && isVirtual) || (formatFilter === "in-person" && !isVirtual);
      return matchesQuery && matchesFormat;
    });
  }, [events, search, formatFilter]);

  const resetForm = () => {
    setForm({ ...initialForm });
    setEditingId(null);
    setError(null);
  };

  const isEditing = Boolean(editingId);

  const buildLocationPayload = (allowNull = false) => {
    if (form.locationLat && form.locationLng) {
      const lat = Number.parseFloat(form.locationLat);
      const lng = Number.parseFloat(form.locationLng);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return {
          lat,
          lng,
          address: form.locationAddress || undefined
        };
      }
    }
    if (allowNull && !form.locationLat && !form.locationLng && !form.locationAddress) {
      return null;
    }
    return undefined;
  };

  const handleSubmit = async () => {
    if (!user) return;
    const title = form.title.trim();
    const description = form.description.trim();
    const startsAtMs = form.startsAt ? Date.parse(form.startsAt) : NaN;
    const endsAtMs = form.endsAt ? Date.parse(form.endsAt) : NaN;

    if (title.length < 3) {
      setError(t("events_form_title_error"));
      return;
    }
    if (Number.isNaN(startsAtMs)) {
      setError(t("events_form_start_error"));
      return;
    }
    if (form.endsAt && Number.isNaN(endsAtMs)) {
      setError(t("events_form_end_error"));
      return;
    }

    setPending(true);
    setError(null);
    try {
      if (isEditing && editingId) {
        const payload: Record<string, unknown> = {
          title,
          description: description ? description : null,
          startsAt: startsAtMs
        };
        if (form.endsAt) {
          payload.endsAt = Number.isNaN(endsAtMs) ? undefined : endsAtMs;
        } else {
          payload.endsAt = null;
        }
        const locationPayload = buildLocationPayload(true);
        if (locationPayload !== undefined) {
          payload.location = locationPayload;
        }
        const response = await fetch(`/api/events?eventId=${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          throw new Error(`Failed to update event: ${response.status}`);
        }
      } else {
        const locationPayload = buildLocationPayload();
        const response = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description: description || undefined,
            startsAt: startsAtMs,
            endsAt: form.endsAt ? endsAtMs : undefined,
            location: locationPayload,
            hostUserId: user.userId,
            attendees: [user.userId]
          })
        });
        if (!response.ok) {
          throw new Error(`Failed to create event: ${response.status}`);
        }
      }
      await refreshEvents();
      resetForm();
    } catch (err) {
      console.error("Failed to submit event", err);
      setError(t("events_alert_error"));
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/events?eventId=${eventId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(`Failed to delete event: ${response.status}`);
      }
      await refreshEvents();
      if (editingId === eventId) {
        resetForm();
      }
    } catch (err) {
      console.error("Failed to delete event", err);
      setError(t("events_alert_error"));
    } finally {
      setPending(false);
    }
  };

  const handleRsvp = async (eventId: string) => {
    if (!user) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/events?eventId=${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.userId })
      });
      if (!response.ok) {
        throw new Error(`Failed to RSVP: ${response.status}`);
      }
      await refreshEvents();
      setRsvpState((prev) => ({ ...prev, [eventId]: "going" }));
    } catch (err) {
      console.error("Failed to RSVP", err);
      setError(t("events_alert_error"));
    } finally {
      setPending(false);
    }
  };

  const handleEditStart = (event: Event) => {
    setEditingId(event.eventId);
    setForm({
      title: event.title,
      description: event.description ?? "",
      startsAt: toDateTimeLocal(event.startsAt),
      endsAt: event.endsAt ? toDateTimeLocal(event.endsAt) : "",
      locationAddress: event.location?.address ?? "",
      locationLat: event.location ? String(event.location.lat) : "",
      locationLng: event.location ? String(event.location.lng) : ""
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLocalRsvp = (eventId: string, status: "interested" | "going") => {
    setRsvpState((prev) => {
      const current = prev[eventId];
      if (current === status) {
        const clone = { ...prev };
        delete clone[eventId];
        return clone;
      }
      return { ...prev, [eventId]: status };
    });
  };

  const handleAddToCalendar = (event: Event) => {
    const formatDate = (value: number) =>
      new Date(value).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `UID:${event.eventId}@spheraconnect`,
      `DTSTAMP:${formatDate(Date.now())}`,
      `DTSTART:${formatDate(event.startsAt)}`,
      `DTEND:${formatDate(event.endsAt ?? event.startsAt + 60 * 60 * 1000)}`,
      `SUMMARY:${event.title}`,
      event.description ? `DESCRIPTION:${event.description}` : undefined,
      event.location?.address ? `LOCATION:${event.location.address}` : undefined,
      "END:VEVENT",
      "END:VCALENDAR"
    ].filter(Boolean);
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${event.title}.ics`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const upcomingEvents = useMemo(
    () => visibleEvents.filter((event) => event.startsAt >= Date.now()),
    [visibleEvents]
  );
  const pastEvents = useMemo(
    () => visibleEvents.filter((event) => event.startsAt < Date.now()).sort((a, b) => b.startsAt - a.startsAt),
    [visibleEvents]
  );
  const timelineEvents = useMemo(() => upcomingEvents.slice(0, 6), [upcomingEvents]);
  const focusedEvent = useMemo(() => {
    if (!timelineEvents.length) return null;
    if (focusEventId) {
      return timelineEvents.find((event) => event.eventId === focusEventId) ?? timelineEvents[0];
    }
    return timelineEvents[0];
  }, [timelineEvents, focusEventId]);

  const canSubmit = form.title.trim().length >= 3 && Boolean(form.startsAt);

  const renderEventCard = (event: Event, variant: "upcoming" | "past") => {
    const attendeesLabel = t("events_manage_attendees", { count: event.attendees.length });
    const isHost = user?.userId === event.hostUserId;
    const hasRsvped = Boolean(user && event.attendees.includes(user.userId));
    const localRsvp = rsvpState[event.eventId];
    const hostProfile = directoryState[event.hostUserId];
    const hostName = hostProfile?.displayName ?? hostProfile?.email ?? event.hostUserId;
    const attendeeIds = Array.from(new Set(event.attendees));
    const eventHub = eventHubMap[event.eventId] ?? null;
    const presenceStats = eventPresenceStats[event.eventId] ?? { checkedInAttendees: [], totalActive: 0 };
    const presenceLabel = presenceStats.totalActive
      ? t("events_presence_active", { count: presenceStats.totalActive })
      : t("events_presence_none");
    const checkedInLabel =
      presenceStats.checkedInAttendees.length > 0
        ? t("events_presence_attending_now", { count: presenceStats.checkedInAttendees.length })
        : null;
    const locationLabel = event.location?.address ?? eventHub?.name ?? t("events_filter_virtual");

    return (
      <Card
        key={event.eventId}
        className={`space-y-4 ${variant === "upcoming" ? "bg-card/80 p-6" : "bg-border/20 p-6"}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {new Date(event.startsAt).toLocaleString()}
            </p>
            <h3 className="text-lg font-semibold text-white">{event.title}</h3>
            {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
          </div>
          <Badge>{new Date(event.startsAt).toLocaleDateString()}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {isHost && <Badge variant="outline">{t("events_manage_host_badge")}</Badge>}
          <Badge variant="outline">{attendeesLabel}</Badge>
          {eventHub && <Badge variant="outline">{t("events_hub_label", { name: eventHub.name })}</Badge>}
          {localRsvp && (
            <Badge variant="accent">
              {localRsvp === "going" ? t("events_rsvp_going") : t("events_rsvp_interested")}
            </Badge>
          )}
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <AvatarBubble user={hostProfile} fallbackLabel={hostName} size={48} />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {t("events_manage_host_badge")}
              </p>
              <p className="text-sm font-medium text-white">{hostName}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{locationLabel}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              <span>{presenceLabel}</span>
            </div>
            {checkedInLabel && <span className="text-xs">{checkedInLabel}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-border/30 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{t("events_attendees_confirmed", { count: attendeeIds.length })}</span>
            </div>
            <AvatarStack ids={attendeeIds} directory={directoryState} />
          </div>
          {variant === "upcoming" && user && (
            <div className="flex flex-wrap gap-2">
              {!isHost && (
                <Button
                  variant={hasRsvped ? "outline" : "accent"}
                  size="sm"
                  disabled={pending || hasRsvped}
                  onClick={() => handleRsvp(event.eventId)}
                >
                  {hasRsvped ? t("events_manage_rsvp_done") : t("events_manage_rsvp")}
                </Button>
              )}
              <Button
                variant={localRsvp === "interested" ? "accent" : "outline"}
                size="sm"
                onClick={() => handleLocalRsvp(event.eventId, "interested")}
              >
                {t("events_rsvp_interested")}
              </Button>
              <Button
                variant={localRsvp === "going" ? "accent" : "outline"}
                size="sm"
                onClick={() => handleLocalRsvp(event.eventId, "going")}
              >
                {t("events_rsvp_going")}
              </Button>
              {isHost && (
                <>
                  <Button variant="outline" size="sm" disabled={pending} onClick={() => handleEditStart(event)}>
                    {t("events_manage_edit")}
                  </Button>
                  <Button variant="ghost" size="sm" disabled={pending} onClick={() => handleDelete(event.eventId)}>
                    {t("events_manage_delete")}
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={() => handleAddToCalendar(event)}>
                {t("events_calendar_add")}
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header>
        <h1 className="text-3xl font-semibold text-white">{t("events_title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("events_subtitle")}</p>
      </header>

      <section className="space-y-4 rounded-3xl border border-border/50 bg-card/60 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            type="search"
            className="w-full rounded-full border border-border/40 bg-background/60 px-4 py-2 text-sm text-white md:w-72"
            placeholder={t("events_filter_search")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <Button
              variant={formatFilter === "all" ? "accent" : "outline"}
              size="sm"
              onClick={() => setFormatFilter("all")}
            >
              {t("events_filter_all")}
            </Button>
            <Button
              variant={formatFilter === "virtual" ? "accent" : "outline"}
              size="sm"
              onClick={() => setFormatFilter("virtual")}
            >
              {t("events_filter_virtual")}
            </Button>
            <Button
              variant={formatFilter === "in-person" ? "accent" : "outline"}
              size="sm"
              onClick={() => setFormatFilter("in-person")}
            >
              {t("events_filter_inperson")}
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <Card className="border-destructive/60 bg-destructive/10 p-4 text-sm text-destructive">{error}</Card>
      )}

      {!loading && isAuthenticated && (
        <section className="space-y-4 rounded-3xl border border-border/60 bg-card/70 p-6 shadow-2xl">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-white">
              {isEditing ? t("events_manage_update") : t("events_planner_heading")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("events_planner_hint")}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder={t("events_form_title_label")}
            />
            <Input
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
              placeholder={t("events_form_start_label")}
            />
            <Input
              type="datetime-local"
              value={form.endsAt}
              onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))}
              placeholder={t("events_form_end_label")}
            />
            <Input
              value={form.locationAddress}
              onChange={(event) => setForm((prev) => ({ ...prev, locationAddress: event.target.value }))}
              placeholder={t("events_form_location_label")}
            />
            <Input
              value={form.locationLat}
              onChange={(event) => setForm((prev) => ({ ...prev, locationLat: event.target.value }))}
              placeholder={t("events_form_lat_label")}
            />
            <Input
              value={form.locationLng}
              onChange={(event) => setForm((prev) => ({ ...prev, locationLng: event.target.value }))}
              placeholder={t("events_form_lng_label")}
            />
          </div>
          <Textarea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder={t("events_form_description_label")}
            rows={3}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="accent"
              disabled={pending || !canSubmit}
              onClick={handleSubmit}
            >
              {pending ? t("generic_loading") : isEditing ? t("events_manage_update") : t("events_form_submit")}
            </Button>
            <Button variant="ghost" onClick={resetForm} disabled={pending}>
              {isEditing ? t("events_manage_cancel_edit") : t("events_form_reset")}
            </Button>
          </div>
        </section>
      )}

      {fetching && (
        <Card className="border-border/40 bg-border/10 p-3 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {t("generic_loading")}
        </Card>
      )}

      {eventsWithLocation.length > 0 && (
        <section className="space-y-4 rounded-3xl border border-border/50 bg-card/70 p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">{t("events_map_heading")}</h2>
              <p className="text-sm text-muted-foreground">{t("events_map_hint")}</p>
            </div>
          </div>
          <EventMap
            events={eventsWithLocation}
            focusEventId={focusEventId}
            onSelect={setFocusEventId}
            directory={directoryState}
            hubs={hubDirectory}
            presence={presenceState}
          />
        </section>
      )}

      {timelineEvents.length > 0 && (
        <section className="space-y-4 rounded-3xl border border-border/50 bg-card/70 p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">{t("events_timeline_heading")}</h2>
              <p className="text-sm text-muted-foreground">{t("events_timeline_hint")}</p>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {timelineEvents.map((event) => (
              <button
                key={event.eventId}
                type="button"
                onClick={() => setFocusEventId(event.eventId)}
                className={`min-w-[180px] rounded-2xl border px-4 py-3 text-left text-sm ${
                  focusEventId === event.eventId ? "border-accent bg-accent/10 text-white" : "border-border/40 bg-background/40 text-muted-foreground"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.3em]">{new Date(event.startsAt).toLocaleDateString()}</p>
                <p className="font-semibold">{event.title}</p>
              </button>
            ))}
          </div>
          {focusedEvent && (() => {
            const hostProfile = directoryState[focusedEvent.hostUserId];
            const hostName = hostProfile?.displayName ?? hostProfile?.email ?? focusedEvent.hostUserId;
            const eventHub = eventHubMap[focusedEvent.eventId] ?? null;
            const presenceStats = eventPresenceStats[focusedEvent.eventId] ?? { checkedInAttendees: [], totalActive: 0 };
            const presenceLabel = presenceStats.totalActive
              ? t("events_presence_active", { count: presenceStats.totalActive })
              : t("events_presence_none");
            const checkedInLabel =
              presenceStats.checkedInAttendees.length > 0
                ? t("events_presence_attending_now", { count: presenceStats.checkedInAttendees.length })
                : null;
            const locationLabel = focusedEvent.location?.address ?? eventHub?.name ?? t("events_filter_virtual");
            const attendeeIds = Array.from(new Set(focusedEvent.attendees));
            const alreadyRsvped = Boolean(user && focusedEvent.attendees.includes(user.userId));

            return (
              <Card className="space-y-4 border-border/60 bg-background/60 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      {new Date(focusedEvent.startsAt).toLocaleString()}
                    </p>
                    <h3 className="text-xl font-semibold text-white">{focusedEvent.title}</h3>
                    {focusedEvent.description && (
                      <p className="text-sm text-muted-foreground">{focusedEvent.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={alreadyRsvped ? "outline" : "accent"}
                      size="sm"
                      onClick={() => handleRsvp(focusedEvent.eventId)}
                    >
                      {alreadyRsvped ? t("events_manage_rsvp_done") : t("events_rsvp_going")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleAddToCalendar(focusedEvent)}>
                      {t("events_calendar_add")}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <AvatarBubble user={hostProfile} fallbackLabel={hostName} size={48} />
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        {t("events_manage_host_badge")}
                      </p>
                      <p className="text-sm font-medium text-white">{hostName}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{locationLabel}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <AvatarStack ids={attendeeIds} directory={directoryState} size={34} />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Wifi className="h-3.5 w-3.5" />
                      <span>{presenceLabel}</span>
                    </div>
                    {checkedInLabel && <span className="text-xs text-muted-foreground">{checkedInLabel}</span>}
                  </div>
                </div>
              </Card>
            );
          })()}
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">{t("events_upcoming")}</h2>
          <Badge variant="outline">
            {upcomingEvents.length} {t("events_listed_suffix")}
          </Badge>
        </div>
        <div className="grid gap-4">
          {upcomingEvents.map((event) => renderEventCard(event, "upcoming"))}
          {upcomingEvents.length === 0 && !fetching && (
            <Card className="border-dashed bg-transparent p-6 text-sm text-muted-foreground">
              {t("events_none_upcoming")}
            </Card>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">{t("events_recent")}</h2>
          <Badge variant="outline">
            {pastEvents.length} {t("events_archived_suffix")}
          </Badge>
        </div>
        <div className="grid gap-4">
          {pastEvents.map((event) => renderEventCard(event, "past"))}
          {pastEvents.length === 0 && !fetching && (
            <Card className="border-dashed bg-transparent p-6 text-sm text-muted-foreground">
              {t("events_none_planned")}
            </Card>
          )}
        </div>
      </section>
    </div>
  );
};
