type SmsPayload = {
  to: string;
  message: string;
};

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

export const sendTransactionalSms = async ({ to, message }: SmsPayload) => {
  if (!to || !message) {
    return { delivered: false, via: "skipped" as const };
  }
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.info("[sms] Twilio credentials missing; logging payload", { to, message });
    return { delivered: false, via: "console" as const };
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const body = new URLSearchParams({
    From: TWILIO_FROM_NUMBER,
    To: to,
    Body: message
  });
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    console.warn("[sms] send failed", payload);
    return { delivered: false, via: "twilio" as const };
  }
  return { delivered: true, via: "twilio" as const };
};
