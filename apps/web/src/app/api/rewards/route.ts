import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getBackend } from "@/lib/backend";
import { RewardLogSchema } from "@/lib/validation";
import type { RewardLog, User } from "@/lib/types";

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
  const createdAt = payload.createdAt ?? Date.now();

  const resolveRecipient = async (value?: string | null): Promise<User | null> => {
    const identifier = value?.trim();
    if (!identifier) return null;
    try {
      const direct = await backend.users.get(identifier);
      if (direct) return direct;
    } catch (error) {
      console.warn("[rewards] direct user lookup failed", error);
    }
    try {
      const candidates = await backend.users.list({ query: identifier });
      if (!candidates.length) return null;
      const normalized = identifier.toLowerCase();
      const match =
        candidates.find((user) => user.userId === identifier) ??
        candidates.find((user) => user.email?.toLowerCase() === normalized) ??
        candidates.find((user) => user.displayName?.toLowerCase() === normalized);
      return match ?? candidates[0] ?? null;
    } catch (error) {
      console.warn("[rewards] recipient lookup failed", error);
      return null;
    }
  };

  // Handle transfers by crediting the recipient as well.
  if (payload.action === "transfer" && payload.recipientId && payload.recipientId.trim().length > 0) {
    const recipient = await resolveRecipient(payload.recipientId);
    if (!recipient) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Recipient not found" } }, { status: 404 });
    }
    if (recipient.userId === payload.userId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Cannot transfer to yourself" } },
        { status: 400 }
      );
    }
    const debit: RewardLog = {
      userId: payload.userId,
      action: "transfer",
      points: payload.points,
      note: payload.note,
      id: randomUUID(),
      createdAt
    };
    const credit: RewardLog = {
      userId: recipient.userId,
      action: "transfer",
      points: Math.abs(payload.points),
      note: payload.note ? `From ${payload.userId}: ${payload.note}` : `From ${payload.userId}`,
      id: randomUUID(),
      createdAt
    };
    try {
      const savedDebit = await backend.rewards.log(debit);
      const savedCredit = await backend.rewards.log(credit);
      const sender = await backend.users.get(payload.userId);
      await backend.notifications.create({
        userId: recipient.userId,
        kind: "rewards.transfer",
        title: "Points received",
        body: `${sender?.displayName ?? "A member"} sent you ${Math.abs(payload.points)} pts`,
        link: "/rewards/workspace",
        linkLabel: "View rewards",
        createdAt
      });
      return NextResponse.json({ debit: savedDebit, credit: savedCredit }, { status: 201 });
    } catch (error) {
      console.error("[api/rewards] transfer failed", error);
      return NextResponse.json(
        { error: { code: "SUPABASE_ERROR", message: "Unable to record transfer" } },
        { status: 500 }
      );
    }
  }

  const logPayload: RewardLog = {
    userId: payload.userId,
    action: payload.action,
    points: payload.points,
    note: payload.note,
    id: randomUUID(),
    createdAt
  };
  const log = await backend.rewards.log(logPayload);
  return NextResponse.json(log, { status: 201 });
}
