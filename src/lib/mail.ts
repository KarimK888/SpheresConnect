type SendInviteParams = {
  email: string;
  name?: string;
  inviteLink: string;
};

type HubPresenceEmailParams = {
  to: string[];
  hubName: string;
  count: number;
  hubLink?: string;
};

type OrderReceiptEmailParams = {
  to: string;
  recipientName?: string;
  orderId: string;
  amountLabel: string;
  artworkTitle?: string;
  role: "buyer" | "seller";
  counterpartyName?: string;
  notes?: string;
};

const getSender = () => process.env.PROFILE_INVITE_FROM ?? "SpheraConnect <no-reply@spheraconnect.dev>";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

const postEmail = async (payload: { from: string; to: string[]; subject: string; html: string }) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info("[email] Resend API key missing; logging payload", payload);
    return { delivered: false, via: "console" as const };
  }
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body?.message ?? body?.error ?? "Unknown error";
    console.warn("[email] send failed", message);
    return { delivered: false, via: "resend" as const, message };
  }
  return { delivered: true, via: "resend" as const };
};

export const sendProfileInviteEmail = async ({ email, name, inviteLink }: SendInviteParams) => {
  const sender = getSender();
  const subject = "Complete your SpheraConnect profile";
  const previewName = name ? `, ${name}` : "";
  const html = `
    <p>Hey${previewName || ""},</p>
    <p>Thanks for joining SpheraConnect. Click the button below to finish setting up your creator profile.</p>
    <p><a href="${inviteLink}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;border-radius:999px;text-decoration:none;">Create your profile</a></p>
    <p>If the button doesn’t work, copy and paste this URL into your browser:<br/>${inviteLink}</p>
    <p>See you inside,<br/>The SpheraConnect Team</p>
  `;

  if (!process.env.RESEND_API_KEY) {
    console.info(`[email] Profile invite for ${email}: ${inviteLink}`);
    return { delivered: false, via: "console" as const };
  }

  return postEmail({ from: sender, to: [email], subject, html });
};

export const sendHubPresenceEmail = async ({ to, hubName, count, hubLink }: HubPresenceEmailParams) => {
  if (!to.length) {
    return { delivered: false, via: "skipped" as const };
  }
  const uniqueRecipients = Array.from(new Set(to)).slice(0, Number(process.env.HUB_PRESENCE_ALERT_MAX_RECIPIENTS ?? 25));
  const sender = process.env.HUB_ALERT_FROM ?? getSender();
  const subject = `${hubName} is live right now`;
  const cta = hubLink
    ? `<p><a href="${hubLink}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;border-radius:999px;text-decoration:none;">Open hub map</a></p>`
    : "";
  const html = `
    <p>Heads up—${count} creators are checked in at <strong>${hubName}</strong> right now.</p>
    <p>Jump into the hub to collaborate or share updates.</p>
    ${cta}
  `;
  if (!process.env.RESEND_API_KEY) {
    console.info(`[email] Hub presence alert (${hubName}):`, uniqueRecipients);
    return { delivered: false, via: "console" as const };
  }
  return postEmail({ from: sender, to: uniqueRecipients, subject, html });
};

export const sendOrderReceiptEmail = async ({
  to,
  recipientName,
  orderId,
  amountLabel,
  artworkTitle,
  role,
  counterpartyName,
  notes
}: OrderReceiptEmailParams) => {
  const sender = process.env.ORDER_RECEIPT_FROM ?? getSender();
  const subject =
    role === "buyer"
      ? `Receipt for ${artworkTitle ?? "your purchase"}`
      : `New payout for ${artworkTitle ?? "your artwork"}`;
  const greeting = recipientName ? `Hi ${recipientName},` : "Hello,";
  const counterpartLine =
    counterpartyName && role === "seller"
      ? `<p>The collector <strong>${counterpartyName}</strong> just completed payment.</p>`
      : counterpartyName && role === "buyer"
        ? `<p>Your order from <strong>${counterpartyName}</strong> is confirmed.</p>`
        : "";
  const notesBlock = notes ? `<p><strong>Collector notes:</strong><br/>${notes}</p>` : "";

  const html = `
    <p>${greeting}</p>
    ${counterpartLine}
    <p><strong>Order ID:</strong> ${orderId}<br/><strong>Amount:</strong> ${amountLabel}</p>
    ${artworkTitle ? `<p><strong>Artwork:</strong> ${artworkTitle}</p>` : ""}
    ${notesBlock}
    <p>View the full order:<br/><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/marketplace/orders/${orderId}">Open order details</a></p>
    <p>— SpheraConnect</p>
  `;

  return postEmail({ from: sender, to: [to], subject, html });
};
