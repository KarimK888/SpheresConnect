import { NextResponse } from "next/server";
import { z } from "zod";
import { buildProfileInviteLink, createProfileInviteToken, verifyProfileInviteToken } from "@/lib/profile-invite";
import { sendProfileInviteEmail } from "@/lib/mail";

const postSchema = z.object({
  email: z.string().email(),
  name: z.string().optional()
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const result = postSchema.safeParse(json);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const email = result.data.email.toLowerCase();
  const token = createProfileInviteToken(email);
  const inviteLink = buildProfileInviteLink(token);

  await sendProfileInviteEmail({
    email,
    name: result.data.name,
    inviteLink
  });

  return NextResponse.json({ ok: true, token, inviteLink });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const verified = verifyProfileInviteToken(token);
  if (!verified) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
  if (verified.expired) {
    return NextResponse.json({ valid: false, expired: true }, { status: 410 });
  }

  return NextResponse.json({ valid: true, email: verified.payload.email });
}
