import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedRequest } from "@/lib/auth/request-auth";
import mongoClient from "@/lib/mongodb";
import { stripe } from "@/lib/stripe";
import { CheckoutRepository } from "@/repositories/checkout.repo";

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

function getPrimaryEmailAddress(user: any): string | null {
  const primaryId = user.primaryEmailAddressId;
  const primary = user.emailAddresses?.find(
    (email: { id: string; emailAddress: string }) => email.id === primaryId
  );

  return primary?.emailAddress || user.emailAddresses?.[0]?.emailAddress || null;
}

async function resolveStripeCustomerId(
  userId: string,
  emails: string[]
): Promise<string | null> {
  const checkoutRepo = new CheckoutRepository(mongoClient);
  const lastCheckout = await checkoutRepo.findLatestCheckoutByUserId(userId);

  if (lastCheckout) {
    const session = await stripe.checkout.sessions.retrieve(lastCheckout.checkoutId);
    if (typeof session.customer === "string" && session.customer) {
      return session.customer;
    }
  }

  for (const email of emails) {
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (customers.data.length > 0) {
      return customers.data[0].id;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { user, userId } = await requireAuthenticatedRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const primaryEmail = getPrimaryEmailAddress(user);
    const emailSet = new Set<string>();

    if (primaryEmail) {
      emailSet.add(primaryEmail);
    }

    for (const email of user.emailAddresses ?? []) {
      if (email?.emailAddress) {
        emailSet.add(email.emailAddress);
      }
    }

    const emails = [...emailSet].filter((email) => email.trim().length > 0);

    const stripeCustomerId = await resolveStripeCustomerId(userId, emails);
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
