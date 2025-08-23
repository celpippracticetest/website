import { NextResponse, type NextRequest } from "next/server";
import {
  clerkClient,
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";

const isAdminRoute = createRouteMatcher(["/cms(.*)"]);
const isProfileRoute = createRouteMatcher(["/profile(.*)"]);
const isReferralRoute = createRouteMatcher(["/referral(.*)"]);
const isPlansRoute = createRouteMatcher(["/plans(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const authenticate = await auth();

  if (
    req.nextUrl.pathname.startsWith("/sign-up") ||
    req.nextUrl.pathname.startsWith("/sign-in")
  ) {
    const url = req.nextUrl.clone();
    const ref = url.searchParams.get("ref");
    const inviter = url.searchParams.get("inviter");

    if (ref || inviter) {
      const response = NextResponse.next();

      if (ref) {
        response.cookies.set("pendingReferralCode", ref, {
          maxAge: 60 * 60,
          httpOnly: false,
          path: "/",
        });
      }

      if (inviter) {
        response.cookies.set("pendingInviterName", inviter, {
          maxAge: 60 * 60,
          httpOnly: false,
          path: "/",
        });
      }

      return response;
    }
  }

  if (isProfileRoute(req)) {
    if (!authenticate.userId) {
      const dashboard = new URL("/practice-overview", req.url);
      return NextResponse.redirect(dashboard);
    }
    const plan = authenticate.sessionClaims?.metadata.plan;
    if (plan !== "free" && plan !== "premium") {
      const homeUrl = new URL("/", req.url);
      return NextResponse.redirect(homeUrl);
    }
  }
  if (isPlansRoute(req)) {
    if (!authenticate.userId) {
      const dashboard = new URL("/practice-overview", req.url);
      return NextResponse.redirect(dashboard);
    }
    const plan = authenticate.sessionClaims?.metadata.plan;
    if (plan !== "premium") {
      const homeUrl = new URL("/", req.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  if (isReferralRoute(req)) {
    // Allow public access to referral page for non-authenticated users
    // They need to see the referral page to sign up
    if (!authenticate.userId) {
      // Don't redirect, allow access to referral page
      return NextResponse.next();
    }

    // For authenticated users, check plan
    const plan = authenticate.sessionClaims?.metadata.plan;
    if (plan !== "premium") {
      const homeUrl = new URL("/", req.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  if (authenticate.userId && !authenticate.sessionClaims?.metadata.roles) {
    const client = await clerkClient();
    client.users.updateUserMetadata(authenticate.userId, {
      publicMetadata: {
        roles: ["user"],
        plan: "free",
      },
    });
  }

  // Create referral code when user becomes premium
  if (
    authenticate.userId &&
    authenticate.sessionClaims?.metadata.plan === "premium"
  ) {
    const hasReferralCode = (authenticate.sessionClaims?.metadata as any)
      ?.referralCode;

    if (!hasReferralCode) {
      console.log(
        "🔄 User is premium but has no referral code, creating one..."
      );

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        // Forward cookies
        const incomingCookie = req.headers.get("cookie");
        if (incomingCookie) headers["cookie"] = incomingCookie;

        const response = await fetch(
          `${req.nextUrl.origin}/api/users/create-referral-code`,
          {
            method: "POST",
            headers,
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log("✅ Referral code created:", data.code);
        } else {
          console.error("❌ Failed to create referral code:", response.status);
        }
      } catch (error) {
        console.error("❌ Error creating referral code:", error);
      }
    }
  }

  // Update onboarding status when user visits practice-overview
  if (authenticate.userId && req.nextUrl.pathname === "/practice-overview") {
    const hasCompletedOnboarding = (authenticate.sessionClaims?.metadata as any)
      ?.onboardingCompleted;
    if (!hasCompletedOnboarding) {
      const client = await clerkClient();

      // Check if user has referral code in cookies
      const referralCode = req.cookies.get("pendingReferralCode")?.value;

      if (referralCode) {
        // Store referral code in user metadata for later processing
        console.log("Referral code found:", referralCode);
        await client.users.updateUserMetadata(authenticate.userId, {
          publicMetadata: {
            ...authenticate.sessionClaims?.metadata,
            onboardingCompleted: true,
            referralCode: referralCode,
            referralActive: true,
          },
        });

        // Track the signup for the referrer
        try {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };

          // Forward cookies (can help when APIs depend on session cookies)
          const incomingCookie = req.headers.get("cookie");
          if (incomingCookie) headers["cookie"] = incomingCookie;

          // If Vercel Protection is enabled (Preview/Dev), use bypass token
          const vercelBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
          if (vercelBypass)
            headers["x-vercel-protection-bypass"] = vercelBypass as string;

          const response = await fetch(
            `${req.nextUrl.origin}/api/referrals/track-signup`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({ referralCode }),
            }
          );

          if (!response.ok) {
            // Read response body safely to aid debugging
            const errorText = await response
              .text()
              .catch(() => "❌ No error body");
            console.error(
              "❌ Failed to track signup:",
              response.status,
              response.statusText,
              errorText
            );
          } else {
            // Try to parse JSON but don't fail if it's empty
            let data: unknown = null;
            try {
              data = await response.json();
            } catch {}
            console.log(
              "✅ Successfully tracked signup for referral code:",
              referralCode,
              data ? data : ""
            );
          }
        } catch (error) {
          console.error(
            "❌ Network or runtime error while tracking signup:",
            error
          );
        }
      } else {
        // Just update onboarding status
        await client.users.updateUserMetadata(authenticate.userId, {
          publicMetadata: {
            ...authenticate.sessionClaims?.metadata,
            onboardingCompleted: true,
          },
        });
      }
    }
  }

  if (
    isAdminRoute(req) &&
    (!authenticate.sessionClaims?.metadata.roles ||
      !authenticate.sessionClaims?.metadata?.roles?.includes("admin"))
  ) {
    const url = new URL("/", req.url);
    return NextResponse.redirect(url);
  }

  const protectedPaths = [
    "POST:/api/practices",
    "POST:/api/tasks",
    "POST:/api/practices/answers",
    "GET:/api/practices/answers",
    "POST:/api/answers",
    "POST:/api/answers/writing",
    "GET:/api/answers/writing",
    "POST:/api/answers/speaking",
    "POST:/api/checkout_session",
  ];

  const requestedPath = `${req.method}:${req.nextUrl.pathname}`;
  if (protectedPaths.includes(requestedPath)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/api/users/webhook",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
