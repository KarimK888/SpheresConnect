import { NextResponse } from "next/server";
import { OrderSchema } from "@/lib/validation";
import { getBackend } from "@/lib/backend";

export async function POST(request: Request) {
  const backend = getBackend();
  const payload = OrderSchema.parse(await request.json());
  const session = await backend.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required" } }, { status: 401 });
  }
  const intent = await backend.orders.createPaymentIntent({
    artworkId: payload.artworkId,
    buyerId: session.user.userId
  });
  return NextResponse.json(intent, { status: 201 });
}
