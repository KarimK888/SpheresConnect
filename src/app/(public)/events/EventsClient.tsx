"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
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
  hostUserId: string;
}

const initialForm: EventFormState = {
  title: "",
  startsAt: "",
  endsAt: "",
  description: "",
  locationAddress: "",
  locationLat: "",
  locationLng: "",
  hostUserId: ""
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
        <Image
          src={user.profilePictureUrl}
          alt={fallbackLabel}
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const uploadCopyRaw = t("events_upload_requirements_copy");
  const uploadCopy =
    uploadCopyRaw === "events_upload_requirements_copy"
      ? "You need to upload your research findings first to register and attend this sync."
      : uploadCopyRaw;
  const timeLabelRaw = t("events_time_label");
  const timeLabel = timeLabelRaw === "events_time_label" ? "Time" : timeLabelRaw;
  const currentSprintsLabelRaw = t("events_current_sprints_label");
  const currentSprintsLabel =
    currentSprintsLabelRaw === "events_current_sprints_label" ? "Current sprints" : currentSprintsLabelRaw;
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
  const [plannerVisible, setPlannerVisible] = useState(false);

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
  const presenceByHub = useMemo(() => presenceState ?? {}, [presenceState]);

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

  const upcomingEvents = useMemo(
    () =>
      visibleEvents
        .filter((event) => event.startsAt >= Date.now())
        .sort((a, b) => a.startsAt - b.startsAt),
    [visibleEvents]
  );

  const pastEvents = useMemo(
    () =>
      visibleEvents
        .filter((event) => event.startsAt < Date.now())
        .sort((a, b) => b.startsAt - a.startsAt),
    [visibleEvents]
  );

  const primaryEvent =
    (focusEventId && events.find((event) => event.eventId === focusEventId)) ||
    upcomingEvents[0] ||
    events[0] ||
    null;

  const primaryEventDateString = primaryEvent
    ? new Date(primaryEvent.startsAt).toLocaleString()
    : t("events_none_upcoming");

  const primaryEventHub = primaryEvent ? eventHubMap[primaryEvent.eventId] : null;
  const primaryEventLocationLabel =
    primaryEvent?.location?.address ?? primaryEventHub?.name ?? t("events_filter_virtual");

  const timelineEvents = useMemo(() => upcomingEvents.slice(0, 6), [upcomingEvents]);

  const focusedEvent = useMemo(() => {
    if (!timelineEvents.length) return null;
    if (focusEventId) {
      return timelineEvents.find((event) => event.eventId === focusEventId) ?? timelineEvents[0];
    }
    return timelineEvents[0];
  }, [timelineEvents, focusEventId]);

  const hostPendingEvents = useMemo(() => {
    if (!user?.userId) return [];
    return events.filter(
      (event) => event.hostUserId === user.userId && (event.pendingAttendees?.length ?? 0) > 0
    );
  }, [events, user?.userId]);

  const resetForm = () => {
    setForm({ ...initialForm, hostUserId: user?.userId ?? "" });
    setEditingId(null);
    setError(null);
  };

  const isEditing = Boolean(editingId);

  const buildLocationPayload = (allowNull = false) => {
    const hasLat = form.locationLat.trim().length > 0;
    const hasLng = form.locationLng.trim().length > 0;
    const hasAddress = form.locationAddress.trim().length > 0;
    if (hasLat || hasLng || hasAddress) {
      const latValue = hasLat ? Number.parseFloat(form.locationLat) : undefined;
      const lngValue = hasLng ? Number.parseFloat(form.locationLng) : undefined;
      return {
        lat: latValue !== undefined && !Number.isNaN(latValue) ? latValue : undefined,
        lng: lngValue !== undefined && !Number.isNaN(lngValue) ? lngValue : undefined,
        address: hasAddress ? form.locationAddress.trim() : undefined
      };
    }
    if (allowNull) {
      return null;
    }
    return undefined;
  };

  const resolveHostUserId = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return user?.userId ?? "";
    if (directoryState[trimmed]) {
      return trimmed;
    }
    const lowered = trimmed.toLowerCase();
    const match = Object.values(directoryState).find(
      (profile) =>
        profile.email?.toLowerCase() === lowered || profile.displayName?.toLowerCase() === lowered
    );
    return match?.userId ?? trimmed;
  };

  useEffect(() => {
    if (user?.userId) {
      setForm((prev) => (prev.hostUserId ? prev : { ...prev, hostUserId: user.userId ?? "" }));
    }
  }, [user?.userId]);

  useEffect(() => {
    const isPlanner = searchParams?.get("view") === "planner";
    setPlannerVisible(isPlanner);
  }, [searchParams]);

  const openPlanner = () => {
    router.replace("/events/workspace?view=planner");
    setPlannerVisible(true);
  };

  const closePlanner = () => {
    router.replace("/events/workspace");
    setPlannerVisible(false);
  };

  const handleSubmit = async () => {
    if (!user) return;
    const title = form.title.trim();
    const description = form.description.trim();
    const startsAtMs = form.startsAt ? Date.parse(form.startsAt) : NaN;
    const endsAtMs = form.endsAt ? Date.parse(form.endsAt) : NaN;
    const hostUserId = resolveHostUserId(form.hostUserId);

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
          startsAt: startsAtMs,
          hostUserId
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
            hostUserId,
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

  const submitRsvpAction = async (
    eventId: string,
    action: "request" | "cancel" | "approve" | "reject",
    targetUserId?: string
  ) => {
    if (!user) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/events?eventId=${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.userId, action, targetUserId })
      });
      if (!response.ok) {
        throw new Error(`Failed to RSVP: ${response.status}`);
      }
      await refreshEvents();
    } catch (err) {
      console.error("Failed to RSVP", err);
      setError(t("events_alert_error"));
    } finally {
      setPending(false);
    }
  };

  const handleRsvp = async (eventId: string) => submitRsvpAction(eventId, "request");
  const handleCancelRsvp = async (eventId: string) => submitRsvpAction(eventId, "cancel");
  const handleModerateRsvp = async (
    eventId: string,
    targetUserId: string,
    action: "approve" | "reject"
  ) => submitRsvpAction(eventId, action, targetUserId);

  const handleEditStart = (event: Event) => {
    setEditingId(event.eventId);
    setForm({
      title: event.title,
      description: event.description ?? "",
      startsAt: toDateTimeLocal(event.startsAt),
      endsAt: event.endsAt ? toDateTimeLocal(event.endsAt) : "",
      locationAddress: event.location?.address ?? "",
      locationLat:
        event.location && typeof event.location.lat === "number" ? String(event.location.lat) : "",
      locationLng:
        event.location && typeof event.location.lng === "number" ? String(event.location.lng) : "",
      hostUserId: event.hostUserId
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
    const pendingAttendees = event.pendingAttendees ?? [];
    const pendingSet = new Set(pendingAttendees);
    const isPendingRequest = Boolean(user && pendingSet.has(user.userId));
    const pendingCount = pendingAttendees.length;
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
      <Card key={event.eventId} className="border-none bg-transparent p-0 text-left">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#7b8196]">
                {new Date(event.startsAt).toLocaleString()}
              </p>
              <h3 className="mt-1 text-base font-semibold text-white">{event.title}</h3>
              {event.description && (
                <p className="mt-2 text-xs leading-relaxed text-[#cfd3e3]">{event.description}</p>
              )}
            </div>
            <Badge className="border border-[#1f2233] bg-[#0b1220] text-[11px] uppercase tracking-[0.2em] text-[#9ca3c9]">
              {new Date(event.startsAt).toLocaleDateString()}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-[#7b8196]">
            {isHost && (
              <Badge variant="outline" className="border-[#3a425a] text-[#cfd3e3]">
                {t("events_manage_host_badge")}
              </Badge>
            )}
            <Badge variant="outline" className="border-[#3a425a] text-[#cfd3e3]">
              {attendeesLabel}
            </Badge>
            {eventHub && (
              <Badge variant="outline" className="border-[#3a425a] text-[#cfd3e3]">
                {t("events_hub_label", { name: eventHub.name })}
              </Badge>
            )}
          {localRsvp && (
            <Badge variant="secondary" className="border-none bg-[#1f2937] text-[#e5e7ff]">
              {localRsvp === "going" ? t("events_rsvp_going") : t("events_rsvp_interested")}
            </Badge>
          )}
          {isPendingRequest && (
            <Badge variant="outline" className="border-[#c2435b] text-[#ffc6d0]">
              {t("events_rsvp_pending")}
            </Badge>
          )}
          {isHost && pendingCount > 0 && (
            <Badge variant="outline" className="border-[#c2435b] text-[#ffc6d0]">
              {t("events_manage_pending_badge", { count: pendingCount })}
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-[#1f2536] pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <AvatarBubble user={hostProfile} fallbackLabel={hostName} size={44} />
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#7b8196]">
                  {t("events_manage_host_badge")}
                </p>
                <p className="text-sm font-medium text-white">{hostName}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-[#9ca3c9]">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{locationLabel}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-xs text-[#9ca3c9]">
              <div className="flex items-center gap-2">
                <Wifi className="h-3.5 w-3.5" />
                <span>{presenceLabel}</span>
              </div>
              {checkedInLabel && <span className="text-[11px]">{checkedInLabel}</span>}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-[#7b8196]">
                <Users className="h-3.5 w-3.5" />
                <span>{t("events_attendees_confirmed", { count: attendeeIds.length })}</span>
              </div>
              <AvatarStack ids={attendeeIds} directory={directoryState} />
            </div>

            {variant === "upcoming" && user && (
              <div className="flex flex-wrap gap-2">
                {!isHost && (
                  <>
                    {hasRsvped ? (
                      <Badge variant="secondary" className="rounded-full bg-[#1f2937] px-4 py-1 text-xs">
                        {t("events_manage_rsvp_done")}
                      </Badge>
                    ) : isPendingRequest ? (
                      <>
                        <Badge variant="outline" className="rounded-full border-[#c2435b] px-4 py-1 text-xs text-[#ffc6d0]">
                          {t("events_rsvp_pending")}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full px-4"
                          disabled={pending}
                          onClick={() => handleCancelRsvp(event.eventId)}
                        >
                          {t("events_rsvp_cancel")}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="accent"
                        size="sm"
                        className="rounded-full px-4"
                        disabled={pending}
                        onClick={() => handleRsvp(event.eventId)}
                      >
                        {t("events_rsvp_request")}
                      </Button>
                    )}
                  </>
                )}
                <Button
                  variant={localRsvp === "interested" ? "accent" : "outline"}
                  size="sm"
                  onClick={() => handleLocalRsvp(event.eventId, "interested")}
                  className="rounded-full px-4"
                >
                  {t("events_rsvp_interested")}
                </Button>
                <Button
                  variant={localRsvp === "going" ? "accent" : "outline"}
                  size="sm"
                  onClick={() => handleLocalRsvp(event.eventId, "going")}
                  className="rounded-full px-4"
                >
                  {t("events_rsvp_going")}
                </Button>
                {isHost && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => handleEditStart(event)}
                      className="rounded-full px-4"
                    >
                      {t("events_manage_edit")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => handleDelete(event.eventId)}
                      className="rounded-full px-4"
                    >
                      {t("events_manage_delete")}
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddToCalendar(event)}
                  className="rounded-full px-4"
                >
                  {t("events_calendar_add")}
                </Button>
              </div>
            )}
          </div>
        </div>

        {isHost && pendingCount > 0 && (
          <div className="space-y-3 rounded-2xl border border-[#2b2f40] bg-[#080d18] p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#7b8196]">
              {t("events_manage_pending_heading")}
            </p>
            {pendingAttendees.map((pendingId) => {
              const pendingProfile = directoryState[pendingId];
              const pendingName = pendingProfile?.displayName ?? pendingId;
              return (
                <div key={pendingId} className="flex flex-col gap-3 rounded-xl border border-[#1f2233] p-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <AvatarBubble user={pendingProfile} fallbackLabel={pendingName} size={40} />
                    <div>
                      <p className="text-sm font-medium text-white">{pendingName}</p>
                      <p className="text-xs text-[#9ca3c9]">{pendingProfile?.email ?? pendingId}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="accent"
                      size="sm"
                      className="rounded-full px-4"
                      disabled={pending}
                      onClick={() => handleModerateRsvp(event.eventId, pendingId, "approve")}
                    >
                      {t("events_manage_approve")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full px-4"
                      disabled={pending}
                      onClick={() => handleModerateRsvp(event.eventId, pendingId, "reject")}
                    >
                      {t("events_manage_reject")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen w-full bg-[#050812] text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-8">
        <header>
          <Card className="border-none bg-[#050812] p-0 shadow-none">
            <div className="flex items-center justify-between px-1 pb-6 pt-2">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#262c3f] text-[#9ca3c9]"
                onClick={() => window.history.back()}
              >
                <span className="-ml-[1px] text-lg">←</span>
              </button>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#262c3f] text-[#9ca3c9]"
              >
                <span className="text-sm">☷</span>
              </button>
            </div>

            <div className="flex gap-6">
              <div className="flex-1 space-y-6">
                <div className="space-y-2">
                  <p className="text-[11px] tracking-[0.3em] text-[#7b8196] uppercase">
                    {t("events_landing_tag")}
                  </p>
                  <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
                    {t("events_title")}
                  </h1>
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-[11px] tracking-[0.3em] text-[#7b8196] uppercase">{timeLabel}</p>
                    <p className="mt-1 text-base">{primaryEventDateString}</p>
                  </div>
                  <div>
                    <p className="text-[11px] tracking-[0.3em] text-[#7b8196] uppercase">
                      {t("events_form_location_label")}
                    </p>
                    <p className="mt-1 text-base">{primaryEventLocationLabel}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex flex-col items-center gap-4">
                  {events
                    .filter((event) => event.startsAt >= Date.now())
                    .slice(0, 4)
                    .map((event, index) => {
                      const hostProfile = directoryState[event.hostUserId];
                      const label =
                        hostProfile?.displayName ?? hostProfile?.email ?? event.title;

                      return (
                        <button
                          key={event.eventId}
                          type="button"
                          className="relative flex flex-col items-center"
                          onClick={() => setFocusEventId(event.eventId)}
                        >
                          <AvatarBubble
                            user={hostProfile}
                            fallbackLabel={label}
                            size={index === 0 ? 52 : 40}
                          />
                          {index < 3 && <div className="mt-2 h-8 w-px bg-[#2c3344]" />}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          </Card>
        </header>

        <section className="mt-8 rounded-[32px] border border-[#1d2233] bg-[#101321] px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.85)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <input
              type="search"
              className="w-full rounded-full border border-[#2b2f40] bg-[#050816] px-4 py-2 text-sm text-[#e5e7ff] placeholder:text-[#4b5268] md:w-72"
              placeholder={t("events_filter_search")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-full px-4 tracking-[0.3em] ${
                formatFilter === "all"
                  ? "bg-[#c2435b] text-white hover:bg-[#c2435b]"
                  : "border border-[#2b2f40] bg-transparent text-[#e5e7ff]"
              }`}
              onClick={() => setFormatFilter("all")}
            >
              {t("events_filter_all")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-full px-4 tracking-[0.3em] ${
                formatFilter === "virtual"
                  ? "bg-[#c2435b] text-white hover:bg-[#c2435b]"
                  : "border border-[#2b2f40] bg-transparent text-[#e5e7ff]"
              }`}
              onClick={() => setFormatFilter("virtual")}
            >
              {t("events_filter_virtual")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-full px-4 tracking-[0.3em] ${
                formatFilter === "in-person"
                  ? "bg-[#c2435b] text-white hover:bg-[#c2435b]"
                  : "border border-[#2b2f40] bg-transparent text-[#e5e7ff]"
              }`}
              onClick={() => setFormatFilter("in-person")}
            >
              {t("events_filter_inperson")}
            </Button>
          </div>
        </div>
        {!plannerVisible && isAuthenticated && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="rounded-full px-4" onClick={openPlanner}>
              {t("events_cta_secondary")}
            </Button>
          </div>
        )}
      </section>

      {error && (
        <Card className="border-destructive/60 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </Card>
      )}

      {isAuthenticated && hostPendingEvents.length > 0 && (
        <section className="rounded-2xl border border-[#2b2f40] bg-[#080d18] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">{t("events_manage_pending_heading")}</p>
            <Badge variant="outline" className="border-[#c2435b] text-[#ffc6d0]">
              {hostPendingEvents.length} {t("events_manage_pending_badge", { count: hostPendingEvents.length })}
            </Badge>
          </div>
          <div className="mt-4 space-y-4">
            {hostPendingEvents.map((event) => (
              <div key={event.eventId} className="space-y-3 rounded-xl border border-[#1f2233] p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-[#7b8196]">
                      {new Date(event.startsAt).toLocaleString()}
                    </p>
                    <p className="text-base font-semibold">{event.title}</p>
                  </div>
                  <Badge variant="outline" className="border-[#c2435b] text-[#ffc6d0]">
                    {(event.pendingAttendees?.length ?? 0)} {t("events_manage_pending_badge", { count: event.pendingAttendees?.length ?? 0 })}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {(event.pendingAttendees ?? []).map((pendingId) => {
                    const profile = directoryState[pendingId];
                    const name = profile?.displayName ?? profile?.email ?? pendingId;
                    return (
                      <div key={pendingId} className="flex flex-col gap-3 rounded-lg border border-[#2b2f40] p-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <AvatarBubble user={profile} fallbackLabel={name} size={36} />
                          <div>
                            <p className="text-sm font-medium text-white">{name}</p>
                            <p className="text-xs text-[#9ca3c9]">{profile?.email ?? pendingId}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="accent"
                            size="sm"
                            className="rounded-full px-4"
                            disabled={pending}
                            onClick={() => handleModerateRsvp(event.eventId, pendingId, "approve")}
                          >
                            {t("events_manage_approve")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full px-4"
                            disabled={pending}
                            onClick={() => handleModerateRsvp(event.eventId, pendingId, "reject")}
                          >
                            {t("events_manage_reject")}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && isAuthenticated && plannerVisible && (
        <section id="event-planner" className="mt-2 rounded-2xl bg-[#0b1220] px-4 py-5">
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" className="rounded-full px-4" onClick={closePlanner}>
              {t("generic_back")}
            </Button>
          </div>
          <p className="text-center text-sm leading-relaxed text-[#cfd3e3]">
            {uploadCopy}
          </p>

          <div className="mt-5 rounded-2xl border border-dashed border-[#3d4760] bg-[#050812] px-4 py-5 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#111827]">
              <span className="text-lg">⤴</span>
            </div>
            <h2 className="text-lg font-semibold">
              {isEditing ? t("events_manage_update") : t("events_planner_heading")}
            </h2>
            <p className="mt-1 text-xs text-[#9ca3c9]">{t("events_planner_hint")}</p>

            <div className="mt-4 space-y-3 text-left">
            <div className="grid gap-3">
              <Input
                value={form.hostUserId}
                onChange={(event) => setForm((prev) => ({ ...prev, hostUserId: event.target.value }))}
                placeholder={t("events_form_host_label")}
                className="border-[#262c3f] bg-[#050816]"
              />
              <Input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder={t("events_form_title_label")}
                className="border-[#262c3f] bg-[#050816]"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
                    placeholder={t("events_form_start_label")}
                    className="border-[#262c3f] bg-[#050816]"
                  />
                  <Input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))}
                    placeholder={t("events_form_end_label")}
                    className="border-[#262c3f] bg-[#050816]"
                  />
                </div>
                <Input
                  value={form.locationAddress}
                  onChange={(event) => setForm((prev) => ({ ...prev, locationAddress: event.target.value }))}
                  placeholder={t("events_form_location_label")}
                  className="border-[#262c3f] bg-[#050816]"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    value={form.locationLat}
                    onChange={(event) => setForm((prev) => ({ ...prev, locationLat: event.target.value }))}
                    placeholder={t("events_form_lat_label")}
                    className="border-[#262c3f] bg-[#050816]"
                  />
                  <Input
                    value={form.locationLng}
                    onChange={(event) => setForm((prev) => ({ ...prev, locationLng: event.target.value }))}
                    placeholder={t("events_form_lng_label")}
                    className="border-[#262c3f] bg-[#050816]"
                  />
                </div>
              </div>
              <Textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder={t("events_form_description_label")}
                rows={3}
                className="border-[#262c3f] bg-[#050816]"
              />
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  variant="accent"
                  disabled={pending || !canSubmit}
                  onClick={handleSubmit}
                  className="rounded-full px-6"
                >
                  {pending ? t("generic_loading") : isEditing ? t("events_manage_update") : t("events_form_submit")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={resetForm}
                  disabled={pending}
                  className="rounded-full px-6"
                >
                  {isEditing ? t("events_manage_cancel_edit") : t("events_form_reset")}
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {fetching && (
        <Card className="border-border/40 bg-border/10 p-3 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {t("generic_loading")}
        </Card>
      )}

      {eventsWithLocation.length > 0 && (
        <section className="space-y-4 rounded-3xl border border-[#151b2f] bg-[#050812] p-6">
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
        <section className="space-y-4 rounded-3xl border border-[#151b2f] bg-[#050812] p-6">
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
            const pendingSet = new Set(focusedEvent.pendingAttendees ?? []);
            const timelinePending = Boolean(user && pendingSet.has(user.userId));

            return (
              <Card className="space-y-4 border-[#151b2f] bg-[#050816] p-4">
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
                    {!alreadyRsvped && !timelinePending && (
                      <Button variant="accent" size="sm" onClick={() => handleRsvp(focusedEvent.eventId)}>
                        {t("events_rsvp_request")}
                      </Button>
                    )}
                    {timelinePending && (
                      <>
                        <Badge variant="outline" className="rounded-full border-[#c2435b] px-4 py-1 text-xs text-[#ffc6d0]">
                          {t("events_rsvp_pending")}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => handleCancelRsvp(focusedEvent.eventId)}>
                          {t("events_rsvp_cancel")}
                        </Button>
                      </>
                    )}
                    {alreadyRsvped && (
                      <Badge variant="secondary" className="rounded-full bg-[#1f2937] px-4 py-1 text-xs">
                        {t("events_manage_rsvp_done")}
                      </Badge>
                    )}
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

      <section className="mt-2 rounded-xl border border-[#1d2233] bg-[#0b1220] px-4 py-5 shadow-[0_18px_50px_rgba(0,0,0,0.9)]">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-[#9ca3c9] uppercase">
            {currentSprintsLabel}
          </p>
          <Badge variant="outline" className="border-[#262c3f] text-[#cdd3f7]">
            {upcomingEvents.length} {t("events_listed_suffix")}
          </Badge>
        </div>
        <div className="mt-4 space-y-4">
          {upcomingEvents.map((event) => renderEventCard(event, "upcoming"))}
          {upcomingEvents.length === 0 && !fetching && (
            <p className="text-sm text-[#cfd3e3]">{t("events_none_upcoming")}</p>
          )}
        </div>
      </section>

      <section className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#9ca3c9]">{t("events_recent")}</h2>
          <Badge variant="outline" className="border-[#262c3f] text-[#9ca3c9]">
            {pastEvents.length} {t("events_archived_suffix")}
          </Badge>
        </div>
        <div className="grid gap-4">
          {pastEvents.map((event) => renderEventCard(event, "past"))}
          {pastEvents.length === 0 && !fetching && (
            <Card className="border-dashed border-[#262c3f] bg-transparent p-6 text-sm text-[#9ca3c9]">
              {t("events_none_planned")}
            </Card>
          )}
        </div>
      </section>
      </div>
    </div>
  );
};
