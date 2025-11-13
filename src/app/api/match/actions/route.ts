import { NextResponse } from "next/server";
import { MatchActionSchema } from "@/lib/validation";
import { getBackend } from "@/lib/backend";

export async function GET(request: Request) {
  const backend = getBackend();
  const session = await backend.auth.getSession();
  const url = new URL(request.url);
  const direction = url.searchParams.get("direction") ?? "outgoing";
  const requestedUserId = url.searchParams.get("userId") ?? undefined;
  const userId = session?.user.userId ?? requestedUserId;
  if (!userId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required" } }, { status: 401 });
  }
  if (direction === "incoming") {
    const likes = await backend.matches.incomingLikes({ userId });
    return NextResponse.json({ items: likes });
  }
  const history = await backend.matches.history({ userId });
  return NextResponse.json({ items: history });
}

export async function POST(request: Request) {
  const backend = getBackend();
  const payload = MatchActionSchema.parse(await request.json());
  const session = await backend.auth.getSession();
  const userId = session?.user.userId ?? payload.userId;
  if (!userId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required" } }, { status: 401 });
  }
  const action = await backend.matches.recordAction({
    userId,
    targetId: payload.targetId,
    action: payload.action,
    createdAt: payload.createdAt
  });
  return NextResponse.json(action, { status: 201 });
}
