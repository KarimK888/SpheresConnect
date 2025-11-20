import { NextResponse } from "next/server";
import { z } from "zod";
import { getBackend } from "@/lib/backend";

const ConfirmSchema = z.object({
  paymentIntentId: z.string(),
  status: z.enum(["pending", "paid", "failed", "refunded"])
});

export async function POST(request: Request) {
  const backend = getBackend();
  const payload = ConfirmSchema.parse(await request.json());
  const order = await backend.orders.confirmPayment(payload);
  return NextResponse.json(order, { status: 200 });
}
