import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";

export async function GET(request: NextRequest) {
  const authContext = await getAuthenticatedRequestContext(request);

  if (!authContext?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = authContext.user;

  return NextResponse.json({
    authSource: authContext.source,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName:
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || null,
      imageUrl: user.imageUrl,
      primaryEmail:
        user.primaryEmailAddress?.emailAddress ||
        user.emailAddresses?.[0]?.emailAddress ||
        null,
      publicMetadata: user.publicMetadata ?? {},
      privateMetadata: {
        stripeCustomerId:
          (user.privateMetadata?.stripeCustomerId as string | undefined) ?? null,
      },
    },
  });
}
