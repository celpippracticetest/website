import { clerkClient } from "@clerk/express";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

import { stripe } from "@/lib/stripe";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const product: string | null = req.nextUrl.searchParams.get("product");
    const headersList = await headers();
    const origin = headersList.get("origin");
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!product) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }
    // Create Checkout Sessions from body params.
    // Retrieve the product details using the product ID
    const productDetails = await stripe.products.retrieve(product);
    if (!productDetails.default_price) {
      return NextResponse.json(
        { error: "Product does not have a default price" },
        { status: 400 }
      );
    }

    const priceId = productDetails.default_price as string;
    const priceObject = await stripe.prices.retrieve(priceId);
    const mode = priceObject.recurring ? "subscription" : "payment";

    const session: any = await stripe.checkout.sessions.create({
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/failed?canceled=true`,
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      metadata: {
        user_id: user.id,
      },
      ...(mode === "subscription" && {
        subscription_data: {
          metadata: {
            user_id: user.id,
          },
        },
      }),
    });

    if (mode === "subscription" && session?.subscription) {
      await stripe.subscriptions.update(session.subscription, {
        metadata: {
          user_id: user.id,
          checkout_id: session.id,
        },
      });
    }
    await clerkClient.users.updateUserMetadata(user.id, {
      publicMetadata: {
        planCancelled: false,
      },
    });
    return NextResponse.redirect(session.url, 303);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: err.statusCode || 500 }
    );
  }
}
