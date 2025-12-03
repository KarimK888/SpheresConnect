import { NextResponse } from "next/server";
import { OrderSchema } from "@/lib/validation";
import { getBackend } from "@/lib/backend";

export async function POST(request: Request) {
  const backend = getBackend();
  const payload = OrderSchema.parse(await request.json());
  const session = await backend.auth.getSession();
  const buyerId = session?.user.userId;
  if (!buyerId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required" } }, { status: 401 });
  }
  const metadata = {
    buyerName: payload.buyerName,
    buyerEmail: payload.buyerEmail,
    buyerPhone: payload.buyerPhone,
    notes: payload.notes,
    shippingAddress: payload.shippingAddress
  };
  const intent = await backend.orders.createPaymentIntent({
    artworkId: payload.artworkId,
    buyerId,
    metadata
  });
  return NextResponse.json(intent, { status: 201 });
}
