import { NextResponse } from "next/server";
import { z } from "zod";
import { getBackend } from "@/lib/backend";
import { MessageSchema, ChatSchema } from "@/lib/validation";

const listSchema = z.object({ chatId: z.string() });

export async function GET(request: Request) {
  const backend = getBackend();
  const url = new URL(request.url);
  const params = listSchema.safeParse({ chatId: url.searchParams.get("chatId") });
  if (!params.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "chatId required" } }, { status: 400 });
  }
  const messages = await backend.messages.list(params.data);
  return NextResponse.json({ items: messages });
}

export async function POST(request: Request) {
  const backend = getBackend();
  const payload = MessageSchema.parse(await request.json());
  const message = await backend.messages.send(payload);
  return NextResponse.json(message, { status: 201 });
}

export async function PUT(request: Request) {
  const backend = getBackend();
  const payload = ChatSchema.parse(await request.json());
  const chat = await backend.messages.createChat(payload);
  return NextResponse.json(chat, { status: 201 });
}
