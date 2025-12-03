import { NextResponse } from "next/server";
import { z } from "zod";
import { getBackend } from "@/lib/backend";
import { DEFAULT_REWARDS_PRESETS } from "@/lib/rewards-config";
import { requireApiRole } from "@/lib/server-auth";

const quickActionKeys = ["onboarding", "checkin", "match", "sale", "rsvp"] as const;
const presetsSchema = z.object({
  quickActions: z
    .record(z.enum(quickActionKeys), z.number().min(0))
    .optional()
});

export async function GET() {
  const backend = getBackend();
  try {
    const quickActions = await backend.rewards.presets();
    return NextResponse.json({
      quickActions: { ...DEFAULT_REWARDS_PRESETS.quickActions, ...quickActions }
    });
  } catch (error) {
    console.warn("[api/rewards/presets] falling back to defaults", error);
    return NextResponse.json(DEFAULT_REWARDS_PRESETS);
  }
}

export async function PUT(request: Request) {
  const authCheck = await requireApiRole("admin");
  if (!authCheck.ok) return authCheck.response;

  const backend = getBackend();
  const parsed = presetsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid presets payload" } }, { status: 400 });
  }
  try {
    const overrides = parsed.data.quickActions ?? {};
    const merged = await backend.rewards.updatePresets({
      ...DEFAULT_REWARDS_PRESETS.quickActions,
      ...overrides
    });
    return NextResponse.json({ quickActions: merged });
  } catch (error) {
    console.warn("[api/rewards/presets] unable to update presets", error);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Unable to update presets" } }, { status: 500 });
  }
}
