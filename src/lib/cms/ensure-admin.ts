import { auth, currentUser, sessionClaimsHasAdminRole } from "@/lib/auth/server-auth";
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
  const isAdmin = sessionClaimsHasAdminRole(authenticate.sessionClaims);
  if (!isAdmin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true };
}
