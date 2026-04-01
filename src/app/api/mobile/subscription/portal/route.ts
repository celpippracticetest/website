import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedRequest } from "@/lib/auth/request-auth";
import {
  emailsFromClerkUser,
  resolveStripeCustomerId,
} from "@/lib/resolveStripeCustomerId";
import { stripe } from "@/lib/stripe";

function getBaseAppUrl(request: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  const origin = request.headers.get("origin")?.trim();
  if (origin) {
    return origin.replace(/\/$/, "");
  }

  return "https://celpippracticetest.com";
}

export async function POST(request: NextRequest) {
  try {
    const { user, userId } = await requireAuthenticatedRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripeCustomerId = await resolveStripeCustomerId(userId, {
      clerkStripeCustomerId: user.privateMetadata?.stripeCustomerId as
        | string
        | undefined,
      emails: emailsFromClerkUser(user),
    });
    if (stripeCustomerId == null) {
      return NextResponse.json(
        { error: "No active subscription found for this account." },
        { status: 400 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${getBaseAppUrl(request)}/mobile-checkout-complete?status=managed`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("[mobile subscription portal]", error);

    const message =
      error instanceof Error ? error.message : "Failed to open billing portal.";
    const status = message === "Unauthorized" ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
