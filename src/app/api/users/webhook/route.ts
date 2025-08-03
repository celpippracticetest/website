import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { Analytics } from "@customerio/cdp-analytics-node";
// Replace with your Google Analytics Measurement ID and API Secret
const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID!;
const GA_API_SECRET = process.env.GA_API_SECRET!;
const CLERK_SECRET = process.env.CLERK_WEBHOOK_SECRET!;
// Clerk webhook handler
export async function POST(req: NextRequest) {
  try {
    const wh = new Webhook(CLERK_SECRET);
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers.entries());
    // Throws on error, returns the verified content on success
    wh.verify(payload, headers);

    const body = JSON.parse(payload);
    const cioanalytics = new Analytics({
      writeKey: "d1d97f495f9f326a8163", // TODO fix it to read form ENV
      host: "https://cdp.customer.io",
    });
    await cioanalytics.identify({
      userId: body.data?.id,
      traits: {
        email: body.data.email_addresses[0].email_address,
        created_at: Math.floor(
          parseInt(body.data.created_at.toString()) / 1000
        ),
      },
    });

    // Check for Clerk user.created event
    if (body.type === "user.created" && body.data?.id) {
      const userId = body.data.id;

      // Send event to Google Analytics
      await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: userId, // Use Clerk user ID as client_id
            events: [
              {
                name: "user_created",
                params: {
                  user_id: userId,
                },
              },
            ],
          }),
        }
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log("User created event sent to Google Analytics and Customer.io");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
