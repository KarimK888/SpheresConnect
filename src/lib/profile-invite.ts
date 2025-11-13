import crypto from "node:crypto";

type InvitePayload = {
  email: string;
  issuedAt: number;
};

const PROFILE_INVITE_SECRET =
  process.env.PROFILE_INVITE_SECRET ?? process.env.NEXT_PUBLIC_PROFILE_INVITE_SECRET ?? "dev-profile-invite-secret";

const PROFILE_INVITE_TTL_MS = Number(process.env.PROFILE_INVITE_TTL_MS ?? 1000 * 60 * 60 * 24);

const base64UrlEncode = (input: string) => Buffer.from(input, "utf-8").toString("base64url");
const base64UrlDecode = (input: string) => Buffer.from(input, "base64url").toString("utf-8");

const createSignature = (data: string) =>
  crypto.createHmac("sha256", PROFILE_INVITE_SECRET).update(data).digest("base64url");

export const createProfileInviteToken = (email: string) => {
  const payload: InvitePayload = {
    email,
    issuedAt: Date.now()
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createSignature(encodedPayload);
  return `${encodedPayload}.${signature}`;
};

export const verifyProfileInviteToken = (
  token: string
): { payload: InvitePayload; expired: boolean } | null => {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = createSignature(encodedPayload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as InvitePayload;
    const expired = Date.now() - payload.issuedAt > PROFILE_INVITE_TTL_MS;
    return { payload, expired };
  } catch (error) {
    console.warn("[profile-invite] invalid payload", error);
    return null;
  }
};

export const buildProfileInviteLink = (token: string) => {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return `${base.replace(/\/$/, "")}/create-profile?invite=${token}`;
};
