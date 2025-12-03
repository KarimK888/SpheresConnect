import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const gatewaySecret = process.env.API_GATEWAY_SECRET;

export function middleware(request: NextRequest) {
  if (!gatewaySecret) {
    return NextResponse.next();
  }
  if (request.nextUrl.pathname.startsWith("/api/") && request.method !== "GET") {
    const provided = request.headers.get("x-spheraconnect-gateway");
    if (provided && provided !== gatewaySecret) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"]
};
