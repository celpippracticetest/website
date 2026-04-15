import { NextResponse, type NextRequest } from "next/server";
import {
  clerkClient,
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { logger, trackUserAction, captureException } from "@/lib/sentry-logger";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import { PRICING_AB_COOKIE, type PricingAbLayout } from "@/lib/pricingAbTest";
import { HOME_AB_COOKIE, type HomeAbVariant } from "@/lib/homeAbTest";
import { applyMarketingCookiesToResponse } from "@/lib/marketingCookies";
import {
  runAccountSharingMiddlewareCheck,
  shouldEnforceAccountSharingSignals,
} from "@/lib/accountSharingMiddleware";

const isAdminRoute = createRouteMatcher(["/cms(.*)"]);
const isProfileRoute = createRouteMatcher(["/profile(.*)"]);
const isReferralRoute = createRouteMatcher(["/referral(.*)"]);
const isPlansRoute = createRouteMatcher(["/plans(.*)"]);
const isPreviewEnvironment = process.env.VERCEL_ENV === "preview";

/** Clerk JWT public metadata used for practice gating (see `src/types/globals.d.ts`). */
type JwtPracticeMetadata = {
  plan?: string;
  purchaseDate?: string;
};

function jwtPracticeMetadata(
  sessionClaims: { metadata?: unknown } | null | undefined,
): JwtPracticeMetadata | undefined {
  if (!sessionClaims?.metadata) return undefined;
  return sessionClaims.metadata as JwtPracticeMetadata;
}

const requiresPreviewAuth = (req: NextRequest) => {
  // Keep incoming third-party webhooks reachable in preview if needed.
  if (req.nextUrl.pathname === "/api/users/webhook") {
    return false;
  }
  return true;
};

const hasValidPreviewCredentials = (req: NextRequest) => {
  const previewUsername = process.env.PREVIEW_QA_USERNAME;
  const previewPassword = process.env.PREVIEW_QA_PASSWORD;

  if (!previewUsername || !previewPassword) {
    return false;
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) {
    return false;
  }

  try {
    const credentials = atob(authHeader.slice(6));
    const separatorIndex = credentials.indexOf(":");
    if (separatorIndex === -1) {
      return false;
    }

    const username = credentials.slice(0, separatorIndex);
    const password = credentials.slice(separatorIndex + 1);

    return username === previewUsername && password === previewPassword;
  } catch {
    return false;
  }
};

const PRACTICE_HUB_PATHS = new Set([
  "/speaking",
  "/reading",
  "/writing",
  "/listening",
]);
const REFERRAL_CREATE_COOLDOWN_COOKIE = "referralCodeCreateCooldown";
const REFERRAL_CREATE_COOLDOWN_SECONDS = 60;

export default clerkMiddleware(async (auth, req) => {
  let setReferralCreateCooldown = false;
  let clearPendingReferralCookie = false;

  if (isPreviewEnvironment && requiresPreviewAuth(req)) {
    if (!hasValidPreviewCredentials(req)) {
      return new NextResponse("Authentication required", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Preview QA", charset="UTF-8"',
        },
      });
    }
  }

  if (PRACTICE_HUB_PATHS.has(req.nextUrl.pathname)) {
    const practiceId = req.nextUrl.searchParams.get("selectedPracticeId");
    const taskId = req.nextUrl.searchParams.get("taskId");
    if (practiceId && taskId) {
      const url = req.nextUrl.clone();
      url.pathname = `${req.nextUrl.pathname}/${practiceId}/${taskId}`;
      url.search = "";
      return applyMarketingCookiesToResponse(req, NextResponse.redirect(url, 301));
    }
  }

  const authenticate = await auth();

  const practiceMetaForSharing = jwtPracticeMetadata(authenticate.sessionClaims);
  if (
    shouldEnforceAccountSharingSignals(
      req,
      authenticate.userId,
      practiceMetaForSharing,
    )
  ) {
    const shareCheck = await runAccountSharingMiddlewareCheck(req);
    if (!shareCheck.ok) {
      if (req.nextUrl.pathname.startsWith("/api/")) {
        return applyMarketingCookiesToResponse(
          req,
          NextResponse.json(
            {
              message: shareCheck.reason,
              code: shareCheck.code ?? "ACCOUNT_SHARING_SUSPECTED",
              allowAddDevice: shareCheck.allowAddDevice,
              needsExtraDevices: shareCheck.needsExtraDevices,
              currentPlan: shareCheck.currentPlan,
              allowedDevices: shareCheck.allowedDevices,
              activeDevices: shareCheck.activeDevices,
            },
            { status: 403 },
          ),
        );
      }
      const notice = new URL("/account-sharing-notice", req.url);
      if (shareCheck.code) notice.searchParams.set("code", shareCheck.code);
      if (shareCheck.reason) notice.searchParams.set("message", shareCheck.reason);
      if (typeof shareCheck.allowAddDevice === "boolean") {
        notice.searchParams.set(
          "allowAddDevice",
          shareCheck.allowAddDevice ? "1" : "0",
        );
      }
      if (typeof shareCheck.needsExtraDevices === "number") {
        notice.searchParams.set("needsExtraDevices", String(shareCheck.needsExtraDevices));
      }
      if (typeof shareCheck.allowedDevices === "number") {
        notice.searchParams.set("allowedDevices", String(shareCheck.allowedDevices));
      }
      if (typeof shareCheck.activeDevices === "number") {
        notice.searchParams.set("activeDevices", String(shareCheck.activeDevices));
      }
      if (shareCheck.currentPlan) notice.searchParams.set("currentPlan", shareCheck.currentPlan);
      return applyMarketingCookiesToResponse(req, NextResponse.redirect(notice));
    }
  }

  if (req.nextUrl.pathname === "/pricing") {
    const existing = req.cookies.get(PRICING_AB_COOKIE)?.value;
    /** Winner: two-card layout; migrate legacy `switch_toggle` assignment cookies. */
    const layout: PricingAbLayout = "two_card";
    if (existing !== layout) {
      const newReqHeaders = new Headers(req.headers);
      const currentCookies = newReqHeaders.get("cookie") || "";
      const cookieAddition = `${PRICING_AB_COOKIE}=${layout}`;
      const newCookies = currentCookies ? `${currentCookies}; ${cookieAddition}` : cookieAddition;
      newReqHeaders.set("cookie", newCookies);

      const response = NextResponse.next({
        request: {
          headers: newReqHeaders,
        },
      });

      response.cookies.set(PRICING_AB_COOKIE, layout, {
        path: "/",
        maxAge: 60 * 60 * 24 * 180,
        sameSite: "lax",
      });
      return applyMarketingCookiesToResponse(req, response);
    }
  }

  if (req.nextUrl.pathname === "/") {
    const variant: HomeAbVariant = "passport";

    const newReqHeaders = new Headers(req.headers);
    newReqHeaders.set("x-home-ab-variant", variant);

    const response = NextResponse.next({
      request: {
        headers: newReqHeaders,
      },
    });

    const existing = req.cookies.get(HOME_AB_COOKIE)?.value;
    if (existing !== "passport") {
      response.cookies.set(HOME_AB_COOKIE, variant, {
        path: "/",
        maxAge: 60 * 60 * 24 * 180,
        sameSite: "lax",
      });
    }

    const refParam = req.nextUrl.searchParams.get("ref");
    const inviterParam = req.nextUrl.searchParams.get("inviter");
    if (refParam) {
      response.cookies.set("pendingReferralCode", refParam, {
        maxAge: 60 * 60,
        httpOnly: false,
        path: "/",
      });
    }
    if (inviterParam) {
      response.cookies.set("pendingInviterName", inviterParam, {
        maxAge: 60 * 60,
        httpOnly: false,
        path: "/",
      });
    }

    return applyMarketingCookiesToResponse(req, response);
  }

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

      return applyMarketingCookiesToResponse(req, response);
    }
  }

  if (isProfileRoute(req)) {
    if (!authenticate.userId) {
      const dashboard = new URL("/practice-overview", req.url);
      return applyMarketingCookiesToResponse(req, NextResponse.redirect(dashboard));
    }
    // All authenticated users can access their profile regardless of plan
  }
  if (isPlansRoute(req)) {
    if (!authenticate.userId) {
      const dashboard = new URL("/practice-overview", req.url);
      return applyMarketingCookiesToResponse(req, NextResponse.redirect(dashboard));
    }
    const meta = jwtPracticeMetadata(authenticate.sessionClaims);
    const plan = meta?.plan;
    if (!hasPaidPracticeAccess(plan, meta?.purchaseDate)) {
      const homeUrl = new URL("/", req.url);
      return applyMarketingCookiesToResponse(req, NextResponse.redirect(homeUrl));
    }
  }

  if (isReferralRoute(req)) {
    // Allow public access to referral page for non-authenticated users
    // They need to see the referral page to sign up
    if (!authenticate.userId) {
      // Don't redirect, allow access to referral page
      return applyMarketingCookiesToResponse(req, NextResponse.next());
    }

    // For authenticated users, check plan
    const meta = jwtPracticeMetadata(authenticate.sessionClaims);
    const plan = meta?.plan;
    if (!hasPaidPracticeAccess(plan, meta?.purchaseDate)) {
      const homeUrl = new URL("/", req.url);
      return applyMarketingCookiesToResponse(req, NextResponse.redirect(homeUrl));
    }
  }

  if (authenticate.userId && !authenticate.sessionClaims?.metadata.roles) {
    const client = await clerkClient();
    const existingPlan = (authenticate.sessionClaims?.metadata as any)?.plan;
    await client.users.updateUserMetadata(authenticate.userId, {
      publicMetadata: {
        roles: ["user"],
        plan: existingPlan || "free",
      },
    });
  }

  // Create referral code when user becomes premium
  const practiceMeta = jwtPracticeMetadata(authenticate.sessionClaims);
  if (
    authenticate.userId &&
    hasPaidPracticeAccess(practiceMeta?.plan, practiceMeta?.purchaseDate)
  ) {
    const hasReferralCode = (authenticate.sessionClaims?.metadata as any)
      ?.referralCode;
    const onEligiblePage =
      req.method === "GET" &&
      (req.nextUrl.pathname === "/practice-overview" ||
        req.nextUrl.pathname === "/success" ||
        req.nextUrl.pathname === "/success/paypal");
    const hasCooldownCookie = Boolean(
      req.cookies.get(REFERRAL_CREATE_COOLDOWN_COOKIE)?.value,
    );

    if (!hasReferralCode && onEligiblePage && !hasCooldownCookie) {
      logger.info("User is premium but has no referral code, creating one", {
        component: "middleware",
        action: "create_referral_code",
        userId: authenticate.userId,
      });
      setReferralCreateCooldown = true;

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
          },
        );

        if (response.ok) {
          const data = await response.json();
          logger.info("Referral code created successfully", {
            component: "middleware",
            action: "referral_code_created",
            userId: authenticate.userId,
            metadata: { code: data.code },
          });
        } else {
          const body = (await response.json().catch(() => ({}))) as {
            retryAfter?: number;
            error?: string;
          };
          logger.error("Failed to create referral code", {
            component: "middleware",
            action: "referral_code_creation_failed",
            userId: authenticate.userId,
            metadata: {
              status: response.status,
              retryAfter: body.retryAfter,
              error: body.error,
            },
          });
        }
      } catch (error) {
        captureException(error, {
          component: "middleware",
          action: "referral_code_creation_error",
          userId: authenticate.userId,
        });
      }
    }
  }

  // Update onboarding status when user visits practice-overview
  if (authenticate.userId && req.nextUrl.pathname === "/practice-overview") {
    const hasCompletedOnboarding = (authenticate.sessionClaims?.metadata as any)
      ?.onboardingCompleted;
    if (!hasCompletedOnboarding) {
      const client = await clerkClient();

      const referralCode = req.cookies.get("pendingReferralCode")?.value;

      if (referralCode) {
        let pendingKind: "partner" | "user_referral" | "none" = "none";
        try {
          const classifyHeaders: Record<string, string> = {
            "Content-Type": "application/json",
          };
          const incomingCookie = req.headers.get("cookie");
          if (incomingCookie) classifyHeaders["cookie"] = incomingCookie;
          const vercelBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
          if (vercelBypass) {
            classifyHeaders["x-vercel-protection-bypass"] = vercelBypass;
          }

          const classifyRes = await fetch(
            `${req.nextUrl.origin}/api/partners/apply-pending-code`,
            {
              method: "POST",
              headers: classifyHeaders,
              body: JSON.stringify({ code: referralCode }),
            },
          );
          const classifyData = (await classifyRes.json().catch(() => ({}))) as {
            kind?: string;
          };
          if (
            classifyData.kind === "partner" ||
            classifyData.kind === "user_referral" ||
            classifyData.kind === "none"
          ) {
            pendingKind = classifyData.kind;
          }
        } catch (error) {
          captureException(error, {
            component: "middleware",
            action: "classify_pending_code_error",
            userId: authenticate.userId,
          });
        }

        clearPendingReferralCookie = true;

        if (pendingKind === "partner") {
          logger.info("Partner attribution applied from pending cookie", {
            component: "middleware",
            action: "partner_attribution_from_cookie",
            userId: authenticate.userId,
            metadata: { referralCode },
          });
        } else if (pendingKind === "user_referral") {
          logger.info("Referral code found in cookies", {
            component: "middleware",
            action: "referral_code_found",
            userId: authenticate.userId,
            metadata: { referralCode },
          });
          await client.users.updateUserMetadata(authenticate.userId, {
            publicMetadata: {
              ...authenticate.sessionClaims?.metadata,
              onboardingCompleted: true,
              referralCode: referralCode,
              referralActive: true,
            },
          });

          logger.info("Processing referral discount", {
            component: "middleware",
            action: "process_referral_discount",
            userId: authenticate.userId,
            metadata: { referralCode },
          });

          try {
            const discountResponse = await fetch(
              `${req.nextUrl.origin}/api/referrals/apply-discount`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  referralCode,
                  userId: authenticate.userId,
                  userEmail: (authenticate.sessionClaims as any)
                    ?.email_addresses?.[0]?.email_address,
                }),
              },
            );

            if (discountResponse.ok) {
              logger.info("Referral discount applied successfully", {
                component: "middleware",
                action: "referral_discount_applied",
                userId: authenticate.userId,
                metadata: { referralCode },
              });
            } else {
              const errorData = await discountResponse.json();
              logger.error("Failed to apply referral discount", {
                component: "middleware",
                action: "referral_discount_failed",
                userId: authenticate.userId,
                metadata: { referralCode, error: errorData },
              });
            }
          } catch (error) {
            captureException(error, {
              component: "middleware",
              action: "referral_discount_error",
              userId: authenticate.userId,
              metadata: { referralCode },
            });
          }

          try {
            const headers: Record<string, string> = {
              "Content-Type": "application/json",
            };
            const incomingCookie = req.headers.get("cookie");
            if (incomingCookie) headers["cookie"] = incomingCookie;
            const vercelBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
            if (vercelBypass)
              headers["x-vercel-protection-bypass"] = vercelBypass as string;

            const response = await fetch(
              `${req.nextUrl.origin}/api/referrals/track-signup`,
              {
                method: "POST",
                headers,
                body: JSON.stringify({ referralCode }),
              },
            );

            if (!response.ok) {
              const errorText = await response
                .text()
                .catch(() => "No error body");
              logger.error("Failed to track signup", {
                component: "middleware",
                action: "track_signup_failed",
                userId: authenticate.userId,
                metadata: {
                  status: response.status,
                  statusText: response.statusText,
                  errorText,
                  referralCode,
                },
              });
            } else {
              let data: unknown = null;
              try {
                data = await response.json();
              } catch {}
              logger.info("Successfully tracked signup for referral code", {
                component: "middleware",
                action: "signup_tracked",
                userId: authenticate.userId,
                metadata: { referralCode, data },
              });
            }
          } catch (error) {
            captureException(error, {
              component: "middleware",
              action: "track_signup_error",
              userId: authenticate.userId,
              metadata: { referralCode },
            });
          }
        } else {
          await client.users.updateUserMetadata(authenticate.userId, {
            publicMetadata: {
              ...authenticate.sessionClaims?.metadata,
              onboardingCompleted: true,
            },
          });
        }
      } else {
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
    return applyMarketingCookiesToResponse(req, NextResponse.redirect(url));
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
    "POST:/api/paypal/create-subscription",
  ];

  const requestedPath = `${req.method}:${req.nextUrl.pathname}`;
  if (protectedPaths.includes(requestedPath)) {
    await auth.protect();
  }

  const response = applyMarketingCookiesToResponse(req, NextResponse.next());
  if (setReferralCreateCooldown) {
    response.cookies.set(REFERRAL_CREATE_COOLDOWN_COOKIE, "1", {
      path: "/",
      maxAge: REFERRAL_CREATE_COOLDOWN_SECONDS,
      sameSite: "lax",
      httpOnly: true,
    });
  }
  if (clearPendingReferralCookie) {
    response.cookies.set("pendingReferralCode", "", {
      path: "/",
      maxAge: 0,
    });
  }
  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|manifest)).*)",
    "/api/users/webhook",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
