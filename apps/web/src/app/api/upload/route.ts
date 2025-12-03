import { NextResponse } from "next/server";
import { getBackend } from "@/lib/backend";
import { UploadSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const backend = getBackend();
  const payload = UploadSchema.parse(await request.json());
  const url = await backend.uploads.createSignedUrl(payload);
  return NextResponse.json(url, { status: 201 });
}
