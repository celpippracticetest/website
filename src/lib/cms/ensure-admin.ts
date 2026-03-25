import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function ensureCmsAdmin(): Promise<
  { ok: true } | { ok: false; response: NextResponse }
> {
  const user = await currentUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const authenticate = await auth();
  const isAdmin = authenticate.sessionClaims?.metadata?.roles?.includes("admin");
  if (!isAdmin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true };
}
