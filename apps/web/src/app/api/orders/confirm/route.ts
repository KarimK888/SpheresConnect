import { NextResponse } from "next/server";
import { z } from "zod";
import { getBackend } from "@/lib/backend";
import { requireApiRole } from "@/lib/server-auth";

const ConfirmSchema = z.object({
  paymentIntentId: z.string(),
  status: z.enum(["pending", "paid", "failed", "refunded"])
});

export async function POST(request: Request) {
  const authCheck = await requireApiRole(["admin", "moderator"]);
  if (!authCheck.ok) {
    return authCheck.response;
  }
  const backend = getBackend();
  const payload = ConfirmSchema.parse(await request.json());
  const order = await backend.orders.confirmPayment(payload);
  return NextResponse.json(order, { status: 200 });
}
