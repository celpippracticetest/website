import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { currentUser } from "@clerk/nextjs/server";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import mongoClient from "@/lib/mongodb";

export async function POST(req: Request) {
    try {
        const user = await currentUser();

        if (!user || notAuthenticated(user)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const checkoutRepo = new CheckoutRepository(mongoClient);
        const lastCheckout = await checkoutRepo.findLatestCheckoutByUserId(user.id);

        let stripeCustomerId: string | undefined;
        let debugInfo: string = "";

        if (lastCheckout) {
            // Retrieve the checkout session to get the customer ID
            const session = await stripe.checkout.sessions.retrieve(lastCheckout.checkoutId);
            if (session?.customer) {
                stripeCustomerId = session.customer as string;
            } else {
                debugInfo += "Checkout found but no customer in session. ";
            }
        } else {
            debugInfo += "No local checkout found. ";
        }

        const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;

        // Fallback: If no local checkout is found, or Stripe session lookup failed,
        // try to find the customer by email directly in Stripe
        if (!stripeCustomerId) {
            if (email) {
                const customers = await stripe.customers.list({
                    email: email,
                    limit: 1,
                });
                if (customers.data.length > 0) {
                    stripeCustomerId = customers.data[0].id;
                } else {
                    debugInfo += `No Stripe customer found for email ${email}. `;
                }
            } else {
                debugInfo += "No primary email found for user. ";
            }
        }

        if (!stripeCustomerId) {
            return NextResponse.json({ error: `No active subscription found. Debug: ${debugInfo}` }, { status: 400 });
        }

        // Create a billing portal session
        // The return_url is where Stripe will redirect the user after they are done managing their subscription
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile`,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error: any) {
        console.error("[STRIPE_PORTAL]", error);
        return NextResponse.json({ error: `Internal Error: ${error.message}` }, { status: 500 });
    }
}

function notAuthenticated(user: any) {
    return !user.id;
}
