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
  const session = await backend.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required" } }, { status: 401 });
  }
  const payload = MessageSchema.parse(await request.json());
  if (payload.senderId !== session.user.userId) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Invalid sender" } }, { status: 403 });
  }
  if (!(payload.content?.trim() || (payload.attachments && payload.attachments.length > 0))) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Message requires content or an attachment" } },
      { status: 400 }
    );
  }
  const message = await backend.messages.send(payload);
  try {
    const chatList = await backend.messages.listChats({ userId: payload.senderId });
    const chat = chatList.find((entry) => entry.chatId === payload.chatId);
    if (chat) {
      const sender = await backend.users.get(payload.senderId);
      const senderName = sender?.displayName ?? sender?.email ?? "Someone";
      await Promise.all(
        chat.memberIds
          .filter((memberId) => memberId !== payload.senderId)
          .map((memberId) =>
            backend.notifications.create({
              userId: memberId,
              kind: "message",
              title: `${senderName} sent you a message`,
              body: payload.content ?? "New message",
              metadata: { chatId: chat.chatId, senderId: payload.senderId },
              link: `/messages?chat=${chat.chatId}`
            })
          )
      );
    }
  } catch (error) {
    console.warn("[messages] unable to fan-out notification", error);
  }
  return NextResponse.json(message, { status: 201 });
}

export async function PUT(request: Request) {
  const backend = getBackend();
  const payload = ChatSchema.parse(await request.json());
  const chat = await backend.messages.createChat(payload);
  return NextResponse.json(chat, { status: 201 });
}
