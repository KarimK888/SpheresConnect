import { NextResponse } from "next/server";
import { z } from "zod";
import { getBackend } from "@/lib/backend";

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
const oauthSchema = z.object({ provider: z.enum(["google", "apple", "linkedin"]), token: z.string() });

export async function POST(request: Request, { params }: { params: { route: string[] } }) {
  const backend = getBackend();
  const action = params.route?.[0];

  if (action === "login") {
    const body = loginSchema.parse(await request.json());
    const session = await backend.auth.login(body);
    return NextResponse.json(session);
  }

  if (action === "signup") {
    const body = loginSchema.parse(await request.json());
    const session = await backend.auth.signup(body);
    return NextResponse.json(session, { status: 201 });
  }

  if (action === "oauth") {
    const body = oauthSchema.parse(await request.json());
    const session = await backend.auth.oauth(body);
    return NextResponse.json(session);
  }

  return NextResponse.json({ error: { code: "NOT_FOUND", message: "Unknown auth action" } }, { status: 404 });
}
