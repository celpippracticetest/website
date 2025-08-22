import { NextResponse } from "next/server";
import Stripe from "stripe";
import { clerkClient } from "@clerk/express";
import mongoClient from "@/lib/mongodb";
import { ensureUserReferral } from "@/app/api/referrals/route";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const baseUrl = (() => {
      const u = new URL(req.url);
      return `${u.protocol}//${u.host}`;
    })();

    const user = await clerkClient.users.getUser(userId);

    // Read referral code from Clerk public metadata (set earlier in the funnel) and persist it server-side
    const referralUsedCode = (
      user?.publicMetadata?.referralUsedCode as string | undefined
    )?.toUpperCase();
    let referredByUserId: string | undefined;
    let referredByName: string | undefined;
    if (referralUsedCode) {
      try {
        const db = (await mongoClient).db();
        const referralsCol = db.collection("referrals");
        const signupsCol = db.collection("referral_signups");

        // Find the referrer by their code
        const refDoc = await referralsCol.findOne({ code: referralUsedCode });
        referredByUserId = refDoc?.userId as string | undefined;

        // Upsert the signup record for this invitee
        await signupsCol.updateOne(
          { inviteeUserId: userId },
          {
            $setOnInsert: { createdAt: new Date() },
            $set: {
              referralUsedCode,
              referredByUserId: referredByUserId || null,
              lastUpdatedAt: new Date(),
            },
          },
          { upsert: true }
        );

        // Optionally resolve referrer display
        if (referredByUserId) {
          try {
            const refUser = await clerkClient.users.getUser(referredByUserId);
            const fullName = [refUser.firstName, refUser.lastName]
              .filter(Boolean)
              .join(" ");
            referredByName =
              fullName ||
              (refUser.emailAddresses?.[0]?.emailAddress as string | undefined);
          } catch {}
        }
      } catch (persistErr) {
        console.error("Persist referralUsedCode error:", persistErr);
      }
    }

    if (
      !(
        user?.publicMetadata?.referralCode && user?.publicMetadata?.referralLink
      )
    ) {
      try {
        await ensureUserReferral(userId, baseUrl);
      } catch (e) {
        console.error("ensureUserReferral error:", e);
      }
    }

    const freshUser = await clerkClient.users.getUser(userId);

    // If referralActive is explicitly false, the user should not receive a discount
    // (e.g. referral already used). If it's true (pending referral) or undefined,
    // allow coupon creation.
    if (freshUser?.publicMetadata?.referralActive === false) {
      return NextResponse.json(
        { error: "User referral is inactive and cannot receive a discount." },
        { status: 400 }
      );
    }

    const couponId = freshUser?.publicMetadata.couponId;
    const couponCode = freshUser?.publicMetadata.couponCode;
    if (couponId && couponCode) {
      return NextResponse.json({
        couponId,
        couponCode,
      });
    }

    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const visibleCode = `NEW-${suffix}`;

    const coupon = await stripe.coupons.create({
      name: visibleCode,
      percent_off: 20,
      duration: "once",
      metadata: { userId, visibleCode },
      redeem_by: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    });

    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: visibleCode,
    });

    await clerkClient.users.updateUser(userId, {
      publicMetadata: {
        ...freshUser.publicMetadata,
        couponId: coupon.id,
        couponCode: visibleCode,
        promotionCodeId: promotionCode.id,
      },
    });

    const referralCode = freshUser?.publicMetadata?.referralCode as
      | string
      | undefined;
    const referralLink = freshUser?.publicMetadata?.referralLink as
      | string
      | undefined;

    return NextResponse.json({
      couponId: coupon.id,
      couponCode: visibleCode,
      referralCode,
      referralLink,
      referralUsedCode: (
        freshUser?.publicMetadata?.referralUsedCode as string | undefined
      )?.toUpperCase(),
      referredByUserId,
      referredByName,
    });
  } catch (error) {
    console.error("Stripe error:", error);
    return NextResponse.json(
      { error: "Failed to create coupon" },
      { status: 500 }
    );
  }
}
