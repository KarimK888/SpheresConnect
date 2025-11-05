import { NextResponse } from "next/server";
import { getStripe, getWebhookSecret } from "@/lib/stripe";
import { getBackend } from "@/lib/backend";

export const config = {
  api: {
    bodyParser: false
  }
};

export async function POST(request: Request) {
  const stripe = getStripe();
  const backend = getBackend();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Missing signature" } }, { status: 400 });
  }

  const payload = await request.text();

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, getWebhookSecret());
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      if (paymentIntent && typeof paymentIntent === "object" && "id" in paymentIntent) {
        await backend.orders.confirmPayment({
          paymentIntentId: String(paymentIntent.id),
          status: "paid"
        });
      }
    }
  } catch (error) {
    console.error("Stripe webhook error", error);
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid signature" } }, { status: 400 });
  }

  return NextResponse.json({ received: true });
}
