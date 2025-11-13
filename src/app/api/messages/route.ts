import { NextResponse } from "next/server";
import { z } from "zod";
import { getBackend } from "@/lib/backend";
import { MessageSchema, ChatSchema } from "@/lib/validation";

const chatListSchema = z.object({ chatId: z.string().optional(), userId: z.string().optional() });

export async function GET(request: Request) {
  const backend = getBackend();
  const url = new URL(request.url);
  const params = chatListSchema.safeParse({
    chatId: url.searchParams.get("chatId") ?? undefined,
    userId: url.searchParams.get("userId") ?? undefined
  });
  if (!params.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid query parameters" } }, { status: 400 });
  }
  if (params.data.chatId) {
    const messages = await backend.messages.list({ chatId: params.data.chatId });
    return NextResponse.json({ items: messages });
  }
  if (params.data.userId) {
    const chats = await backend.messages.listChats({ userId: params.data.userId });
    return NextResponse.json({ items: chats });
  }
  return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "chatId or userId required" } }, { status: 400 });
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
