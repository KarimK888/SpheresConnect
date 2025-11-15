"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, ShieldCheck, ShoppingBag } from "lucide-react";
import type { Artwork, Order } from "@/lib/types";
import { useI18n } from "@/context/i18n";
import { useSessionState } from "@/context/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface MarketplaceCheckoutClientProps {
  artwork: Artwork;
  sellerName: string;
}

interface CheckoutIntent {
  clientSecret: string;
  order: Order;
}

export const MarketplaceCheckoutClient = ({ artwork, sellerName }: MarketplaceCheckoutClientProps) => {
  const { t } = useI18n();
  const router = useRouter();
  const sessionUser = useSessionState((state) => state.user);
  const loadingSession = useSessionState((state) => state.loading);
  const [form, setForm] = useState({
    fullName: sessionUser?.displayName ?? "",
    email: sessionUser?.email ?? "",
    notes: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    region: "",
    country: "",
    postalCode: ""
  });
  const [intent, setIntent] = useState<CheckoutIntent | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"idle" | "intent" | "confirm">("idle");

  const priceLabel = useMemo(
    () =>
      (artwork.price / 100).toLocaleString(undefined, {
        style: "currency",
        currency: artwork.currency.toUpperCase()
      }),
    [artwork.price, artwork.currency]
  );

  const shippingAddress = useMemo(() => {
    const line1 = form.addressLine1.trim();
    if (!line1) return null;
    return {
      line1,
      line2: form.addressLine2.trim() || undefined,
      city: form.city.trim() || undefined,
      region: form.region.trim() || undefined,
      country: form.country.trim() || undefined,
      postalCode: form.postalCode.trim() || undefined
    };
  }, [form.addressLine1, form.addressLine2, form.city, form.region, form.country, form.postalCode]);

  const canSubmitIntent =
    form.fullName.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(form.email) &&
    Boolean(shippingAddress) &&
    form.phone.trim().length >= 6;

  const startCheckout = async () => {
    if (!canSubmitIntent) return;
    if (!sessionUser) {
      router.push(`/login?next=/marketplace/checkout/${artwork.artworkId}`);
      return;
    }
    setSubmitting("intent");
    setError(null);
    setStatusMessage(null);
    try {
      const metadata = {
        buyerName: form.fullName.trim(),
        buyerEmail: form.email.trim(),
        buyerPhone: form.phone.trim() || undefined,
        notes: form.notes.trim() || undefined,
        shippingAddress: shippingAddress ?? undefined
      };
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artworkId: artwork.artworkId,
          buyerId: sessionUser.userId,
          buyerName: metadata.buyerName,
          buyerEmail: metadata.buyerEmail,
          notes: metadata.notes,
          shippingAddress: metadata.shippingAddress,
          buyerPhone: metadata.buyerPhone
        })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message ?? t("checkout_error_generic"));
      }
      const payload = (await response.json()) as CheckoutIntent;
      setIntent(payload);
      setStatusMessage(t("checkout_status_ready"));
    } catch (error) {
      setIntent(null);
      setError(error instanceof Error ? error.message : t("checkout_error_generic"));
    } finally {
      setSubmitting("idle");
    }
  };

  const confirmPayment = async () => {
    if (!intent) return;
    setSubmitting("confirm");
    setError(null);
    try {
      const response = await fetch("/api/orders/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: intent.order.stripePaymentIntentId, status: "paid" })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message ?? t("checkout_error_generic"));
      }
      const updatedOrder = (await response.json()) as Order;
      setIntent((prev) => (prev ? { ...prev, order: updatedOrder } : prev));
      setStatusMessage(t("checkout_status_paid"));
      router.push(`/marketplace/orders/${updatedOrder.orderId}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : t("checkout_error_generic"));
    } finally {
      setSubmitting("idle");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white"
          onClick={() => router.push("/marketplace")}
        >
          <ShoppingBag className="h-4 w-4" />
          {t("checkout_back_to_marketplace")}
        </button>
        <div>
          <h1 className="text-3xl font-semibold text-white">{t("checkout_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("checkout_subtitle")}</p>
        </div>
      </div>

      {!sessionUser && !loadingSession && (
        <Card className="border-border/60 bg-accent/10">
          <CardContent className="flex flex-col gap-3 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <span>{t("checkout_login_required")}</span>
            <Button asChild variant="secondary">
              <Link href="/login">{t("nav_sign_in")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg text-white">{t("checkout_summary_heading")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-[1fr,1fr]">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black/20">
                <Image
                  src={artwork.mediaUrls[0] ?? "https://placehold.co/800x600?text=Artwork"}
                  alt={artwork.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("checkout_artwork_label")}</p>
                  <p className="text-xl font-semibold text-white">{artwork.title}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("checkout_order_price")}</p>
                  <p className="text-lg font-semibold text-white">{priceLabel}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("checkout_order_seller")}</p>
                  <p className="text-base font-medium text-white">{sellerName}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {artwork.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <LabelledInput
                label={t("checkout_shipping_name")}
                value={form.fullName}
                onChange={(value) => setForm((prev) => ({ ...prev, fullName: value }))}
              />
              <LabelledInput
                label={t("checkout_shipping_email")}
                value={form.email}
                onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
              />
              <LabelledInput
                label={t("checkout_shipping_phone")}
                value={form.phone}
                onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
                type="tel"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <LabelledInput
                label={t("checkout_shipping_address_line1")}
                value={form.addressLine1}
                onChange={(value) => setForm((prev) => ({ ...prev, addressLine1: value }))}
              />
              <LabelledInput
                label={t("checkout_shipping_address_line2")}
                value={form.addressLine2}
                onChange={(value) => setForm((prev) => ({ ...prev, addressLine2: value }))}
                placeholder={t("checkout_shipping_address_line2_placeholder")}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <LabelledInput
                label={t("checkout_shipping_city")}
                value={form.city}
                onChange={(value) => setForm((prev) => ({ ...prev, city: value }))}
              />
              <LabelledInput
                label={t("checkout_shipping_region")}
                value={form.region}
                onChange={(value) => setForm((prev) => ({ ...prev, region: value }))}
              />
              <LabelledInput
                label={t("checkout_shipping_postal")}
                value={form.postalCode}
                onChange={(value) => setForm((prev) => ({ ...prev, postalCode: value }))}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <LabelledInput
                label={t("checkout_shipping_country")}
                value={form.country}
                onChange={(value) => setForm((prev) => ({ ...prev, country: value }))}
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("checkout_shipping_notes")}</p>
              <Textarea
                rows={3}
                className="mt-2"
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg text-white">{t("checkout_payment_heading")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/50 bg-background/60 p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 text-white">
                <ShieldCheck className="h-4 w-4 text-accent" />
                {t("checkout_secure_payment")}
              </div>
              <p className="mt-2">{t("checkout_payment_copy")}</p>
            </div>
            {statusMessage && (
              <div className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm text-accent-foreground">
                {statusMessage}
              </div>
            )}
            {error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <Button
              className="w-full"
              disabled={!canSubmitIntent || submitting !== "idle" || !!intent}
              onClick={startCheckout}
            >
              {submitting === "intent" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("checkout_start_button")}
            </Button>
            <Button
              className="w-full"
              variant="secondary"
              disabled={!intent || submitting !== "idle" || intent.order.status === "paid"}
              onClick={confirmPayment}
            >
              {submitting === "confirm" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              {t("checkout_confirm_button")}
            </Button>
            {intent && (
              <div className="rounded-xl border border-border/40 bg-background/40 p-3 text-xs text-muted-foreground">
                <p>
                  <span className="font-semibold text-white">{t("checkout_intent_label")}:</span> {intent.clientSecret}
                </p>
                <p>
                  <span className="font-semibold text-white">{t("checkout_order_status")}:</span> {intent.order.status}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface LabelledInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}

const LabelledInput = ({ label, value, onChange, placeholder, type = "text" }: LabelledInputProps) => (
  <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
    {label}
    <Input
      className="mt-2"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type={type}
    />
  </label>
);
