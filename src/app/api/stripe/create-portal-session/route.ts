import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { currentUser } from "@clerk/nextjs/server";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import mongoClient from "@/lib/mongodb";

export async function POST(req: Request) {
    try {
        const user = await currentUser();

        if (!user || !user.id) {
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
            // Try primary email first
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
            }
            
            // If not found, try other emails
            if (!stripeCustomerId) {
                 for (const userEmail of user.emailAddresses) {
                    if (userEmail.emailAddress === email) continue; // Skip primary already checked
                    
                    const customers = await stripe.customers.list({
                        email: userEmail.emailAddress,
                        limit: 1,
                    });
                    
                    if (customers.data.length > 0) {
                        stripeCustomerId = customers.data[0].id;
                        break; 
                    }
                 }
            }
        }

        if (!stripeCustomerId) {
            console.error(`[STRIPE_PORTAL] No customer found. Debug: ${debugInfo}`);
            return NextResponse.json({ error: `No active subscription found. Please contact support.` }, { status: 400 });
        }

        // Determine return URL
        const returnUrl = process.env.NEXT_PUBLIC_APP_URL 
            ? `${process.env.NEXT_PUBLIC_APP_URL}/profile`
            : `${req.headers.get("origin")}/profile`;

        // Create a billing portal session
        // The return_url is where Stripe will redirect the user after they are done managing their subscription
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: returnUrl,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error: unknown) {
        console.error("[STRIPE_PORTAL]", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: `Internal Error: ${errorMessage}` }, { status: 500 });
    }
}

