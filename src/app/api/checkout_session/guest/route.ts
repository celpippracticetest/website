import { NextRequest, NextResponse } from "next/server";

/** Guest checkout is disabled — users must register before subscribing. */
function redirectToSignUp(req: NextRequest): NextResponse {
  const signUpUrl = new URL("/sign-up", req.url);
  signUpUrl.searchParams.set("redirect_url", "/pricing");
  return NextResponse.redirect(signUpUrl, 302);
}

export async function GET(req: NextRequest) {
  return redirectToSignUp(req);
}

export async function POST(req: NextRequest) {
  return redirectToSignUp(req);
}
