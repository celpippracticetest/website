import Profile from "@/components/dashboard-new/Profile";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import { getHybridCurrentUser } from "@/lib/auth/web-session-server";
import { appUserAdmin } from "@/lib/auth/server-auth";
import documentsClient from "@/lib/appDocumentsClient";
import { redirect } from "next/navigation";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function UserProfilePage() {
  const hybridUser = await getHybridCurrentUser();
  const userId = hybridUser?.userId;

  if (!userId) {
    redirect("/practice-overview");
  }

  let prevCheckout = null;
  let subscriptionData = null;
  let user = null;

  try {
    const userRepo = new CheckoutRepository(documentsClient);
    prevCheckout = await userRepo.findLatestCheckoutByUserId(userId);

    // Get user's Stripe customer ID
    const client = await (await appUserAdmin())();
    user = await client.users.getUser(userId);
    let customerId = user.privateMetadata?.stripeCustomerId as
      | string
      | undefined;

    console.log("Debug - User metadata:", {
      userId,
      privateMetadata: user.privateMetadata,
      customerId,
    });

    let subscriptionData = null;
    if (customerId) {
      try {
        // First try to get active or trialing subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          // status: "active", // Removed to find all statuses (we'll filter later if needed)
          limit: 1,
        });

        console.log(
          "Debug - Active subscriptions found:",
          subscriptions.data.length,
        );

        if (subscriptions.data.length > 0) {
          const subscriptionId = subscriptions.data[0].id;
          console.log("Debug - Found subscription ID:", subscriptionId);

          // Get full subscription details
          const subscription = (await stripe.subscriptions.retrieve(
            subscriptionId,
            {
              expand: ["items.data.price.product"],
            },
          )) as any;

          console.log("Debug - Raw subscription data:", {
            id: subscription.id,
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end,
            items: subscription.items,
          });

          console.log(
            "Debug - Subscription current_period_start:",
            subscription.current_period_start,
          );
          console.log(
            "Debug - Subscription current_period_end:",
            subscription.current_period_end,
          );
          console.log(
            "Debug - Subscription billing_cycle_anchor:",
            subscription.billing_cycle_anchor,
          );
          console.log("Debug - Subscription created:", subscription.created);

          console.log(
            "Debug - Full subscription object keys:",
            Object.keys(subscription),
          );
          console.log("Debug - Subscription type:", typeof subscription);
          console.log(
            "Debug - Latest invoice ID:",
            subscription.latest_invoice,
          );

          // Calculate current period from billing cycle anchor
          let currentPeriodStart, currentPeriodEnd;

          if (subscription.billing_cycle_anchor) {
            // Calculate current period based on billing cycle anchor and interval
            const anchorDate = new Date(
              subscription.billing_cycle_anchor * 1000,
            );
            const now = new Date();

            // For weekly subscription, calculate current week
            const weeksSinceAnchor = Math.floor(
              (now.getTime() - anchorDate.getTime()) /
                (7 * 24 * 60 * 60 * 1000),
            );

            currentPeriodStart =
              subscription.billing_cycle_anchor +
              weeksSinceAnchor * 7 * 24 * 60 * 60;
            currentPeriodEnd = currentPeriodStart + 7 * 24 * 60 * 60; // 7 days later

            console.log("Debug - Calculated period:", {
              anchorDate: anchorDate.toISOString(),
              weeksSinceAnchor,
              currentPeriodStart: new Date(
                currentPeriodStart * 1000,
              ).toISOString(),
              currentPeriodEnd: new Date(currentPeriodEnd * 1000).toISOString(),
            });
          } else if (subscription.latest_invoice) {
            try {
              const invoice = await stripe.invoices.retrieve(
                subscription.latest_invoice,
              );
              console.log("Debug - Invoice data:", {
                id: invoice.id,
                period_start: invoice.period_start,
                period_end: invoice.period_end,
                status: invoice.status,
              });

              // Use the invoice period as fallback
              currentPeriodStart = invoice.period_start;
              currentPeriodEnd = invoice.period_end;
            } catch (invoiceError) {
              console.error("Error fetching invoice:", invoiceError);
            }
          }

          subscriptionData = {
            id: subscription.id,
            status: subscription.status,
            currentPeriodStart: currentPeriodStart,
            currentPeriodEnd: currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            planId: subscription.items.data[0]?.price?.id,
            planName: subscription.items.data[0]?.price?.product?.name,
          };
          console.log("Debug - Subscription data:", subscriptionData);
        } else {
          // If no active subscription, check for recent successful payments
          console.log(
            "Debug - No active subscription, checking recent payments...",
          );
          const charges = await stripe.charges.list({
            customer: customerId,
            limit: 1,
          });

          console.log("Debug - Recent charges found:", charges.data.length);

          if (charges.data.length > 0) {
            const latestCharge = charges.data[0];
            console.log("Debug - Latest charge:", {
              id: latestCharge.id,
              amount: latestCharge.amount,
              status: latestCharge.status,
              created: new Date(latestCharge.created * 1000).toISOString(),
            });

            // For one-time payments, create a subscription-like object
            if (latestCharge.status === "succeeded") {
              const chargeDate = new Date(latestCharge.created * 1000);
              const endDate = new Date(chargeDate);
              endDate.setDate(endDate.getDate() + 30); // Assume 30-day validity for one-time payments

              subscriptionData = {
                id: latestCharge.id,
                status: "active",
                currentPeriodStart: latestCharge.created,
                currentPeriodEnd: Math.floor(endDate.getTime() / 1000),
                cancelAtPeriodEnd: false,
                planId: "one_time_payment",
                isOneTimePayment: true,
                planName: latestCharge.description || "One-time Payment",
              };
              console.log("Debug - One-time payment data:", subscriptionData);
            }
          }
        }
      } catch (stripeError) {
        console.error("Error fetching subscription data:", stripeError);
      }
    } else {
      // Try to find customer by email if no customerId in metadata
      const userEmail = user.emailAddresses?.[0]?.emailAddress;
      if (userEmail) {
        try {
          console.log("Debug - Searching customer by email:", userEmail);
          const customers = await stripe.customers.list({
            email: userEmail,
            limit: 1,
          });

          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
            console.log("Debug - Found customer by email:", customerId);

            // Check for subscriptions (any status)
            const subscriptions = await stripe.subscriptions.list({
              customer: customerId,
              limit: 1,
            });

            if (subscriptions.data.length > 0) {
              const subscriptionId = subscriptions.data[0].id;
              console.log("Debug - Found subscription ID:", subscriptionId);

              // Get full subscription details
              const subscription = (await stripe.subscriptions.retrieve(
                subscriptionId,
                {
                  expand: ["items.data.price.product"],
                },
              )) as any;

              console.log("Debug - Raw subscription data:", {
                id: subscription.id,
                status: subscription.status,
                current_period_start: subscription.current_period_start,
                current_period_end: subscription.current_period_end,
                cancel_at_period_end: subscription.cancel_at_period_end,
                items: subscription.items,
              });

              console.log(
                "Debug - Full subscription object keys:",
                Object.keys(subscription),
              );
              console.log("Debug - Subscription type:", typeof subscription);
              console.log(
                "Debug - Latest invoice ID:",
                subscription.latest_invoice,
              );

              // Calculate current period from billing cycle anchor
              let currentPeriodStart, currentPeriodEnd;

              if (subscription.billing_cycle_anchor) {
                // Calculate current period based on billing cycle anchor and interval
                const anchorDate = new Date(
                  subscription.billing_cycle_anchor * 1000,
                );
                const now = new Date();

                // For weekly subscription, calculate current week
                const weeksSinceAnchor = Math.floor(
                  (now.getTime() - anchorDate.getTime()) /
                    (7 * 24 * 60 * 60 * 1000),
                );

                currentPeriodStart =
                  subscription.billing_cycle_anchor +
                  weeksSinceAnchor * 7 * 24 * 60 * 60;
                currentPeriodEnd = currentPeriodStart + 7 * 24 * 60 * 60; // 7 days later

                console.log("Debug - Calculated period:", {
                  anchorDate: anchorDate.toISOString(),
                  weeksSinceAnchor,
                  currentPeriodStart: new Date(
                    currentPeriodStart * 1000,
                  ).toISOString(),
                  currentPeriodEnd: new Date(
                    currentPeriodEnd * 1000,
                  ).toISOString(),
                });
              } else if (subscription.latest_invoice) {
                try {
                  const invoice = await stripe.invoices.retrieve(
                    subscription.latest_invoice,
                  );
                  console.log("Debug - Invoice data:", {
                    id: invoice.id,
                    period_start: invoice.period_start,
                    period_end: invoice.period_end,
                    status: invoice.status,
                  });

                  // Use the invoice period as fallback
                  currentPeriodStart = invoice.period_start;
                  currentPeriodEnd = invoice.period_end;
                } catch (invoiceError) {
                  console.error("Error fetching invoice:", invoiceError);
                }
              }

              subscriptionData = {
                id: subscription.id,
                status: subscription.status,
                currentPeriodStart: currentPeriodStart,
                currentPeriodEnd: currentPeriodEnd,
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                planId: subscription.items.data[0]?.price?.id,
              };
              console.log(
                "Debug - Active subscription found:",
                subscriptionData,
              );
            } else {
              // Check for recent payments
              const charges = await stripe.charges.list({
                customer: customerId,
                limit: 1,
              });

              if (charges.data.length > 0) {
                const latestCharge = charges.data[0];
                if (latestCharge.status === "succeeded") {
                  const chargeDate = new Date(latestCharge.created * 1000);
                  const endDate = new Date(chargeDate);
                  endDate.setDate(endDate.getDate() + 30);

                  subscriptionData = {
                    id: latestCharge.id,
                    status: "active",
                    currentPeriodStart: latestCharge.created,
                    currentPeriodEnd: Math.floor(endDate.getTime() / 1000),
                    cancelAtPeriodEnd: false,
                    planId: "one_time_payment",
                    isOneTimePayment: true,
                  };
                  console.log(
                    "Debug - One-time payment found:",
                    subscriptionData,
                  );
                }
              }
            }
          }
        } catch (emailError) {
          console.error("Error finding customer by email:", emailError);
        }
      }
    }

    // Sync metadata if needed
    if (subscriptionData) {
      const shouldBePlan = "plus";
      if (user.publicMetadata.plan !== shouldBePlan) {
        console.log(
          `Debug - Updating user metadata from ${user.publicMetadata.plan} to ${shouldBePlan}`,
        );
        await client.users.updateUserMetadata(userId, {
          publicMetadata: {
            ...user.publicMetadata,
            plan: shouldBePlan,
          },
        });
        // Update local user object to reflect changes in UI immediately
        user.publicMetadata.plan = shouldBePlan;
      }
    }
  } catch (error) {
    console.error("Unexpected error loading profile subscription data:", error);
    if (!user && hybridUser?.user) {
      user = hybridUser.user as NonNullable<typeof user>;
    }
  }

  if (!user) {
    redirect("/practice-overview");
  }

  return (
    <Profile
      user={JSON.parse(JSON.stringify(user))}
      prevCheckout={prevCheckout}
      subscriptionData={subscriptionData}
    />
  );
}
