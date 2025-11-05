import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getBackend } from "@/lib/backend";
import { EventSchema, EventUpdateSchema, RSVPEventSchema } from "@/lib/validation";

export async function GET() {
  const backend = getBackend();
  const events = await backend.events.list();
  return NextResponse.json({ items: events });
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
  const event = await backend.events.update({ eventId, data: payload });
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
