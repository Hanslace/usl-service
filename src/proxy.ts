import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const sessionId = req.cookies.get("usl_session_id")?.value;

  if (!sessionId) {
    return NextResponse.redirect(
      new URL("/session-expired", req.url)
    );
  }

  return NextResponse.next();
}


export const config = {
  matcher: [
    "/((?!start|session-expired|api|_next|static).*)",
  ],
};
