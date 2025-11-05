"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/context/i18n";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Event } from "@/lib/types";

interface EventsClientProps {
  upcoming: Event[];
  past: Event[];
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

const toDateTimeLocal = (timestamp: number) => {
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset();
  const local = new Date(timestamp - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

export const EventsClient = ({ upcoming, past }: EventsClientProps) => {
  const { t } = useI18n();
  const { user, isAuthenticated, loading } = useAuth();
  const [events, setEvents] = useState<Event[]>(() =>
    [...upcoming, ...past].sort((a, b) => a.startsAt - b.startsAt)
  );
  const [form, setForm] = useState<EventFormState>({ ...initialForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshEvents = useCallback(async () => {
    setFetching(true);
    try {
      const response = await fetch("/api/events", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`);
      }
      const payload: { items: Event[] } = await response.json();
      setEvents(payload.items.sort((a, b) => a.startsAt - b.startsAt));
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

  const upcomingEvents = useMemo(
    () => events.filter((event) => event.startsAt >= Date.now()),
    [events]
  );
  const pastEvents = useMemo(
    () => events.filter((event) => event.startsAt < Date.now()).sort((a, b) => b.startsAt - a.startsAt),
    [events]
  );

  const canSubmit = form.title.trim().length >= 3 && Boolean(form.startsAt);

  const renderEventCard = (event: Event, variant: "upcoming" | "past") => {
    const attendeesLabel = t("events_manage_attendees").replace("{count}", String(event.attendees.length));
    const isHost = user?.userId === event.hostUserId;
    const hasRsvped = Boolean(user && event.attendees.includes(user.userId));

    return (
      <Card
        key={event.eventId}
        className={variant === "upcoming" ? "space-y-3 bg-card/80 p-6" : "space-y-3 bg-border/20 p-6"}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white">{event.title}</h3>
            {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
          </div>
          <Badge>{new Date(event.startsAt).toLocaleString()}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {isHost && <Badge variant="outline">{t("events_manage_host_badge")}</Badge>}
          <span>{attendeesLabel}</span>
        </div>
        {event.location?.address && <p className="text-sm text-muted-foreground">{event.location.address}</p>}
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
            {isHost && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => handleEditStart(event)}
                >
                  {t("events_manage_edit")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => handleDelete(event.eventId)}
                >
                  {t("events_manage_delete")}
                </Button>
              </>
            )}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header>
        <h1 className="text-3xl font-semibold text-white">{t("events_title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("events_subtitle")}</p>
      </header>

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
