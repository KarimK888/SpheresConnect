import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getBackend } from "@/lib/backend";
import type { Checkin } from "@/lib/types";
import { EventSchema, EventUpdateSchema, RSVPEventSchema } from "@/lib/validation";

export async function GET() {
  const backend = getBackend();
  const [events, hubs, checkins] = await Promise.all([
    backend.events.list(),
    backend.hubs.list(),
    backend.checkins
      .listActive()
      .then((items) => items)
      .catch(() => [])
  ]);

  const hubDirectory = Object.fromEntries(hubs.map((hub) => [hub.hubId, hub]));
  const presenceByHub = checkins.reduce<Record<string, Checkin[]>>((acc, entry) => {
    if (!entry.hubId) {
      return acc;
    }
    if (!acc[entry.hubId]) {
      acc[entry.hubId] = [];
    }
    acc[entry.hubId].push(entry);
    return acc;
  }, {});

  const uniqueUserIds = new Set<string>();
  events.forEach((event) => {
    uniqueUserIds.add(event.hostUserId);
    event.attendees.forEach((attendee) => uniqueUserIds.add(attendee));
  });
  hubs.forEach((hub) => hub.activeUsers.forEach((userId) => uniqueUserIds.add(userId)));
  checkins.forEach((entry) => uniqueUserIds.add(entry.userId));

  const directoryEntries = await Promise.all(
    Array.from(uniqueUserIds).map(async (userId) => {
      const profile = await backend.users.get(userId);
      return profile ? [userId, profile] : null;
    })
  );

  const directory = Object.fromEntries(
    directoryEntries.filter(Boolean) as [string, Awaited<ReturnType<typeof backend.users.get>>][]
  );

  return NextResponse.json({
    items: events,
    directory,
    hubs: hubDirectory,
    presence: presenceByHub
  });
}

export async function POST(request: Request) {
  const backend = getBackend();
  const payload = EventSchema.parse(await request.json());
  const event = await backend.events.create({
    eventId: payload.eventId ?? randomUUID(),
    title: payload.title,
    description: payload.description,
    startsAt: payload.startsAt,
    endsAt: payload.endsAt,
    location: payload.location,
    hostUserId: payload.hostUserId,
    attendees: payload.attendees,
    createdAt: payload.createdAt ?? Date.now()
  });
  return NextResponse.json(event, { status: 201 });
}

export async function PATCH(request: Request) {
  const backend = getBackend();
  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Missing eventId" } }, { status: 400 });
  }
  const payload = RSVPEventSchema.parse(await request.json());
  const event = await backend.events.rsvp({ eventId, userId: payload.userId });
  return NextResponse.json(event);
}

export async function PUT(request: Request) {
  const backend = getBackend();
  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Missing eventId" } }, { status: 400 });
  }
  const payload = EventUpdateSchema.parse(await request.json());
  const normalized = {
    ...payload,
    description: payload.description ?? undefined,
    endsAt: payload.endsAt ?? undefined,
    location: payload.location ?? undefined
  };
  const event = await backend.events.update({ eventId, data: normalized });
  return NextResponse.json(event);
}

export async function DELETE(request: Request) {
  const backend = getBackend();
  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Missing eventId" } }, { status: 400 });
  }
  await backend.events.remove({ eventId });
  return NextResponse.json({ success: true });
}
