import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getBackend } from "@/lib/backend";
import { CheckinSchema } from "@/lib/validation";
import type { RewardLog } from "@/lib/types";

const nearSchema = z.object({ lat: z.coerce.number(), lng: z.coerce.number() });
const checkinRequestSchema = CheckinSchema.extend({
  userId: z.string().optional()
});

export async function GET(request: Request) {
  const backend = getBackend();
  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lng = url.searchParams.get("lng");
  const near = lat && lng ? nearSchema.parse({ lat, lng }) : undefined;
  const checkins = await backend.checkins.listActive({ near });
  return NextResponse.json({ items: checkins });
}

export async function POST(request: Request) {
  const backend = getBackend();
  const payload = checkinRequestSchema.parse(await request.json());
  const session = await backend.auth.getSession();
  const userId = session?.user.userId ?? payload.userId;
  if (!userId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required" } }, { status: 401 });
  }
  const checkin = await backend.checkins.create({ ...payload, userId });

  const rewardEntry: RewardLog = {
    id: randomUUID(),
    userId,
    action: "checkin",
    points: 10,
    createdAt: Date.now(),
    note: "Hub check-in"
  };
  backend.rewards
    .log(rewardEntry)
    .catch((error) => console.warn("[api/checkin] reward log failed", error));

  return NextResponse.json(checkin, { status: 201 });
}
