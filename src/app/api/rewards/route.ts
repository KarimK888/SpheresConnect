import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getBackend } from "@/lib/backend";
import { RewardLogSchema } from "@/lib/validation";
import type { RewardLog } from "@/lib/types";

const summarySchema = z.object({ userId: z.string() });

export async function GET(request: Request) {
  const backend = getBackend();
  const url = new URL(request.url);
  const params = summarySchema.safeParse({ userId: url.searchParams.get("userId") });
  if (!params.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "userId required" } }, { status: 400 });
  }
  const summary = await backend.rewards.summary(params.data);
  return NextResponse.json(summary);
}

export async function POST(request: Request) {
  const backend = getBackend();
  const payload = RewardLogSchema.parse(await request.json());
  const logPayload: RewardLog = {
    ...payload,
    id: randomUUID(),
    createdAt: payload.createdAt ?? Date.now()
  };
  const log = await backend.rewards.log(logPayload);
  return NextResponse.json(log, { status: 201 });
}
