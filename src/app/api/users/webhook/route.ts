import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { TrackClient, RegionUS } from "customerio-node";
import { ensureUserReferral } from "@/app/api/referrals/route";
import { ActivityLogger } from "@/lib/userActivity";
import { getDb } from "@/lib/mongodb";

const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID!;
const GA_API_SECRET = process.env.GA_API_SECRET!;
const CLERK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

// Clerk webhook handler
export async function POST(req: NextRequest) {
  try {
    // Check if webhook secret is configured
    if (!CLERK_SECRET) {
      console.error("CLERK_WEBHOOK_SECRET not found in environment");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

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

    const eventType = body.type;
    const userId = body.data?.id;

    // Handle user.created event
    if (eventType === "user.created" && userId) {
      const email = body.data.email_addresses?.[0]?.email_address;
      const firstName = body.data.first_name;
      const lastName = body.data.last_name;
      const imageUrl = body.data.image_url;
      const publicMetadata = body.data.public_metadata || {};

      try {
        const db = await getDb();
        const usersCollection = db.collection("users");

        await usersCollection.updateOne(
          { clerkUserId: userId },
          {
            $set: {
              clerkUserId: userId,
              email,
              firstName,
              lastName,
              imageUrl,
              publicMetadata,
              plan: publicMetadata.plan || "free",
              planType: publicMetadata.planType || null,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
        console.log(`✅ Synced user ${userId} to MongoDB users collection`);
      } catch (dbErr) {
        console.error("Failed to sync user to MongoDB:", dbErr);
      }

      try {
        // Log user signup
        await ActivityLogger.userSignup(userId);
      } catch (logErr) {
        console.error("Activity logging failed:", logErr);
      }

      try {
        // Ensure the newly created user immediately gets their own referral code
        const baseUrl = req.nextUrl.origin;
        await ensureUserReferral(userId, baseUrl);
      } catch (ensureErr) {
        console.error("ensureUserReferral failed:", ensureErr);
      }

      // --- Referral signup tracking (only if the user came via a referral) ---
      try {
        const meta =
          (body?.data?.unsafe_metadata as any) ||
          (body?.data?.public_metadata as any) ||
          {};
        const referralCode =
          meta.ref || meta.referral || meta.code || meta.referralCode;

        if (referralCode) {
          await fetch(`${req.nextUrl.origin}/api/referrals/track-signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ referralCode, inviteeId: userId }),
          });
        }
      } catch (refErr) {
        console.error("Referral signup tracking failed:", refErr);
      }
    }
    // Handle user.updated event
    else if (eventType === "user.updated" && userId) {
      const email = body.data.email_addresses?.[0]?.email_address;
      const firstName = body.data.first_name;
      const lastName = body.data.last_name;
      const imageUrl = body.data.image_url;
      const publicMetadata = body.data.public_metadata || {};

      try {
        const db = await getDb();
        const usersCollection = db.collection("users");

        await usersCollection.updateOne(
          { clerkUserId: userId },
          {
            $set: {
              clerkUserId: userId,
              email,
              firstName,
              lastName,
              imageUrl,
              publicMetadata,
              plan: publicMetadata.plan || "free",
              planType: publicMetadata.planType || null,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
        console.log(`✅ Updated user ${userId} in MongoDB users collection`);
      } catch (dbErr) {
        console.error("Failed to update user in MongoDB:", dbErr);
      }
    }
    // Handle user.deleted event
    else if (eventType === "user.deleted" && userId) {
      try {
        const db = await getDb();
        const usersCollection = db.collection("users");

        // Mark user as deleted instead of actually deleting (preserve data for analytics/compliance)
        const result = await usersCollection.updateOne(
          { clerkUserId: userId },
          {
            $set: {
              deletedAt: new Date(),
              deleted: true,
              updatedAt: new Date(),
            },
          }
        );

        if (result.matchedCount > 0) {
          console.log(
            `✅ Marked user ${userId} as deleted in MongoDB (data preserved)`
          );
        } else {
          console.log(
            `⚠️ User ${userId} not found in MongoDB (may have never been synced)`
          );
        }

        // Note: We preserve all user data (users collection, useractivities, etc.)
        // for analytics, compliance, and historical purposes.
        // The user is marked as deleted but data remains in the database.
      } catch (dbErr) {
        console.error("Failed to mark user as deleted in MongoDB:", dbErr);
      }
    }
    // Log unhandled event types for debugging
    else {
      console.log(
        `ℹ️ Received unhandled Clerk webhook event: ${eventType}${userId ? ` for user ${userId}` : ""}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log("User event processed successfully");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
