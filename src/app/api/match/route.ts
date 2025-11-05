import { NextResponse } from "next/server";
import { MatchRequestSchema } from "@/lib/validation";
import { getBackend } from "@/lib/backend";

export async function POST(request: Request) {
  const backend = getBackend();
  const payload = MatchRequestSchema.parse(await request.json());
  const matches = await backend.matches.suggest(payload);
  return NextResponse.json({ items: matches });
}
