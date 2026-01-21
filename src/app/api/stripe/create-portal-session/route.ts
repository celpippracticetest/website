import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { currentUser } from "@clerk/nextjs/server";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import mongoClient from "@/lib/mongodb";

export async function POST(req: Request) {
    try {
        const user = await currentUser();

        if (!user || notAuthenticated(user)) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const checkoutRepo = new CheckoutRepository(mongoClient);
        const lastCheckout = await checkoutRepo.findLatestCheckoutByUserId(user.id);

        if (!lastCheckout) {
            return new NextResponse("No active subscription found", { status: 404 });
        }

        // Retrieve the checkout session to get the customer ID
        // We store the Stripe Session ID in 'checkoutId' field of our DB
        const session = await stripe.checkout.sessions.retrieve(lastCheckout.checkoutId);

        if (!session?.customer) {
            return new NextResponse("Stripe customer not found", { status: 404 });
        }

        const stripeCustomerId = session.customer as string;

        // Create a billing portal session
        // The return_url is where Stripe will redirect the user after they are done managing their subscription
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile`,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error) {
        console.error("[STRIPE_PORTAL]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

function notAuthenticated(user: any) {
    return !user.id;
}
