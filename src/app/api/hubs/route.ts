import { NextResponse } from "next/server";
import { getBackend } from "@/lib/backend";

export async function GET() {
  const backend = getBackend();
  const hubs = await backend.hubs.list();
  return NextResponse.json({ items: hubs });
}
