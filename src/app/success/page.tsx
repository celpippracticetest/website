import { redirect } from "next/navigation";
import { stripe } from "../../lib/stripe";
import DashboardHome from "@/components/dashboard-app/dashboardHome";
import mongoClient from "@/lib/mongodb";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import { Analytics } from "@customerio/cdp-analytics-node";
import SuccessPageTracking from "@/components/analytics/SuccessPageTracking";

export default async function Success({ searchParams }: any) {
  const { session_id } = await searchParams;
  const user = await currentUser();

  if (!session_id)
    throw new Error("Please provide a valid session_id (`cs_test_...`)");

  // Retrieve the session and expand payment_intent into an object
  const session = await stripe.checkout.sessions.retrieve(session_id, {
    expand: ["line_items", "payment_intent"],
  });

  const sessionData = JSON.parse(JSON.stringify(session));

  // Extract and guard session status
  const status = session.status;
  // Ensure payment_intent is expanded to an object
  if (typeof session.payment_intent === "string") {
    throw new Error("Expected expanded payment_intent object");
  }

  // Other fields from session
  const amountTotal = session?.amount_total;
  const currency = session?.currency;
  const customerEmail = session?.customer_details?.email;
  const lineItems = session?.line_items?.data;

  if (status === "open") {
    return redirect("/");
  }
  const userRepo = new CheckoutRepository(mongoClient);
  const prevCheckout = await userRepo.findCheckoutBySessionId(session_id);
  if (prevCheckout !== null) {
    return (
      <div className=" bg-[#F4F7FF] min-h-screen flex w-full lg:pt-[108px] pt-[70px]">
        <DashboardHome session={sessionData} email={customerEmail} />
      </div>
    );
  }
  if (!user) {
    throw new Error("You need to be signed in");
  }

  await userRepo.createCheckout({
    userId: user.id,
    checkoutId: session_id,
    createdAt: new Date(),
    status: status?.toString(),
    lineItems,
  });

  if (status === "complete") {
    const publicMetadata = (await auth()).sessionClaims?.metadata;
    const client = await clerkClient();
    await client.users.updateUserMetadata(user.id, {
      publicMetadata: {
        ...publicMetadata,
        plan: "premium",
        // Ensure referral is disabled immediately after a successful purchase
        referralActive: false,
        referralDiscountUsed: true,
        referralDiscountUsedAt: new Date().toISOString(),
        referralDiscountActive: false,
      },
    });
    const cioanalytics = new Analytics({
      writeKey: "9c3070e20a6782f0f20d", // TODO fix it to read form ENV
      host: "https://cdp.customer.io",
    });
    cioanalytics.identify({
      userId: user.id,
      traits: {
        email: user.emailAddresses[0].emailAddress,
        name: user.fullName,
        plan: "premium",
      },
    });

    return (
      <div className="bg-[#F4F7FF]  min-h-screen flex w-full lg:pt-[108px] pt-[70px]">
        <SuccessPageTracking
          transactionId={session?.invoice as string}
          value={(amountTotal ?? 0) / 100}
          currency={currency?.toUpperCase() || 'CAD'}
          items={lineItems || []}
          email={customerEmail?.trim().toLowerCase()}
        />

        <DashboardHome session={sessionData} email={customerEmail} />
      </div>
    );
  }
}
