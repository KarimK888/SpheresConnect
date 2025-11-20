import { NextResponse } from "next/server";
import { z } from "zod";
import { getBackend } from "@/lib/backend";
import { UserSchema } from "@/lib/validation";

const updateSchema = UserSchema.partial().omit({ userId: true, joinedAt: true, email: true });
const actionSchema = z.object({ userId: z.string(), action: z.enum(["requestVerification", "verify"]) });

export async function GET(request: Request) {
  const backend = getBackend();
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const query = url.searchParams.get("query") ?? undefined;

  if (id) {
    const user = await backend.users.get(id);
    if (!user) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "User not found" } }, { status: 404 });
    }
    return NextResponse.json(user);
  }

  const users = await backend.users.list({ query: query ?? undefined });
  return NextResponse.json({ items: users });
}

export async function PATCH(request: Request) {
  const backend = getBackend();
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Missing id" } }, { status: 400 });
  }
  const payload = updateSchema.parse(await request.json());
  const user = await backend.users.update(id, payload);
  return NextResponse.json(user);
}

export async function POST(request: Request) {
  const backend = getBackend();
  const payload = actionSchema.parse(await request.json());

  if (payload.action === "requestVerification") {
    const result = await backend.users.requestVerification(payload.userId);
    return NextResponse.json(result);
  }

  const user = await backend.users.verify(payload.userId);
  return NextResponse.json(user);
}
