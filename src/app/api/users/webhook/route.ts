import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { TrackClient, RegionUS } from "customerio-node";

const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID!;
const GA_API_SECRET = process.env.GA_API_SECRET!;
const CLERK_SECRET = process.env.CLERK_WEBHOOK_SECRET!;
// Clerk webhook handler
export async function POST(req: NextRequest) {
  try {
    const wh = new Webhook(CLERK_SECRET);
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers.entries());

    let body;
    try {
      wh.verify(payload, headers);
      body = JSON.parse(payload);
    } catch (verifyError) {
      console.error("Verification or JSON parsing failed:", verifyError);
      return NextResponse.json(
        { error: "Invalid webhook signature or payload" },
        { status: 400 }
      );
    }

    const cio = new TrackClient(
      "05f16cff56799907a78d",
      "d1d97f495f9f326a8163",
      { region: RegionUS }
    );

    try {
      await cio.identify(body.data?.id, {
        email: body.data.email_addresses?.[0]?.email_address,
        created_at: Math.floor(
          parseInt(body.data.created_at.toString()) / 1000
        ),
      });
    } catch (cioError) {
      console.error("Customer.io identify error:", cioError);
    }

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
