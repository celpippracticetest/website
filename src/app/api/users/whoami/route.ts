import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import { NextRequest, NextResponse } from "next/server";

export const GET = async function (request: NextRequest) {
  const ctx = await getAuthenticatedRequestContext(request);
  if (!ctx?.user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user: ctx.user });
};
