import { NextResponse } from "next/server";
import Stripe from "stripe";
import mongoClient from "@/lib/mongodb";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import { ReferralRewardRepository } from "@/repositories/referral-reward.repo";
import { ReferralRepository } from "@/repositories/referral.repo";
import { clerkClient } from "@clerk/express";
export const runtime = "nodejs";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Helper to merge new fields into existing publicMetadata
async function updateUserPublicMetadata(
  userId: string,
  newFields: Record<string, any>
) {
  try {
    const user = await clerkClient.users.getUser(userId);
    const currentMetadata = user.publicMetadata || {};
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: { ...currentMetadata, ...newFields },
    });
    console.log(`✅ Successfully updated metadata for user: ${userId}`);
  } catch (error) {
    console.log(
      `⚠️ Could not update user ${userId} metadata: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    // Continue processing even if this fails
  }
}

// Handle referral rewards when a payment is completed
async function handleReferralRewards(
  session: Stripe.Checkout.Session,
  metadata: any
) {
  try {
    // Get user ID from metadata or resolve via email fallback
    const metaUserId = metadata?.user_id as string | undefined;
    let userIdToUse: string | undefined = metaUserId;

    // Get user from Clerk to check if they were referred
    let user;
    let userMetadata: any = {};

    try {
      if (userIdToUse) {
        user = await clerkClient.users.getUser(userIdToUse);
      } else {
        throw new Error("No user_id in metadata");
      }
      userMetadata = user.publicMetadata as any;
    } catch (error) {
      // Fallback: resolve user by email from the session
      const inviteeEmail =
        (session as any)?.customer_details?.email ||
        (session as any)?.customer_email;
      if (inviteeEmail) {
        try {
          const users = await clerkClient.users.getUserList({
            emailAddress: [String(inviteeEmail).trim().toLowerCase()],
          });
          if (users?.data?.length) {
            user = users.data[0];
            userIdToUse = user.id;
            userMetadata = user.publicMetadata as any;
            console.log(
              `✅ Resolved Clerk user by email (${inviteeEmail}) → ${userIdToUse}`
            );
          } else {
            console.warn(`❌ No Clerk user found by email ${inviteeEmail}`);
            return;
          }
        } catch (err) {
          console.error("Error resolving user by email:", err);
          return;
        }
      } else {
        console.log(
          "No user ID and no email found on session; cannot process referral"
        );
        return;
      }
    }

    const referralCode = userMetadata?.referralCode;

    if (!referralCode) {
      console.log("No referral code found in user metadata");
      return;
    }

    // Find the referrer
    const referralRepo = new ReferralRepository(mongoClient);
    const referrer = await referralRepo.findOneByCode(referralCode);

    if (!referrer) {
      console.log(`Referral code ${referralCode} not found`);
      return;
    }

    // Calculate reward amount (20% of purchase)
    const amountTotal = session.amount_total || 0;
    const rewardAmount = (amountTotal / 100) * 0.2; // Convert from cents and apply 20%

    if (rewardAmount < 0.01) {
      console.log("Reward amount too small to process");
      return;
    }

    // Create referral reward record
    const rewardRepo = new ReferralRewardRepository(mongoClient);
    await rewardRepo.ensureIndexes();

    const reward = await rewardRepo.createReward({
      inviterId: referrer.userId,
      inviteeId: metadata.user_id,
      referralCode,
      amount: rewardAmount,
      status: "confirmed",
      checkoutId: session.id,
      planPurchased: metadata.plan_name || "premium",
      purchaseAmount: amountTotal / 100,
      purchaseDate: new Date(),
    });

    console.log(
      `✅ Referral reward created: $${rewardAmount} for user ${referrer.userId} (status: confirmed)`
    );

    // Update referrer's metadata to show they have pending rewards
    const referrerUser = await clerkClient.users.getUser(referrer.userId);
    const currentMetadata = referrerUser.publicMetadata || {};

    await clerkClient.users.updateUserMetadata(referrer.userId, {
      publicMetadata: {
        ...currentMetadata,
        hasPendingRewards: true,
        lastReferralDate: new Date().toISOString(),
        // Set referralActive to false to prevent reuse of the same referral code
        referralActive: false,
      },
    });

    // Deactivate the referral discount code after successful purchase.
    // Re-fetch invitee metadata to avoid stale values and ensure we pick up
    // the stored promotion code id (legacy or new key).
    try {
      const freshUser = await clerkClient.users.getUser(userIdToUse as string);
      const freshMeta = freshUser.publicMetadata as any;
      const promotionCodeId =
        freshMeta?.referralPromotionId || freshMeta?.promotionCodeId;

      console.log(
        "Referral handling: promotionCodeId resolved ->",
        promotionCodeId
      );

      if (promotionCodeId) {
        try {
          // Deactivate the promotion code in Stripe
          await stripe.promotionCodes.update(promotionCodeId, {
            active: false,
          });
          console.log(` Deactivated promotion code: ${promotionCodeId}`);

          // Update invitee metadata to mark discount as used and clear referralActive
          try {
            await clerkClient.users.updateUserMetadata(userIdToUse as string, {
              publicMetadata: {
                ...freshMeta,
                referralDiscountUsed: true,
                referralDiscountUsedAt: new Date().toISOString(),
                referralDiscountActive: false,
                referralActive: false, // This prevents future discounts for this user
                referralCodeUsed: true, // Mark that referral code was used
              },
            });
            console.log(
              `✅ Successfully set referralActive to false for user: ${userIdToUse}`
            );
          } catch (error) {
            console.log(
              `⚠️ Could not update user ${userIdToUse} metadata, but referral processing completed`
            );
          }
          console.log(
            `✅ Marked referral discount as used for user: ${userIdToUse}`
          );
          console.log(
            `✅ Set referralActive to false for invitee: ${userIdToUse} - no more discounts`
          );
        } catch (error) {
          console.error(
            "Error deactivating promotion code:",
            promotionCodeId,
            error
          );
        }
      } else {
        console.log(
          "No promotionCodeId found on invitee metadata; skipping deactivation."
        );
      }
    } catch (err) {
      console.error(
        "Failed to refresh invitee metadata before deactivating promotion code:",
        err
      );
    }
  } catch (error) {
    console.error("Error handling referral rewards:", error);
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const sig = req.headers.get("stripe-signature")!;
    let event: Stripe.Event;

    try {
      // Use the webhook secret from Stripe CLI for testing
      const webhookSecret =
        "whsec_d86d4a30c760f5269bf65452dcd49bdfa2ab6468f62814eeba72ba45813b5f6c";

      // In development, allow bypassing signature verification for testing
      if (process.env.NODE_ENV === "development" && sig === "test") {
        console.log("⚠️ Development mode: Bypassing signature verification");
        event = JSON.parse(rawBody) as Stripe.Event;

        // For testing, just return success without processing
        if (event.type === "checkout.session.completed") {
          console.log("✅ Test webhook received checkout.session.completed");
          console.log("✅ Event data:", JSON.stringify(event.data, null, 2));

          // Simulate the referralActive change for testing
          console.log(
            "✅ Would set referralActive to false for user: test-user-123"
          );

          return NextResponse.json({
            received: true,
            message: "Test webhook processed successfully",
            event_type: event.type,
            user_id: event.data.object.metadata?.user_id,
            referral_active_changed: true,
          });
        }
      } else {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      }
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata;

      console.log("🔍 Processing checkout.session.completed event");
      console.log("🔍 Session ID:", session.id);
      console.log("🔍 Metadata:", JSON.stringify(metadata, null, 2));

      if (metadata?.user_id) {
        await updateUserPublicMetadata(metadata.user_id, {
          planCancelled: false,
        });
        console.log(
          `Cleared planCancelled for user ${metadata.user_id} on new purchase.`
        );
      }

      if (session.subscription && metadata?.user_id) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        if (subscription.status !== "canceled") {
          await stripe.subscriptions.update(session.subscription as string, {
            metadata: {
              user_id: metadata.user_id,
              checkout_id: session.id,
            },
          });
          console.log(
            `Backfilled subscription metadata for ${session.subscription}`
          );
        } else {
          console.warn(
            `Cannot update metadata: subscription ${subscription.id} is canceled.`
          );
        }
      }

      // Handle referral rewards and mark discount as used
      try {
        await handleReferralRewards(session, metadata);
      } catch (error) {
        console.error("Error handling referral rewards:", error);
      }

      // Always check and mark referral discount as used for any user with referral metadata
      if (metadata?.user_id) {
        try {
          const { clerkClient } = await import("@clerk/express");
          const user = await clerkClient.users.getUser(metadata.user_id);
          const userMetadata = user.publicMetadata as any;

          // Check if user has referral discount that needs to be marked as used
          if (
            userMetadata?.referralPromotionId ||
            userMetadata?.promotionCodeId ||
            userMetadata?.referralCode // Also check if user was referred
          ) {
            await clerkClient.users.updateUserMetadata(metadata.user_id, {
              publicMetadata: {
                ...userMetadata,
                referralDiscountUsed: true,
                referralDiscountUsedAt: new Date().toISOString(),
                referralDiscountActive: false,
                referralActive: false, // Always set to false after purchase
              },
            });
            console.log(
              `✅ Marked referral discount as used for user: ${metadata.user_id}`
            );
            console.log(
              `✅ Set referralActive to false for invitee: ${metadata.user_id}`
            );
          }
        } catch (error) {
          console.error("Error marking referral discount as used:", error);
          // Continue processing even if this fails
        }
      }

      return NextResponse.json({ received: true });
    }

    if (event.type === "customer.subscription.created") {
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = subscription.metadata;
      if (metadata?.user_id) {
        await updateUserPublicMetadata(metadata.user_id, {
          planCancelled: false,
        });
        console.log(
          `Cleared planCancelled for user ${metadata.user_id} on subscription creation.`
        );
      }
      return NextResponse.json({ received: true });
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = subscription.metadata;
      if (subscription.cancel_at_period_end) {
        if (metadata?.user_id) {
          await updateUserPublicMetadata(metadata.user_id, {
            planCancelled: true,
          });
          console.log(
            `Set planCancelled=true for user ${metadata.user_id} on subscription update.`
          );
        }
        console.log(
          `Subscription ${subscription.id} scheduled to cancel at end of period; no immediate downgrade.`
        );
        return NextResponse.json({ received: true });
      }
    }

    const checkoutRepo = new CheckoutRepository(mongoClient);
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as any;
      const invoiceId = invoice?.id as string;

      const rawSubscription = invoice.subscription;
      let subscriptionId: string | null = null;
      if (typeof rawSubscription === "string") {
        subscriptionId = rawSubscription;
      } else if (
        rawSubscription &&
        typeof rawSubscription === "object" &&
        "id" in rawSubscription
      ) {
        subscriptionId = rawSubscription?.id;
      }

      let sessionId: string | null = null;
      const paymentIntentId = invoice?.payment_intent as string | undefined;
      if (paymentIntentId) {
        const list = await stripe.checkout.sessions.list({
          payment_intent: paymentIntentId,
          limit: 1,
        });
        if (list.data.length) {
          sessionId = list?.data[0]?.id;
        }
      }

      if (!sessionId && subscriptionId) {
        const sessionsBySub = await stripe.checkout.sessions.list({
          subscription: subscriptionId,
          limit: 1,
        });
        if (sessionsBySub.data.length) {
          sessionId = sessionsBySub?.data[0]?.id;
        }
      }

      if (!sessionId) {
        const email = invoice.customer_email?.trim().toLowerCase();
        if (email) {
          try {
            const users: any = await clerkClient?.users.getUserList({
              emailAddress: [email],
            });
            if (users?.data?.length) {
              const user = users.data[0];
              const lastCheckout = await checkoutRepo.findLastByUserId(user.id);
              if (lastCheckout) {
                console.info(
                  "lastCheckout no error and the document was updated!"
                );

                await checkoutRepo.updateCreatedAtBySessionId(
                  lastCheckout.checkoutId,
                  new Date(
                    (invoice?.lines?.data[0]?.period?.start as number) * 1000
                  )
                );
                await checkoutRepo.updateStatus(
                  lastCheckout.checkoutId,
                  "complete"
                );

                // Try to handle referral rewards using the checkout session if possible
                try {
                  const session = await stripe.checkout.sessions.retrieve(
                    lastCheckout.checkoutId
                  );
                  if (session) {
                    await handleReferralRewards(session, session.metadata);
                  }
                } catch (err) {
                  console.error(
                    "Failed to process referral rewards from invoice branch:",
                    err
                  );
                }

                return NextResponse.json({ received: true });
              }
            }
          } catch (err) {
            console.error("Error finding user by email:", err);
          }
        }
        console.warn(
          `No checkout session or user found for invoice ${invoiceId}, skipping repository update`
        );
        return NextResponse.json({ received: true });
      }

      console.info("we have no error and the document was updated!");

      await checkoutRepo.updateCreatedAtBySessionId(
        sessionId,
        new Date((invoice?.lines?.data[0]?.period?.start as number) * 1000)
      );

      // If we were able to find a sessionId earlier in this handler, fetch it and handle referral rewards
      try {
        const session = await stripe.checkout.sessions.retrieve(
          sessionId as string
        );
        if (session) {
          await handleReferralRewards(session, session.metadata);
        }
      } catch (err) {
        console.error(
          "Failed to process referral rewards for resolved sessionId:",
          err
        );
      }

      return NextResponse.json({ received: true });
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      // subscription.deleted branch doesn't have access to earlier handler's sessionId
      let { user_id, checkout_id } = subscription.metadata;

      console.log(
        `🔔 Deleted webhook for subscription ${subscription.id}`,
        "initial metadata →",
        { user_id, checkout_id }
      );

      // 1. Fallback: metadata from subscription.latest_invoice → session
      console.log(
        "➡️ Fallback #1: latest_invoice =",
        subscription.latest_invoice
      );
      if (!user_id || !checkout_id) {
        if (subscription.latest_invoice) {
          try {
            const invoice = (await stripe.invoices.retrieve(
              subscription.latest_invoice as string
            )) as Stripe.Invoice;
            const pi = (invoice as any).payment_intent as string | null;
            console.log(
              "   • Invoice retrieved",
              invoice.id,
              "payment_intent =",
              pi
            );

            if (pi) {
              const sessions = await stripe.checkout.sessions.list({
                payment_intent: pi,
                limit: 1,
              });
              const sess: any = sessions.data[0];
              console.log("   • Session from PI fallback →", sess);

              if (sess?.metadata?.user_id) user_id = sess.metadata.user_id;
              if (sess?.id) checkout_id = sess.id;
              console.log("   • After #1 →", { user_id, checkout_id });
            }
          } catch (err) {
            console.warn("   ❗️ Fallback #1 error:", err);
          }
        }
      }

      // 2. Fallback: metadata from listing sessions by subscription ID
      console.log("➡️ Fallback #2: list sessions by subscription ID");
      if (!user_id || !checkout_id) {
        try {
          const sessionsBySub = await stripe.checkout.sessions.list({
            subscription: subscription.id,
            limit: 1,
          });
          const sess2: any = sessionsBySub.data[0];
          console.log("   • Session from sub-list fallback →", sess2);

          if (sess2?.metadata?.user_id) user_id = sess2.metadata.user_id;
          if (sess2?.id) checkout_id = sess2.id;
          console.log("   • After #2 →", { user_id, checkout_id });
        } catch (err) {
          console.warn("   ❗️ Fallback #2 error:", err);
        }
      }

      // 3. Fallback: find user_id via invoice.customer_email
      console.log("➡️ Fallback #3: invoice customer_email");
      if (!user_id && subscription.latest_invoice) {
        try {
          const invoice = (await stripe.invoices.retrieve(
            subscription.latest_invoice as string
          )) as Stripe.Invoice;
          const email = invoice.customer_email;
          console.log("   • Invoice.customer_email =", email);

          if (email) {
            const users = await clerkClient.users.getUserList({
              emailAddress: [email.trim().toLowerCase()],
            });
            console.log("   • Clerk users found →", users.data);
            if (users.data.length) {
              user_id = users.data[0].id;
              console.log("   • After #3 → user_id =", user_id);
            }
          }
        } catch (err) {
          console.warn("   ❗️ Fallback #3 error:", err);
        }
      }

      // 4. Fallback: retrieve checkout_id from database using found user_id
      console.log("➡️ Fallback #4: DB lookup for last checkout");
      if (user_id && !checkout_id) {
        try {
          const lastCheckout = await checkoutRepo.findLastByUserId(user_id);
          console.log("   • Last checkout from DB →", lastCheckout);
          if (lastCheckout) {
            checkout_id = lastCheckout.checkoutId;
            console.log("   • After #4 → checkout_id =", checkout_id);
          }
        } catch (err) {
          console.warn("   ❗️ Fallback #4 error:", err);
        }
      }

      // Final check before bail-out
      console.log("🔍 Final metadata →", { user_id, checkout_id });
      if (!user_id || !checkout_id || checkout_id === "{CHECKOUT_SESSION_ID}") {
        console.warn("❌ Still missing metadata for", subscription.id);
        return NextResponse.json({ received: true });
      }

      // Cancel and downgrade
      await Promise.all([
        checkoutRepo.updateStatus(checkout_id, "cancelled"),
        updateUserPublicMetadata(user_id, { plan: "free" }),
      ]);

      console.log(
        `✅ Subscription ${subscription.id} cancelled and user ${user_id} downgraded (checkout_id=${checkout_id}).`
      );
      return NextResponse.json({ received: true });
    }
    if (event.type === "charge.refunded") {
      const chargeObj = event.data.object as any;
      const refundId = chargeObj.id as string;
      let sessionId: string | null = null;

      const paymentIntentId = chargeObj.payment_intent as string | undefined;
      if (paymentIntentId) {
        const resp = await stripe.checkout.sessions.list({
          payment_intent: paymentIntentId,
          limit: 10,
        });
        if (resp.data.length > 0) {
          const sortedSessions = resp.data.sort(
            (a, b) => (b as any).created - (a as any).created
          );
          sessionId = sortedSessions[0].id;
        }
      }

      if (!sessionId && chargeObj.invoice) {
        const inv: any = (await stripe.invoices.retrieve(
          chargeObj.invoice as string
        )) as Stripe.Invoice;
        const pi = inv.payment_intent as string | undefined;
        if (pi) {
          const resp2 = await stripe.checkout.sessions.list({
            payment_intent: pi,
            limit: 10,
          });
          if (resp2.data.length > 0) {
            const sortedSessions2 = resp2.data.sort(
              (a, b) => (b as any).created - (a as any).created
            );
            sessionId = sortedSessions2[0].id;
          }
        }
      }

      if (!sessionId) {
        let email = chargeObj.billing_details?.email;
        if (!email && chargeObj.invoice) {
          const inv = await stripe.invoices.retrieve(
            chargeObj.invoice as string
          );
          email = inv.customer_email ?? undefined;
        }

        if (email) {
          const users = await clerkClient.users.getUserList({
            emailAddress: [email.trim().toLowerCase()],
          });
          if (users.data.length) {
            const allCheckouts = await checkoutRepo.findAllByUserId(
              users.data[0].id
            );
            const refundedCheckout = allCheckouts.find(
              (c: any) => c.status === "refunded"
            );
            sessionId = refundedCheckout?.checkoutId ?? null;
          }
        }
      }

      // 4. Fallback: retrieve sessionId from subscription metadata
      if (!sessionId && chargeObj.invoice) {
        try {
          const invFallback = (await stripe.invoices.retrieve(
            chargeObj.invoice as string
          )) as any;
          const subId = invFallback.subscription as string | null;
          if (subId) {
            const sub = await stripe.subscriptions.retrieve(subId);
            const checkoutFromMeta = sub.metadata.checkout_id;
            if (checkoutFromMeta) {
              sessionId = checkoutFromMeta;
              console.log(
                `   • Fallback #4: sessionId from subscription metadata → ${sessionId}`
              );
            }
          }
        } catch (err) {
          console.warn("   ❗️ Fallback #4 error:", err);
        }
      }

      if (!sessionId) {
        // Fallback: process refund via invoice.subscription like subscription.deleted
        if (chargeObj.invoice) {
          const inv = (await stripe.invoices.retrieve(
            chargeObj.invoice as string
          )) as any;
          const subscriptionId = inv.subscription as string | null;
          if (subscriptionId) {
            // Retrieve subscription metadata and cancel
            let subRecord: Stripe.Subscription | null = null;
            try {
              subRecord = await stripe.subscriptions.retrieve(subscriptionId);
            } catch (err: any) {
              if (err?.code === "resource_missing") {
                console.warn(
                  `❌ Subscription not found in fallback: ${subscriptionId}`
                );
              } else {
                throw err;
              }
            }
            await stripe.subscriptions.cancel(subscriptionId);
            console.log(
              `🚫 Subscription ${subscriptionId} canceled due to refund.`
            );
            const userId = subRecord?.metadata.user_id ?? null;
            const checkoutId = subRecord?.metadata.checkout_id ?? null;
            if (checkoutId) {
              await checkoutRepo.updateStatus(checkoutId, "refunded");
              console.log(`📝 Checkout ${checkoutId} marked refunded.`);
            }
            if (userId) {
              await clerkClient.users.updateUserMetadata(userId, {
                publicMetadata: { plan: "free" },
              });
              console.log(`✅ User ${userId} downgraded due to refund.`);
            }
            return NextResponse.json({ received: true });
          }
        }
        // 5. Fallback: downgrade user via invoice.customer_email if still no update
        if (chargeObj.invoice) {
          try {
            const invEmail = (await stripe.invoices.retrieve(
              chargeObj.invoice as string
            )) as any;
            const customerEmail = invEmail.customer_email;
            if (customerEmail) {
              const usersByEmail = await clerkClient.users.getUserList({
                emailAddress: [customerEmail.trim().toLowerCase()],
              });
              if (usersByEmail.data.length) {
                const fallbackUserId = usersByEmail.data[0].id;
                await updateUserPublicMetadata(fallbackUserId, {
                  plan: "free",
                });
                console.log(
                  `✅ Fallback #5: User ${fallbackUserId} downgraded based on invoice.customer_email.`
                );
              }
            }
          } catch (err) {
            console.warn("   ❗️ Fallback #5 error:", err);
          }
        }
        // 6. Fallback: DB lookup for sessionId via billing email
        let emailForDB: string | undefined = chargeObj.billing_details?.email;
        if (!emailForDB && chargeObj.invoice) {
          const invEmailSearch = await stripe.invoices.retrieve(
            chargeObj.invoice as string
          );
          emailForDB = invEmailSearch.customer_email ?? undefined;
        }
        if (emailForDB) {
          const usersByEmail2 = await clerkClient.users.getUserList({
            emailAddress: [emailForDB.trim().toLowerCase()],
          });
          if (usersByEmail2.data.length) {
            const allCheckouts2 = await checkoutRepo.findAllByUserId(
              usersByEmail2.data[0].id
            );
            if (allCheckouts2.length) {
              const lastCheckout2 = allCheckouts2.sort(
                (a, b) =>
                  new Date((b as any).createdAt).getTime() -
                  new Date((a as any).createdAt).getTime()
              )[0];
              const resolvedSessionId = lastCheckout2.checkoutId;
              console.log(
                `   • Fallback #6: DB lookup via email → sessionId ${resolvedSessionId}`
              );
              await checkoutRepo.updateStatus(resolvedSessionId, "refunded");
              console.log(`📝 Checkout ${resolvedSessionId} marked refunded.`);
              return NextResponse.json({ received: true });
            }
          }
        }
        console.warn(
          `⚠️ Refund ${refundId} but no sessionId found — skipping.`
        );
        return NextResponse.json({ received: true });
      }

      await checkoutRepo.updateStatus(sessionId, "refunded");

      let userId: string | null = null;
      const sess = await stripe.checkout.sessions.retrieve(sessionId);

      if (sess.subscription) {
        try {
          const sub = await stripe.subscriptions.retrieve(
            sess.subscription as string
          );
          userId = sub.metadata.user_id ?? null;

          await stripe.subscriptions.cancel(sub.id);
          console.log(`🚫 Subscription ${sub.id} canceled due to refund.`);
        } catch (err: any) {
          if (err?.code === "resource_missing") {
            console.warn(`❌ Subscription not found: ${sess.subscription}`);
          } else {
            throw err;
          }
        }
      }

      if (!userId) {
        const record = await checkoutRepo.findBySessionId(sessionId);
        userId = record?.userId ?? null;
      }

      if (userId) {
        await updateUserPublicMetadata(userId, { plan: "free" });
        console.log(
          `✅ Refund ${refundId}: session ${sessionId} marked refunded, user ${userId} downgraded.`
        );
      } else {
        console.warn(`⚠️ Cannot find user for refunded session ${sessionId}.`);
      }

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failure" },
      { status: 500 }
    );
  }
}
